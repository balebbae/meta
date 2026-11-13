"""Build train/val/test JSONL files for each task.

uv run python -m rally_ft.build --task all --train 2000 --val 200 --test 200
"""

from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path

from rally_ft.common import with_answer
from rally_ft.tasks import exercise_check, mapper, private_muse, proof

TASKS = {"mapper": mapper, "private_muse": private_muse, "proof": proof, "exercise_check": exercise_check}
SEEDS = {"train": 1, "val": 2, "test": 3}
DEFAULT_FRAMES = Path("data/exercise_frames")


def build(task: str, sizes: dict[str, int], out: Path, frames_dir: Path = DEFAULT_FRAMES) -> dict:
    mod = TASKS[task]
    out = out / task
    out.mkdir(parents=True, exist_ok=True)
    counts = {}
    for split, n in sizes.items():
        kw = {"image_dir": out / "images" / split} if task in ("proof", "exercise_check") else {}
        if task == "exercise_check":  # frames come from the clips the index assigns to this split
            kw.update(split=split, frames_dir=frames_dir)
        rows = mod.generate(n, seed=SEEDS[split], **kw)
        with (out / f"{split}.jsonl").open("w") as f:
            for r in rows:
                if split == "train":
                    r = {**r, "sft_messages": with_answer(r, sort_keys=task != "exercise_check")}
                f.write(json.dumps(r) + "\n")
        counts[split] = len(rows)
        if task == "exercise_check":
            counts[f"{split}_cases"] = dict(sorted(Counter(r["case"] for r in rows).items()))
    if task == "exercise_check":
        exercise_check.write_license_note(out)
    return counts


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--task", default="all", choices=["all", *TASKS])
    p.add_argument("--train", type=int, default=2000)
    p.add_argument("--val", type=int, default=200)
    p.add_argument("--test", type=int, default=200)
    p.add_argument("--out", type=Path, default=Path("data"))
    p.add_argument("--frames-dir", type=Path, default=DEFAULT_FRAMES, help="exercise_check: dir with index.jsonl")
    a = p.parse_args()
    sizes = {"train": a.train, "val": a.val, "test": a.test}
    for t in TASKS if a.task == "all" else [a.task]:
        if t == "exercise_check" and a.task == "all" and not (a.frames_dir / "index.jsonl").exists():
            print(f"exercise_check skipped: {a.frames_dir / 'index.jsonl'} not found (build exercise frames first)")
            continue
        print(t, build(t, sizes, a.out, a.frames_dir))


if __name__ == "__main__":
    main()
