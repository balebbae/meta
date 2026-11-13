# finetune/: Muse Glimmer 30B fine-tuning for Activities / Rally

A self-contained Python project (it doesn't touch the Next.js app). It has synthetic datasets with exact graders, training scripts, and an eval harness for four tasks:

| Task | What the model learns | Why fine-tune |
|---|---|---|
| `mapper` | Messy text (workout logs, Marketplace titles, Event blurbs, video summaries) → ontology terms: activity, 2024 Compendium code, equipment, normalized metrics | One shared vocabulary for scoring (MET-minutes) and feed tagging |
| `private_muse` | Answer a game's question from the owner's vault at exactly the precision the share policy allows, or refuse. Never leak other values | The on-device privacy agent; rewards are verifiable (correctness + leak check), so it works for GRPO |
| `proof` | Photo of a treadmill / watch / phone / bike / rower screen, race bib or non-workout → the app's `ProofResult` (same schema and prompt as `lib/activities/proof.ts`) | Photo Proof without sending photos to the cloud |
| `exercise_check` | Rally move proof (`lib/rally/proof.ts`): 1 photo or 3 clip stills + today's task text → `{shows, ex, match, km, min, steps, ok, why}`. Is it today's exercise, is it real workout proof, what numbers does a screen show. Reps and form stay in code | Fast on-device move check; Ember only guesses "plausibly shows" |

All targets are computed by code, so there are no hand labels and no real user or health data. WHOOP data is never used (WHOOP's API terms ban using it to train models).

## Layout
- `rally_ft/ontology.json`: activities with 2024 Adult Compendium of Physical Activities codes and MET values, metrics (units, rounding step, sensitivity category), default share levels per audience
- `rally_ft/ontology.py`: `resolve()` (speed/watt bands → Compendium code), `met_minutes()`, `round_metric()`, `allows()`
- `rally_ft/tasks/{mapper,private_muse,proof,exercise_check}.py`: generator, `SCHEMA`, `grade()`; `private_muse` also has GRPO reward functions
- `rally_ft/imaging.py`: Photo Proof rendering: seven-segment LCD digits, bezels, procedural backgrounds, perspective/glare/moiré/motion blur/JPEG
- `rally_ft/build.py`: writes `data/<task>/{train,val,test}.jsonl` (train rows include `sft_messages`)
- `rally_ft/eval.py`: scores any OpenAI-compatible endpoint (Meta Model API, or vLLM/SGLang/llama.cpp serving Glimmer); writes `reports/`
- `train/sft.py`: Unsloth LoRA SFT (text tasks, and vision for `proof` and `exercise_check`)
- `train/grpo_private_muse.py`: TRL GRPO from the SFT adapter

## On any machine
```sh
cd finetune
uv venv && uv pip install -e ".[eval]" pytest ruff
.venv/bin/pytest -q
.venv/bin/python -m rally_ft.build --task all --train 1500 --val 100 --test 100
META_API_KEY=... .venv/bin/python -m rally_ft.eval --task mapper --model muse-ember-1.0 --n 40
```

## On the DGX Spark (GB10)
Versions follow Unsloth's Muse Glimmer notebooks (transformers 5.15.0 is required for the Glimmer architecture).
```sh
uv pip install -e ".[train,eval]"
python train/sft.py --task mapper --out outputs/mapper-lora            # bf16 LoRA (>40 GB; Spark has 128 GB)
python train/sft.py --task proof --out outputs/proof-lora               # vision LoRA
python train/sft.py --task exercise_check --out outputs/exercise_check-lora   # vision LoRA, 1 or 3 images per row
python train/sft.py --task private_muse --out outputs/private_muse-lora
python train/grpo_private_muse.py --init outputs/private_muse-lora --out outputs/private_muse-grpo
# Serve (e.g. vLLM with the LoRA), then compare against the baseline:
python -m rally_ft.eval --task mapper --base-url http://localhost:8000/v1 --model <served-name> --effort '' --reasoning-strength low --no-schema
```
Add `--qlora` to `train/sft.py` to use the 4-bit Unsloth checkpoint if memory is tight. None of the training scripts have been run yet: this VM has no GPU.

## Baseline (Nov 12, Muse Ember 1.0 via Meta Model API, minimal reasoning, JSON schema, n=40 test rows each)
| Task | Score | Notes |
|---|---|---|
| mapper | all-fields 0.23 (kind 1.0, activity 0.70, Compendium code 0.53, equipment 0.78, metrics 0.98) | Weakest on Compendium codes and activity choice |
| private_muse | correct 0.60, status 0.83, leak rate 0.025 | Over- and under-refuses; 1 leak in 40 |
| proof | all-fields 0.68 (activity 0.80, numbers 0.88) | Old schema and old data (run/walk label was a coin flip); re-run on the new set |

## exercise_check data and licence
- Labels are computed by `exercise_check.gold()`: `ok` = shows a workout (`exercise_frames` | `workout_screen`) AND `match`. Mix: ~40% exercise frames (half matching task, half wrong task), ~30% workout screens from `proof.make_example` (task met, task short, or a different activity), ~30% negatives (non-exercise clips, proof's non-workout scenes, race bibs, illegible screens). Exercise rows use 1 still or all 3.
- Needs `data/exercise_frames/index.jsonl` (`--frames-dir` to point elsewhere); `--task exercise_check` fails with a clear message without it, and `--task all` skips it. Train/test come from the index's group-level `split`; val is ~10% of train groups. No clip or group crosses splits.
- **Data gap:** HMDB51 could not be downloaded, so the current index (714 UCF101 clips: push_up 102, squat 112, lunge 127, jumping_jack 123, none 250) has no sit-up clips. `sit_up` stays in the schema, but sit-ups only appear as wrong-task text, never as positives. Add sit-up clips (with `split`/`group`) and rebuild to cover it.
- **Licence:** the exercise frames come from UCF101 / HMDB51, which are for non-commercial research only. Don't redistribute the frames or ship them in the product. The build writes `data/exercise_check/LICENSE.txt`. WHOOP data is never used.
- `grade()` reports screen-number accuracy (screen rows), exercise accuracy (exercise rows), `reject` (wrong-task/junk rows not approved), `false_reject` (positives not approved) and `all`; eval adds per-case scores and p50/p95 latency.
- Real clips: `python -m rally_ft.eval --task exercise_check --model <m> --test-jsonl data/real_clips/test.jsonl --n 0` scores rows in the generated test-row format (`images` (1 or 3, relative to the JSONL), `task_text`, `target`; `ok` is recomputed).

Real photos: `python -m rally_ft.eval --task proof --model <m> --test-jsonl data/real_photos/labels.jsonl --n 0` scores rows of `{image, kind, distanceKm, durationMin, steps, verdict}` (image path relative to the JSONL).

These numbers are the bar a fine-tuned Glimmer needs to beat. Re-run the eval to compare.
