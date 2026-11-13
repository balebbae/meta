"""Train, export and evaluate the exercise classifier.

    python -m repcount.dataset --workers 6          # once: cache landmarks for every clip in the index
    python -m repcount.train_clf                    # CV on train groups -> model/exercise_clf.json -> test report

Model selection uses only the index's train split, with group-held-out folds (StratifiedGroupKFold on `group`, so
clips of one UCF101 actor/scene never sit on both sides). The test split is touched once, at the end, through the
exported JSON and `classify()` (the exact path the app/port will run). Reports go to reports/ (not committed).
"""

from __future__ import annotations

import argparse
import json
import time
from collections import Counter
from pathlib import Path

import numpy as np

from repcount import classify as C
from repcount.counter import guess_exercise
from repcount.dataset import CACHE, INDEX, load_index, load_landmarks, video_path

ROOT = Path(__file__).resolve().parent.parent
GUESS_TO_LABEL = {"pushup": "push_up", "squat": "squat", "lunge": "lunge", "jumping_jack": "jumping_jack",
                  "situp": "sit_up"}
THRESHOLDS = {
    "min_valid_frac": 0.5,  # share of frames with shoulders/hips visible
    "min_valid_frames": 8,
    "min_clip_s": 1.5,
    "horizontal_min_tilt": 40.0,  # push_up / sit_up need a torso at least this far from vertical (median, deg)
    "upright_max_tilt": 60.0,  # squat / lunge / jumping_jack need a torso no further than this from vertical
}
TARGET_PRECISION = 0.95  # accuracy-when-confident the abstain threshold aims for on held-out train groups
GB_MARGIN = 0.03  # boosting must beat LR macro-F1 by this much to be worth a harder browser port


def load(index: Path, cache: Path) -> tuple[list[dict], np.ndarray, list[str]]:
    rows, X, missing = [], [], []
    for r in load_index(index):
        got = load_landmarks(r, cache)
        if got is None:
            missing.append(r["clip_id"])
            continue
        lm, fps, pose_s = got
        x, _ = C.clip_features(lm, fps)
        rows.append({**r, "_lm": lm, "_fps": fps, "_pose_s": pose_s})
        X.append(x)
    return rows, np.asarray(X), missing


def _lr(c: float):
    from sklearn.linear_model import LogisticRegression
    from sklearn.pipeline import make_pipeline
    from sklearn.preprocessing import StandardScaler

    return make_pipeline(StandardScaler(), LogisticRegression(C=c, max_iter=5000, class_weight="balanced"))


def _gb():
    from sklearn.ensemble import HistGradientBoostingClassifier

    return HistGradientBoostingClassifier(max_depth=3, learning_rate=0.08, max_iter=200, l2_regularization=1.0,
                                          class_weight="balanced", random_state=0)


def oof(make, X, y, groups, classes, folds=5) -> np.ndarray:
    from sklearn.model_selection import StratifiedGroupKFold

    P = np.zeros((len(y), len(classes)))
    for tr, va in StratifiedGroupKFold(n_splits=folds, shuffle=True, random_state=0).split(X, y, groups):
        m = make().fit(X[tr], y[tr])
        cols = [classes.index(c) for c in m.classes_]
        P[np.ix_(va, cols)] = m.predict_proba(X[va])
    return P


def macro_f1(y, pred, classes) -> float:
    from sklearn.metrics import f1_score

    return float(f1_score(y, pred, labels=classes, average="macro", zero_division=0))


def pick_threshold(P, y, classes, target=TARGET_PRECISION) -> tuple[float, dict]:
    conf, pred = P.max(1), np.asarray(classes)[P.argmax(1)]
    best = None
    for t in np.round(np.arange(0.40, 0.96, 0.01), 2):
        m = conf >= t
        if m.sum() < 10:
            break
        acc = float((pred[m] == y[m]).mean())
        if acc >= target:
            best = (float(t), {"coverage": round(float(m.mean()), 3), "acc_when_confident": round(acc, 3)})
            break
    if best is None:  # never reached the target: use a high bar and say so
        t = 0.9
        m = conf >= t
        best = (t, {"coverage": round(float(m.mean()), 3),
                    "acc_when_confident": round(float((pred[m] == y[m]).mean()) if m.any() else 0.0, 3),
                    "target_not_reached": True})
    return best


def export(model, classes, names, threshold, cv_report, n_train) -> dict:
    sc, lr = model.named_steps["standardscaler"], model.named_steps["logisticregression"]
    coef, icpt = lr.coef_, lr.intercept_
    if coef.shape[0] == 1:  # binary: softmax over [0, w.z + b] == sigmoid
        coef, icpt = np.vstack([np.zeros_like(coef), coef]), np.concatenate([[0.0], icpt])
    order = [list(lr.classes_).index(c) for c in classes]  # sklearn sorts classes; keep LABELS order
    coef, icpt = coef[order], icpt[order]
    rng = np.random.default_rng(0)
    x = sc.mean_ + rng.normal(0, 1, len(names)) * sc.scale_
    doc = {
        "name": "exercise_clf",
        "version": 1,
        "kind": "multinomial_logistic_regression",
        "labels_schema": "finetune/rally_ft/tasks/exercise_check.py EXERCISES (body subset + none)",
        "classes": classes,
        "features": names,
        "model": {
            "mean": sc.mean_.round(6).tolist(),
            "scale": sc.scale_.round(6).tolist(),
            "coef": coef.round(6).tolist(),
            "intercept": icpt.round(6).tolist(),
            "C": float(lr.C),
            "inference": "z = (x - mean) / scale; logits = coef @ z + intercept; p = softmax(logits)",
        },
        "thresholds": {**THRESHOLDS, "min_confidence": threshold},
        "rep_signal": {"push_up": "elbow", "squat": "knee", "lunge": "knee", "jumping_jack": "arms_up",
                       "sit_up": "hip"},
        "min_rep_range": {"elbow": 35.0, "knee": 35.0, "hip": 30.0, "arms_up": 0.5},
        "preprocessing": {
            "landmarks": "MediaPipe Pose Landmarker (full), 33 BlazePose points, x,y normalized image coords "
                         "(y down), visibility; sampled every round(fps/15)-th frame so rate <= 15 fps",
            "invalid_frame": "max visibility of landmarks 11,12,23,24 < 0.5 -> all landmarks NaN",
            "side_weighting": "left/right pair values averaged with weights visibility+1e-3 of the middle joint",
            "torso_len": "median over valid frames of |mid(hips) - mid(shoulders)| (features.py uses the "
                         "visibility-weighted shoulder/hip points for arms_up/feet_apart; classify.py uses plain "
                         "midpoints for hip_height/ankle_spread)",
            "smooth_s": C.SMOOTH_S,
            "freq_band_hz": list(C.FREQ_BAND),
            "nfft": C.NFFT,
        },
        "signal_defs": {
            "elbow": "angle(shoulder, elbow, wrist), side-weighted (deg)",
            "knee": "angle(hip, knee, ankle), side-weighted (deg)",
            "hip": "angle(shoulder, hip, knee), side-weighted (deg)",
            "torso_tilt": "atan2(|dx|, |dy|) of weighted hip - weighted shoulder, deg (0 vertical, 90 horizontal)",
            "arms_up": "(weighted shoulder y - mean wrist y) / torso_len",
            "feet_apart": "|ankle_l.x - ankle_r.x| / torso_len",
            "abduction": "angle(hip, shoulder, elbow), side-weighted (deg)",
            "knee_gap": "|angle_l(hip,knee,ankle) - angle_r(hip,knee,ankle)| (deg)",
            "hip_height": "-mid(hips).y / torso_len",
            "ankle_spread": "|ankle_l - ankle_r| (2-D) / torso_len",
        },
        "stat_defs": {
            "mean": "mean over finite frames", "std": "population std over finite frames",
            "range": "p95 - p5 over finite frames (linear-interpolated percentiles)",
            "freq": "argmax Hz of |rfft(hann * (s - mean(s)), n=max(nfft, T))|^2 within freq_band, where s = NaN "
                    "gaps linearly interpolated then counter.smooth (median then moving average, window "
                    "round(smooth_s*fps)|1); 0 if < 8 finite frames",
            "periodicity": "power in the 3 bins around that peak / total in-band power",
            "arms_legs_coupling": "Pearson r(arms_up, feet_apart) over frames where both are finite (0 if < 8)",
            "knee_hip_coupling": "Pearson r(knee, hip)",
            "valid_frac": "share of valid frames", "core_vis": "mean visibility of 11,12,23,24 over valid frames",
            "nan_policy": "missing stat -> 0",
        },
        "abstain_rules": [
            "person_found = valid_frac >= min_valid_frac and valid frames >= min_valid_frames, else abstain",
            "clip shorter than min_clip_s -> abstain",
            "max p < min_confidence -> abstain",
            "push_up/sit_up predicted while median torso_tilt < horizontal_min_tilt -> abstain",
            "squat/lunge/jumping_jack predicted while median torso_tilt > upright_max_tilt -> abstain",
            "body exercise predicted but its rep_signal range < min_rep_range -> abstain (low_motion)",
            "no sit_up class and horizontal body whose hip range > max(30, elbow range) -> abstain",
        ],
        "selftest": {"x": x.round(6).tolist(), "probs": model.predict_proba(x[None])[0][order].round(6).tolist()},
        "training": {"data": "UCF101 train split of finetune/data/exercise_frames/index.jsonl", "clips": n_train,
                     "cv": cv_report},
        "licence": "Fitted on UCF101 clips (non-commercial research licence). These coefficients are derived "
                   "from that data: fine for research/demo, check the licence before shipping in a product.",
    }
    # the selftest must hold for the numpy inference path the port mirrors
    assert np.allclose(C.predict_proba(np.asarray(doc["selftest"]["x"]), doc), doc["selftest"]["probs"], atol=1e-4)
    return doc


def evaluate(rows, model_doc, classes) -> dict:
    from sklearn.metrics import confusion_matrix, precision_recall_fscore_support

    y, pred, abst, conf, lat, pose_s, frames, secs = [], [], [], [], [], [], [], []
    reasons = Counter()
    for r in rows:
        t = time.perf_counter()
        out = C.classify(r["_lm"], r["_fps"], model_doc)
        lat.append((time.perf_counter() - t) * 1000)
        pose_s.append(r["_pose_s"])
        frames.append(len(r["_lm"]))
        secs.append(len(r["_lm"]) / r["_fps"])
        y.append(r["exercise"])
        pred.append(out["exercise"])
        abst.append(out["abstain"])
        conf.append(out["confidence"])
        reasons.update(out["abstain_reasons"])
    y, pred, abst = np.asarray(y), np.asarray(pred), np.asarray(abst)
    labels = sorted(set(y) | set(classes), key=lambda c: C.LABELS.index(c))
    p, rc, f, n = precision_recall_fscore_support(y, pred, labels=labels, zero_division=0)
    keep = ~abst
    pc, rcc, _, _ = precision_recall_fscore_support(y[keep], pred[keep], labels=labels, zero_division=0)
    per_class = {c: {"n": int(n[i]), "precision": round(float(p[i]), 3), "recall": round(float(rc[i]), 3),
                     "f1": round(float(f[i]), 3), "precision_confident": round(float(pc[i]), 3),
                     "coverage": round(float(keep[y == c].mean()), 3) if (y == c).any() else None,
                     "recall_confident_of_all": round(
                         float(((pred == c) & (y == c) & keep).sum() / max(1, (y == c).sum())), 3)}
                 for i, c in enumerate(labels)}
    gated = np.where(abst, "abstain", pred)
    cm = {t: {pp: int(((y == t) & (gated == pp)).sum()) for pp in [*labels, "abstain"]} for t in labels}
    guess = [GUESS_TO_LABEL[guess_exercise(r["_lm"])] for r in rows]
    return {
        "clips": len(rows),
        "accuracy_no_abstain": round(float((pred == y).mean()), 3),
        "abstain_rate": round(float(abst.mean()), 3),
        "accuracy_when_confident": round(float((pred[keep] == y[keep]).mean()), 3) if keep.any() else None,
        "confident_wrong": int(((pred != y) & keep).sum()),
        "confident_wrong_pairs": Counter(f"{a}->{b}" for a, b, k in zip(y, pred, keep, strict=True)
                                         if k and a != b).most_common(),
        "abstain_reasons": dict(reasons),
        "per_class": per_class,
        "confusion_raw": {t: dict(zip(labels, map(int, row), strict=True))
                          for t, row in zip(labels, confusion_matrix(y, pred, labels=labels), strict=True)},
        "confusion_gated": cm,
        "rules_baseline_guess_exercise_accuracy": round(float((np.asarray(guess) == y).mean()), 3),
        "latency": {
            "classify_ms_median": round(float(np.median(lat)), 1),
            "classify_ms_p95": round(float(np.percentile(lat, 95)), 1),
            "pose_s_median_parallel6": round(float(np.median(pose_s)), 2),
            "pose_s_p95_parallel6": round(float(np.percentile(pose_s, 95)), 2),
            "clip_s_median": round(float(np.median(secs)), 2),
            "frames_median": int(np.median(frames)),
        },
    }


def serial_pose_latency(rows, n: int) -> dict:
    """Re-time pose extraction one clip at a time (the parallel extraction numbers include contention)."""
    from repcount.pose import landmarks

    ts, per_frame = [], []
    for r in rows[:n]:
        t = time.perf_counter()
        lm, _ = landmarks(video_path(r))
        dt = time.perf_counter() - t
        ts.append(dt)
        per_frame.append(dt * 1000 / max(1, len(lm)))
    return {"clips": len(ts), "pose_s_median": round(float(np.median(ts)), 2),
            "pose_ms_per_frame_median": round(float(np.median(per_frame)), 1)}


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--index", type=Path, default=INDEX)
    p.add_argument("--cache", type=Path, default=CACHE)
    p.add_argument("--out", type=Path, default=C.MODEL_PATH)
    p.add_argument("--report", type=Path, default=ROOT / "reports" / "exercise_clf_eval.json")
    p.add_argument("--latency-clips", type=int, default=12, help="clips to re-time serially (0 to skip)")
    a = p.parse_args()

    rows, X, missing = load(a.index, a.cache)
    print(f"{len(rows)} clips with landmarks, {len(missing)} missing")
    split = np.asarray([r["split"] for r in rows])
    y = np.asarray([r["exercise"] for r in rows])
    groups = np.asarray([r["group"] for r in rows])
    tr = split == "train"
    classes = [c for c in C.LABELS if c in set(y[tr])]
    names = C.feature_names()
    print("train", dict(Counter(y[tr])), "test", dict(Counter(y[~tr])))

    cv: dict[str, dict] = {}
    best_c, best_f1, best_P = None, -1.0, None
    for c in (0.03, 0.1, 0.3, 1.0, 3.0):
        P = oof(lambda c=c: _lr(c), X[tr], y[tr], groups[tr], classes)
        pred = np.asarray(classes)[P.argmax(1)]
        f1 = macro_f1(y[tr], pred, classes)
        cv[f"lr_C{c}"] = {"macro_f1": round(f1, 3), "acc": round(float((pred == y[tr]).mean()), 3)}
        if f1 > best_f1:
            best_c, best_f1, best_P = c, f1, P
    Pg = oof(_gb, X[tr], y[tr], groups[tr], classes)
    pg = np.asarray(classes)[Pg.argmax(1)]
    gb_f1 = macro_f1(y[tr], pg, classes)
    cv["hist_gradient_boosting"] = {"macro_f1": round(gb_f1, 3), "acc": round(float((pg == y[tr]).mean()), 3)}
    guess = np.asarray([GUESS_TO_LABEL[guess_exercise(r["_lm"])] for r, t in zip(rows, tr, strict=True) if t])
    cv["rules_guess_exercise"] = {"macro_f1": round(macro_f1(y[tr], guess, classes), 3),
                                  "acc": round(float((guess == y[tr]).mean()), 3)}
    choice = "logistic_regression"
    if gb_f1 > best_f1 + GB_MARGIN:
        choice = "hist_gradient_boosting (not exported: JSON export is LR only; see README)"
    cv["chosen"] = f"logistic_regression C={best_c}"
    cv["boosting_clearly_better"] = bool(gb_f1 > best_f1 + GB_MARGIN)
    thr, thr_info = pick_threshold(best_P, y[tr], classes)
    cv["threshold"] = {"min_confidence": thr, "target_acc_when_confident": TARGET_PRECISION, **thr_info}
    print(json.dumps(cv, indent=1))
    if choice != "logistic_regression":
        print("NOTE: boosting beat LR by more than the margin; exporting LR anyway (port simplicity).")

    final = _lr(best_c).fit(X[tr], y[tr])
    doc = export(final, classes, names, thr, cv, int(tr.sum()))
    a.out.parent.mkdir(parents=True, exist_ok=True)
    a.out.write_text(json.dumps(doc, indent=1) + "\n")
    print("wrote", a.out)

    test_rows = [r for r, t in zip(rows, tr, strict=True) if not t]
    rep = {"cv": cv, "test": evaluate(test_rows, doc, classes), "missing_landmarks": missing}
    if a.latency_clips:
        rep["test"]["latency"]["serial"] = serial_pose_latency(test_rows, a.latency_clips)
    a.report.parent.mkdir(parents=True, exist_ok=True)
    a.report.write_text(json.dumps(rep, indent=1) + "\n")
    print(json.dumps(rep["test"], indent=1))


if __name__ == "__main__":
    main()
