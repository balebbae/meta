"""Which exercise does a clip show? Pose landmarks -> clip features -> rules + logistic regression -> verdict.

    from repcount.classify import classify
    classify(lm, fps)            # lm: (T, 33, 4) MediaPipe landmarks sampled at <= 15 fps
    # {"exercise": "push_up", "confidence": 0.97, "abstain": false, "person_found": true, "reps": 9, ...}

Labels match the vision LLM's exercise_check schema (push_up | squat | lunge | jumping_jack | sit_up | none).
Everything a browser port needs (signal definitions, feature order, scaler, coefficients, thresholds) lives in
`model/exercise_clf.json`; inference here is plain numpy over that file, so the JSON *is* the model. Training:
`python -m repcount.train_clf`.

Pipeline (keep in sync with `signal_defs` / `stat_defs` in the JSON):
1. Per-frame signals: `features.features()` (side-weighted joint angles, torso tilt, arm height, feet apart; frames
   whose shoulders and hips are all < 0.5 visibility become NaN) plus shoulder abduction, left/right knee gap, hip
   height and ankle spread.
2. Per-clip stats per signal: mean, std, range (p95 - p5), dominant frequency (Hz) and periodicity (share of
   spectral power at that peak), plus a few cross-signal features (arms/legs coupling for jumping jacks).
3. Standardize, multinomial logistic regression, softmax.
4. Rules around the model: no person / too little pose -> abstain; prediction that contradicts body orientation
   (push-up while upright, squat while horizontal) -> abstain; exercise predicted but its joint barely moves ->
   abstain; max probability below the threshold picked on group-held-out train predictions -> abstain.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

import numpy as np

from repcount.counter import MIN_RANGE, _fill, count, smooth
from repcount.features import (
    L_ANKLE,
    L_ELBOW,
    L_HIP,
    L_KNEE,
    L_SHOULDER,
    R_ANKLE,
    R_ELBOW,
    R_HIP,
    R_KNEE,
    R_SHOULDER,
    angle,
    features,
)

MODEL_PATH = Path(__file__).resolve().parent.parent / "model" / "exercise_clf.json"
LABELS = ["push_up", "squat", "lunge", "jumping_jack", "sit_up", "none"]
BODY = ["push_up", "squat", "lunge", "jumping_jack", "sit_up"]
TO_COUNTER = {
    "push_up": "pushup", "squat": "squat", "lunge": "lunge", "jumping_jack": "jumping_jack", "sit_up": "situp"
}
HORIZONTAL = {"push_up", "sit_up"}  # torso near horizontal for most of the clip
UPRIGHT = {"squat", "lunge", "jumping_jack"}

# preprocessing constants (exported to the JSON; the port must use the same values)
FREQ_BAND = (0.15, 3.5)  # Hz; slower is drift, faster is pose jitter at <= 15 fps
NFFT = 256
SMOOTH_S = 0.2
DYNAMIC = ["elbow", "knee", "hip", "arms_up", "abduction", "hip_height", "feet_apart", "ankle_spread"]
STATIC = ["torso_tilt", "knee_gap"]
STATS_DYNAMIC = ["mean", "std", "range", "freq", "periodicity"]
STATS_STATIC = ["mean", "std", "range"]
EXTRA = ["arms_legs_coupling", "knee_hip_coupling", "valid_frac", "core_vis"]


def feature_names() -> list[str]:
    names = [f"{s}.{k}" for s in DYNAMIC for k in STATS_DYNAMIC]
    names += [f"{s}.{k}" for s in STATIC for k in STATS_STATIC]
    return names + EXTRA


def _weighted_pair_angle(xy, vis, a, b, c) -> np.ndarray:
    left = angle(xy[:, a[0]], xy[:, b[0]], xy[:, c[0]])
    right = angle(xy[:, a[1]], xy[:, b[1]], xy[:, c[1]])
    wl, wr = vis[:, b[0]] + 1e-3, vis[:, b[1]] + 1e-3
    return (left * wl + right * wr) / (wl + wr)


def signals(lm: np.ndarray) -> dict[str, np.ndarray]:
    """Per-frame signals: features.features() plus the four extra ones the classifier needs."""
    f = features(lm)
    lm = lm.copy()
    core = [L_SHOULDER, R_SHOULDER, L_HIP, R_HIP]
    with np.errstate(all="ignore"):
        bad = ~(np.nanmax(np.nan_to_num(lm[:, core, 3], nan=0.0), axis=1) >= 0.5)
    lm[bad] = np.nan
    xy, vis = lm[..., :2], lm[..., 3]
    torso = (xy[:, L_HIP] + xy[:, R_HIP]) / 2 - (xy[:, L_SHOULDER] + xy[:, R_SHOULDER]) / 2
    tl = np.linalg.norm(torso, axis=-1)
    torso_len = max(float(np.nanmedian(tl)) if np.isfinite(tl).any() else 1.0, 1e-3)
    knee_l = angle(xy[:, L_HIP], xy[:, L_KNEE], xy[:, L_ANKLE])
    knee_r = angle(xy[:, R_HIP], xy[:, R_KNEE], xy[:, R_ANKLE])
    hip_mid = (xy[:, L_HIP] + xy[:, R_HIP]) / 2
    f["abduction"] = _weighted_pair_angle(xy, vis, (L_HIP, R_HIP), (L_SHOULDER, R_SHOULDER), (L_ELBOW, R_ELBOW))
    f["knee_gap"] = np.abs(knee_l - knee_r)
    f["hip_height"] = -hip_mid[:, 1] / torso_len
    f["ankle_spread"] = np.linalg.norm(xy[:, L_ANKLE] - xy[:, R_ANKLE], axis=-1) / torso_len
    f["_valid"] = (~bad).astype(float)
    f["_core_vis"] = np.where(bad, np.nan, np.nanmean(np.nan_to_num(lm[:, core, 3], nan=0.0), axis=1))
    return f


def spectrum_peak(x: np.ndarray, fps: float) -> tuple[float, float]:
    """(dominant frequency in Hz within FREQ_BAND, share of in-band power within +-1 bin of the peak)."""
    if not np.isfinite(x).any() or np.isfinite(x).sum() < 8:
        return 0.0, 0.0
    x = smooth(_fill(x), fps, SMOOTH_S)
    x = x - x.mean()
    win = np.hanning(len(x))
    p = np.abs(np.fft.rfft(x * win, n=max(NFFT, len(x)))) ** 2
    fr = np.fft.rfftfreq(max(NFFT, len(x)), 1 / fps)
    band = (fr >= FREQ_BAND[0]) & (fr <= FREQ_BAND[1])
    if not band.any() or p[band].sum() <= 1e-12:
        return 0.0, 0.0
    pb, fb = p[band], fr[band]
    i = int(np.argmax(pb))
    peak = pb[max(0, i - 1) : i + 2].sum()
    return float(fb[i]), float(peak / pb.sum())


def _corr(a: np.ndarray, b: np.ndarray) -> float:
    m = np.isfinite(a) & np.isfinite(b)
    if m.sum() < 8 or np.std(a[m]) < 1e-9 or np.std(b[m]) < 1e-9:
        return 0.0
    return float(np.corrcoef(a[m], b[m])[0, 1])


def clip_features(lm: np.ndarray, fps: float) -> tuple[np.ndarray, dict[str, np.ndarray]]:
    """Feature vector in feature_names() order (NaN-free), plus the per-frame signals it came from."""
    s = signals(lm)
    out: list[float] = []

    def stats(x: np.ndarray, which: list[str]) -> list[float]:
        fin = x[np.isfinite(x)]
        if len(fin) == 0:
            return [0.0] * len(which)
        vals = {"mean": float(fin.mean()), "std": float(fin.std()),
                "range": float(np.percentile(fin, 95) - np.percentile(fin, 5))}
        if "freq" in which:
            vals["freq"], vals["periodicity"] = spectrum_peak(x, fps)
        return [vals[k] for k in which]

    for name in DYNAMIC:
        out += stats(s[name], STATS_DYNAMIC)
    for name in STATIC:
        out += stats(s[name], STATS_STATIC)
    out.append(_corr(s["arms_up"], s["feet_apart"]))
    out.append(_corr(s["knee"], s["hip"]))
    out.append(float(s["_valid"].mean()) if len(s["_valid"]) else 0.0)
    cv = s["_core_vis"]
    out.append(float(np.nanmean(cv)) if np.isfinite(cv).any() else 0.0)
    return np.nan_to_num(np.asarray(out, dtype=float), nan=0.0, posinf=0.0, neginf=0.0), s


@lru_cache(maxsize=4)
def load_model(path: str | Path = MODEL_PATH) -> dict:
    return json.loads(Path(path).read_text())


def predict_proba(x: np.ndarray, model: dict) -> np.ndarray:
    lr = model["model"]
    z = (x - np.asarray(lr["mean"])) / np.asarray(lr["scale"])
    logits = np.asarray(lr["coef"]) @ z + np.asarray(lr["intercept"])
    e = np.exp(logits - logits.max())
    return e / e.sum()


def _sig_range(s: dict[str, np.ndarray], name: str) -> float:
    x = s[name][np.isfinite(s[name])]
    return float(np.percentile(x, 95) - np.percentile(x, 5)) if len(x) else 0.0


def classify(lm: np.ndarray, fps: float, model: dict | None = None, expected: str | None = None) -> dict:
    """Clip verdict. `expected` (an exercise_check label, e.g. today's task) only changes which exercise reps are
    counted for; the classification never sees it."""
    model = model or load_model()
    th = model["thresholds"]
    classes: list[str] = model["classes"]
    x, s = clip_features(lm, fps)
    names = model["features"]
    valid_frac, core_vis = x[names.index("valid_frac")], x[names.index("core_vis")]
    n_valid = int(s["_valid"].sum())
    tilt = s["torso_tilt"][np.isfinite(s["torso_tilt"])]
    tilt_med = float(np.median(tilt)) if len(tilt) else float("nan")
    flags: list[str] = []
    person_found = bool(valid_frac >= th["min_valid_frac"] and n_valid >= th["min_valid_frames"])
    if not person_found:
        flags.append("no_person")
    if len(lm) / max(fps, 1e-6) < th["min_clip_s"]:
        flags.append("short_clip")
    if person_found and valid_frac < 0.8:
        flags.append("pose_gaps")
    if person_found and core_vis < 0.7:
        flags.append("low_visibility")
    lower = [L_KNEE, R_KNEE, L_ANKLE, R_ANKLE]
    if person_found and np.nanmean(np.nan_to_num(lm[:, lower, 3], nan=0.0).max(axis=1)) < 0.5:
        flags.append("legs_out_of_frame")

    p = predict_proba(x, model)
    order = np.argsort(-p)
    label, conf = classes[int(order[0])], float(p[order[0]])
    probs = {c: round(float(v), 4) for c, v in zip(classes, p, strict=True)}

    abstain_reasons: list[str] = []
    if not person_found:
        abstain_reasons.append("no_person")
    if "short_clip" in flags:
        abstain_reasons.append("short_clip")
    if conf < th["min_confidence"]:
        abstain_reasons.append("low_confidence")
    if np.isfinite(tilt_med):
        if label in HORIZONTAL and tilt_med < th["horizontal_min_tilt"]:
            abstain_reasons.append("posture_conflict")
        if label in UPRIGHT and tilt_med > th["upright_max_tilt"]:
            abstain_reasons.append("posture_conflict")
    if label in BODY:
        sig = {"push_up": "elbow", "squat": "knee", "lunge": "knee", "jumping_jack": "arms_up", "sit_up": "hip"}[label]
        if _sig_range(s, sig) < MIN_RANGE[sig]:
            abstain_reasons.append("low_motion")
    # sit-ups are in the label set but not (yet) in the training data: a horizontal body folding at the hip more
    # than it bends at the elbow could be one, so don't let the model confidently call it something else.
    if "sit_up" not in classes and person_found and np.isfinite(tilt_med) and tilt_med > th["horizontal_min_tilt"]:
        if _sig_range(s, "hip") > max(MIN_RANGE["hip"], _sig_range(s, "elbow")):
            abstain_reasons.append("possible_sit_up_unmodelled")
    flags += [r for r in abstain_reasons if r not in flags]

    rep_ex = expected if expected in TO_COUNTER else (label if label in TO_COUNTER else None)
    reps = rep_conf = None
    if person_found and rep_ex is not None:
        c = count(lm, fps, TO_COUNTER[rep_ex])
        reps, rep_conf = c.reps, c.confidence
        if rep_conf < 0.8:
            flags.append("irregular_reps")
    return {
        "exercise": label,
        "confidence": round(conf, 4),
        "abstain": bool(abstain_reasons),
        "abstain_reasons": abstain_reasons,
        "person_found": person_found,
        "reps": reps,
        "reps_for": rep_ex,
        "rep_confidence": rep_conf,
        "flags": flags,
        "probs": probs,
        "supported": [c for c in classes if c != "none"],
        "torso_tilt_deg": round(tilt_med, 1) if np.isfinite(tilt_med) else None,
    }
