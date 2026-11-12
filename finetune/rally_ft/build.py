"""Build train/val/test JSONL files for each task.

uv run python -m rally_ft.build --task all --train 2000 --val 200 --test 200
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from rally_ft.common import with_answer
from rally_ft.tasks import mapper, private_muse, proof

TASKS = {"mapper": mapper, "private_muse": private_muse, "proof": proof}
SEEDS = {"train": 1, "val": 2, "test": 3}


def build(task: str, sizes: dict[str, int], out: Path) -> dict[str, int]:
    mod = TASKS[task]
    out = out / task
    out.mkdir(parents=True, exist_ok=True)
    counts = {}
    for split, n in sizes.items():
        kw = {"image_dir": out / "images" / split} if task == "proof" else {}
        rows = mod.generate(n, seed=SEEDS[split], **kw)
        with (out / f"{split}.jsonl").open("w") as f:
            for r in rows:
                if split == "train":
                    r = {**r, "sft_messages": with_answer(r)}
                f.write(json.dumps(r) + "\n")
        counts[split] = len(rows)
    return counts


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--task", default="all", choices=["all", *TASKS])
    p.add_argument("--train", type=int, default=2000)
    p.add_argument("--val", type=int, default=200)
    p.add_argument("--test", type=int, default=200)
    p.add_argument("--out", type=Path, default=Path("data"))
    a = p.parse_args()
    sizes = {"train": a.train, "val": a.val, "test": a.test}
    for t in TASKS if a.task == "all" else [a.task]:
        print(t, build(t, sizes, a.out))


if __name__ == "__main__":
    main()
