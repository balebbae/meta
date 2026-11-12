"""Top-1/top-3 accuracy and MRR of query -> activity retrieval.

python -m rally_embed.evaluate --model BAAI/bge-small-en-v1.5 --model outputs/rally-embed
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import numpy as np

from rally_embed.data import QUERY_PREFIX, activity_docs, realistic_test, templated_test


def score(model, queries: list[tuple[str, str]], prefix: str = QUERY_PREFIX) -> dict:
    docs = activity_docs()
    ids = list(docs)
    d = model.encode([docs[i] for i in ids], normalize_embeddings=True)
    t = time.time()
    q = model.encode([prefix + text for text, _ in queries], normalize_embeddings=True, batch_size=64)
    ms = 1000 * (time.time() - t) / max(1, len(queries))
    ranks = []
    for row, (_, gold) in zip(q @ d.T, queries, strict=True):
        order = [ids[j] for j in np.argsort(-row)]
        ranks.append(order.index(gold) + 1)
    r = np.array(ranks)
    return {
        "n": len(r),
        "top1": round(float((r == 1).mean()), 3),
        "top3": round(float((r <= 3).mean()), 3),
        "mrr": round(float((1 / r).mean()), 3),
        "ms_per_query": round(ms, 2),
    }


def misses(model, queries, k: int = 10) -> list[str]:
    docs = activity_docs()
    ids = list(docs)
    d = model.encode([docs[i] for i in ids], normalize_embeddings=True)
    q = model.encode([QUERY_PREFIX + t for t, _ in queries], normalize_embeddings=True)
    out = []
    for row, (text, gold) in zip(q @ d.T, queries, strict=True):
        pred = ids[int(np.argmax(row))]
        if pred != gold:
            out.append(f"{text!r}: gold={gold} pred={pred}")
    return out[:k]


def main() -> None:
    from sentence_transformers import SentenceTransformer

    p = argparse.ArgumentParser()
    p.add_argument("--model", action="append", required=True)
    p.add_argument("--show-misses", action="store_true")
    p.add_argument("--report", type=Path, default=Path("reports/eval.json"))
    a = p.parse_args()
    sets = {"realistic": realistic_test(), "templated": templated_test()}
    results = {}
    for name in a.model:
        m = SentenceTransformer(name)
        results[name] = {s: score(m, qs) for s, qs in sets.items()}
        print(name, json.dumps(results[name]))
        if a.show_misses:
            print("  misses:", *misses(m, sets["realistic"]), sep="\n   ")
    a.report.parent.mkdir(parents=True, exist_ok=True)
    a.report.write_text(json.dumps(results, indent=1))


if __name__ == "__main__":
    main()
