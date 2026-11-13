"""python -m repcount.cli VIDEO --exercise pushup   (omit --exercise to guess it; --classify for the trained model)."""

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
    p.add_argument("--classify", action="store_true", help="print the exercise classifier verdict (classify.py)")
    a = p.parse_args()
    t = time.time()
    lm, fps = landmarks(a.video, max_fps=a.max_fps)
    if a.classify:
        from repcount.classify import TO_COUNTER, classify

        expected = {v: k for k, v in TO_COUNTER.items()}.get(a.exercise) if a.exercise else None
        print(json.dumps({**classify(lm, fps, expected=expected), "seconds": round(time.time() - t, 2)}))
        return
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
