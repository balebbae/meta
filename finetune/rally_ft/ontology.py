"""Activity ontology: activities with Compendium MET values, metrics, sensitivity categories and share levels."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

LEVEL_ORDER = ["none", "muse_only", "boolean", "rounded", "exact"]


@lru_cache(maxsize=1)
def load() -> dict:
    return json.loads((Path(__file__).parent / "ontology.json").read_text())


def activity_ids() -> list[str]:
    return list(load()["activities"])


def resolve(activity: str, speed_mph: float | None = None, watts: float | None = None, variant: str | None = None) -> dict:
    """Return the Compendium entry {code, met, desc} that best matches the activity and its intensity."""
    a = load()["activities"][activity]
    if variant and variant in a.get("variants", {}):
        return a["variants"][variant]
    if speed_mph is not None and "by_speed_mph" in a:
        bands = [b for b in a["by_speed_mph"] if speed_mph >= b["min"]]
        if bands:
            return bands[-1]
    if watts is not None and "by_watts" in a:
        bands = [b for b in a["by_watts"] if watts >= b["min"]]
        if bands:
            return bands[-1]
    return a["default"]


def met_minutes(activity: str, duration_min: float, **intensity) -> float:
    return round(resolve(activity, **intensity)["met"] * duration_min, 1)


def metric_category(metric: str) -> str:
    return load()["metrics"][metric]["category"]


def round_metric(metric: str, value: float) -> float:
    step = load()["metrics"][metric]["round"]
    r = round(value / step) * step
    return round(r, 2) if isinstance(step, float) else int(r)


def default_level(category: str, audience: str) -> str:
    return load()["categories"][category]["default_levels"][audience]


def allows(level: str, needed: str) -> bool:
    """True if a policy level permits an answer at the `needed` precision."""
    return LEVEL_ORDER.index(level) >= LEVEL_ORDER.index(needed)
