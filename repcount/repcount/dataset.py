"""Exercise-clip dataset: the finetune split index -> cached MediaPipe landmarks.

    python -m repcount.dataset --workers 6        # extract landmarks for every clip in the index (CPU only)

Reads `finetune/data/exercise_frames/index.jsonl` (clip_id, dataset, source_class, exercise, split, group) and
uses its group-level train/test split as is. Landmarks go to `.cache/landmarks/` (not committed): they are derived
from UCF101 (non-commercial research licence) and must not be committed or redistributed.
"""

from __future__ import annotations

import argparse
import json
import os
import time
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
# override with REPCOUNT_DATA (e.g. a git worktree, where the gitignored data dir is absent)
DATA = Path(os.environ.get("REPCOUNT_DATA") or ROOT.parent / "finetune" / "data" / "exercise_frames")
INDEX = DATA / "index.jsonl"
CACHE = ROOT / ".cache" / "landmarks"
VIDEO_EXT = (".avi", ".mp4", ".mov", ".webm", ".mkv")


def load_index(path: Path = INDEX) -> list[dict]:
    return [json.loads(line) for line in path.open() if line.strip()]


def video_path(row: dict, data: Path = DATA) -> Path | None:
    """UCF101 lives at _downloads/ucf101/videos/<Class>/<name>.avi; other sources (e.g. situp_cc) may give an explicit
    `video` field or sit anywhere under _downloads/<dataset>/."""
    if row.get("video"):
        p = Path(row["video"])
        return p if p.is_absolute() else data / p
    ds, name = row.get("dataset", "ucf101"), row["clip_id"].split("/")[-1]
    p = data / "_downloads" / ds / "videos" / row["source_class"] / f"{name}.avi"
    if p.exists():
        return p
    root = data / "_downloads" / ds
    for ext in VIDEO_EXT:
        hits = sorted(root.rglob(f"{name}{ext}")) if root.exists() else []
        if hits:
            return hits[0]
    return None


def cache_file(row: dict, cache: Path = CACHE) -> Path:
    return cache / (row["clip_id"].replace("/", "__") + ".npz")


def _extract(args: tuple[dict, str, float]) -> dict:
    row, cache, max_fps = args
    from repcount.pose import landmarks

    out = cache_file(row, Path(cache))
    if out.exists():
        return {"clip_id": row["clip_id"], "cached": True}
    vp = video_path(row)
    if vp is None:
        return {"clip_id": row["clip_id"], "error": "video not found"}
    t = time.perf_counter()
    lm, fps = landmarks(vp, max_fps=max_fps)
    dt = time.perf_counter() - t
    np.savez_compressed(out, lm=lm.astype(np.float32), fps=fps, pose_s=dt)
    return {"clip_id": row["clip_id"], "frames": len(lm), "pose_s": round(dt, 2)}


def load_landmarks(row: dict, cache: Path = CACHE) -> tuple[np.ndarray, float, float] | None:
    """(landmarks (T, 33, 4), effective fps, pose wall seconds) or None if not extracted."""
    f = cache_file(row, cache)
    if not f.exists():
        return None
    z = np.load(f)
    return z["lm"].astype(float), float(z["fps"]), float(z["pose_s"])


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--index", type=Path, default=INDEX)
    p.add_argument("--cache", type=Path, default=CACHE)
    p.add_argument("--workers", type=int, default=6)
    p.add_argument("--max-fps", type=float, default=15.0)
    a = p.parse_args()
    a.cache.mkdir(parents=True, exist_ok=True)
    os.environ.setdefault("CUDA_VISIBLE_DEVICES", "")
    rows = load_index(a.index)
    todo = [(r, str(a.cache), a.max_fps) for r in rows if not cache_file(r, a.cache).exists()]
    print(f"{len(rows)} clips, {len(todo)} to extract", flush=True)
    with ProcessPoolExecutor(max_workers=min(6, a.workers)) as ex:
        for i, res in enumerate(ex.map(_extract, todo, chunksize=1)):
            if "error" in res or i % 25 == 0:
                print(i, json.dumps(res), flush=True)
    print("done", flush=True)


if __name__ == "__main__":
    main()
