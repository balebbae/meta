import numpy as np
import pytest
from test_counter import FPS, pushup_clip

from repcount import classify as C


@pytest.fixture(scope="module")
def model():
    if not C.MODEL_PATH.exists():
        pytest.skip("model/exercise_clf.json not trained yet (python -m repcount.train_clf)")
    return C.load_model()


def test_feature_vector_matches_names_and_is_finite():
    x, _ = C.clip_features(pushup_clip(5), FPS)
    assert len(x) == len(C.feature_names())
    assert np.isfinite(x).all()


def test_spectrum_peak_finds_the_rep_rate():
    t = np.arange(0, 10, 1 / FPS)
    f, per = C.spectrum_peak(np.sin(2 * np.pi * 0.5 * t), FPS)
    assert abs(f - 0.5) < 0.07 and per > 0.8
    f, per = C.spectrum_peak(np.random.default_rng(0).normal(size=len(t)), FPS)
    assert per < 0.5


def test_pushup_elbow_frequency_feature():
    x, _ = C.clip_features(pushup_clip(8, period_s=2.0, noise_deg=1.0), FPS)
    assert abs(x[C.feature_names().index("elbow.freq")] - 0.5) < 0.08


def test_json_matches_code(model):
    assert model["features"] == C.feature_names()
    assert set(model["classes"]) <= set(C.LABELS) and "none" in model["classes"]
    st = model["selftest"]
    assert np.allclose(C.predict_proba(np.asarray(st["x"]), model), st["probs"], atol=1e-4)
    n = len(model["features"])
    assert np.asarray(model["model"]["coef"]).shape == (len(model["classes"]), n)


def test_no_person_abstains(model):
    lm = np.full((60, 33, 4), np.nan)
    out = C.classify(lm, FPS, model)
    assert out["abstain"] and not out["person_found"] and "no_person" in out["abstain_reasons"]
    assert out["reps"] is None


def test_still_person_is_not_a_confident_exercise(model):
    lm = pushup_clip(0)  # horizontal body that never moves
    out = C.classify(lm, FPS, model)
    assert out["exercise"] == "none" or out["abstain"]


def test_upright_body_cannot_be_a_confident_pushup(model):
    lm = pushup_clip(6)
    # stand the skeleton up: hips straight below shoulders
    from repcount.features import L_HIP, R_HIP

    lm[:, [L_HIP, R_HIP], :2] = [0.5, 0.8]
    out = C.classify(lm, FPS, model)
    assert not (out["exercise"] == "push_up" and not out["abstain"])


def test_reps_counted_for_expected_exercise(model):
    out = C.classify(pushup_clip(6), FPS, model, expected="push_up")
    assert out["reps_for"] == "push_up" and out["reps"] == 6
