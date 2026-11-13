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

## Exercise classifier (`classify.py`): which exercise does the clip show?
Checks a proof clip against today's task. It uses the same labels as the vision LLM's `exercise_check` (`push_up | squat | lunge | jumping_jack | sit_up | none`). `lib/rally/proof-fusion.ts` combines the two verdicts.

- **Features** (58 per clip, built from pose sampled at ≤15 fps). For each signal (elbow/knee/hip angle, arm height, shoulder abduction, hip height, feet apart, ankle spread) it takes the mean, std, range (p95−p5), dominant frequency and periodicity. It also uses torso tilt (separates the horizontal push-ups/sit-ups from upright squats/lunges/jacks), the left/right knee gap (lunges are asymmetric), arm–leg coupling (jumping jacks) and pose coverage.
- **Model:** standardized multinomial logistic regression. `C` is picked by 5-fold StratifiedGroupKFold on the *train* groups, and the model is wrapped in rules. The clip abstains when:
  - no person is found, or the clip is under 1.5 s;
  - the posture contradicts the label, e.g. a push-up with an upright torso;
  - the exercise's joint barely moves;
  - it might be an unmodelled sit-up;
  - max p < 0.70. The 0.70 threshold was picked on group-held-out train predictions to reach ≥95% accuracy when confident.
- **Reps** come from the existing `counter.py`, counted for the expected exercise if one is given.
- **Export:** `model/exercise_clf.json` holds the feature order, signal/stat definitions, scaler, coefficients, thresholds, abstain rules and a selftest vector. Inference in `classify.py` reads only this JSON, so a TS port that passes the selftest and uses the same signal definitions matches the Python.
- **LR vs boosting:** in group CV, HistGradientBoosting scored macro-F1 0.895 vs 0.887 for LR. That gap is within noise, under the 0.03 margin we set, and a port would need ~200 trees per class, so LR ships. The `guess_exercise` rules baseline scores 0.36.

```sh
REPCOUNT_DATA=/path/to/finetune/data/exercise_frames .venv/bin/python -m repcount.dataset --workers 6  # cache pose (~20 min CPU)
.venv/bin/python -m repcount.train_clf     # CV -> model/exercise_clf.json -> test report in reports/
.venv/bin/python -m repcount.cli clip.mp4 --classify --exercise pushup
```

### Test split (`index.jsonl` split=test, 86 clips, group-disjoint from train; run once after model selection)
| class | n | precision | recall | coverage (not abstained) | precision when confident |
|---|---|---|---|---|---|
| push_up | 13 | 0.77 | 1.00 | 1.00 | 1.00 |
| squat | 13 | 1.00 | 0.77 | 0.54 | 1.00 |
| lunge | 15 | 0.77 | 0.67 | 0.60 | 1.00 |
| jumping_jack | 15 | 1.00 | 1.00 | 0.93 | 1.00 |
| none | 30 | 0.84 | 0.87 | 0.47 | 0.78 |

- **Accuracy:** 0.86 without abstaining. With abstaining, the **abstain rate is 34%** (13 no-person, 18 low-confidence, 3 posture, 1 low-motion, 1 possible sit-up) and **accuracy when confident is 0.93** (53/57).
- **All 4 confident errors are lunge → none.** In the fusion these become rejections of real lunges, so lunge proofs are the weak spot. In train CV the main confident confusion was none ↔ push_up instead.
- **Gated confusion (rows = truth):**
  - push_up: 13 correct.
  - squat: 7 correct, 6 abstain.
  - lunge: 5 correct, 4 called none, 6 abstain.
  - jumping_jack: 14 correct, 1 abstain.
  - none: 14 correct, 16 abstain (mostly close-ups with no hips in frame).
- **Latency (CPU, aarch64):** classify takes 3.8 ms per clip (p95 4.2 ms: features + LR + rep count). MediaPipe pose (full model) dominates at ~105 ms/frame, which is **~7.9 s for a median 5.8 s clip** (73 frames at 12.5 fps, measured serially).
- **Sit-ups:** not in the index yet, so the model has no `sit_up` class and its `supported` list omits it. The fusion therefore sends sit-up tasks to the VLM, and horizontal hip-folding clips abstain. When `situp_cc` rows land in the index, re-run `dataset` + `train_clf` and the class is added automatically.
- **Limitations:**
  - The test set is small (13–30 clips per class), so expect ±10 points on any per-class number.
  - UCF101 clips are YouTube footage, not phone proof clips, so treat these numbers as indicative.
  - The `none` class is only 5 activities (eye makeup, cooking, guitar, typing, dog walking), so near-misses such as burpees, planks or stretching are untested.
  - One person per clip; MediaPipe picks one pose.
  - **Licence:** the coefficients are fitted on UCF101 (non-commercial research licence). Retrain on own/CC clips before shipping in the product. Landmark caches (`.cache/`) and reports stay local.
