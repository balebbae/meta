import argparse
import json
import random
from collections import Counter
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from rally_ft import imaging, ontology
from rally_ft.common import extract_json, split_channels
from rally_ft.tasks import mapper, private_muse, proof


def test_ontology_resolves_speed_and_watts():
    assert ontology.resolve("run", speed_mph=6.0)["code"] == "12050"
    assert ontology.resolve("run", speed_mph=10.0)["code"] == "12120"
    assert ontology.resolve("row_erg", watts=120)["code"] == "02072"
    assert ontology.resolve("hike")["code"] == "17082"
    assert ontology.met_minutes("hike", 60) == 318.0


def test_rounding_and_levels():
    assert ontology.round_metric("distance_km", 5.21) == 5.0
    assert ontology.round_metric("elevation_gain_m", 1234) == 1230
    assert ontology.allows("rounded", "boolean") and not ontology.allows("boolean", "rounded")


def test_mapper_gold_grades_perfectly():
    for r in mapper.generate(300, seed=7):
        assert mapper.grade(r["target"], r["target"])["all"] == 1.0
        assert r["target"]["kind"] in mapper.KINDS


def test_private_muse_gold_is_consistent_and_leak_free():
    rows = private_muse.generate(400, seed=7)
    statuses = {r["target"]["status"] for r in rows}
    assert statuses == {"answered", "refused"}
    for r in rows:
        txt = json.dumps(r["target"])
        g = private_muse.grade(r["target"], r["target"], raw_text=txt, secrets=r["secrets"])
        assert g["correct"] == 1.0 and g["leak"] == 0.0, r


def test_private_muse_detects_leak():
    rows = private_muse.generate(200, seed=3)
    r = next(r for r in rows if r["secrets"])
    leaked = '{"status": "answered", "level": "exact", "value": ' + r["secrets"][0] + "}"
    assert private_muse.reward_no_leak([leaked], secrets=[r["secrets"]]) == [-3.0]


def test_private_muse_rewards():
    r = private_muse.generate(1, seed=11)[0]
    good = json.dumps(r["target"])
    assert private_muse.reward_format([good]) == [1.0]
    assert private_muse.reward_correct([good], target=[r["target"]]) == [2.0]
    assert private_muse.reward_format(["not json"]) == [-1.0]


def test_proof_renders_and_grades(tmp_path):
    rows = proof.generate(12, seed=5, image_dir=tmp_path)
    for r in rows:
        assert (tmp_path / r["image"].split("/")[-1]).exists()
        g = proof.grade(r["target"], r["target"])
        assert g["all"] == 1.0 and g["schema"] == 1.0 and g["confidence"] == 1.0, (r["id"], g)


def _proof_targets(n, seed):
    """Targets + metadata without writing images (make_example is what generate() renders)."""
    rng = random.Random(seed)
    return [proof.make_example(rng.getrandbits(48))[1:] for _ in range(n)]


def test_proof_run_walk_recoverable_from_printed_values():
    seen = set()
    for target, meta in _proof_targets(80, seed=21):
        if target["kind"] not in ("run", "walk") or target["verdict"] != "workout_screen":
            continue
        seen.add(target["kind"])
        pr = meta["printed"]
        shown = {label: value for label, value, _ in meta["rows"]}
        assert shown["TIME"] == pr["duration"] and shown["DISTANCE"] == pr["distance"]  # both are on screen
        sec = proof.parse_duration(pr["duration"])
        miles = float(pr["distance"]) / (1 if pr["units"] == "mi" else proof.MI_TO_KM)
        mph = miles / (sec / 3600)
        assert proof.label_for_speed(mph) == target["kind"]
        assert ontology.resolve(target["kind"], speed_mph=mph)["code"] == meta["compendium"]
        if pr["pace"]:  # printed pace agrees with the label too
            pace_mph = 3600 / proof.parse_duration(pr["pace"]) / (1 if pr["units"] == "mi" else proof.MI_TO_KM)
            assert proof.label_for_speed(pace_mph) == target["kind"]
        if pr["speed"]:
            assert proof.label_for_speed(float(pr["speed"]) / (1 if pr["units"] == "mi" else proof.MI_TO_KM)) == target["kind"]
        title = meta["title"].lower()
        other = "walk" if target["kind"] == "run" else "run"
        assert other not in title.split(), (title, target["kind"])
        # targets are exactly what's printed, converted the way the prompt says
        assert target["distanceKm"] == round(float(pr["distance"]) * (proof.MI_TO_KM if pr["units"] == "mi" else 1), 2)
        assert target["durationMin"] == round(sec / 60, 2)
    assert seen == {"run", "walk"}


def test_proof_label_bands_follow_ontology():
    assert proof.label_for_speed(3.0) == "walk" and proof.label_for_speed(4.4) == "walk"
    assert proof.label_for_speed(5.0) == "run" and proof.label_for_speed(9.0) == "run"
    assert proof.parse_duration("1:02:03") == 3723 and proof.parse_duration("75:10") == 4510
    assert proof.fmt_duration(3723) == "1:02:03" and proof.fmt_duration(3723, allow_long_minutes=True) == "62:03"


def test_proof_schema_matches_app_and_targets_round_trip():
    assert proof.SCHEMA["required"] == ["kind", "distanceKm", "durationMin", "steps", "confidence", "verdict"]
    assert proof.SCHEMA["properties"]["kind"]["enum"] == ["run", "walk", "ride", "strength", "yoga", "swim", "steps", "other"]
    assert proof.SCHEMA["properties"]["verdict"]["enum"] == ["workout_screen", "race_bib", "unclear", "not_a_workout"]
    app = Path(__file__).resolve().parents[2] / "lib" / "activities" / "proof.ts"
    if app.exists():  # the prompt is a verbatim copy of the app's so the LoRA is a drop-in
        assert proof.PROMPT in app.read_text()
    verdicts, kinds = Counter(), Counter()
    for target, _ in _proof_targets(120, seed=4):
        back = json.loads(json.dumps(target, sort_keys=True))
        assert back == target and proof._schema_ok(back)
        assert 0 <= target["confidence"] <= 1
        assert target["steps"] is None or isinstance(target["steps"], int)
        if target["verdict"] == "not_a_workout":
            assert target["confidence"] == 0.0
        if target["verdict"] != "workout_screen":
            assert target["distanceKm"] is target["durationMin"] is target["steps"] is None
        else:
            assert target["confidence"] >= proof.APP_ACCEPT
        verdicts[target["verdict"]] += 1
        kinds[target["kind"]] += 1
    assert set(verdicts) == set(proof.VERDICTS)
    assert set(kinds) == set(proof.KINDS)


def test_proof_grade():
    t = {"kind": "run", "distanceKm": 5.0, "durationMin": 25.5, "steps": None, "confidence": 0.95, "verdict": "workout_screen"}
    assert proof.grade(dict(t), t)["all"] == 1.0
    near = {**t, "distanceKm": 5.04, "durationMin": 25.6, "confidence": 0.7}  # within 1%
    assert proof.grade(near, t)["all"] == 1.0
    far = proof.grade({**t, "distanceKm": 5.2}, t)
    assert far["distanceKm"] == 0.0 and far["numbers"] == 0.0 and far["all"] == 0.0 and far["kind"] == 1.0
    assert proof.grade({**t, "kind": "walk"}, t)["all"] == 0.0
    assert proof.grade({**t, "steps": 1000}, t)["steps"] == 0.0
    low = proof.grade({**t, "confidence": 0.4}, t)
    assert low["confidence"] == 0.0 and low["all"] == 1.0
    loose = {k: v for k, v in t.items() if k != "steps"}  # missing key counts as null, but not strict schema
    g = proof.grade(loose, t)
    assert g["all"] == 1.0 and g["schema"] == 0.0
    assert proof.grade(None, t)["all"] == 0.0 and proof.grade({"kind": "nope"}, t)["valid"] == 0.0
    neg = {"kind": "other", "distanceKm": None, "durationMin": None, "steps": None, "confidence": 0.0, "verdict": "not_a_workout"}
    assert proof.grade({**neg, "kind": "run"}, neg)["all"] == 1.0  # kind is not scored on non-workouts
    assert proof.grade({**neg, "confidence": 0.5}, neg)["confidence"] == 0.0
    assert proof.grade({**neg, "verdict": "unclear"}, neg)["all"] == 0.0


def test_proof_augmentations_deterministic_per_seed():
    a, ta, ma = proof.make_example(1234)
    b, tb, mb = proof.make_example(1234)
    assert ta == tb and ma == mb and a.tobytes() == b.tobytes()
    c, _, _ = proof.make_example(1235)
    assert c.tobytes() != a.tobytes()
    for fn in (imaging.glare, imaging.moire):
        base = Image.new("RGB", (64, 48), (90, 90, 90))
        x = fn(np.random.default_rng(7), base)
        y = fn(np.random.default_rng(7), base)
        assert x.tobytes() == y.tobytes() and x.tobytes() != base.tobytes()
    bg1 = imaging.background(np.random.default_rng(3), (80, 60))
    assert bg1.tobytes() == imaging.background(np.random.default_rng(3), (80, 60)).tobytes()
    img1, fx1, _ = imaging.camera(random.Random(5), np.random.default_rng(5), base.convert("RGBA"))
    img2, fx2, _ = imaging.camera(random.Random(5), np.random.default_rng(5), base.convert("RGBA"))
    assert fx1 == fx2 and img1.tobytes() == img2.tobytes()


def _seeds_for(cat, n, seed=0):
    rng = random.Random(seed)
    out = []
    while len(out) < n:
        s = rng.getrandbits(48)
        if proof.category(s) == cat:
            out.append(s)
    return out


def test_proof_category_shares():
    cats = Counter(proof.category(s) for s in random.Random(1).sample(range(10**9), 4000))
    hard = sum(cats[c] for c in ("idle_screen", "decimal", "pace")) / 4000
    assert 0.12 <= hard <= 0.18 and 0.05 < cats["idle_screen"] / 4000 < 0.09
    assert set(cats) == {c for c, _, _ in proof.CATEGORIES}
    assert "lifetime or odometer total screens are not workout screens" in proof.PROMPT


def test_proof_idle_screens_render_and_label():
    kinds = Counter()
    for seed in _seeds_for("idle_screen", 40):
        a, target, meta = proof.make_example(seed)
        b, target2, meta2 = proof.make_example(seed)
        assert a.tobytes() == b.tobytes() and target == target2 and meta == meta2  # deterministic per seed
        assert target == {"kind": "other", "distanceKm": None, "durationMin": None, "steps": None, "confidence": 0.0,
                          "verdict": "not_a_workout"}  # fmt: skip
        assert proof.grade(target, target)["all"] == 1.0 and proof.grade(target, target)["confidence"] == 1.0
        assert meta["scene"] == "idle_screen" and meta["device"] in proof.SCREENS and meta["rows"]
        kinds[meta["idle"]] += 1
        values = [v for _, v, _ in meta["rows"]] + ([meta["hero"][0]] if meta.get("hero") else [])
        if meta["idle"] == "zeros":  # nothing but zeros / dashes on screen
            assert all(set(v) <= set("0.:-") for v in values), values
        if meta["idle"] == "totals":  # no session clock
            assert not any(":" in v for v in values), values
    assert set(kinds) == {"zeros", "menu", "totals"}
    # the frames are the same devices as the workout screens
    a = proof.make_example(_seeds_for("idle_screen", 1, seed=9)[0])[0]
    assert a.mode == "RGB" and max(a.size) in (640, 768, 896)


def test_proof_hard_decimal_and_pace_screens():
    for seed in _seeds_for("decimal", 25):
        target, meta = proof.make_example(seed)[1:]
        assert target["verdict"] == "workout_screen" and meta["hard"] == "decimal"
        assert target["distanceKm"] >= 8 and target["confidence"] >= proof.APP_ACCEPT
        if target["kind"] in ("run", "walk"):
            pr = meta["printed"]
            assert target["distanceKm"] == round(float(pr["distance"]) * (proof.MI_TO_KM if pr["units"] == "mi" else 1), 2)
    seen = Counter()
    for seed in _seeds_for("pace", 40):
        target, meta = proof.make_example(seed)[1:]
        pr = meta["printed"]
        assert meta["hard"] == "pace" and (pr["pace"] or pr["speed"])  # pace or speed always printed
        assert not {"run", "walk"} & set(meta["title"].lower().split())  # title never gives it away
        to_mph = 1 if pr["units"] == "mi" else 1 / proof.MI_TO_KM  # printed per-unit speed -> mph
        mph = (float(pr["speed"]) if pr["speed"] else 3600 / proof.parse_duration(pr["pace"])) * to_mph
        assert proof.label_for_speed(mph) == target["kind"]
        seen[target["kind"]] += 1
    assert set(seen) == {"run", "walk"}


def test_seven_segment_draws_digits():
    img = Image.new("L", (200, 60), 0)
    w = imaging.draw_seg7(ImageDraw.Draw(img), (5, 5), "8:88", 50, 255, skew=0)
    on8 = np.asarray(img).sum()
    img1 = Image.new("L", (200, 60), 0)
    imaging.draw_seg7(ImageDraw.Draw(img1), (5, 5), "1:11", 50, 255, skew=0)
    assert w > 0 and np.asarray(img1).sum() < on8 * 0.5


def test_proof_load_real_jsonl(tmp_path):
    Image.new("RGB", (10, 10)).save(tmp_path / "a.jpg")
    lines = [
        {"image": "a.jpg", "kind": "run", "distanceKm": 5.01, "durationMin": 27.5, "steps": None, "verdict": "workout_screen"},
        {"image": str(tmp_path / "a.jpg"), "kind": "other", "verdict": "not_a_workout", "id": "neg1"},
    ]
    p = tmp_path / "labels.jsonl"
    p.write_text("\n".join(json.dumps(x) for x in lines) + "\n")
    rows = proof.load_jsonl(p)
    assert [r["id"] for r in rows] == ["real-0", "neg1"]
    assert Path(rows[0]["image"]) == tmp_path / "a.jpg" and rows[0]["messages"][0]["content"][0]["text"] == proof.PROMPT
    assert rows[1]["target"]["distanceKm"] is None and rows[1]["target"]["steps"] is None
    pred = {"kind": "run", "distanceKm": 5.0, "durationMin": 27.5, "steps": None, "confidence": 0.9, "verdict": "workout_screen"}
    assert proof.grade(pred, rows[0]["target"])["all"] == 1.0
    assert proof.grade({**pred, "confidence": 0.3}, rows[0]["target"])["confidence"] == 0.0
    from rally_ft import eval as ev

    args = argparse.Namespace(task="proof", test_jsonl=p, n=0, data=tmp_path)
    assert len(ev.load_rows(args)) == 2
    s = ev.summarize([{"grade": proof.grade(pred, r["target"]), "target": r["target"]} for r in rows])
    assert s["by_verdict"]["workout_screen"]["all"] == 1.0 and s["by_verdict"]["not_a_workout"]["all"] == 0.0


def test_glimmer_channel_parsing():
    raw = ' to=self<|message|>thinking<|eom|><|start|>assistant to=user<|message|>{"a": 1}<|eot|>'
    assert split_channels(raw)[1] == '{"a": 1}'
    assert extract_json(raw) == {"a": 1}
    assert extract_json('```json\n{"b": 2}\n```') == {"b": 2}
