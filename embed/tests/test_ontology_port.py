"""lib/activities/ontology.ts ports finetune/rally_ft/ontology.py; both are checked against the same fixtures."""

import json
from pathlib import Path

from rally_embed.data import FINETUNE, ontology

LIB = Path(__file__).resolve().parents[2] / "lib" / "activities"
PY = {"speedMph": "speed_mph"}


def kwargs(intensity: dict) -> dict:
    return {PY.get(k, k): v for k, v in intensity.items()}


def test_ontology_json_copy_matches():
    copy = json.loads((LIB / "ontology.json").read_text())
    assert copy == json.loads((FINETUNE / "rally_ft" / "ontology.json").read_text())


def test_shared_fixtures_match_python():
    fx = json.loads((LIB / "ontology.fixtures.json").read_text())
    for c in fx["resolve"]:
        assert ontology.resolve(c["activity"], **kwargs(c["intensity"])) == c["expected"], c
    for c in fx["met_minutes"]:
        assert ontology.met_minutes(c["activity"], c["duration_min"], **kwargs(c["intensity"])) == c["expected"], c
