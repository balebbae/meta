# repcount: video Proof rep counter

Counts reps in a workout video, so "show 20 push-ups" in a Rally game can be checked by code instead of guessed by an LLM.

- **How it works:** MediaPipe Pose Landmarker (Apache 2.0) gives 33 body landmarks per frame. The counter tracks one joint angle per exercise: elbow for push-ups, knee for squats and lunges, hip for sit-ups, and arm height for jumping jacks. It cleans the signal with a median filter (drops single-frame pose glitches) and a moving average, then counts full down-up cycles with hysteresis.
- **No training.** Rep counting is signal processing on the pose model's output, so it's deterministic and testable. It runs on CPU at ~50 frames/s, and the 5070 Ti isn't needed.
- **Confidence** comes from how regular the tempo is. Clips below 0.8 (several people in frame, overhead camera, mixed exercises, glitchy pose) should go to Muse video review or a friend's thumbs-up, not be auto-accepted.

## Results (Wikimedia Commons clips, `labels.csv`)
| Clip | Gold | Counted | Confidence |
|---|---|---|---|
| Interval push-ups (side view) | 6 | 6 | 0.97 |
| Kettlebell racked squats (side view) | 6 | 6 | 0.95 |
| Squat demonstration | 2 | 2 | 1.00 |

- Gold counts were checked against a frame contact sheet plus the joint-angle trace, not a frame-by-frame human count.
- **Clips that fail all score confidence ≤ 0.54, so they're flagged rather than accepted.** These were a group of Navy SEALs, a push-up contest, an overhead-camera squat, a sit-up clip with text overlays, and jumping jacks mixed with burpees. Pose failed entirely on a slow-motion jumping-jack clip, which gives 0 reps and confidence 0.
- That's 3 labelled clips, too few to claim an accuracy number. Grow the set by recording 10-rep clips on a phone (side view, whole body in frame) and adding rows to `labels.csv`.

## Use
```sh
cd repcount
uv venv && uv pip install -e . pytest ruff
mkdir -p models && curl -L -o models/pose_landmarker_full.task \
  https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task
.venv/bin/pytest -q
.venv/bin/python -m repcount.cli my_pushups.mp4 --exercise pushup
# {"exercise": "pushup", "reps": 10, "confidence": 0.93, "rep_times_s": [...], ...}
.venv/bin/python -m repcount.fetch && .venv/bin/python -m repcount.eval     # labelled clips
```
- `guess_exercise` is only a rough posture check. Pass `--exercise` from the quest.
- **For the app:** run this as a tiny Python service, or port it to the browser with `@mediapipe/tasks-vision`, which uses the same model and landmarks. Doing it in the browser keeps the video on the phone, which fits the Private Muse story. The counter is ~80 lines of numpy and easy to port to TS.
