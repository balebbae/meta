"""Photo Proof: photos of workout screens (treadmill, watch, phone, bike computer, rower) -> the app's ProofResult.

Target schema, prompt and message layout match `lib/activities/proof.ts` exactly, so a LoRA trained here is a
drop-in replacement for the Ember call in `analyzeProof` (one user turn: prompt text, then the image).

Labels are exact because every image is rendered from known values, and every label is derivable from what is
printed: run vs walk comes from the printed distance/time (and pace or speed) through the ontology's speed bands,
and any title that names the activity agrees with it. Hard negatives: `not_a_workout` (scenes, text screens,
appliance clocks, receipts; confidence 0) and `race_bib` (bib number, no workout numbers). A few screens are
photographed so badly that nothing is legible (`unclear`).

App-policy hard cases (see CATEGORIES, ~15% of rows): `idle_screen` (the same consoles/watches/apps showing a ready
or menu screen, only zeros/dashes, or odometer/lifetime totals -> not_a_workout, confidence 0, no numbers),
`decimal` (two/three-digit distances on LCD digits, so 21.24 is never read as 212.4) and `pace` (run vs walk
decided only by the printed pace/speed near the boundary, neutral titles).

Real photos: `load_jsonl()` reads {image, kind, distanceKm, durationMin, steps, verdict} rows for eval only.
"""

from __future__ import annotations

import json
import random
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from rally_ft import imaging as im
from rally_ft import ontology
from rally_ft.common import close

TASK = "proof"
KINDS = ["run", "walk", "ride", "strength", "yoga", "swim", "steps", "other"]
VERDICTS = ["workout_screen", "race_bib", "unclear", "not_a_workout"]
FIELDS = ["kind", "distanceKm", "durationMin", "steps", "confidence", "verdict"]
NUM_FIELDS = ["distanceKm", "durationMin", "steps"]
# Identical to the schema in lib/activities/proof.ts.
SCHEMA = {
    "type": "object",
    "properties": {
        "kind": {"type": "string", "enum": KINDS},
        "distanceKm": {"type": ["number", "null"]},
        "durationMin": {"type": ["number", "null"]},
        "steps": {"type": ["integer", "null"]},
        "confidence": {"type": "number"},
        "verdict": {"type": "string", "enum": VERDICTS},
    },
    "required": FIELDS,
    "additionalProperties": False,
}
# Identical to PROMPT in lib/activities/proof.ts (keep in sync).
PROMPT = """You read a photo of a fitness device or screen (treadmill, watch, bike computer, phone app, race bib) and extract the workout it shows.
Rules: only report numbers that are visibly printed. Convert miles to km (x1.609). Convert mm:ss to minutes as a decimal. If the image is not a workout screen, set verdict to not_a_workout and confidence 0. Idle, menu, all-zero/dash and lifetime or odometer total screens are not workout screens.
Never describe or comment on any person, body, weight or health condition in the image; only the device readout.
Return JSON matching the schema. confidence is 0..1."""  # noqa: E501 - verbatim copy of the app prompt
MI_TO_KM = 1.609  # the factor the prompt tells the model to use
APP_ACCEPT = 0.6  # app/api/proof/route.ts accepts a photo at confidence >= 0.6

# ---------------------------------------------------------------- run vs walk from the ontology speed bands
# Walk bands top out at "4.0 to 4.4 mph"; the slowest run band is "5.0 to 5.2 mph". Speeds are sampled inside
# those bands (never in the gap), so the printed numbers decide the label unambiguously.
WALK_MPH = (2.0, 4.4)
RUN_MPH = (5.0, 11.5)
SPLIT_MPH = (WALK_MPH[1] + RUN_MPH[0]) / 2


def label_for_speed(speed_mph: float) -> str:
    """run or walk for a printed average speed. Also checks the speed lands in a real Compendium band."""
    label = "walk" if speed_mph < SPLIT_MPH else "run"
    bands = ontology.load()["activities"][label]["by_speed_mph"]
    assert ontology.resolve(label, speed_mph=speed_mph) in bands
    return label


def parse_duration(s: str) -> int:
    """'m:ss', 'mm:ss' or 'h:mm:ss' -> seconds."""
    parts = [int(p) for p in s.strip().split(":")]
    sec = 0
    for p in parts:
        sec = sec * 60 + p
    return sec


def fmt_duration(sec: int, allow_long_minutes: bool = False) -> str:
    h, rem = divmod(sec, 3600)
    m, s = divmod(rem, 60)
    if h and not allow_long_minutes:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{h * 60 + m}:{s:02d}"


def _num(s: str) -> float:
    return float(s.replace(",", ""))


def _empty(kind: str, verdict: str, confidence: float) -> dict:
    return {"kind": kind, "distanceKm": None, "durationMin": None, "steps": None, "confidence": confidence, "verdict": verdict}


def _dur(rng: random.Random, lo_min: float, hi_min: float) -> int:
    return rng.randint(int(lo_min * 60), int(hi_min * 60))


def _dist(rng: random.Random, lo_km: float, hi_km: float, units: str) -> tuple[str, float]:
    """Printed distance string (2 dp, in `units`) and the km target the model should report."""
    v = rng.uniform(lo_km, hi_km) / (MI_TO_KM if units == "mi" else 1)
    s = f"{v:.2f}"
    return s, round(float(s) * (MI_TO_KM if units == "mi" else 1), 2)


# ---------------------------------------------------------------- workout screen specs


def _spec_run_walk(
    rng: random.Random, device: str, km_range: tuple | None = None, mph_range: tuple | None = None, neutral: bool = False
) -> dict:
    """A run or walk screen. Overrides for the hard cases: `km_range` (same for both labels), `mph_range`
    ((walk lo, hi), (run lo, hi)), and `neutral` (pace or speed always shown, title never names the activity)."""
    label = rng.choice(["run", "walk"])
    units = rng.choice(["km", "mi"])
    mph = rng.uniform(*(mph_range or (WALK_MPH, RUN_MPH))[label == "run"])
    dist_s, km = _dist(rng, *(km_range or ((1.5, 21) if label == "run" else (0.8, 8))), units)
    miles = float(dist_s) * (1 if units == "mi" else 1 / MI_TO_KM)
    sec = max(60, round(miles / mph * 3600))
    shown_mph = miles / (sec / 3600)
    assert label_for_speed(shown_mph) == label
    dur_s = fmt_duration(sec, allow_long_minutes=device == "treadmill" and rng.random() < 0.4)
    pace_sec = round(sec / float(dist_s))
    pace_s = f"{pace_sec // 60}:{pace_sec % 60:02d}"
    speed_s = f"{float(dist_s) / (sec / 3600):.1f}"
    per = "/km" if units == "km" else "/mi"
    rows = [("TIME", dur_s, ""), ("DISTANCE", dist_s, units)]
    show = rng.choice(["pace", "speed", "both"] if neutral else ["pace", "speed", "both", "none"])
    if show in ("pace", "both"):
        rows.append(("AVG PACE", pace_s, per))
    if show in ("speed", "both"):
        rows.append(("AVG SPEED", speed_s, "km/h" if units == "km" else "mph"))
    rows.append(("CALORIES", str(rng.randint(40, 1100)), "kcal"))
    word = label.capitalize()
    if device == "treadmill":
        titles = ["WORKOUT SUMMARY", "WORKOUT COMPLETE", "", f"{word.upper()} COMPLETE", f"{word.upper()} SUMMARY"]
        title = rng.choice(titles[:3] if neutral else titles)
        rows.append(("INCLINE", f"{rng.choice([0, 0.5, 1, 1.5, 2, 3, 4.5])}", "%"))
    elif neutral:
        title = rng.choice(["Workout", "Outdoor Activity", "Treadmill", "Morning Workout", "Activity"])
        rows.append(("AVG HR", str(rng.randint(85, 175)), "bpm"))
    else:
        title = f"{rng.choice(['Outdoor', 'Indoor', 'Morning', 'Evening'])} {word}"
        rows.append(("AVG HR", str(rng.randint(85, 175)), "bpm"))
    printed = {"distance": dist_s, "units": units, "duration": dur_s, "pace": pace_s if show in ("pace", "both") else None}
    printed["speed"] = speed_s if show in ("speed", "both") else None
    return {
        "screen": device if device == "treadmill" else "watch_run",
        "title": title,
        "rows": rows,
        "target": {"kind": label, "distanceKm": km, "durationMin": round(sec / 60, 2), "steps": None},
        "meta": {
            "printed": printed,
            "speed_mph": round(shown_mph, 3),
            "compendium": ontology.resolve(label, speed_mph=shown_mph)["code"],
        },
    }


def _spec_ride(rng, km_range: tuple = (5, 90)):
    units = rng.choice(["km", "mi"])
    kmh = rng.uniform(12, 34)
    dist_s, km = _dist(rng, *km_range, units)
    sec = max(300, round(km / kmh * 3600))
    spd = f"{float(dist_s) / (sec / 3600):.1f}"
    rows = [("DIST", dist_s, units), ("RIDE TIME", fmt_duration(sec), ""), ("AVG SPD", spd, "km/h" if units == "km" else "mph")]
    rows.append(("CADENCE", str(rng.randint(60, 100)), "rpm"))
    return {
        "screen": "bike",
        "title": rng.choice(["RIDE", "Ride Summary", "", "Outdoor Cycle"]),
        "rows": rows,
        "target": {"kind": "ride", "distanceKm": km, "durationMin": round(sec / 60, 2), "steps": None},
    }


def _spec_swim(rng):
    m = rng.choice(range(200, 3001, 50))
    sec = round(m / rng.uniform(0.6, 1.4))
    ms = f"{m:,}" if rng.random() < 0.5 else str(m)
    rows = [
        ("Distance", ms, "m"),
        ("Time", fmt_duration(sec), ""),
        ("Laps", str(m // 25), ""),
        ("Avg HR", str(rng.randint(90, 160)), "bpm"),
    ]
    return {
        "screen": "watch",
        "title": rng.choice(["Pool Swim", "Swim", "Open Water"]),
        "rows": rows,
        "target": {"kind": "swim", "distanceKm": round(m / 1000, 3), "durationMin": round(sec / 60, 2), "steps": None},
    }


def _spec_rower(rng):
    m = rng.choice(range(500, 12001, 10))
    split = rng.uniform(100, 160)
    sec = round(m / 500 * split)
    rows = [
        ("METERS", str(m), "m"),
        ("TIME", fmt_duration(sec), ""),
        ("/500M", f"{int(split // 60)}:{int(split % 60):02d}.{rng.randint(0, 9)}", ""),
    ]
    rows.append(("WATTS", str(rng.randint(60, 300)), ""))
    return {
        "screen": "rower",
        "title": rng.choice(["", "JUST ROW", "ROW SUMMARY"]),
        "rows": rows,
        "target": {"kind": "other", "distanceKm": round(m / 1000, 3), "durationMin": round(sec / 60, 2), "steps": None},
    }


def _spec_elliptical(rng):
    units = rng.choice(["km", "mi"])
    dist_s, km = _dist(rng, 1, 12, units)
    sec = _dur(rng, 10, 70)
    rows = [
        ("TIME", fmt_duration(sec), ""),
        ("DISTANCE", dist_s, units),
        ("STRIDES", str(rng.randint(800, 9000)), ""),
        ("CALORIES", str(rng.randint(80, 700)), ""),
    ]
    return {
        "screen": "elliptical",
        "title": rng.choice(["", "ELLIPTICAL", "CROSS TRAINER"]),
        "rows": rows,
        "target": {"kind": "other", "distanceKm": km, "durationMin": round(sec / 60, 2), "steps": None},
    }


def _spec_strength_yoga(rng, kind):
    sec = _dur(rng, 8, 95)
    title = rng.choice(
        ["Traditional Strength Training", "Functional Strength", "Weights", "Strength"]
        if kind == "strength"
        else ["Yoga", "Yoga Flow", "Vinyasa Yoga"]
    )
    rows = [
        ("Total Time", fmt_duration(sec), ""),
        ("Active Cal", str(rng.randint(40, 600)), "kcal"),
        ("Avg HR", str(rng.randint(70, 150)), "bpm"),
    ]
    return {
        "screen": rng.choice(["watch", "phone"]),
        "title": title,
        "rows": rows,
        "target": {"kind": kind, "distanceKm": None, "durationMin": round(sec / 60, 2), "steps": None},
    }


def _spec_steps(rng):
    steps = rng.randint(800, 32000)
    rows = []
    km = None
    if rng.random() < 0.6:
        units = rng.choice(["km", "mi"])
        dist_s, km = _dist(rng, steps * 0.00065, steps * 0.00078, units)
        rows.append(("Distance", dist_s, units))
    rows += [("Floors", str(rng.randint(0, 30)), ""), ("Active Cal", str(rng.randint(50, 900)), "kcal")]
    return {
        "screen": rng.choice(["phone", "watch"]),
        "title": rng.choice(["Steps", "Today", "Activity", "Daily Steps"]),
        "hero": (f"{steps:,}" if rng.random() < 0.7 else str(steps), "steps"),
        "rows": rows,
        "target": {"kind": "steps", "distanceKm": km, "durationMin": None, "steps": steps},
    }


WORKOUT_SPECS = [
    (0.20, lambda r: _spec_run_walk(r, "treadmill")),
    (0.22, lambda r: _spec_run_walk(r, "watch")),
    (0.11, _spec_ride),
    (0.08, _spec_swim),
    (0.06, _spec_rower),
    (0.05, _spec_elliptical),
    (0.08, lambda r: _spec_strength_yoga(r, "strength")),
    (0.06, lambda r: _spec_strength_yoga(r, "yoga")),
    (0.14, _spec_steps),
]

# screen -> (device bezel, size, styles, seven-segment probability)
SCREENS = {
    "treadmill": ("console", [(640, 400), (720, 420), (560, 360)], ["lcd_blue", "lcd_red", "lcd_green", "app_dark"], 0.8),
    "elliptical": ("console", [(600, 380)], ["lcd_blue", "lcd_red", "lcd_grey"], 0.8),
    "rower": ("console", [(420, 380)], ["lcd_grey"], 0.9),
    "bike": ("console", [(300, 420), (340, 400)], ["lcd_grey", "oled"], 0.6),
    "watch": ("watch", [(320, 320), (300, 340)], ["oled"], 0.0),
    "watch_run": ("watch", [(320, 320), (300, 340)], ["oled"], 0.0),
    "phone": ("phone", [(360, 720), (390, 760)], ["app_light", "app_dark"], 0.0),
}


def _render_spec(rng: random.Random, spec: dict) -> tuple[Image.Image, str, list]:
    screen = spec["screen"]
    if screen == "watch_run" and rng.random() < 0.35:
        screen = "phone"
    device, sizes, styles, p7 = SCREENS[screen]
    rows = spec["rows"]
    if screen in ("watch", "watch_run") and len(rows) > 3:
        rows = rows[:3] if spec.get("hero") else rows[:4]
    if not spec.get("hero"):
        rows = (
            [rows[0], *rng.sample(rows[1:], len(rows) - 1)]
            if screen in ("watch", "watch_run", "phone")
            else rng.sample(rows, len(rows))
        )
    pad = 0.07
    if device == "watch" and rng.random() < 0.5:
        device, pad = "watch_round", 0.17
    size, style, seg7 = rng.choice(sizes), rng.choice(styles), rng.random() < p7
    seg7 = spec.get("seg7", seg7) and p7 > 0  # hard decimal cases force LCD digits on consoles
    img = im.render_screen(rng, size, style, spec["title"], rows, spec.get("hero"), seg7=seg7, pad_frac=pad)
    return img, device, rows


def _photograph_device(rng: random.Random, np_rng: np.random.Generator, spec: dict) -> tuple[Image.Image, list]:
    """Render a spec's screen, add screen moire and the device bezel (before the camera)."""
    screen, device_kind, shown = _render_spec(rng, spec)
    if rng.random() < 0.3:
        screen = im.moire(np_rng, screen, amp=rng.uniform(0.05, 0.18))
    return im.add_bezel(rng, screen, device_kind), shown


# ---------------------------------------------------------------- hard positives (read decimals, run vs walk)


def _spec_decimal(rng):
    """Two- and three-digit distances on LCD digits (21.24 km, never 212.4): the decimal point is the only cue."""
    if rng.random() < 0.7:
        km_range = rng.choice([(10, 21.1), (21.1, 42.2)]) if rng.random() < 0.6 else (8, 15)
        spec = _spec_run_walk(rng, rng.choice(["treadmill", "watch"]), km_range=km_range)
        if spec["target"]["kind"] == "walk" and spec["target"]["distanceKm"] > 16:  # keep walks plausible
            spec = _spec_run_walk(rng, "treadmill", km_range=(8, 16))
    else:
        spec = _spec_ride(rng, km_range=(40, 180))
    return {**spec, "seg7": True, "meta": {**spec.get("meta", {}), "hard": "decimal"}}


def _spec_pace(rng):
    """Run vs walk decided only by the printed pace or speed: same distances, neutral titles, speeds near the
    walk/run boundary (walk 5.8-7.1 km/h, run 8.0-9.7 km/h)."""
    spec = _spec_run_walk(
        rng, rng.choice(["treadmill", "watch"]), km_range=(2, 10), mph_range=((3.6, 4.4), (5.0, 6.0)), neutral=True
    )
    return {**spec, "meta": {**spec["meta"], "hard": "pace"}}


# ---------------------------------------------------------------- idle / menu / lifetime-total screens (not proof)
# Same devices, bezels and camera as the workout screens; only the content differs. All are not_a_workout.

IDLE_TITLES = ["READY", "PRESS START", "QUICK START", "", "WELCOME"]
NO_DATA_LABELS = ("PACE", "HR", "SPD", "SPEED", "/500M", "CADENCE", "WATTS")


def _zero(rng: random.Random, label: str, value: str) -> str:
    """What the field shows before a session starts: 0.00, 00:00 / 0:00, 0, or dashes."""
    if any(k in label.upper() for k in NO_DATA_LABELS) and rng.random() < 0.6:
        return "--:--" if ":" in value else "--"
    if ":" in value:
        parts = value.split(":")
        return ":".join(["0" * rng.choice([1, 2])] + ["00"] * (len(parts) - 1))
    if "." in value:
        return "0." + "0" * len(value.split(".")[1])
    return "0"


def _idle_zeros(rng):
    """A workout layout before START: every number zero or dashes."""
    _, fn = rng.choice(WORKOUT_SPECS)
    spec = fn(rng)
    rows = [(lab, _zero(rng, lab, val), unit) for lab, val, unit in spec["rows"]]
    title = spec["title"]
    if any(w in title.upper() for w in ("COMPLETE", "SUMMARY")) or rng.random() < 0.4:
        title = rng.choice(IDLE_TITLES)
    hero = ("0", spec["hero"][1]) if spec.get("hero") else None
    return {"screen": spec["screen"], "title": title, "rows": rows, "hero": hero}


def _idle_menu(rng):
    """A program / workout picker or a 'press start' prompt."""
    screen = rng.choice(["treadmill", "treadmill", "elliptical", "rower", "bike", "watch", "phone"])
    units = rng.choice(["km", "mi"])
    if screen in ("treadmill", "elliptical"):
        if rng.random() < 0.5:
            progs = ["MANUAL", "HILL", "INTERVALS", "FAT BURN", "CARDIO", "CUSTOM", "5K", "HEART RATE"]
            rows = [(f"P{i + 1}", p, "") for i, p in enumerate(rng.sample(progs, rng.randint(2, 4)))]
            title = rng.choice(["SELECT PROGRAM", "PROGRAMS", "CHOOSE WORKOUT"])
        else:
            title = rng.choice(["WELCOME", "QUICK START", ""])
            rows = [("", rng.choice([t for t in ["PRESS START", "QUICK START", "PRESS START TO BEGIN"] if t != title]), "")]
            rows += rng.sample([("TIME", "00:00", ""), ("DISTANCE", "0.00", units), ("SPEED", "0.0", "")], rng.randint(0, 2))
    elif screen == "rower":
        title = rng.choice(["MAIN MENU", "SELECT WORKOUT", ""])
        rows = [("", t, "") for t in rng.sample(["Just Row", "Select Workout", "Workout Library", "More Options"], 3)]
    elif screen == "bike":
        title = rng.choice(["", "READY", "PRESS START"])
        rows = [("", rng.choice(["PRESS START", "START RIDE?", "READY"]), ""), ("SPD", "0.0", "km/h" if units == "km" else "mph")]
    else:
        title = rng.choice(["Workouts", "Start Workout", "Choose Activity"])
        acts = ["Outdoor Run", "Outdoor Walk", "Indoor Run", "Pool Swim", "Outdoor Cycle", "Strength", "Yoga"]
        rows = [("", a, "") for a in rng.sample(acts, 3)]
        if rng.random() < 0.5:
            rows.append(("", rng.choice(["Tap to start", "Quick Start", "Press START"]), ""))
    return {"screen": screen, "title": title, "rows": rows}


def _idle_totals(rng):
    """Odometer / lifetime totals: big cumulative numbers, no session time."""
    screen = rng.choice(["treadmill", "elliptical", "bike", "bike", "rower", "watch", "phone"])
    units = rng.choice(["km", "mi"])
    big = rng.uniform(250, 40000)
    dist = f"{big:,.1f}" if rng.random() < 0.5 else f"{big:.1f}"
    if screen in ("treadmill", "elliptical"):
        title = rng.choice(["ODOMETER", "MAINTENANCE", "TOTALS", ""])
        rows = [(rng.choice(["ODO", "TOTAL DIST", "ODOMETER"]), dist, units), ("TOTAL HRS", str(rng.randint(40, 4000)), "")]
    elif screen == "bike":
        title = rng.choice(["", "TOTAL", "ODO"])
        rows = [("ODO", f"{big:.0f}" if rng.random() < 0.5 else f"{big:.1f}", units)]
        trip = ("TRIP TOTAL", f"{rng.uniform(0.3, 0.9) * big:.1f}", units)  # resettable trip, still cumulative
        rows.append(rng.choice([("TOTAL", str(rng.randint(40, 2500)), "h"), trip]))
    elif screen == "rower":
        title = rng.choice(["LIFETIME", "TOTALS", ""])
        rows = [("LIFETIME METERS", f"{rng.randint(50_000, 9_000_000):,}", "m")]
    else:
        title = rng.choice(["Lifetime", "All Time", "Totals"])
        rows = [("All-time Distance", dist, units), ("Lifetime Workouts", str(rng.randint(20, 1500)), "")]
        if rng.random() < 0.5:
            rows.append(("Lifetime Hours", str(rng.randint(15, 2500)), "h"))
    return {"screen": screen, "title": title, "rows": rows}


IDLE_SCREENS = [("zeros", _idle_zeros), ("menu", _idle_menu), ("totals", _idle_totals)]


# ---------------------------------------------------------------- hard negatives

WORDS = ("lunch at noon call mom pick up milk see you soon meeting moved to friday great game last night "
         "remember the tickets eggs bread coffee bananas parking level wifi password invoice total thanks").split()  # fmt: skip


def _scene_landscape(rng, np_rng):
    w, h = rng.choice([(800, 560), (640, 640)])
    yy = np.linspace(0, 1, h)[:, None, None]
    sky = np.array([rng.randint(60, 140), rng.randint(120, 200), rng.randint(180, 255)], dtype=np.float32)
    arr = np.broadcast_to(sky * (1 - 0.4 * yy), (h, w, 3)).copy()
    img = Image.fromarray(arr.astype(np.uint8))
    d = ImageDraw.Draw(img)
    for layer in range(rng.randint(2, 4)):
        base = h * (0.45 + 0.12 * layer)
        pts = [(0, h)] + [(x, base - rng.uniform(0, h * 0.2)) for x in range(0, w + 80, 80)] + [(w, h)]
        g = rng.randint(40, 120)
        d.polygon(pts, fill=(g // 2, g, g // 3 + layer * 10))
    if rng.random() < 0.6:
        cx, cy, r = rng.uniform(0, w), rng.uniform(0, h * 0.35), rng.uniform(20, 60)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 240, 180))
    return img.convert("RGBA"), "landscape"


def _scene_text(rng, np_rng):
    rows = []
    for _ in range(rng.randint(3, 6)):
        rows.append(
            (rng.choice(["Alex", "Sam", "Me", "Note", "", "Reminder"]), " ".join(rng.choices(WORDS, k=rng.randint(2, 4))), "")
        )
    if rng.random() < 0.5:
        rows.append(("", f"{rng.randint(1, 12)}:{rng.randint(0, 59):02d} {rng.choice(['AM', 'PM'])}", ""))
    img = im.render_screen(
        rng, (360, 720), rng.choice(["app_light", "app_dark"]), rng.choice(["Messages", "Notes", "Shopping", "Inbox"]), rows
    )
    return im.add_bezel(rng, img, "phone"), "text_screen"


def _scene_appliance(rng, np_rng):
    title, val = rng.choice(
        [
            ("", f"{rng.randint(1, 12)}:{rng.randint(0, 59):02d}"),
            ("TIMER", f"{rng.randint(0, 9)}:{rng.randint(0, 59):02d}"),
            ("BAKE", str(rng.choice([325, 350, 375, 400, 425]))),
            ("ROOM", str(rng.randint(62, 78))),
            ("SET TEMP", str(rng.randint(16, 26))),
        ]
    )
    img = im.render_screen(
        rng, (520, 300), rng.choice(["lcd_blue", "lcd_green", "lcd_red", "lcd_grey"]), title, [("", val, "")], seg7=True
    )
    return im.add_bezel(rng, img, "console"), "appliance"


def _scene_receipt(rng, np_rng):
    w, h = 380, 640
    img = Image.new("RGB", (w, h), (248, 246, 238))
    d = ImageDraw.Draw(img)
    f = im.font(rng, 20, bold=False)
    y = 20
    d.text((20, y), rng.choice(["CORNER MARKET", "CAFE 21", "HARDWARE CO"]), font=im.font(rng, 26), fill=(20, 20, 20))
    y += 50
    total = 0.0
    for _ in range(rng.randint(4, 10)):
        p = round(rng.uniform(0.5, 25), 2)
        total += p
        d.text((20, y), rng.choice(WORDS).upper(), font=f, fill=(30, 30, 30))
        d.text((w - 100, y), f"{p:.2f}", font=f, fill=(30, 30, 30))
        y += 32
    d.text((20, y + 10), "TOTAL", font=f, fill=(0, 0, 0))
    d.text((w - 100, y + 10), f"{total:.2f}", font=f, fill=(0, 0, 0))
    return img.convert("RGBA"), "receipt"


NEGATIVES = [_scene_landscape, _scene_text, _scene_appliance, _scene_receipt]

BIB_EVENTS = [
    "RIVERSIDE RUN",
    "TURKEY TROT",
    "CITY FUN RUN",
    "HARBOR RACE",
    "MIDNIGHT DASH",
    "PARK RUN FESTIVAL",
    "SPRING CLASSIC",
]


def _race_bib(rng, np_rng):
    w, h = rng.choice([(600, 420), (560, 400)])
    paper = rng.choice([(250, 250, 250), (255, 240, 120), (220, 240, 255)])
    band = tuple(rng.randint(0, 200) for _ in range(3))
    img = Image.new("RGB", (w, h), paper)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, w, h * 0.2], fill=band)
    d.text((24, h * 0.04), rng.choice(BIB_EVENTS), font=im.font(rng, int(h * 0.1)), fill=(255, 255, 255))
    num = str(rng.randint(1, 99999))
    nf = im.font(rng, int(h * 0.42))
    d.text(((w - im.text_w(nf, num)) / 2, h * 0.26), num, font=nf, fill=(10, 10, 10))
    d.rectangle([0, h * 0.82, w, h], fill=band)
    d.text(
        (24, h * 0.85),
        rng.choice(["SPONSORED BY ACME", "2026", "GOOD LUCK!", "WAVE B"]),
        font=im.font(rng, int(h * 0.08)),
        fill=(255, 255, 255),
    )
    return im.add_bezel(rng, img, "paper"), num


# ---------------------------------------------------------------- dataset


def _row(ex_id: str, image: str, target: dict, **extra) -> dict:
    """One row in the app's message layout: a single user turn with the prompt text then the image."""
    user = [{"type": "text", "text": PROMPT}, {"type": "image", "image": image}]
    return {"id": ex_id, "task": TASK, "messages": [{"role": "user", "content": user}], "target": target, "image": image, **extra}


# First draw of make_example -> category (cumulative upper bounds). ~15% of rows are the app-policy hard cases
# (idle/menu/lifetime screens, decimal-heavy distances, run vs walk by pace).
CATEGORIES = [
    ("scene", 0.09, "not_a_workout"),  # landscapes, text screens, appliances, receipts
    ("idle_screen", 0.16, "not_a_workout"),  # device ready / menu / zeros / odometer totals
    ("race_bib", 0.23, "race_bib"),
    ("unclear", 0.27, "unclear"),
    ("decimal", 0.31, "workout_screen"),
    ("pace", 0.35, "workout_screen"),
    ("workout", 1.0, "workout_screen"),
]
VERDICT_OF = {c: v for c, _, v in CATEGORIES}


def category(seed: int) -> str:
    """The category make_example(seed) renders (from its first draw)."""
    u = random.Random(seed).random()
    return next(c for c, hi, _ in CATEGORIES if u < hi)


def make_example(seed: int) -> tuple[Image.Image, dict, dict]:
    """Render one example from its own seed: (image, target, meta). Deterministic per seed."""
    rng = random.Random(seed)
    np_rng = np.random.default_rng(seed)
    u = rng.random()
    cat = next(c for c, hi, _ in CATEGORIES if u < hi)
    if cat == "scene":
        device, scene = rng.choice(NEGATIVES)(rng, np_rng)
        img, fx, _ = im.camera(rng, np_rng, device)
        return img, _empty("other", "not_a_workout", 0.0), {"scene": scene, "effects": fx}
    if cat == "idle_screen":
        idle, fn = rng.choice(IDLE_SCREENS)
        spec = fn(rng)
        device, shown = _photograph_device(rng, np_rng, spec)
        img, fx, _ = im.camera(rng, np_rng, device)
        meta = {"scene": "idle_screen", "idle": idle, "device": spec["screen"], "title": spec["title"]}
        meta["rows"] = [list(r) for r in shown]
        if spec.get("hero"):
            meta["hero"] = list(spec["hero"])
        return img, _empty("other", "not_a_workout", 0.0), {**meta, "effects": fx}
    if cat == "race_bib":
        device, num = _race_bib(rng, np_rng)
        img, fx, _ = im.camera(rng, np_rng, device)
        return img, _empty("run", "race_bib", 0.5), {"scene": "race_bib", "bib": num, "effects": fx}
    if cat == "decimal":
        spec = _spec_decimal(rng)
    elif cat == "pace":
        spec = _spec_pace(rng)
    else:
        r, spec = rng.random(), None
        for w, fn in WORKOUT_SPECS:
            r -= w
            if r <= 0:
                spec = fn(rng)
                break
        spec = spec or WORKOUT_SPECS[-1][1](rng)
    device, shown = _photograph_device(rng, np_rng, spec)
    meta = {"scene": spec["screen"], "title": spec["title"], "rows": [list(r) for r in shown], **spec.get("meta", {})}
    if cat == "unclear":
        img, fx, _ = im.camera(rng, np_rng, device, heavy=True)
        return img, _empty("other", "unclear", 0.2), {**meta, "effects": fx, "illegible": True}
    img, fx, pen = im.camera(rng, np_rng, device)
    target = {**spec["target"], "confidence": round(max(0.7, 0.95 - pen), 2), "verdict": "workout_screen"}
    return img, target, {**meta, "effects": fx}


def generate(n: int, seed: int = 0, image_dir: str | Path = "data/proof/images") -> list[dict]:
    rng = random.Random(seed)
    image_dir = Path(image_dir)
    image_dir.mkdir(parents=True, exist_ok=True)
    rows = []
    for i in range(n):
        img, target, meta = make_example(rng.getrandbits(48))
        path = image_dir / f"{seed}-{i}.jpg"
        img.save(path, "JPEG", quality=92)
        rows.append(_row(f"{TASK}-{seed}-{i}", str(path), target, meta=meta))
    return rows


# ---------------------------------------------------------------- real-photo test set


def load_jsonl(path: str | Path) -> list[dict]:
    """Real photos for eval: JSONL rows {image, kind, distanceKm, durationMin, steps, verdict} (+ optional id).

    `image` is resolved relative to the JSONL file. Missing numbers are null. Confidence is not labelled; grade()
    checks it against the app's accept threshold instead.
    """
    path = Path(path)
    rows = []
    for i, line in enumerate(path.read_text().splitlines()):
        if not line.strip():
            continue
        r = json.loads(line)
        img = Path(r["image"])
        img = img if img.is_absolute() else path.parent / img
        kind, verdict = r.get("kind") or "other", r.get("verdict") or "workout_screen"
        if kind not in KINDS or verdict not in VERDICTS:
            raise ValueError(f"{path}:{i + 1}: bad kind/verdict {kind!r}/{verdict!r}")
        steps = r.get("steps")
        target = {
            "kind": kind,
            "distanceKm": None if r.get("distanceKm") is None else float(r["distanceKm"]),
            "durationMin": None if r.get("durationMin") is None else float(r["durationMin"]),
            "steps": None if steps is None else int(steps),
            "confidence": None,
            "verdict": verdict,
        }
        rows.append(_row(str(r.get("id") or f"real-{i}"), str(img), target, source="real"))
    return rows


# ---------------------------------------------------------------- grading

GRADE_KEYS = ["valid", "schema", "kind", "verdict", *NUM_FIELDS, "numbers", "confidence", "all"]


def _schema_ok(p: dict) -> bool:
    if set(p) != set(FIELDS) or p.get("kind") not in KINDS or p.get("verdict") not in VERDICTS:
        return False
    num = all(p[k] is None or (isinstance(p[k], (int, float)) and not isinstance(p[k], bool)) for k in NUM_FIELDS)
    steps = p["steps"] is None or (isinstance(p["steps"], int) and not isinstance(p["steps"], bool))
    conf = isinstance(p["confidence"], (int, float)) and not isinstance(p["confidence"], bool)
    return num and steps and conf


def grade(pred: dict | None, target: dict) -> dict:
    """Per-field scores plus `all` (kind, verdict and every number right).

    - numbers: within 1% or 0.02 absolute; null must match null.
    - kind: only scored on workout screens (bibs, unclear photos and non-workouts accept any kind).
    - confidence: the app accepts a photo at >= 0.6, so it must clear 0.6 exactly when the target is a workout
      screen, and be <= 0.2 for not_a_workout (the prompt asks for 0). Not part of `all`.
    - schema: strict match of the app schema (all keys, no extras, legal enums and types). Not part of `all`.
    """
    if not isinstance(pred, dict):
        return {k: 0.0 for k in GRADE_KEYS}
    s = {"valid": float(pred.get("kind") in KINDS and pred.get("verdict") in VERDICTS), "schema": float(_schema_ok(pred))}
    s["kind"] = float(target["verdict"] != "workout_screen" or pred.get("kind") == target["kind"])
    s["verdict"] = float(pred.get("verdict") == target["verdict"])
    for k in NUM_FIELDS:
        v = pred.get(k)
        s[k] = float(not isinstance(v, bool) and close(v, target[k], rel=0.01, abs_tol=0.02))
    s["numbers"] = float(all(s[k] == 1.0 for k in NUM_FIELDS))
    try:
        c = float(pred.get("confidence"))
    except (TypeError, ValueError):
        c = None
    if c is None:
        s["confidence"] = 0.0
    elif target["verdict"] == "not_a_workout":
        s["confidence"] = float(c <= 0.2)
    else:
        s["confidence"] = float((c >= APP_ACCEPT) == (target["verdict"] == "workout_screen"))
    s["all"] = float(s["valid"] == s["kind"] == s["verdict"] == s["numbers"] == 1.0)
    return s
