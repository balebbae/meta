import argparse
import json
import random
from collections import Counter
from pathlib import Path

import pytest
from PIL import Image

from rally_ft import build
from rally_ft import eval as ev
from rally_ft.common import with_answer
from rally_ft.tasks import exercise_check as xc
from rally_ft.tasks import proof

CLASSES = {"push_up": "PushUps", "squat": "BodyWeightSquats", "lunge": "Lunges", "jumping_jack": "JumpingJack", "none": "Typing"}


@pytest.fixture
def frames_dir(tmp_path):
    """A tiny synthetic stand-in for data/exercise_frames: 4 train groups + 1 test group per class, 2 clips each."""
    d = tmp_path / "exercise_frames"
    rows = []
    for ex, cls in CLASSES.items():
        for g in range(1, 6):
            for c in range(1, 3):
                cid = f"v_{cls}_g{g:02d}_c{c:02d}"
                rel = [f"frames/{cls}/{cid}_{k}.jpg" for k in (1, 2, 3)]
                for p in rel:
                    (d / p).parent.mkdir(parents=True, exist_ok=True)
                    Image.new("RGB", (32, 24), (g * 40, c * 60, 90)).save(d / p)
                split = "test" if g == 1 else "train"
                rows.append({"clip_id": f"ucf101/{cid}", "dataset": "ucf101", "source_class": cls, "exercise": ex,
                             "frames": rel, "split": split, "group": f"{cls}_g{g:02d}"})  # fmt: skip
    rows.append({**rows[-1], "clip_id": "ucf101/v_WalkingWithDog_g02_c01", "source_class": "WalkingWithDog", "group": "WWD_g02"})
    (d / "index.jsonl").write_text("\n".join(json.dumps(r) for r in rows) + "\n")
    return d


def test_schema_and_prompt():
    assert xc.SCHEMA["required"] == ["shows", "ex", "match", "km", "min", "steps", "ok", "why"]
    assert xc.SCHEMA["additionalProperties"] is False
    shows = ["exercise_frames", "workout_screen", "race_bib", "not_a_workout", "unclear"]
    assert xc.SCHEMA["properties"]["shows"]["enum"] == shows
    assert set(xc.SCHEMA["properties"]["ex"]["enum"]) == {
        "push_up", "squat", "lunge", "jumping_jack", "sit_up", "run", "walk", "ride", "other", "none"
    }  # fmt: skip
    p = xc.prompt("push-ups × 10")
    assert '"push-ups × 10"' in p and "{task}" not in p
    for k in xc.FIELDS:
        assert k in p
    assert "count reps" in p and "form" in p  # rep counting / form stay in code


def test_gold_approval_rule():
    assert xc.gold("exercise_frames", "push_up", True, why="x")["ok"] is True
    assert xc.gold("exercise_frames", "push_up", False, why="x")["ok"] is False
    assert xc.gold("workout_screen", "run", True, km=3.2, mins=20.0, why="x")["ok"] is True
    for shows in ("race_bib", "not_a_workout", "unclear"):
        g = xc.gold(shows, "run", True, km=5.0, why="x")
        assert g["ok"] is False and g["match"] is False and g["ex"] == "none" and g["km"] is None
    g = xc.gold("exercise_frames", "squat", True, km=1.0, why="x")
    assert g["km"] is None  # numbers only on screens
    with pytest.raises(AssertionError):
        xc.gold("exercise_frames", "squat", True, why=" ".join(["w"] * 16))


def test_proof_seed_predicts_verdict():
    rng = random.Random(0)
    for v in ("workout_screen", "not_a_workout", "race_bib", "unclear"):
        assert proof.make_example(xc._proof_seed(rng, v))[1]["verdict"] == v


def test_generate_rows_consistent(frames_dir, tmp_path):
    rows = xc.generate(160, seed=1, image_dir=tmp_path / "img", split="train", frames_dir=frames_dir)
    cases, n_images = Counter(), Counter()
    for r in rows:
        t = r["target"]
        assert list(t) == xc.FIELDS and xc.schema_ok(t), r["id"]
        assert t["ok"] == (t["shows"] in xc.WORKOUT_SHOWS and t["match"])
        assert len(t["why"].split()) <= xc.MAX_WHY_WORDS
        g = xc.grade(json.loads(json.dumps(t)), t)
        assert g["all"] == 1.0 and g["schema"] == 1.0 and g["consistent"] == 1.0, (r["id"], g)
        assert all(Path(p).exists() for p in r["images"])
        cases[r["case"]] += 1
        if t["shows"] == "exercise_frames":
            n_images[len(r["images"])] += 1
            assert r["meta"]["source_class"] != "WalkingWithDog"
            spec = r["meta"]["task_spec"]
            assert t["match"] == (spec["act"] == t["ex"])
        if t["shows"] == "workout_screen":
            assert len(r["images"]) == 1 and (t["km"] is not None or t["min"] is not None or t["steps"] is not None)
    assert set(cases) == {c for c, _ in xc.CASES}
    assert set(n_images) == {1, 3}
    frac = lambda names: sum(cases[c] for c in names) / len(rows)  # noqa: E731
    assert 0.28 < frac(["ex_match", "ex_wrong_task"]) < 0.52
    assert 0.18 < frac(["screen_match", "screen_short", "screen_wrong_activity"]) < 0.42


def test_screen_task_amounts_agree_with_label():
    rng = random.Random(3)
    seen = Counter()
    for _ in range(60):
        _, target, meta = proof.make_example(xc._proof_seed(rng, "workout_screen"))
        for want in ("match", "short", "wrong_activity"):
            got = xc._screen_row(rng, target, meta, want)
            if got is None:
                continue
            task, label, spec = got
            seen[want] += 1
            assert label["match"] is (want == "match") and label["ok"] is (want == "match")
            if want != "wrong_activity":
                v = xc._screen_value(target, spec["unit"])
                assert (spec["amount"] <= v) if want == "match" else (spec["amount"] >= 1.3 * v), (task, v)
            else:
                assert spec["act"] != xc._screen_activity(target, meta)
    assert set(seen) == {"match", "short", "wrong_activity"}


def test_split_leakage(frames_dir, tmp_path):
    out = build.build("exercise_check", {"train": 60, "val": 20, "test": 30}, tmp_path / "data", frames_dir)
    assert out["train"] == 60 and (tmp_path / "data" / "exercise_check" / "LICENSE.txt").exists()
    clip_ids, groups = {}, {}
    for split in ("train", "val", "test"):
        rows = [json.loads(line) for line in (tmp_path / "data" / "exercise_check" / f"{split}.jsonl").open()]
        clip_ids[split] = {r["meta"]["clip_id"] for r in rows if "clip_id" in r["meta"]}
        groups[split] = {r["meta"]["group"] for r in rows if "group" in r["meta"]}
        for r in rows:
            assert ("sft_messages" in r) == (split == "train")
    for a, b in (("train", "test"), ("train", "val"), ("val", "test")):
        assert not clip_ids[a] & clip_ids[b] and not groups[a] & groups[b], (a, b)
    test_groups = {r["group"] for r in xc.load_index(frames_dir) if r["split"] == "test"}
    assert groups["test"] and groups["test"] <= test_groups


def test_build_fails_clearly_without_index(tmp_path):
    with pytest.raises(SystemExit, match="index.jsonl not found"):
        build.build("exercise_check", {"train": 2}, tmp_path / "data", tmp_path / "missing")


def test_multi_image_message_format(frames_dir, tmp_path):
    rows = xc.generate(60, seed=2, image_dir=tmp_path / "img", split="train", frames_dir=frames_dir)
    r = next(r for r in rows if len(r["images"]) == 3)
    (user,) = r["messages"]
    assert user["role"] == "user"
    assert user["content"][0] == {"type": "text", "text": xc.prompt(r["task_text"])}
    assert user["content"][1:] == [{"type": "image", "image": p} for p in r["images"]]
    sft = with_answer(r, sort_keys=False)
    assert sft[-1]["role"] == "assistant" and list(json.loads(sft[-1]["content"])) == xc.FIELDS
    oa = ev._to_openai(r["messages"])[0]["content"]
    assert [p["type"] for p in oa] == ["text", "image_url", "image_url", "image_url"]
    assert all(p["image_url"]["url"].startswith("data:image/jpeg;base64,") for p in oa[1:])


def test_grade():
    t = xc.gold("workout_screen", "run", True, km=5.0, mins=25.5, why="Screen shows a run reaching 5 km.")
    assert xc.grade(dict(t), t)["all"] == 1.0
    near = xc.grade({**t, "km": 5.04, "min": 25.6}, t)  # within 1%
    assert near["numbers"] == 1.0 and near["all"] == 1.0 and near["ex"] is None and near["reject"] is None
    far = xc.grade({**t, "km": 5.2}, t)
    assert far["numbers"] == 0.0 and far["all"] == 0.0 and far["approved"] == 1.0
    fr = xc.grade({**t, "ok": False, "match": False}, t)
    assert fr["false_reject"] == 1.0 and fr["approved"] == 0.0 and fr["all"] == 0.0

    neg = xc.gold("exercise_frames", "squat", False, why="Squats visible, but the task is push-ups.")
    g = xc.grade({**neg, "ok": True, "match": True}, neg)
    assert g["reject"] == 0.0 and g["false_reject"] is None and g["numbers"] is None and g["ex"] == 1.0
    g = xc.grade({**neg, "ex": "lunge"}, neg)
    assert g["reject"] == 1.0 and g["ex"] == 0.0 and g["all"] == 0.0
    assert xc.grade({**neg, "ok": True}, neg)["consistent"] == 0.0

    junk = xc.gold("not_a_workout", "none", False, why="No workout visible.")
    assert xc.grade({**junk, "ex": "other"}, junk)["all"] == 1.0  # ex not scored on non-workouts
    assert xc.grade({**junk, "why": " ".join(["w"] * 20)}, junk)["why_ok"] == 0.0
    loose = {k: v for k, v in junk.items() if k != "steps"}
    g = xc.grade(loose, junk)
    assert g["schema"] == 0.0 and g["all"] == 1.0
    none = xc.grade(None, t)
    assert none["all"] == 0.0 and none["false_reject"] == 1.0 and none["reject"] is None
    assert xc.grade(None, neg)["reject"] == 0.0


def test_eval_summary_subsets_and_latency():
    t = xc.gold("workout_screen", "run", True, km=5.0, mins=25.5, why="ok")
    neg = xc.gold("exercise_frames", "squat", False, why="no")
    results = [
        {"grade": xc.grade(t, t), "target": t, "latency_s": 1.0, "case": "screen_match"},
        {"grade": xc.grade({**neg, "ok": True, "match": True}, neg), "target": neg, "latency_s": 3.0, "case": "ex_wrong_task"},
        {"grade": xc.grade(neg, neg), "target": neg, "latency_s": 2.0, "case": "ex_wrong_task"},
    ]
    s = ev.summarize(results)
    assert s["metrics"]["numbers"] == 1.0 and s["metric_n"]["numbers"] == 1
    assert s["metrics"]["reject"] == 0.5 and s["metrics"]["false_reject"] == 0.0
    assert s["latency_p50_s"] == 2.0 and s["latency_p95_s"] == 3.0
    assert s["by_case"]["ex_wrong_task"] == {"n": 2, "all": 0.5, "approved": 0.5}


def test_load_real_jsonl(tmp_path, frames_dir):
    Image.new("RGB", (10, 10)).save(tmp_path / "a.jpg")
    target = {"shows": "exercise_frames", "ex": "push_up", "match": True, "km": None, "min": None, "steps": None,
              "ok": False, "why": "Push-ups."}  # fmt: skip
    lines = [
        {"images": ["a.jpg", "a.jpg", "a.jpg"], "task_text": "push-ups × 10", "target": target, "case": "ex_match"},
        {"id": "r2", "images": [str(tmp_path / "a.jpg")], "task_text": "run 3 km", "target": {**target, "match": False}},
    ]
    p = tmp_path / "real.jsonl"
    p.write_text("\n".join(json.dumps(x) for x in lines) + "\n")
    rows = xc.load_jsonl(p)
    assert [r["id"] for r in rows] == ["real-0", "r2"]
    assert rows[0]["target"]["ok"] is True  # recomputed from shows + match
    assert rows[0]["messages"][0]["content"][0]["text"] == xc.prompt("push-ups × 10")
    assert len(rows[0]["messages"][0]["content"]) == 4 and Path(rows[0]["images"][0]) == tmp_path / "a.jpg"
    args = argparse.Namespace(task="exercise_check", test_jsonl=p, n=0, data=tmp_path)
    assert len(ev.load_rows(args)) == 2
