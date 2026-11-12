"""Count reps from a 1-D joint signal with smoothing + hysteresis, and pick the exercise's signal."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from repcount.features import features

# signal used per exercise; "low" = the rep's working position is the signal minimum (e.g. bent elbow)
EXERCISES: dict[str, str] = {
    "pushup": "elbow",
    "squat": "knee",
    "lunge": "knee",
    "situp": "hip",
    "jumping_jack": "arms_up",
}


@dataclass
class Count:
    exercise: str
    reps: int
    signal: str
    rep_frames: list[int]
    confidence: float


def _fill(x: np.ndarray) -> np.ndarray:
    x = x.astype(float).copy()
    bad = ~np.isfinite(x)
    if bad.all():
        return np.zeros_like(x)
    idx = np.arange(len(x))
    x[bad] = np.interp(idx[bad], idx[~bad], x[~bad])
    return x


def smooth(x: np.ndarray, fps: float, window_s: float = 0.2) -> np.ndarray:
    """Median filter (removes single-frame pose spikes) then moving average."""
    k = max(1, int(round(window_s * fps)) | 1)
    if k == 1 or len(x) < k:
        return x
    pad = k // 2
    xp = np.pad(x, pad, mode="edge")
    med = np.median(np.lib.stride_tricks.sliding_window_view(xp, k), axis=1)
    return np.convolve(np.pad(med, pad, mode="edge"), np.ones(k) / k, mode="valid")


def count_signal(
    x: np.ndarray, fps: float, low: float = 0.35, high: float = 0.65, min_rep_s: float = 0.4, min_range: float = 0.0
) -> tuple[int, list[int], float]:
    """Count down-up cycles. Normalizes to the 5th-95th percentile range; a rep = going below `low` then back above
    `high` (hysteresis kills jitter). Returns (reps, frame index of each rep's bottom, confidence 0-1)."""
    x = np.asarray(x, dtype=float)
    if len(x) == 0 or not np.isfinite(x).any():
        return 0, [], 0.0
    x = smooth(_fill(x), fps)
    lo, hi = np.percentile(x, 5), np.percentile(x, 95)
    rng = hi - lo
    if rng <= max(min_range, 1e-6):
        return 0, [], 0.0
    z = (x - lo) / rng
    state, reps, bottoms, last, bottom_i = "up" if z[0] > 0.5 else "down", 0, [], -(10**9), 0
    for i, v in enumerate(z):
        if state == "up" and v < low:
            state, bottom_i = "down", i
        elif state == "down":
            if v < z[bottom_i]:
                bottom_i = i
            if v > high:
                state = "up"
                if bottom_i - last >= min_rep_s * fps:
                    reps += 1
                    bottoms.append(bottom_i)
                    last = bottom_i
    if reps >= 2:  # regular tempo -> confident
        gaps = np.diff(bottoms)
        conf = float(np.clip(1.0 - np.std(gaps) / (np.mean(gaps) + 1e-9), 0.0, 1.0))
    else:
        conf = 0.5 if reps == 1 else 0.0
    return reps, bottoms, round(conf, 3)


# minimum swing (degrees, or torso-length units for arms_up) for a movement to count as a rep at all
MIN_RANGE = {"elbow": 35.0, "knee": 35.0, "hip": 30.0, "arms_up": 0.5}


def count(lm: np.ndarray, fps: float, exercise: str) -> Count:
    if exercise not in EXERCISES:
        raise ValueError(f"unknown exercise {exercise!r}; choose from {sorted(EXERCISES)}")
    sig = EXERCISES[exercise]
    reps, bottoms, conf = count_signal(features(lm)[sig], fps, min_range=MIN_RANGE[sig])
    return Count(exercise, reps, sig, bottoms, conf)


def guess_exercise(lm: np.ndarray) -> str:
    """Cheap posture rules; the app normally already knows the exercise from the quest, so this is only a sanity
    check that the video shows that movement."""
    f = features(lm)
    tilt = float(np.nanmedian(f["torso_tilt"]))
    swing = {
        k: float(np.nanpercentile(f[k], 95) - np.nanpercentile(f[k], 5)) for k in ("elbow", "knee", "hip", "arms_up")
    }
    if tilt > 55:  # body horizontal
        return "pushup" if swing["elbow"] >= swing["hip"] else "situp"
    if swing["arms_up"] > 0.8 and f["feet_apart"].std() > 0.05:
        return "jumping_jack"
    if swing["hip"] > 60 and tilt > 30 and swing["knee"] < 40:
        return "situp"
    return "squat"
