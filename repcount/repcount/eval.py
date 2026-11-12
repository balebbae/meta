"""Score the counter on labelled clips.

    python -m repcount.eval --labels labels.csv          # columns: file,exercise,reps[,source,license]

`labels.csv` here lists Wikimedia Commons clips; `python -m repcount.fetch` downloads them into clips/.
Record your own clips (phone, side view, whole body in frame) and append rows to grow the set.
"""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

from repcount.counter import count
from repcount.pose import landmarks


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--labels", type=Path, default=Path("labels.csv"))
    p.add_argument("--clips", type=Path, default=Path("clips"))
    p.add_argument("--min-confidence", type=float, default=0.8, help="below this, the app should route to review")
    a = p.parse_args()
    rows = list(csv.DictReader(a.labels.open()))
    results = []
    for r in rows:
        lm, fps = landmarks(a.clips / r["file"])
        c = count(lm, fps, r["exercise"])
        results.append(
            {
                "file": r["file"],
                "exercise": r["exercise"],
                "gold": int(r["reps"]),
                "pred": c.reps,
                "confidence": c.confidence,
                "auto": c.confidence >= a.min_confidence,
            }
        )
        print(json.dumps(results[-1]))
    auto = [x for x in results if x["auto"]]
    exact = lambda xs: round(sum(x["pred"] == x["gold"] for x in xs) / max(1, len(xs)), 3)  # noqa: E731
    mae = lambda xs: round(sum(abs(x["pred"] - x["gold"]) for x in xs) / max(1, len(xs)), 2)  # noqa: E731
    print(
        json.dumps(
            {
                "clips": len(results),
                "exact": exact(results),
                "mae": mae(results),
                "auto_accepted": len(auto),
                "auto_exact": exact(auto),
                "auto_mae": mae(auto),
            }
        )
    )


if __name__ == "__main__":
    main()
