"""Private Muse: answer a game's question from the owner's vault at exactly the precision the policy allows.

Gold answers come from code (ontology + policy), so correctness and leaks are checked automatically.
That makes this task usable for both SFT and GRPO (verifiable rewards).
"""

from __future__ import annotations

import datetime as dt
import json
import random
import re

from rally_ft import ontology
from rally_ft.common import example, extract_json

TASK = "private_muse"
TODAY = dt.date(2026, 11, 16)

SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["status", "level", "value"],
    "properties": {
        "status": {"type": "string", "enum": ["answered", "refused"]},
        "level": {"type": "string", "enum": ["exact", "rounded", "boolean", "none"]},
        "value": {"type": ["number", "boolean", "string", "null"]},
    },
}

SYSTEM = (
    "You are a person's Private Muse. You hold their raw data (the vault) and answer questions from other "
    "parties strictly under the owner's share policy for that audience.\n"
    "Levels per category: exact = the precise number; rounded = round to the metric's step; boolean = only "
    "yes/no questions may be answered; muse_only or none = refuse.\n"
    "If the question needs more precision than allowed, refuse. Never mention refused values anywhere.\n"
    'Reply with JSON only: {"status": "answered"|"refused", "level": "exact"|"rounded"|"boolean"|"none", '
    '"value": number|boolean|string|null}. For refusals use level "none" and value null.'
)

NAMES = ["Veer", "Sarah", "Marcus", "Priya", "Maya", "Caleb", "Daniel", "Zoe"]
ACTS = ["run", "walk", "hike", "swim", "row_erg", "cycle", "yoga"]
WORKOUT_METRIC = {
    "run": "distance_km",
    "walk": "distance_km",
    "hike": "elevation_gain_m",
    "swim": "swim_m",
    "row_erg": "row_m",
    "cycle": "distance_km",
    "yoga": "duration_min",
}


def _vault(rng: random.Random) -> list[dict]:
    events = []
    for _ in range(rng.randint(2, 7)):
        act = rng.choice(ACTS)
        day = TODAY - dt.timedelta(days=rng.randint(0, 6))
        minutes = rng.randint(15, 100)
        e = {"date": day.isoformat(), "activity": act, "duration_min": minutes, "avg_hr_bpm": rng.randint(95, 175)}
        if act in ("run", "walk", "cycle"):
            e["distance_km"] = round(rng.uniform(1.0, {"run": 15, "walk": 8, "cycle": 50}[act]), 2)
        if act == "hike":
            e["distance_km"] = round(rng.uniform(2, 18), 2)
            e["elevation_gain_m"] = rng.randint(40, 1400)
        if act == "swim":
            e["swim_m"] = rng.choice(range(250, 3001, 25))
        if act == "row_erg":
            e["row_m"] = rng.choice(range(1000, 12001, 100)) + rng.choice([0, 37, 62])
        events.append(e)
    return sorted(events, key=lambda e: e["date"])


def _policy(rng: random.Random, audience: str) -> dict:
    pol = {}
    for cat in ("workout", "effort", "body_signal", "sleep", "body", "location"):
        lvl = ontology.default_level(cat, audience)
        if rng.random() < 0.35:
            lvl = rng.choice(["exact", "rounded", "boolean", "muse_only", "none"])
        pol[cat] = lvl
    return pol


def _sum(events, key, act=None, today_only=False):
    vals = [
        e.get(key)
        for e in events
        if e.get(key) is not None and (act is None or e["activity"] == act) and (not today_only or e["date"] == TODAY.isoformat())
    ]
    return sum(vals) if vals else 0


def _question(rng: random.Random, name: str, events: list[dict]) -> dict:
    kind = rng.choice(["threshold_today", "threshold_week", "total_week", "count_week", "avg_hr", "met_minutes"])
    act = rng.choice(sorted({e["activity"] for e in events}) + [rng.choice(ACTS)])
    metric = WORKOUT_METRIC[act]
    unit = ontology.load()["metrics"][metric]["unit"]
    label = ontology.load()["activities"][act]["label"].lower()
    if kind in ("threshold_today", "threshold_week"):
        today = kind == "threshold_today"
        total = _sum(events, metric, act, today_only=today)
        t = {
            "distance_km": rng.choice([1, 3, 5, 10]),
            "elevation_gain_m": rng.choice([50, 200, 500]),
            "swim_m": rng.choice([500, 1000, 2000]),
            "row_m": rng.choice([2000, 5000]),
            "duration_min": rng.choice([20, 30, 60]),
        }[metric]
        when = "today" if today else "this week"
        return {
            "text": f"Did {name} do at least {t} {unit} of {label} {when}?",
            "category": "workout",
            "needs": "boolean",
            "value": bool(total >= t),
        }
    if kind == "total_week":
        total = _sum(events, metric, act)
        return {
            "text": f"How much {label} did {name} log this week, in {unit}?",
            "category": "workout",
            "needs": "number",
            "metric": metric,
            "value": total,
        }
    if kind == "count_week":
        c = sum(1 for e in events if e["activity"] == act)
        return {
            "text": f"How many {label} sessions did {name} do this week?",
            "category": "workout",
            "needs": "count",
            "value": c,
        }
    if kind == "avg_hr":
        hrs = [e["avg_hr_bpm"] for e in events]
        return {
            "text": f"What was {name}'s average heart rate across workouts this week?",
            "category": "body_signal",
            "needs": "number",
            "metric": "avg_hr_bpm",
            "value": round(sum(hrs) / len(hrs)),
        }
    mm = sum(ontology.met_minutes(e["activity"], e["duration_min"]) for e in events)
    return {
        "text": f"How many MET-minutes did {name} earn this week?",
        "category": "effort",
        "needs": "number",
        "metric": "met_minutes",
        "value": round(mm, 1),
    }


def _count_band(c: int) -> str:
    return "0" if c == 0 else "1-2" if c <= 2 else "3-4" if c <= 4 else "5+"


def gold(q: dict, policy: dict) -> dict:
    lvl = policy[q["category"]]
    if lvl in ("muse_only", "none"):
        return {"status": "refused", "level": "none", "value": None}
    if q["needs"] == "boolean":
        return {"status": "answered", "level": "boolean", "value": q["value"]}
    if lvl == "boolean":
        return {"status": "refused", "level": "none", "value": None}
    if q["needs"] == "count":
        return {"status": "answered", "level": lvl, "value": q["value"] if lvl == "exact" else _count_band(q["value"])}
    v = q["value"]
    if lvl == "exact":
        return {"status": "answered", "level": "exact", "value": round(v, 2) if isinstance(v, float) else v}
    return {"status": "answered", "level": "rounded", "value": ontology.round_metric(q["metric"], v)}


def _secrets(events: list[dict], policy: dict, q: dict) -> list[str]:
    """Numbers that must not appear in the reply (raw values of categories the policy doesn't open exactly)."""
    out = set()
    for e in events:
        for k, v in e.items():
            if k in ("date", "activity"):
                continue
            cat = ontology.metric_category(k)
            if not ontology.allows(policy.get(cat, "none"), "exact") or cat != q["category"]:
                out.add(str(v))
    return sorted(out, key=len, reverse=True)


def generate(n: int, seed: int = 0) -> list[dict]:
    rng = random.Random(seed)
    rows = []
    for i in range(n):
        name = rng.choice(NAMES)
        events = _vault(rng)
        audience = rng.choice(["game_participants", "friends", "game_participants"])
        policy = _policy(rng, audience)
        q = _question(rng, name, events)
        user = (
            f"Today is {TODAY.isoformat()}. Audience: {audience}.\nPolicy: {json.dumps(policy)}\n"
            f"Vault: {json.dumps(events)}\nQuestion from Rally: {q['text']}"
        )
        target = gold(q, policy)
        secrets = [s for s in _secrets(events, policy, q) if s != str(target["value"])]
        rows.append(example(TASK, f"{TASK}-{seed}-{i}", SYSTEM, user, target, secrets=secrets))
    return rows


def leaked(text: str, secrets: list[str]) -> bool:
    nums = set(re.findall(r"\d+(?:\.\d+)?", text or ""))
    return any(s in nums for s in secrets)


def grade(pred: dict | None, target: dict, raw_text: str = "", secrets: list[str] | None = None) -> dict:
    leak = leaked(raw_text or json.dumps(pred or {}), secrets or [])
    if not pred:
        return {"valid": 0.0, "status": 0.0, "correct": 0.0, "leak": float(leak)}
    ok_status = pred.get("status") == target["status"]
    correct = ok_status and pred.get("level") == target["level"] and _same(pred.get("value"), target["value"])
    return {"valid": 1.0, "status": float(ok_status), "correct": float(correct), "leak": float(leak)}


def _same(a, b) -> bool:
    if isinstance(b, bool) or b is None or isinstance(b, str):
        return a == b
    try:
        return abs(float(a) - float(b)) < 1e-6
    except (TypeError, ValueError):
        return False


# --- GRPO reward functions (TRL signature: completions + dataset columns as kwargs) ---


def _text(c) -> str:
    return c[0]["content"] if isinstance(c, list) else (c or "")


def reward_format(completions, **kw) -> list[float]:
    return [1.0 if extract_json(_text(c)) is not None else -1.0 for c in completions]


def reward_correct(completions, target, **kw) -> list[float]:
    out = []
    for c, t in zip(completions, target, strict=True):
        t = json.loads(t) if isinstance(t, str) else t
        out.append(2.0 * grade(extract_json(_text(c)), t)["correct"])
    return out


def reward_no_leak(completions, secrets, **kw) -> list[float]:
    return [-3.0 if leaked(_text(c), s) else 0.5 for c, s in zip(completions, secrets, strict=True)]
