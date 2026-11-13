"""Rally move proof check: 1 photo or 3 clip stills + today's task text -> a compact verdict JSON.

Replaces the Ember call in `lib/rally/proof.ts` ("does this photo plausibly show ..."). The model only says what
the images show, which exercise/activity is visible, whether that matches the task, and any numbers printed on a
workout screen. Rep counting and form stay in code; the prompt says so and nothing here labels them.

Output (short keys, latency matters; key order puts the decision after the evidence):
    {"shows": "exercise_frames", "ex": "push_up", "match": true, "km": null, "min": null, "steps": null,
     "ok": true, "why": "Push-ups visible across the frames, matching the task."}

Gold labels are computed by code, never by hand: `ok` = shows a workout (exercise_frames | workout_screen) AND
match, so labels are consistent by construction (`gold()`).

Data (see generate()):
  - exercise frames from `data/exercise_frames/index.jsonl` (UCF101 clips, 1 or 3 stills), paired with the
    matching task or a wrong one. The index's group-level `split` decides train/test; val is ~10% of the train
    groups per exercise (by hash), so no clip or group is in two splits.
  - workout screens rendered by `proof.make_example`, with a task that the screen meets, falls short of, or is
    for a different activity.
  - negatives: non-exercise clips (exercise "none"), proof's not_a_workout scenes, race bibs, illegible screens.

LICENCE: UCF101 / HMDB51 frames are for non-commercial research only. Data built from them must not ship in the
product or be redistributed; `write_license_note()` drops a note into the generated data dir. No WHOOP data.
"""

from __future__ import annotations

import json
import random
import zlib
from pathlib import Path

from rally_ft.common import close
from rally_ft.tasks import proof

TASK = "exercise_check"
SHOWS = ["exercise_frames", "workout_screen", "race_bib", "not_a_workout", "unclear"]
WORKOUT_SHOWS = ("exercise_frames", "workout_screen")
EXERCISES = ["push_up", "squat", "lunge", "jumping_jack", "sit_up", "run", "walk", "ride", "other", "none"]
BODY_EXERCISES = ["push_up", "squat", "lunge", "jumping_jack", "sit_up"]
NUM_FIELDS = ["km", "min", "steps"]
FIELDS = ["shows", "ex", "match", *NUM_FIELDS, "ok", "why"]
MAX_WHY_WORDS = 15
SCHEMA = {
    "type": "object",
    "properties": {
        "shows": {"type": "string", "enum": SHOWS},
        "ex": {"type": "string", "enum": EXERCISES},
        "match": {"type": "boolean"},
        "km": {"type": ["number", "null"]},
        "min": {"type": ["number", "null"]},
        "steps": {"type": ["integer", "null"]},
        "ok": {"type": "boolean"},
        "why": {"type": "string"},
    },
    "required": FIELDS,
    "additionalProperties": False,
}
# One prompt for Ember and Glimmer so the baseline is fair. `{task}` is today's task text.
PROMPT = """You check proof for a fitness challenge. Today's task: "{task}".
You get 1 photo or 3 stills from a short clip (in time order). Say what they show and whether they prove the task.
shows: exercise_frames (a person doing an exercise), workout_screen (treadmill, watch, phone, bike, rower or similar screen with workout numbers), race_bib, not_a_workout, or unclear (too blurry or dark to tell or read).
ex: the exercise or activity seen: push_up, squat, lunge, jumping_jack, sit_up, run, walk, ride, other, or none. For a screen use the activity it reports (a steps count is walk; swim, row, elliptical, strength and yoga are other). none if no workout is shown.
match: true only if the shown activity is the task's activity and, for a screen, its numbers reach the task's distance, time or steps. Do not count reps or judge form.
km, min, steps: distance, duration and step count printed on a workout screen (convert miles to km x1.609, mm:ss to decimal minutes), else null.
ok: true only if shows is exercise_frames or workout_screen and match is true.
why: at most 15 words about what is visible. Never comment on a person's body, looks, age or health.
Return only JSON with keys shows, ex, match, km, min, steps, ok, why."""  # noqa: E501


def prompt(task_text: str) -> str:
    return PROMPT.replace("{task}", task_text)


# ---------------------------------------------------------------- tasks (what Rally asks for today)

LABELS = {
    "push_up": "Push-ups",
    "squat": "Squats",
    "lunge": "Lunges",
    "jumping_jack": "Jumping jacks",
    "sit_up": "Sit-ups",
    "run": "a run",
    "walk": "a walk",
    "ride": "a ride",
    "swim": "a swim",
    "row": "rowing",
    "elliptical": "elliptical",
    "strength": "strength training",
    "yoga": "yoga",
    "steps": "a step count",
}
REP_WORDS = {"push_up": "push-ups", "squat": "squats", "lunge": "lunges", "jumping_jack": "jumping jacks", "sit_up": "sit-ups"}
SCREEN_ACTS = ["run", "walk", "ride", "swim", "row", "elliptical", "strength", "yoga", "steps"]
# run / walk / steps screens are too close to call against each other, so they are never used as wrong tasks.
CLOSE_ACTS = {"run": {"walk", "steps"}, "walk": {"run", "steps"}, "steps": {"run", "walk"}}
UNITS = {  # activity -> amount units a task may use
    "run": ["km", "min"],
    "walk": ["km", "min"],
    "ride": ["km", "min"],
    "swim": ["m", "min"],
    "row": ["m", "min"],
    "elliptical": ["min"],
    "strength": ["min"],
    "yoga": ["min"],
    "steps": ["steps"],
}
NICE = {
    "km": [0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 21, 25, 30, 40, 50, 60, 80, 100],
    "m": [100, 200, 250, 400, 500, 750, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 6000, 8000, 10000, 12000, 15000],
    "min": [5, 10, 15, 20, 25, 30, 40, 45, 60, 75, 90, 120, 150],
    "steps": [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 10000, 12000, 15000, 20000, 25000, 30000, 40000],
}
# Activity tasks only exercise screens can satisfy -> ex value for the screen.
SCREEN_EX = {"run": "run", "walk": "walk", "ride": "ride", "steps": "walk"}


def _fmt_amount(amount: float, unit: str) -> str:
    if unit == "km":
        return f"{amount:g} km"
    if unit == "m":
        return f"{amount:,} m"
    if unit == "min":
        return f"{amount} min"
    return f"{amount:,} steps"


def task_text(rng: random.Random, act: str, amount: float | None = None, unit: str | None = None) -> str:
    """Rally-style task text, e.g. 'push-ups × 10', '15 squats', 'run 3 km', '8,000 steps'."""
    if act in REP_WORDS:
        reps = amount or rng.choice([5, 8, 10, 12, 15, 20, 25, 30, 40, 50])
        w = REP_WORDS[act]
        return rng.choice([f"{w} × {reps}", f"{reps} {w}", f"{w} x {reps}"])
    a = _fmt_amount(amount, unit)
    if act == "steps":
        return a
    verb = {"strength": "strength workout", "elliptical": "elliptical", "yoga": "yoga"}.get(act, act)
    return rng.choice([f"{verb} {a}", f"{a} {verb}"]) if act in ("run", "walk", "ride", "swim", "row") else f"{verb} {a}"


def _random_task(rng: random.Random, exclude: set[str]) -> tuple[str, dict]:
    acts = [a for a in [*BODY_EXERCISES, *SCREEN_ACTS] if a not in exclude]
    act = rng.choice(acts)
    if act in REP_WORDS:
        return task_text(rng, act), {"act": act}
    unit = rng.choice(UNITS[act])
    amount = rng.choice(NICE[unit][:9])
    return task_text(rng, act, amount, unit), {"act": act, "amount": amount, "unit": unit}


# ---------------------------------------------------------------- gold labels


def gold(shows: str, ex: str, match: bool, km=None, mins=None, steps=None, why: str = "") -> dict:
    """The label, with `ok` computed from the other fields (approved = shows a workout AND matches the task)."""
    assert shows in SHOWS and ex in EXERCISES
    match = bool(match) and shows in WORKOUT_SHOWS
    if shows != "workout_screen":
        km = mins = steps = None
    if shows not in WORKOUT_SHOWS:
        ex = "none"
    assert len(why.split()) <= MAX_WHY_WORDS, why
    ok = shows in WORKOUT_SHOWS and match
    return {"shows": shows, "ex": ex, "match": match, "km": km, "min": mins, "steps": steps, "ok": ok, "why": why}


def _screen_activity(target: dict, meta: dict) -> str:
    kind = target["kind"]
    if kind == "other":
        return {"rower": "row", "elliptical": "elliptical"}[meta["scene"]]
    return kind


def _screen_value(target: dict, unit: str) -> float | None:
    return {"km": target["distanceKm"], "m": None if target["distanceKm"] is None else target["distanceKm"] * 1000,
            "min": target["durationMin"], "steps": target["steps"]}[unit]  # fmt: skip


def _pick_amount(rng: random.Random, value: float, unit: str, meets: bool) -> float | None:
    if meets:
        ok = [x for x in NICE[unit] if x <= 0.95 * value]
        return rng.choice(ok[-3:]) if ok else None
    hi = [x for x in NICE[unit] if x >= 1.3 * value]
    return rng.choice(hi[:3]) if hi else None


# ---------------------------------------------------------------- frames index


def load_index(frames_dir: str | Path) -> list[dict]:
    frames_dir = Path(frames_dir)
    path = frames_dir / "index.jsonl"
    if not path.exists():
        raise SystemExit(
            f"exercise_check: {path} not found. Build the exercise frames first (UCF101/HMDB51 stills; rows "
            '{"clip_id","dataset","source_class","exercise","frames":[3 paths],"split"}) or pass --frames-dir.'
        )
    rows = [json.loads(line) for line in path.read_text().splitlines() if line.strip()]
    for r in rows:
        if r["exercise"] not in [*BODY_EXERCISES, "none"] or r["split"] not in ("train", "test") or len(r["frames"]) != 3:
            raise ValueError(f"{path}: bad row {r.get('clip_id')!r}")
    return rows


# Non-exercise source classes that are too close to a Rally activity to call "not a workout".
AMBIGUOUS_NONE = {"WalkingWithDog", "Walking", "Running", "Biking", "Jogging", "walk", "run", "ride_bike"}


def _group(clip: dict) -> str:
    return clip.get("group") or clip["clip_id"]


def val_groups(index: list[dict]) -> set[str]:
    """~10% of the index's train groups per exercise (at least 1 when a class has 2+), picked by a stable hash."""
    by_ex: dict[str, set[str]] = {}
    for c in index:
        if c["split"] == "train":
            by_ex.setdefault(c["exercise"], set()).add(_group(c))
    out = set()
    for gs in by_ex.values():
        k = max(1, round(0.1 * len(gs))) if len(gs) >= 2 else 0
        out |= set(sorted(gs, key=lambda g: (zlib.crc32(g.encode()), g))[:k])
    return out


def clip_split(clip: dict, val: set[str]) -> str:
    """train/val/test for a clip. Test is the index's own (group-level) test split; val is carved from whole
    train groups, so a group never straddles two splits."""
    if clip["split"] == "test":
        return "test"
    return "val" if _group(clip) in val else "train"


def clips_for(frames_dir: str | Path, split: str) -> list[dict]:
    index = [c for c in load_index(frames_dir) if c.get("source_class") not in AMBIGUOUS_NONE]
    val = val_groups(index)
    return [c for c in index if clip_split(c, val) == split]


# ---------------------------------------------------------------- rows


def _row(ex_id: str, images: list[str], task: str, target: dict, **extra) -> dict:
    """One user turn: the prompt (with today's task) then 1 or 3 images, in clip order."""
    user = [{"type": "text", "text": prompt(task)}, *({"type": "image", "image": p} for p in images)]
    return {"id": ex_id, "task": TASK, "messages": [{"role": "user", "content": user}], "target": target,
            "images": images, "task_text": task, **extra}  # fmt: skip


def _proof_seed(rng: random.Random, verdict: str) -> int:
    """A seed whose proof.make_example has `verdict`. Mirrors make_example's first draw (checked in tests)."""
    while True:
        seed = rng.getrandbits(48)
        u = random.Random(seed).random()
        v = "not_a_workout" if u < 0.10 else "race_bib" if u < 0.18 else "unclear" if u < 0.22 else "workout_screen"
        if v == verdict:
            return seed


def _screen_row(rng: random.Random, target: dict, meta: dict, want: str) -> tuple[str, dict, dict] | None:
    """(task text, label, task meta) for a workout screen. want: match | short | wrong_activity."""
    act = _screen_activity(target, meta)
    ex = SCREEN_EX.get(act, "other")
    nums = {"km": target["distanceKm"], "mins": target["durationMin"], "steps": target["steps"]}
    if want == "wrong_activity":
        task, spec = _random_task(rng, exclude={act, *CLOSE_ACTS.get(act, set())})
        why = f"Screen shows {LABELS[act]}, not {LABELS[spec['act']].lower()}."
        return task, gold("workout_screen", ex, False, **nums, why=why), spec
    units = [u for u in UNITS[act] if _screen_value(target, u)]
    rng.shuffle(units)
    for unit in units:
        amount = _pick_amount(rng, _screen_value(target, unit), unit, meets=want == "match")
        if amount is None:
            continue
        task = task_text(rng, act, amount, unit)
        spec = {"act": act, "amount": amount, "unit": unit}
        verb = "reaching" if want == "match" else "short of"
        why = f"Screen shows {LABELS[act]} {verb} {_fmt_amount(amount, unit)}."
        return task, gold("workout_screen", ex, want == "match", **nums, why=why), spec
    return None


CASES = [  # (case, weight): ~40% exercise frames, ~30% screens, ~30% negatives
    ("ex_match", 0.20),
    ("ex_wrong_task", 0.20),
    ("screen_match", 0.18),
    ("screen_short", 0.06),
    ("screen_wrong_activity", 0.06),
    ("junk_frames", 0.12),
    ("junk_photo", 0.09),
    ("race_bib", 0.06),
    ("unclear", 0.03),
]


def _pick_case(rng: random.Random) -> str:
    r = rng.random()
    for case, w in CASES:
        r -= w
        if r <= 0:
            return case
    return CASES[-1][0]


class _Cycler:
    """Draw clips without replacement, reshuffling when exhausted, so every clip is used about equally."""

    def __init__(self, rng: random.Random, clips: list[dict]):
        self.rng, self.clips, self.queue = rng, clips, []

    def __bool__(self) -> bool:
        return bool(self.clips)

    def next(self) -> dict:
        if not self.queue:
            self.queue = self.rng.sample(self.clips, len(self.clips))
        return self.queue.pop()


def generate(
    n: int,
    seed: int = 0,
    image_dir: str | Path = "data/exercise_check/images",
    split: str = "train",
    frames_dir: str | Path = "data/exercise_frames",
) -> list[dict]:
    """n rows for `split` (train | val | test). Frames come only from clips assigned to that split."""
    rng = random.Random(f"{TASK}-{split}-{seed}")
    image_dir, frames_dir = Path(image_dir), Path(frames_dir)
    image_dir.mkdir(parents=True, exist_ok=True)
    clips = clips_for(frames_dir, split)
    exercise = _Cycler(rng, [c for c in clips if c["exercise"] != "none"])
    junk = _Cycler(rng, [c for c in clips if c["exercise"] == "none"])
    if not exercise or not junk:
        raise SystemExit(f"exercise_check: no exercise or no 'none' clips for split {split!r} in {frames_dir}/index.jsonl")
    rows = []
    for i in range(n):
        ex_id = f"{TASK}-{split}-{i}"
        case = _pick_case(rng)
        if case in ("ex_match", "ex_wrong_task", "junk_frames"):
            clip = (junk if case == "junk_frames" else exercise).next()
            k = rng.choice([1, 3])
            frames = [clip["frames"][1]] if k == 1 else clip["frames"]
            images = [str(frames_dir / f) for f in frames]
            where = "the photo" if k == 1 else "the clip"
            exn = clip["exercise"]
            if case == "ex_match":
                task = task_text(rng, exn)
                spec = {"act": exn}
                label = gold("exercise_frames", exn, True, why=f"{LABELS[exn]} visible in {where}, matching the task.")
            elif case == "ex_wrong_task":
                task, spec = _random_task(rng, exclude={exn}) if rng.random() < 0.25 else (None, None)
                if task is None:
                    other = rng.choice([e for e in BODY_EXERCISES if e != exn])
                    task, spec = task_text(rng, other), {"act": other}
                want = LABELS[spec["act"]].lower()
                label = gold("exercise_frames", exn, False, why=f"{LABELS[exn]} visible in {where}, but the task is {want}.")
            else:
                task, spec = _random_task(rng, exclude=set())
                label = gold("not_a_workout", "none", False, why=f"No workout visible in {where}.")
            meta = {"clip_id": clip["clip_id"], "group": clip.get("group"), "dataset": clip["dataset"],
                    "source_class": clip["source_class"], "n_images": k, "task_spec": spec}  # fmt: skip
            rows.append(_row(ex_id, images, task, label, case=case, meta=meta))
            continue
        verdict = {"junk_photo": "not_a_workout", "race_bib": "race_bib", "unclear": "unclear"}.get(case, "workout_screen")
        while True:
            pseed = _proof_seed(rng, verdict)
            img, ptarget, pmeta = proof.make_example(pseed)
            if verdict == "workout_screen":
                want = {"screen_match": "match", "screen_short": "short", "screen_wrong_activity": "wrong_activity"}[case]
                got = _screen_row(rng, ptarget, pmeta, want)
                if got is None:  # e.g. no nice amount above/below the printed value; draw another screen
                    continue
                task, label, spec = got
            else:
                task, spec = _random_task(rng, exclude=set())
                why = {
                    "not_a_workout": "No workout shown; the photo is not a workout screen.",
                    "race_bib": "Only a race bib; no workout is shown.",
                    "unclear": "Screen too blurry to read.",
                }[verdict]
                label = gold(verdict, "none", False, why=why)
            break
        path = image_dir / f"{split}-{i}.jpg"
        img.save(path, "JPEG", quality=90)
        meta = {"proof_seed": pseed, "scene": pmeta.get("scene"), "n_images": 1, "task_spec": spec}
        rows.append(_row(ex_id, [str(path)], task, label, case=case, meta=meta))
    return rows


LICENSE_NOTE = """exercise_check data: licence note
- Exercise frames come from UCF101 (and possibly HMDB51). Both are distributed for non-commercial research use
  only. Rows built from them, and any adapter trained on them, are for research/evaluation; do not redistribute
  the frames or ship them in the product. Check the licence before any commercial use.
- Workout screens, race bibs and non-workout scenes are synthetic (rally_ft/imaging.py), no real user data.
- No WHOOP data is used anywhere in this dataset (WHOOP's API terms ban training models on it).
"""


def write_license_note(out_dir: str | Path) -> Path:
    p = Path(out_dir) / "LICENSE.txt"
    p.write_text(LICENSE_NOTE)
    return p


# ---------------------------------------------------------------- external test set (real phone clips)


def load_jsonl(path: str | Path) -> list[dict]:
    """Rows in the generated test-row format; only `images`, `task_text` and `target` are needed (+ optional id,
    case). Relative image paths resolve against the JSONL file. The prompt is rebuilt and `ok` recomputed."""
    path = Path(path)
    rows = []
    for i, line in enumerate(path.read_text().splitlines()):
        if not line.strip():
            continue
        r = json.loads(line)
        imgs = [Path(p) if Path(p).is_absolute() else path.parent / p for p in r["images"]]
        if len(imgs) not in (1, 3):
            raise ValueError(f"{path}:{i + 1}: expected 1 or 3 images, got {len(imgs)}")
        t = r["target"]
        if t.get("shows") not in SHOWS or t.get("ex") not in EXERCISES:
            raise ValueError(f"{path}:{i + 1}: bad shows/ex {t.get('shows')!r}/{t.get('ex')!r}")
        nums = {"km": t.get("km"), "mins": t.get("min"), "steps": t.get("steps")}
        label = gold(t["shows"], t["ex"], t.get("match", False), **nums, why=t.get("why", ""))
        extra = {"case": r["case"]} if r.get("case") else {}
        rows.append(_row(str(r.get("id") or f"real-{i}"), [str(p) for p in imgs], r["task_text"], label, source="real", **extra))
    return rows


# ---------------------------------------------------------------- grading

GRADE_KEYS = ["valid", "schema", "shows", "ex", "match", "numbers", "approved", "reject", "false_reject", "consistent",
              "why_ok", "all"]  # fmt: skip


def _is_num(v) -> bool:
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def schema_ok(p: dict) -> bool:
    if set(p) != set(FIELDS) or p.get("shows") not in SHOWS or p.get("ex") not in EXERCISES:
        return False
    if not all(isinstance(p[k], bool) for k in ("match", "ok")) or not isinstance(p["why"], str):
        return False
    steps_ok = p["steps"] is None or (isinstance(p["steps"], int) and not isinstance(p["steps"], bool))
    return steps_ok and all(p[k] is None or _is_num(p[k]) for k in ("km", "min"))


def grade(pred: dict | None, target: dict) -> dict:
    """Per-row scores. Metrics that don't apply to a row are None (eval averages over the rows they apply to):

    - numbers: workout_screen rows only; km/min/steps within 1% or 0.02 (null must be null).
    - ex: exercise_frames rows only (exercise accuracy).
    - reject: negative rows (target ok false); 1 when the prediction is not approved (wrong-task/junk rejection).
    - false_reject: positive rows (target ok true); 1 when the prediction is not approved.
    - consistent: the prediction's ok equals (shows a workout AND match), the rule the app can re-check.
    - all: shows, match, ok and every number right, plus ex when the target shows a workout.
    """
    pos = bool(target["ok"])
    applies = {
        "ex": target["shows"] == "exercise_frames",
        "numbers": target["shows"] == "workout_screen",
        "reject": not pos,
        "false_reject": pos,
    }
    if not isinstance(pred, dict):
        s = {k: 0.0 for k in GRADE_KEYS}
        s["false_reject"] = 1.0
        return {k: (v if applies.get(k, True) else None) for k, v in s.items()}
    approved = pred.get("ok") is True
    nums_ok = all(not isinstance(pred.get(k), bool) and close(pred.get(k), target[k], rel=0.01, abs_tol=0.02) for k in NUM_FIELDS)
    s = {
        "valid": float(pred.get("shows") in SHOWS and pred.get("ex") in EXERCISES and isinstance(pred.get("ok"), bool)),
        "schema": float(schema_ok(pred)),
        "shows": float(pred.get("shows") == target["shows"]),
        "ex": float(pred.get("ex") == target["ex"]),
        "match": float(pred.get("match") is target["match"]),
        "numbers": float(nums_ok),
        "approved": float(approved == pos),
        "reject": float(not approved),
        "false_reject": float(not approved),
        "consistent": float(approved == (pred.get("shows") in WORKOUT_SHOWS and pred.get("match") is True)),
        "why_ok": float(isinstance(pred.get("why"), str) and 0 < len(pred["why"].split()) <= MAX_WHY_WORDS),
    }
    ex_ok = s["ex"] == 1.0 or target["shows"] not in WORKOUT_SHOWS
    s["all"] = float(s["valid"] == s["shows"] == s["match"] == s["approved"] == 1.0 and ex_ok and nums_ok)
    return {k: (v if applies.get(k, True) else None) for k, v in s.items()}
