# Runbook: fine-tune Muse Glimmer 30B on the DGX Spark

This file is written for a coding agent (e.g. Claude Code) running on the DGX Spark. Run each step in order from the `finetune/` directory, and stop to report if a step fails. Don't edit the Next.js app outside `finetune/`.

## 0. Preconditions
- DGX Spark (GB10, 128 GB unified memory) with the NVIDIA driver and CUDA working: `nvidia-smi` shows the GPU.
- Python 3.10+ and `uv` (`curl -LsSf https://astral.sh/uv/install.sh | sh`).
- About 150 GB of free disk space: bf16 weights are ~60 GB, plus the HF cache and checkpoints.
- Optional: `META_API_KEY` in the environment, only if you want the cloud baseline eval (step 3).

## 1. Install
```sh
cd finetune
uv venv --python 3.12 && source .venv/bin/activate
uv pip install -e ".[train,eval]" pytest ruff
python -c "import transformers, torch; print(transformers.__version__, torch.cuda.is_available())"   # expect 5.15.0 True
pytest -q                                                                                             # expect 8 passed
```
- If `unsloth` fails to install on aarch64, follow Unsloth's DGX Spark guide (https://unsloth.ai/docs/blog/fine-tuning-llms-with-nvidia-dgx-spark-and-unsloth). It uses their Docker image; mount this repo into it and repeat step 1 inside the container.
- `transformers` must be exactly 5.15.0 for the Glimmer architecture.

## 2. Build datasets
```sh
python -m rally_ft.build --task all --train 3000 --val 200 --test 200
```
This writes `data/<task>/{train,val,test}.jsonl`, plus `data/proof/images/`. It's deterministic (fixed seeds).

## 3. (Optional) Cloud baseline
```sh
for t in mapper private_muse proof; do python -m rally_ft.eval --task $t --model muse-ember-1.0 --n 100; done
```
Reports go to `reports/`. The README's baseline table used n=40.

## 4. Smoke test (~minutes)
Prove the pipeline end to end before long runs:
```sh
python train/sft.py --task mapper --out outputs/smoke --epochs 0.02
```
- **If memory is short:** add `--qlora` (4-bit base) and/or `--batch 1 --grad-accum 16`.
- **If the run stalls on download:** run `hf download meta-models/Muse-Glimmer-30B` first (or `unsloth/Muse-Glimmer-30B-unsloth-bnb-4bit` for `--qlora`).

## 5. Train (in this order)
```sh
python train/sft.py --task mapper --out outputs/mapper-lora
python train/sft.py --task private_muse --out outputs/private_muse-lora
python train/sft.py --task proof --out outputs/proof-lora                      # vision; slower
python train/grpo_private_muse.py --init outputs/private_muse-lora --out outputs/private_muse-grpo --steps 300
```
- Log the loss every few minutes. If any run is still going after ~3 hours, stop it, keep the latest checkpoint in `outputs/<name>/checkpoint-*`, and move on.
- GRPO is optional. Skip it if time is short, because SFT alone gives the before/after number.

## 6. Serve and evaluate
Serve the base model with the adapter through an OpenAI-compatible server. vLLM example (adjust to what's installed):
```sh
vllm serve meta-models/Muse-Glimmer-30B --enable-lora --lora-modules mapper=outputs/mapper-lora \
  private_muse=outputs/private_muse-lora proof=outputs/proof-lora --max-lora-rank 16 --port 8000
```
Then compare base vs fine-tuned:
```sh
for t in mapper private_muse proof; do
  python -m rally_ft.eval --task $t --base-url http://localhost:8000/v1 --api-key-env NONE --model meta-models/Muse-Glimmer-30B --effort '' --no-schema --n 200
  python -m rally_ft.eval --task $t --base-url http://localhost:8000/v1 --api-key-env NONE --model $t --effort '' --no-schema --n 200
done
```
- If vLLM won't serve Glimmer + LoRA on this box, merge the adapter instead (`model.save_pretrained_merged(...)` with Unsloth) and serve the merged model, or use llama.cpp after exporting to GGUF.
- If the base model doesn't support `reasoning_effort`, keep `--effort ''`.

## 7. Report back
- Copy the `summary` blocks from `reports/*.json` into a table: task × {Ember baseline, Glimmer base, Glimmer fine-tuned}, plus median latency.
- Commit **only** `finetune/RESULTS.md` (the table plus run settings: epochs, rank, wall time, peak memory).
- **Never commit** `data/`, `outputs/` or weights, which are git-ignored. Upload adapters to Hugging Face only if the team asks.
