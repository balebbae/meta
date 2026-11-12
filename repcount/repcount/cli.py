"""python -m repcount.cli VIDEO --exercise pushup   (omit --exercise to guess it)."""

from __future__ import annotations

import argparse
import json
import time

from repcount.counter import EXERCISES, count, guess_exercise
from repcount.pose import landmarks


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("video")
    p.add_argument("--exercise", choices=sorted(EXERCISES))
    p.add_argument("--max-fps", type=float, default=15.0)
    a = p.parse_args()
    t = time.time()
    lm, fps = landmarks(a.video, max_fps=a.max_fps)
    ex = a.exercise or guess_exercise(lm)
    c = count(lm, fps, ex)
    out = {
        "exercise": c.exercise,
        "guessed": a.exercise is None,
        "reps": c.reps,
        "confidence": c.confidence,
        "rep_times_s": [round(i / fps, 2) for i in c.rep_frames],
        "frames": len(lm),
        "seconds": round(time.time() - t, 2),
    }
    print(json.dumps(out))


if __name__ == "__main__":
    main()
