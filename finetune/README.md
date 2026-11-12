# finetune/: Muse Glimmer 30B fine-tuning for Activities / Rally

A self-contained Python project (it doesn't touch the Next.js app). It has synthetic datasets with exact graders, training scripts, and an eval harness for three tasks:

| Task | What the model learns | Why fine-tune |
|---|---|---|
| `mapper` | Messy text (workout logs, Marketplace titles, Event blurbs, video summaries) → ontology terms: activity, 2024 Compendium code, equipment, normalized metrics | One shared vocabulary for scoring (MET-minutes) and feed tagging |
| `private_muse` | Answer a game's question from the owner's vault at exactly the precision the share policy allows, or refuse. Never leak other values | The on-device privacy agent; rewards are verifiable (correctness + leak check), so it works for GRPO |
| `proof` | Photo of a treadmill / watch / pool / rowing-monitor / bike screen → structured workout | Photo Proof without sending photos to the cloud |

All targets are computed by code, so there are no hand labels and no real user or health data. WHOOP data is never used (WHOOP's API terms ban using it to train models).

## Layout
- `rally_ft/ontology.json`: activities with 2024 Adult Compendium of Physical Activities codes and MET values, metrics (units, rounding step, sensitivity category), default share levels per audience
- `rally_ft/ontology.py`: `resolve()` (speed/watt bands → Compendium code), `met_minutes()`, `round_metric()`, `allows()`
- `rally_ft/tasks/{mapper,private_muse,proof}.py`: generator, `SCHEMA`, `grade()`; `private_muse` also has GRPO reward functions
- `rally_ft/build.py`: writes `data/<task>/{train,val,test}.jsonl` (train rows include `sft_messages`)
- `rally_ft/eval.py`: scores any OpenAI-compatible endpoint (Meta Model API, or vLLM/SGLang/llama.cpp serving Glimmer); writes `reports/`
- `train/sft.py`: Unsloth LoRA SFT (text tasks, and vision for `proof`)
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
| proof | all-fields 0.68 (activity 0.80, numbers 0.88) | Mostly activity confusions (run vs walk) |

These numbers are the bar a fine-tuned Glimmer needs to beat. Re-run the eval to compare.
