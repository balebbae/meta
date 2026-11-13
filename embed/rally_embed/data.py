"""Training pairs and activity documents, built from finetune/'s ontology and mapper generator (no user data)."""

from __future__ import annotations

import json
import random
import sys
from pathlib import Path

FINETUNE = Path(__file__).resolve().parents[2] / "finetune"
if str(FINETUNE) not in sys.path:
    sys.path.insert(0, str(FINETUNE))

from rally_ft import ontology  # noqa: E402
from rally_ft.tasks import mapper  # noqa: E402

REALISTIC = Path(__file__).resolve().parent / "realistic_test.jsonl"
QUERY_PREFIX = "Represent this sentence for searching relevant passages: "  # bge retrieval instruction


def activity_docs() -> dict[str, str]:
    """One passage per activity: label, aliases and Compendium description."""
    docs = {}
    for aid, a in ontology.load()["activities"].items():
        aliases = ", ".join(a.get("aliases", []))
        docs[aid] = f"{a['label']}. Also called: {aliases}. {a['default']['desc']}."
    return docs


def mapper_queries(n: int, seed: int) -> list[tuple[str, str]]:
    out = []
    for r in mapper.generate(n, seed=seed):
        act = r["target"].get("activity")
        if act:
            out.append((r["messages"][1]["content"], act))
    return out


ALIAS_TEMPLATES = [
    "{a} class tonight, who's in?",
    "{a} session, 30 min",
    "looking for a {a} buddy this weekend",
    "first time trying {a}",
    "beginner {a} group, all levels welcome",
    "{a} gear for sale, barely used",
    "did some {a} today",
    "{a} workout for beginners",
]


def alias_queries(seed: int) -> list[tuple[str, str]]:
    """Generic templates over every ontology alias, so activities the mapper generator rarely emits
    (pilates, stretch, dance) still get training signal."""
    rng = random.Random(seed)
    out = []
    for aid, a in ontology.load()["activities"].items():
        for alias in a.get("aliases", []) + [a["label"].lower()]:
            for tpl in rng.sample(ALIAS_TEMPLATES, 3):
                out.append((tpl.format(a=alias), aid))
    return out


# Brand, gear and slang people actually write. Kept out of ontology.json (that's the shared contract); these only
# shape training text. Never copy strings from realistic_test.jsonl here (tests/test_data.py checks exact matches).
GEAR_ALIASES = {
    "run": [
        "Hoka Clifton",
        "Brooks Ghost",
        "Asics Gel-Nimbus",
        "Saucony Kinvara",
        "Garmin Forerunner 265",
        "Coros Pace",
        "running vest",
        "race bib",
        "parkrun",
        "Couch to 5K",
        "half marathon",
        "marathon training block",
        "long run",
        "LSD run",
        "strides",
        "fartlek",
        "track workout",
        "6x800 on the track",
        "12x400 repeats",
        "mile repeats",
        "Yasso 800s",
        "negative split",
        "tempo miles",
        "treadmill run",
        "Turkey Trot",
        "fun run",
        "Strava segment",
        "race day",
        "BQ attempt",
        "recovery jog",
    ],
    "trail_run": [
        "Salomon Sense Ride",
        "Hoka Speedgoat",
        "Altra Lone Peak",
        "La Sportiva Bushido",
        "trail ultra",
        "50k ultra",
        "singletrack",
        "technical trail",
        "skyrace",
        "vertical K",
        "fell running",
        "mud run",
        "hydration vest",
        "trail race",
        "rocky descent",
    ],
    "walk": [
        "walking pad",
        "under-desk treadmill",
        "step count",
        "10k steps",
        "daily steps goal",
        "Fitbit step challenge",
        "mall walking",
        "lunch walk",
        "brisk walk",
        "walking group",
        "Nordic walking",
        "walking meeting",
        "pram walk",
        "evening walk with the dog",
        "hot girl walk",
    ],
    "hike": [
        "Osprey daypack",
        "Gregory backpack",
        "Merrell Moab",
        "Salomon X Ultra boots",
        "Black Diamond trekking poles",
        "Leki poles",
        "AllTrails route",
        "14er",
        "peak bagging",
        "thru-hike",
        "section hike",
        "backpacking trip",
        "summit push",
        "switchbacks",
        "trailhead parking",
        "ridge scramble",
        "waterfall trail",
    ],
    "swim": [
        "Speedo goggles",
        "TYR swimsuit",
        "Arena jammer",
        "swim cap",
        "pull buoy",
        "kickboard",
        "wetsuit",
        "triathlon swim",
        "open water swim",
        "masters swim",
        "lap swim",
        "100s on the 1:45",
        "1500m freestyle",
        "flip turns",
        "pool lengths",
        "Ironman swim leg",
        "swim drills",
    ],
    "row_erg": [
        "Concept2 RowErg",
        "Concept2 Model E",
        "PM5",
        "Hydrow",
        "Ergatta",
        "WaterRower",
        "2k test",
        "erg piece",
        "rowing machine intervals",
        "Row Club class",
        "500m splits",
        "split on the monitor",
        "ErgData",
        "erg PR",
    ],
    "row_water": [
        "single scull",
        "double scull",
        "coxed eight",
        "coxswain",
        "crew practice",
        "regatta",
        "boathouse",
        "learn to row program",
        "sweep rowing",
        "Head of the Charles",
        "rigger",
        "outrigger canoe",
        "dragon boat",
    ],
    "kayak": [
        "sea kayak",
        "sit-on-top kayak",
        "whitewater kayak",
        "Eskimo roll",
        "kayak paddle",
        "spray skirt",
        "PFD",
        "Old Town kayak",
        "Perception kayak",
        "paddleboarding",
        "SUP",
        "kayak rental",
        "flatwater paddle",
    ],
    "cycle": [
        "Wahoo KICKR",
        "Tacx Neo",
        "smart trainer",
        "turbo trainer",
        "Zwift",
        "Zwift race",
        "TrainerRoad",
        "Peloton",
        "Peloton ride",
        "Echelon bike",
        "SoulCycle",
        "spin class",
        "indoor cycling",
        "Trek Madone",
        "Specialized Tarmac",
        "Cannondale",
        "Canyon gravel bike",
        "Garmin Edge",
        "power meter",
        "FTP test",
        "century ride",
        "gravel ride",
        "group ride",
        "crit race",
        "bike commute",
        "MTB trail",
        "e-bike",
        "clipless pedals",
        "cycling shoes",
        "chamois",
    ],
    "strength": [
        "leg day",
        "push day",
        "pull day",
        "upper/lower split",
        "PPL split",
        "5x5",
        "Starting Strength",
        "5/3/1",
        "squat PR",
        "bench PR",
        "deadlift",
        "1RM",
        "powerlifting",
        "Olympic lifting",
        "clean and jerk",
        "snatch",
        "barbell",
        "bumper plates",
        "squat rack",
        "power rack",
        "Rogue rack",
        "Bowflex dumbbells",
        "adjustable dumbbells",
        "kettlebell swings",
        "hypertrophy block",
        "sets and reps",
        "cable machine",
        "Smith machine",
        "lifting belt",
        "chalk and straps",
        "Planet Fitness",
        "gym session",
    ],
    "bodyweight": [
        "push-up challenge",
        "pull-up bar",
        "dip station",
        "calisthenics",
        "street workout",
        "burpees",
        "mountain climbers",
        "air squats",
        "plank challenge",
        "jumping jacks",
        "HIIT circuit",
        "Tabata",
        "bootcamp class",
        "no-equipment workout",
        "7 minute workout",
        "muscle-ups",
        "gymnastic rings",
        "resistance bands workout",
        "jump rope",
        "CrossFit WOD",
        "Murph",
    ],
    "yoga": [
        "Manduka mat",
        "Lululemon yoga mat",
        "yoga blocks",
        "Vinyasa flow",
        "hot yoga",
        "Bikram",
        "yin yoga",
        "restorative yoga",
        "Ashtanga",
        "power yoga",
        "sun salutations",
        "downward dog",
        "warrior pose",
        "savasana",
        "Yoga with Adriene",
        "Alo Moves",
        "CorePower Yoga",
    ],
    "pilates": [
        "reformer",
        "reformer class",
        "Balanced Body reformer",
        "Club Pilates",
        "mat Pilates",
        "wall Pilates",
        "the hundred",
        "Pilates ring",
        "Lagree",
        "megaformer",
        "Cadillac tower",
        "core burn",
    ],
    "stretch": [
        "foam roller",
        "foam rolling",
        "Theragun",
        "massage gun",
        "mobility routine",
        "hip opener",
        "hamstring stretch",
        "hip flexor stretch",
        "StretchLab",
        "assisted stretching",
        "cool down",
        "flexibility work",
        "splits training",
        "lacrosse ball release",
        "Pliability",
    ],
    "dance": [
        "Zumba",
        "salsa night",
        "bachata",
        "ballroom",
        "tango lessons",
        "hip hop class",
        "K-pop choreography",
        "TikTok dance",
        "line dancing",
        "barre",
        "contemporary dance",
        "tap class",
        "Just Dance",
        "swing dancing",
        "dance cardio",
        "pole fitness",
    ],
}

GEAR_TEMPLATES = [
    "{a}",
    "{a} today",
    "{a} for sale, good condition",
    "anyone tried {a}?",
    "{a} this morning, felt great",
    "selling my {a}, local pickup",
    "{a} with friends on Saturday",
    "my first {a}",
    "{a}, beginners welcome",
    "post-work {a}",
]


def gear_queries(seed: int) -> list[tuple[str, str]]:
    """Brand/gear/slang aliases in a few realistic wrappers (captions, listings, logs)."""
    rng = random.Random(seed)
    return [
        (tpl.format(a=alias), aid)
        for aid, aliases in GEAR_ALIASES.items()
        for alias in aliases
        for tpl in rng.sample(GEAR_TEMPLATES, 4)
    ]


def train_pairs(n: int = 6000, seed: int = 11) -> list[dict]:
    """(anchor query, positive activity doc). In-batch negatives come from MultipleNegativesRankingLoss, so batches
    must not repeat an activity too often; we shuffle and let the trainer's no-duplicates sampler handle it."""
    docs = activity_docs()
    queries = mapper_queries(n, seed) + alias_queries(seed) + gear_queries(seed)
    pairs = [{"anchor": QUERY_PREFIX + q, "positive": docs[a]} for q, a in queries]
    random.Random(seed).shuffle(pairs)
    return pairs


def templated_test(n: int = 600, seed: int = 999) -> list[tuple[str, str]]:
    return mapper_queries(n, seed)


def realistic_test() -> list[tuple[str, str]]:
    """Hand-written, real-world-style captions/listings/events; not produced by the generator's templates."""
    return [(r["text"], r["activity"]) for r in map(json.loads, REALISTIC.open())]
