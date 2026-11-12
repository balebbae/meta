import json

from rally_ft import ontology
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
        assert proof.grade(r["target"], r["target"])["all"] == 1.0


def test_glimmer_channel_parsing():
    raw = ' to=self<|message|>thinking<|eom|><|start|>assistant to=user<|message|>{"a": 1}<|eot|>'
    assert split_channels(raw)[1] == '{"a": 1}'
    assert extract_json(raw) == {"a": 1}
    assert extract_json('```json\n{"b": 2}\n```') == {"b": 2}
