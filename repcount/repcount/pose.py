"""Video -> (T, 33, 4) MediaPipe pose landmarks."""

from __future__ import annotations

from pathlib import Path

import numpy as np

DEFAULT_MODEL = Path(__file__).resolve().parent.parent / "models" / "pose_landmarker_full.task"
MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/"
    "pose_landmarker_full.task"
)


def landmarks(video: str | Path, model: str | Path = DEFAULT_MODEL, max_fps: float = 15.0) -> tuple[np.ndarray, float]:
    """Run pose on every k-th frame so the effective rate is <= max_fps. Missing detections are NaN."""
    import cv2
    import mediapipe as mp
    from mediapipe.tasks.python import BaseOptions
    from mediapipe.tasks.python.vision import PoseLandmarker, PoseLandmarkerOptions, RunningMode

    if not Path(model).exists():
        raise FileNotFoundError(f"{model} missing; download it: curl -L -o {model} {MODEL_URL}")
    cap = cv2.VideoCapture(str(video))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    step = max(1, int(round(fps / max_fps)))
    opts = PoseLandmarkerOptions(base_options=BaseOptions(model_asset_path=str(model)), running_mode=RunningMode.VIDEO)
    frames = []
    with PoseLandmarker.create_from_options(opts) as det:
        i = 0
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            if i % step == 0:
                img = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
                res = det.detect_for_video(img, int(i * 1000 / fps))
                if res.pose_landmarks:
                    frames.append([[p.x, p.y, p.z, p.visibility] for p in res.pose_landmarks[0]])
                else:
                    frames.append([[np.nan] * 4] * 33)
            i += 1
    cap.release()
    return np.asarray(frames, dtype=float).reshape(-1, 33, 4), fps / step
