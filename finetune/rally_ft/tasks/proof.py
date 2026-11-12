"""Photo Proof: synthetic workout screens (treadmill, watch, pool clock, rowing monitor) -> structured workout.

Images are rendered from known values, so labels are exact and grading is automatic.
"""

from __future__ import annotations

import datetime as dt
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

from rally_ft.common import close, example

TASK = "proof"
FIELDS = ["activity", "distance_km", "duration_min", "elevation_gain_m", "swim_m", "row_m", "avg_watts", "occurred_at"]
SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": FIELDS,
    "properties": {
        "activity": {"type": "string", "enum": ["run", "walk", "hike", "swim", "row_erg", "cycle"]},
        **{k: {"type": ["number", "null"]} for k in FIELDS[1:7]},
        "occurred_at": {"type": ["string", "null"]},
    },
}
SYSTEM = (
    "Extract the workout shown on this screen photo. Reply with JSON only using keys "
    f"{FIELDS}. Distances in km (swim and row in metres), duration in minutes (decimal), "
    "occurred_at as YYYY-MM-DDTHH:MM or null. Use null for anything not shown."
)
FONT_DIRS = ["/usr/share/fonts/truetype/dejavu", "/usr/share/fonts/truetype/liberation"]


def _fonts() -> list[str]:
    out = []
    for d in FONT_DIRS:
        p = Path(d)
        if p.exists():
            out += [str(f) for f in p.glob("*.ttf") if "Bold" in f.name or "Mono" in f.name]
    return out


def _font(rng, size):
    fs = _fonts()
    return ImageFont.truetype(rng.choice(fs), size) if fs else ImageFont.load_default()


def _mmss(minutes: float) -> str:
    s = round(minutes * 60)
    h, rem = divmod(s, 3600)
    m, s = divmod(rem, 60)
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m}:{s:02d}"


def _empty() -> dict:
    return {k: None for k in FIELDS}


def _spec(rng: random.Random) -> tuple[str, dict, list[tuple[str, str]]]:
    kind = rng.choice(["treadmill", "watch_run", "watch_hike", "pool", "rower", "bike"])
    when = dt.datetime(2026, 11, rng.randint(10, 16), rng.randint(5, 21), rng.choice([0, 5, 12, 30, 47]))
    t = _empty()
    t["occurred_at"] = when.strftime("%Y-%m-%dT%H:%M") if rng.random() < 0.7 else None
    minutes = round(rng.uniform(8, 95), 2)
    t["duration_min"] = round(round(minutes * 60) / 60, 2)
    rows = [("TIME", _mmss(t["duration_min"]))]
    if kind in ("treadmill", "watch_run"):
        t["activity"] = rng.choice(["run", "walk"])
        km = round(rng.uniform(1, 16), 2)
        t["distance_km"] = km
        rows.append(("DISTANCE", f"{km:.2f} km"))
        rows.append(("PACE", _mmss(t["duration_min"] / km) + " /km"))
    elif kind == "watch_hike":
        t["activity"] = "hike"
        t["distance_km"] = round(rng.uniform(2, 20), 2)
        t["elevation_gain_m"] = rng.randint(30, 1500)
        rows += [("DISTANCE", f"{t['distance_km']:.2f} km"), ("ELEV GAIN", f"{t['elevation_gain_m']} m")]
    elif kind == "pool":
        t["activity"] = "swim"
        t["swim_m"] = rng.choice(range(200, 3001, 50))
        rows += [("DISTANCE", f"{t['swim_m']} m"), ("LAPS", str(t["swim_m"] // 25))]
    elif kind == "rower":
        t["activity"] = "row_erg"
        t["row_m"] = rng.choice(range(500, 12001, 10))
        t["avg_watts"] = rng.randint(60, 260)
        rows += [("METERS", f"{t['row_m']} m"), ("AVG WATTS", str(t["avg_watts"])), ("SPM", str(rng.randint(18, 32)))]
    else:
        t["activity"] = "cycle"
        t["distance_km"] = round(rng.uniform(5, 60), 2)
        rows += [("DISTANCE", f"{t['distance_km']:.2f} km"), ("CADENCE", f"{rng.randint(60, 100)} rpm")]
    rows.append(("CALORIES", str(rng.randint(80, 900))))
    rng.shuffle(rows)
    if t["occurred_at"]:
        rows.append(("", when.strftime(rng.choice(["%Y-%m-%d %H:%M", "%b %d %Y  %H:%M"]))))
    return kind, t, rows


def render(rng: random.Random, kind: str, rows: list[tuple[str, str]]) -> Image.Image:
    w, h = rng.choice([(800, 500), (640, 640), (720, 540)])
    bg = tuple(rng.randint(0, 40) for _ in range(3)) if rng.random() < 0.8 else (235, 235, 230)
    fg = (240, 240, 240) if sum(bg) < 300 else (20, 20, 20)
    accent = rng.choice([(120, 200, 255), (255, 170, 60), (120, 255, 150), (255, 90, 90)])
    img = Image.new("RGB", (w, h), bg)
    d = ImageDraw.Draw(img)
    title = {
        "treadmill": "WORKOUT COMPLETE",
        "watch_run": "Outdoor Run",
        "watch_hike": "Hike Summary",
        "pool": "POOL SWIM",
        "rower": "ROW SUMMARY",
        "bike": "RIDE",
    }[kind]
    d.text((30, 20), title, font=_font(rng, 30), fill=accent)
    y, label_f, val_f = 80, _font(rng, 24), _font(rng, rng.randint(34, 46))
    step = (h - 110) // max(len(rows), 1)
    for label, value in rows:
        if label:
            d.text((30, y), label, font=label_f, fill=accent)
        d.text((w // 2 - 40, y - 8), value, font=val_f if label else label_f, fill=fg)
        y += step
    img = img.rotate(rng.uniform(-6, 6), expand=True, fillcolor=bg)
    if rng.random() < 0.5:
        img = img.filter(ImageFilter.GaussianBlur(rng.uniform(0.3, 1.2)))
    return img


def generate(n: int, seed: int = 0, image_dir: str | Path = "data/proof/images") -> list[dict]:
    rng = random.Random(seed)
    image_dir = Path(image_dir)
    image_dir.mkdir(parents=True, exist_ok=True)
    rows = []
    for i in range(n):
        kind, target, lines = _spec(rng)
        path = image_dir / f"{seed}-{i}.png"
        render(rng, kind, lines).save(path)
        user = [{"type": "image", "image": str(path)}, {"type": "text", "text": "What workout does this show?"}]
        rows.append(example(TASK, f"{TASK}-{seed}-{i}", SYSTEM, user, target, image=str(path)))
    return rows


def grade(pred: dict | None, target: dict) -> dict:
    if not pred:
        return {"valid": 0.0, "activity": 0.0, "numbers": 0.0, "time": 0.0, "all": 0.0}
    nums_ok = all(close(pred.get(k), target[k], rel=0.01, abs_tol=0.02) for k in FIELDS[1:7])
    s = {
        "valid": 1.0,
        "activity": float(pred.get("activity") == target["activity"]),
        "numbers": float(nums_ok),
        "time": float((pred.get("occurred_at") or None) == target["occurred_at"]),
    }
    s["all"] = float(all(v == 1.0 for v in s.values()))
    return s
