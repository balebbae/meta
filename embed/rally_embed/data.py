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


def train_pairs(n: int = 6000, seed: int = 11) -> list[dict]:
    """(anchor query, positive activity doc). In-batch negatives come from MultipleNegativesRankingLoss, so batches
    must not repeat an activity too often; we shuffle and let the trainer's no-duplicates sampler handle it."""
    docs = activity_docs()
    queries = mapper_queries(n, seed) + alias_queries(seed)
    pairs = [{"anchor": QUERY_PREFIX + q, "positive": docs[a]} for q, a in queries]
    random.Random(seed).shuffle(pairs)
    return pairs


def templated_test(n: int = 600, seed: int = 999) -> list[tuple[str, str]]:
    return mapper_queries(n, seed)


def realistic_test() -> list[tuple[str, str]]:
    """Hand-written, real-world-style captions/listings/events; not produced by the generator's templates."""
    return [(r["text"], r["activity"]) for r in map(json.loads, REALISTIC.open())]
