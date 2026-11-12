"""Ontology mapper: messy text (feed captions, Marketplace titles, Event blurbs, manual logs) -> ontology terms.

Targets are computed by code from the generator's hidden ground truth, so grading is exact.
"""

from __future__ import annotations

import random

from rally_ft import ontology
from rally_ft.common import close, example

TASK = "mapper"
KINDS = ["workout_log", "gear_listing", "event", "video"]
METRIC_KEYS = ["distance_km", "duration_min", "elevation_gain_m", "swim_m", "row_m", "avg_watts"]
KM_PER_MILE = 1.609344
M_PER_FT = 0.3048

SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["kind", "activity", "compendium_code", "equipment", "metrics"],
    "properties": {
        "kind": {"type": "string", "enum": KINDS},
        "activity": {"type": ["string", "null"], "enum": [*ontology.activity_ids(), None]},
        "compendium_code": {"type": ["string", "null"]},
        "equipment": {"type": "array", "items": {"type": "string", "enum": list(ontology.load()["equipment"])}},
        "metrics": {
            "type": "object",
            "additionalProperties": False,
            "required": METRIC_KEYS,
            "properties": {k: {"type": ["number", "null"]} for k in METRIC_KEYS},
        },
    },
}


def system_prompt() -> str:
    o = ontology.load()
    acts = "; ".join(f"{k} ({v['label']}; default {v['default']['code']})" for k, v in o["activities"].items())
    return (
        "You map fitness text from a social app to a fixed ontology. Reply with JSON only.\n"
        f"kind: one of {KINDS}.\nactivity ids: {acts}.\n"
        f"equipment ids: {', '.join(o['equipment'])}.\n"
        "compendium_code: the 2024 Adult Compendium code for the activity at the stated intensity; "
        "running/walking/cycling use speed bands, rowing machines use watts, otherwise the activity default. "
        "Null if there is no activity.\n"
        "metrics: convert to km, minutes, metres, watts; null when not stated. Never guess numbers."
    )


def _empty_metrics() -> dict:
    return {k: None for k in METRIC_KEYS}


def _dist_phrase(rng: random.Random, km: float) -> str:
    if rng.random() < 0.45:
        return rng.choice(["{:.1f} mi", "{:.1f} miles", "{:.2f}mi"]).format(km / KM_PER_MILE)
    return rng.choice(["{:.1f} km", "{:.1f}k", "{:.2f} kilometers"]).format(km)


def _parse_back_km(phrase: str) -> float:
    num = float("".join(c for c in phrase if c.isdigit() or c == "."))
    return num * KM_PER_MILE if "mi" in phrase else num


def _dur_phrase(rng: random.Random, minutes: int) -> str:
    if minutes >= 60 and rng.random() < 0.5:
        h, m = divmod(minutes, 60)
        return f"{h}h{m:02d}" if rng.random() < 0.5 else f"{h} hr {m} min"
    return rng.choice(["{} min", "{} mins", "{} minutes"]).format(minutes)


def _workout(rng: random.Random) -> tuple[str, dict]:
    act = rng.choice(["run", "walk", "hike", "swim", "row_erg", "cycle", "yoga", "strength", "trail_run"])
    m = _empty_metrics()
    intensity: dict = {}
    if act in ("run", "walk", "cycle", "trail_run", "hike"):
        speed = {"run": (5.0, 10.5), "walk": (2.4, 4.3), "cycle": (9, 18), "trail_run": (4.5, 8), "hike": (1.8, 3.2)}[act]
        mph = rng.uniform(*speed)
        minutes = rng.randint(15, 120)
        km = mph * KM_PER_MILE * minutes / 60
        dp = _dist_phrase(rng, km)
        km = _parse_back_km(dp)
        minutes_used = minutes
        mph = km / KM_PER_MILE / (minutes_used / 60)
        if act in ("run", "walk", "cycle"):
            intensity = {"speed_mph": mph}
        m["distance_km"] = round(km, 2)
        m["duration_min"] = minutes_used
        parts = [dp, _dur_phrase(rng, minutes_used)]
        if act in ("hike", "trail_run", "cycle") and rng.random() < 0.7:
            gain_ft = rng.randint(200, 3000)
            if rng.random() < 0.5:
                parts.append(f"{gain_ft} ft gain")
                m["elevation_gain_m"] = round(gain_ft * M_PER_FT)
            else:
                gain_m = round(gain_ft * M_PER_FT)
                parts.append(f"+{gain_m}m elevation")
                m["elevation_gain_m"] = gain_m
        word = rng.choice(ontology.load()["activities"][act]["aliases"])
        text = rng.choice(
            [
                "just did a {w}, {p}",
                "{w} today: {p}",
                "logged {p} {w} lol",
                "{p} — {w} with the crew",
                "morning {w} {p}",
            ]
        ).format(w=word, p=", ".join(parts))
    elif act == "swim":
        laps = rng.randint(10, 80)
        pool = rng.choice([25, 50])
        minutes = rng.randint(15, 75)
        m.update(swim_m=laps * pool, duration_min=minutes)
        text = rng.choice(["swam {l} laps in a {p}m pool, {d}", "{l} x {p}m laps, {d} total", "pool: {l} laps ({p} m), {d}"])
        text = text.format(l=laps, p=pool, d=_dur_phrase(rng, minutes))
    elif act == "row_erg":
        meters = rng.choice(range(1000, 12001, 500))
        minutes = rng.randint(5, 50)
        watts = rng.randint(70, 199)
        m.update(row_m=meters, duration_min=minutes, avg_watts=watts)
        intensity = {"watts": watts}
        text = rng.choice(
            ["erg {r}m in {d}, avg {w}W", "rowing machine: {r} meters, {d}, {w} watts", "{r}m row on the erg ({d}) @ {w}W"]
        )
        text = text.format(r=meters, d=_dur_phrase(rng, minutes), w=watts)
    else:
        minutes = rng.randint(15, 90)
        m["duration_min"] = minutes
        word = rng.choice(ontology.load()["activities"][act]["aliases"])
        text = rng.choice(["{d} of {w}", "{w} session, {d}", "did {w} for {d}"]).format(d=_dur_phrase(rng, minutes), w=word)
    code = ontology.resolve(act, **intensity)["code"]
    return text, {"kind": "workout_log", "activity": act, "compendium_code": code, "equipment": [], "metrics": m}


GEAR = [
    ("rowing_machine", "row_erg", ["Rowing machine barely used", "Indoor rower, folds flat", "Erg for sale, great condition"]),
    ("running_shoes", "run", ["Running shoes size 10, 50 miles on them", "Barely worn road running shoes"]),
    ("hiking_boots", "hike", ["Waterproof hiking boots, women's 8", "Hiking boots, used twice"]),
    ("trekking_poles", "hike", ["Pair of trekking poles, adjustable"]),
    ("goggles", "swim", ["Swim goggles 3-pack, new", "Anti-fog swimming goggles"]),
    ("yoga_mat", "yoga", ["Thick yoga mat with strap", "Yoga mat, lightly used"]),
    ("kettlebell", "strength", ["16kg kettlebell", "Cast iron kettlebell set"]),
    ("bike", "cycle", ["Road bike 54cm, recently tuned", "Commuter bike with rack"]),
    ("kayak_paddle", "kayak", ["Kayak paddle, carbon shaft"]),
    ("resistance_bands", "strength", ["Resistance bands set of 5"]),
]


def _gear(rng: random.Random) -> tuple[str, dict]:
    eq, act, titles = rng.choice(GEAR)
    price = rng.choice([15, 20, 25, 40, 60, 80, 120, 250])
    text = f"Marketplace listing: {rng.choice(titles)} - ${price} - {rng.choice(['pickup only', 'can deliver', 'OBO'])}"
    return text, {
        "kind": "gear_listing",
        "activity": act,
        "compendium_code": None,
        "equipment": [eq],
        "metrics": _empty_metrics(),
    }


def _event(rng: random.Random) -> tuple[str, dict]:
    act, name = rng.choice(
        [
            ("run", "5K fun run"),
            ("run", "10K"),
            ("hike", "group hike"),
            ("swim", "open water swim"),
            ("cycle", "group ride"),
            ("yoga", "yoga in the park"),
            ("row_water", "regatta"),
        ]
    )
    m = _empty_metrics()
    if name in ("5K fun run", "10K"):
        m["distance_km"] = 5.0 if name.startswith("5") else 10.0
    text = (
        f"Event: Saturday {name} at {rng.choice(['the lake', 'Riverside Park', 'downtown', 'the trailhead'])}, all levels welcome"
    )
    return text, {"kind": "event", "activity": act, "compendium_code": None, "equipment": [], "metrics": m}


def _video(rng: random.Random) -> tuple[str, dict]:
    act, desc, eq = rng.choice(
        [
            ("bodyweight", "A woman demonstrates squats, lunges and push-ups on a white background", []),
            ("yoga", "Slow flow on a mat in a sunny studio: downward dog into warrior two", ["yoga_mat"]),
            ("row_erg", "Close-up of hands on a rowing machine handle during a steady piece", ["rowing_machine"]),
            ("swim", "Underwater shot of a swimmer doing freestyle laps in a pool", ["goggles"]),
            ("hike", "Two hikers with trekking poles climbing a rocky ridge", ["trekking_poles"]),
            ("strength", "Kettlebell swings in a garage gym", ["kettlebell"]),
        ]
    )
    text = f"Video summary: {desc}."
    return text, {"kind": "video", "activity": act, "compendium_code": None, "equipment": eq, "metrics": _empty_metrics()}


def generate(n: int, seed: int = 0) -> list[dict]:
    rng = random.Random(seed)
    makers = [_workout] * 5 + [_gear] * 2 + [_event, _video]
    rows = []
    for i in range(n):
        text, target = rng.choice(makers)(rng)
        rows.append(example(TASK, f"{TASK}-{seed}-{i}", system_prompt(), text, target))
    return rows


def grade(pred: dict | None, target: dict) -> dict:
    if not pred:
        return {"valid": 0.0, "kind": 0.0, "activity": 0.0, "code": 0.0, "equipment": 0.0, "metrics": 0.0, "all": 0.0}
    pm = pred.get("metrics") or {}
    metric_ok = all(close(pm.get(k), target["metrics"][k]) for k in METRIC_KEYS)
    s = {
        "valid": 1.0,
        "kind": float(pred.get("kind") == target["kind"]),
        "activity": float(pred.get("activity") == target["activity"]),
        "code": float(pred.get("compendium_code") == target["compendium_code"]),
        "equipment": float(sorted(pred.get("equipment") or []) == sorted(target["equipment"])),
        "metrics": float(metric_ok),
    }
    s["all"] = float(all(v == 1.0 for v in s.values()))
    return s
