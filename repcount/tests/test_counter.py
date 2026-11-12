import numpy as np
import pytest

from repcount.counter import count, count_signal
from repcount.features import L_ELBOW, L_HIP, L_SHOULDER, L_WRIST, R_ELBOW, R_HIP, R_SHOULDER, R_WRIST

FPS = 15.0


def pushup_clip(reps: int, period_s: float = 2.0, noise_deg: float = 4.0, seed: int = 0, lead_s: float = 1.0):
    """Synthetic side-view skeleton whose elbow angle swings 170 -> 70 -> 170 deg `reps` times."""
    rng = np.random.default_rng(seed)
    t = np.arange(0, lead_s * 2 + reps * period_s, 1 / FPS)
    phase = np.clip((t - lead_s) / period_s, 0, reps)
    ang = 170 - 100 * (1 - np.cos(2 * np.pi * phase)) / 2 + rng.normal(0, noise_deg, len(t))
    lm = np.zeros((len(t), 33, 4))
    lm[..., 3] = 1.0
    sh, el = np.array([0.5, 0.5]), np.array([0.5, 0.65])
    for s_i, e_i, w_i, h_i in ((L_SHOULDER, L_ELBOW, L_WRIST, L_HIP), (R_SHOULDER, R_ELBOW, R_WRIST, R_HIP)):
        lm[:, s_i, :2], lm[:, e_i, :2], lm[:, h_i, :2] = sh, el, [0.8, 0.52]
        rad = np.radians(ang)  # wrist rotates around the elbow away from the shoulder direction (straight up)
        lm[:, w_i, 0], lm[:, w_i, 1] = el[0] + 0.15 * np.sin(rad), el[1] - 0.15 * np.cos(rad)
    return lm


@pytest.mark.parametrize("reps,period,noise", [(1, 2.0, 2.0), (5, 2.0, 4.0), (12, 1.2, 6.0), (20, 0.9, 4.0)])
def test_counts_synthetic_pushups(reps, period, noise):
    assert count(pushup_clip(reps, period, noise), FPS, "pushup").reps == reps


def test_regular_tempo_is_confident():
    assert count(pushup_clip(8), FPS, "pushup").confidence > 0.9


def test_still_clip_counts_zero():
    assert count(pushup_clip(0), FPS, "pushup").reps == 0


def test_single_frame_spikes_do_not_count():
    lm = pushup_clip(4)
    lm[[30, 31, 60], L_WRIST, :2] = lm[[30, 31, 60], R_WRIST, :2] = [0.5, 0.95]
    assert count(lm, FPS, "pushup").reps == 4


def test_missing_frames_are_interpolated():
    lm = pushup_clip(6)
    lm[::7] = np.nan
    assert count(lm, FPS, "pushup").reps == 6


def test_tiny_wiggle_is_not_a_rep():
    x = 160 + 5 * np.sin(np.linspace(0, 20 * np.pi, 300))
    assert count_signal(x, FPS, min_range=35.0)[0] == 0


def test_unknown_exercise():
    with pytest.raises(ValueError):
        count(pushup_clip(1), FPS, "cartwheel")
