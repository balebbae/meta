"""Joint-angle features from MediaPipe's 33 pose landmarks (BlazePose topology)."""

from __future__ import annotations

import numpy as np

# BlazePose landmark indices
L_SHOULDER, R_SHOULDER, L_ELBOW, R_ELBOW, L_WRIST, R_WRIST = 11, 12, 13, 14, 15, 16
L_HIP, R_HIP, L_KNEE, R_KNEE, L_ANKLE, R_ANKLE = 23, 24, 25, 26, 27, 28


def angle(a: np.ndarray, b: np.ndarray, c: np.ndarray) -> np.ndarray:
    """Angle ABC in degrees for (T, 2|3) arrays."""
    ba, bc = a - b, c - b
    cos = (ba * bc).sum(-1) / (np.linalg.norm(ba, axis=-1) * np.linalg.norm(bc, axis=-1) + 1e-9)
    return np.degrees(np.arccos(np.clip(cos, -1.0, 1.0)))


def _side(lm: np.ndarray, vis: np.ndarray, left: int, right: int) -> np.ndarray:
    """Per-frame visibility-weighted average of a left/right pair, so whichever side faces the camera dominates."""
    wl, wr = vis[:, left : left + 1] + 1e-3, vis[:, right : right + 1] + 1e-3
    return (lm[:, left] * wl + lm[:, right] * wr) / (wl + wr)


def features(lm: np.ndarray) -> dict[str, np.ndarray]:
    """lm: (T, 33, 4) array of x, y, z, visibility in normalized image coords (y grows downward)."""
    lm = lm.copy()
    # frames where the core joints are barely visible are pose glitches; treat them as missing
    core = [L_SHOULDER, R_SHOULDER, L_HIP, R_HIP]
    lm[np.nanmax(lm[:, core, 3], axis=1) < 0.5] = np.nan
    xy, vis = lm[..., :2], lm[..., 3]

    def joint(a: tuple[int, int], b: tuple[int, int], c: tuple[int, int]) -> np.ndarray:
        left = angle(xy[:, a[0]], xy[:, b[0]], xy[:, c[0]])
        right = angle(xy[:, a[1]], xy[:, b[1]], xy[:, c[1]])
        wl, wr = vis[:, b[0]] + 1e-3, vis[:, b[1]] + 1e-3
        return (left * wl + right * wr) / (wl + wr)

    sh, hip = _side(xy, vis, L_SHOULDER, R_SHOULDER), _side(xy, vis, L_HIP, R_HIP)
    torso = hip - sh
    # one torso length per clip (median): per-frame lengths blow up when a glitch collapses the torso
    torso_len = float(np.nanmedian(np.linalg.norm(torso, axis=-1))) if np.isfinite(torso).any() else 1.0
    torso_len = max(torso_len, 1e-3)
    wrists_y = (xy[:, L_WRIST, 1] + xy[:, R_WRIST, 1]) / 2
    ankles_x = np.abs(xy[:, L_ANKLE, 0] - xy[:, R_ANKLE, 0])
    return {
        "elbow": joint((L_SHOULDER, R_SHOULDER), (L_ELBOW, R_ELBOW), (L_WRIST, R_WRIST)),
        "knee": joint((L_HIP, R_HIP), (L_KNEE, R_KNEE), (L_ANKLE, R_ANKLE)),
        "hip": joint((L_SHOULDER, R_SHOULDER), (L_HIP, R_HIP), (L_KNEE, R_KNEE)),
        # 0 deg = torso vertical, 90 deg = horizontal (push-up / plank)
        "torso_tilt": np.degrees(np.arctan2(np.abs(torso[:, 0]), np.abs(torso[:, 1]) + 1e-9)),
        # arms overhead -> large; normalized by torso length so distance to camera doesn't matter
        "arms_up": (sh[:, 1] - wrists_y) / torso_len,
        "feet_apart": ankles_x / torso_len,
        "shoulder_height": -sh[:, 1] / torso_len,
    }
