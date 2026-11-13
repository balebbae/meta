# Model card: Rally proof checker (Muse Glimmer 30B + `exercise_check` LoRA)

## What it does
When someone logs a Rally move or a workout, the app asks: **does this proof actually show today's task?**
Given today's task text (for example `"squats × 20"` or `"run 5 km"`) and **one photo or 3 stills from a short clip**, the
model returns compact JSON:

```json
{"shows": "exercise_frames", "ex": "lunge", "match": false, "km": null, "min": null, "steps": null,
 "ok": false, "why": "Lunges visible in the clip, but the task is squats."}
```

| Field | Meaning |
|---|---|
| `shows` | `exercise_frames`, `workout_screen`, `race_bib`, `not_a_workout`, or `unclear` |
| `ex` | `push_up`, `squat`, `lunge`, `jumping_jack`, `sit_up`, `run`, `walk`, `ride`, `other`, `none` |
| `match` | whether what's shown is today's task |
| `km`, `min`, `steps` | numbers read off a workout screen (miles converted to km, mm:ss to minutes), else null |
| `ok` | approve the proof (a workout is shown **and** it matches the task) |
| `why` | one short reason (≤ 15 words) |

It does **not** count reps or judge form (code does that: `repcount/`), and it never comments on a person's body.

## How it fits into the app
1. **Clip proof, on the phone:** MediaPipe pose runs in the browser (`components/rally/clip.ts`) and a small pose
   classifier (`lib/rally/pose-classify.ts`) names the exercise. Video never leaves the phone; only the verdict and
   1–3 stills are sent.
2. **Server:** `lib/rally/proof-fusion.ts` combines pose with this vision check. Pose may **reject** a clearly wrong
   exercise on its own, but **approval always needs the vision check**, because the pose verdict comes from the client.
3. **Vision check:** `lib/rally/proof.ts` calls this model when `GLIMMER_PROOF_URL` is set, else hosted Muse Ember.
   On a timeout or error it falls back to Ember; if that also fails, the proof stays **pending** (no damage).

## Model and training
- **Base:** Meta Muse Glimmer 30B (open weights, Apache 2.0), 4-bit (`unsloth/Muse-Glimmer-30B-unsloth-bnb-4bit`).
- **Method:** QLoRA with Unsloth: rank 16 LoRA on language **and** vision layers (131 M trainable parameters,
  0.44%), 1 epoch over 1,200 examples, batch 2 × 8 accumulation, learning rate 2e-4, reasoning strength "low".
- **Hardware:** one NVIDIA DGX Spark (GB10), 2 h 47 min. The GPU was clock-limited (~650 MHz) during the run.
- **Loss:** 0.71 → ~0.01. Training loss this low means it fits the synthetic format closely, so we judge it only on
  held-out and **real** photos (below).
- **Code:** `rally_ft/tasks/exercise_check.py` (data, prompt, schema, grader), `train/sft.py` (training).

## Data
No user data, and no WHOOP data, is used anywhere.

| Slice | Source | Labels |
|---|---|---|
| Workout screens (treadmill, watch, bike, rower, phone) incl. idle/zero/menu/odometer negatives | Rendered by code (`rally_ft/imaging.py`, `tasks/proof.py`) | Exact, from the generator |
| Exercise clips: push-ups, squats, lunges, jumping jacks + non-exercise clips | UCF101 (official download), 3 stills per clip | Dataset classes |
| Single photos of exercises (incl. sit-ups) | Wikimedia Commons / Openverse, CC-licensed, each checked by eye | Hand-checked |
| Wrong-task pairs, junk photos, race bibs | Generated from the above | Code |

**Licences:** UCF101 is **research-only**, so this LoRA is for the hackathon demo, not commercial use; retrain on
own or CC data before shipping. CC images' attributions are in `data/exercise_frames/*_manifest.csv` (gitignored data).

## Outcome (Nov 13, 2026): not shipped
**The fine-tune did not beat hosted Muse Ember, so the app keeps on-device pose + Ember.** Full tables:
[RESULTS.md](RESULTS.md).

| All fields correct | Ember | Glimmer + LoRA |
|---|---|---|
| Held-out mix (300) | **94.7%** | 91.0% |
| Single real exercise photos (124) | **93.5%** | 92.7% |
| Real screen photos, Photo Proof prompt (84) | **71.4%** | 28.6% |
| Median latency | **0.8–1.1 s** | 14–23 s |

What we learned:
- **Ember was already strong.** One prompt sentence (idle, menu, all-zero and odometer screens aren't proof) lifted
  Ember from 56% to 71% on real screen photos. That sentence is in production (`lib/activities/proof.ts`).
- **Train and serve on the same weights.** We trained on the 4-bit base, but vLLM 0.33 can't serve bitsandbytes 4-bit,
  so we served the LoRA merged into bf16 weights quantised to FP8. LoRA corrections learned against 4-bit weights don't
  transfer cleanly. Next time: train in bf16 (or FP8) and serve the same.
- **Narrow fine-tunes forget other formats.** On the Photo Proof prompt it never trained on, numbers and
  "not a workout" collapsed. Train on every prompt/schema the app sends, or keep one task per endpoint.
- **This GPU was clock-limited** (~650–690 MHz under load), making training ~3–4× and serving ~10× slower than a
  healthy GB10. Fix the power adapter / reset clocks before the next run.

Next attempt, if wanted: bf16 LoRA on 3,000+ examples, 2 epochs, both prompts, a real-photo dev set for early
stopping, on a healthy GPU (~1–2 h).

## Evaluation
Same prompt, JSON schema and rows for every model; results in **[RESULTS.md](RESULTS.md)**.
- **Held-out mix (300):** synthetic screens + UCF101 groups never seen in training.
- **Single exercise photos (124):** real CC photos, never trained on.
- **Real screen photos (84):** real CC photos of treadmills, watches, bike computers, rowers, apps; hand-labelled and
  re-checked (`data/real_photos/CONVENTIONS.md`). This set uses the Photo Proof prompt, which the LoRA was not trained on.
- Hosted baselines (final prompt): Ember 71.4% / 94.7% / 93.5% all-fields on these three sets, 0.8 s median.

## Known limits
- Synthetic screens and research video are not phone photos; the real-photo sets are the honest test, and a team set
  of 30–50 real phone clips is still to come.
- Five exercises only. Anything else comes back as `other`/`none` and falls to Ember or pending.
- Served locally at ~690 MHz GPU clock, latency is several seconds per check, slower than hosted Ember.

## Live for clip proof (Nov 13, 2026)
After the eval, the team chose to run it for **Rally clip proof only**, where it is within noise of Ember (92.7% vs
93.5% on single exercise photos) and keeps proof stills on our own GPU instead of a third-party API. To avoid a ~10 s
wait, a clip move is saved **pending** at once and `settleClipProof()` (`lib/rally/queries.ts`, via Next `after()`)
applies the damage when Glimmer approves; Ember is the fallback on error. Photo proof and dares (workout screens,
where it scored 28.6%) stay on Ember. Turn it off by removing `GLIMMER_PROOF_URL` in Vercel.

## Hosting
vLLM 0.33 can't apply LoRA to vision layers or serve bitsandbytes 4-bit, so the adapter is merged into the weights with
`train/merge_lora.py` (streams one tensor at a time) and served as a plain checkpoint with `--quantization fp8`:
`finetune/ops/serve.sh` (127.0.0.1:8010, API key in `~/.config/rally/glimmer.key`) and `finetune/ops/tunnel.sh`
(Cloudflare quick tunnel). The app hookup (`lib/rally/proof.ts`) is active when `GLIMMER_PROOF_URL` is set in Vercel; see
[NEXT_STEPS.md](NEXT_STEPS.md). It depends on the DGX staying on and the tunnel URL not changing.
