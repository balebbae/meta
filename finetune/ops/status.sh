#!/bin/bash
# One-glance status of the fine-tune: training progress, post-training eval, results. Safe to run any time.
#   bash finetune/ops/status.sh
cd "$(dirname "$0")/.." || exit 1
echo "== $(date '+%H:%M %Z')"
step=$(tr '\r' '\n' < logs/train-v1.log 2>/dev/null | grep -oE "\| [0-9]+/75 \[[^]]*\]" | tail -1)
if grep -q "EXIT=0" logs/train-v1.log 2>/dev/null; then echo "Training: DONE (adapter in outputs/exercise_check-v1)"
elif grep -qE "EXIT=[1-9]|Traceback|OutOfMemory" logs/train-v1.log 2>/dev/null; then echo "Training: FAILED, see logs/train-v1.log"; grep -E "Error|EXIT" logs/train-v1.log | tail -3
else echo "Training: running ${step:-starting}"; fi
age=$(( $(date +%s) - $(stat -c %Y logs/train-v1.log 2>/dev/null || date +%s) ))
[ $age -gt 600 ] && ! grep -q "EXIT=" logs/train-v1.log && echo "  WARNING: training log silent for ${age}s (possible stall)"
echo "Eval: $(grep -hE "SERVER_READY|EVAL_DONE|EVAL_FAILED|VLLM_DIED|NO_ADAPTER|ALL_DONE" logs/serve_eval.log 2>/dev/null | tail -1 || true)"
[ -s logs/serve_eval.log ] || echo "  (starts automatically when training finishes)"
nvidia-smi --query-gpu=utilization.gpu,memory.used --format=csv,noheader 2>/dev/null | sed 's/^/GPU: /'
if ls reports/glimmer-v1/*.json >/dev/null 2>&1; then echo; .venv/bin/python ops/results.py | sed -n '/## Verdict/,$p'; fi
