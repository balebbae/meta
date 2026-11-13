#!/bin/bash
# Serve the fine-tuned Glimmer (LoRA merged into the weights by train/merge_lora.py, FP8 on load) on 127.0.0.1:8010 only.
# Not in use: it did not beat Ember (RESULTS.md). vLLM 0.33 can't serve bitsandbytes 4-bit or LoRA on vision layers.
# Port 8000 belongs to the DGX's own vLLM autoscaler; never use it.
#   bash finetune/ops/serve.sh          # starts in the background, prints model name + key location
#   bash finetune/ops/serve.sh stop
export PATH="/home/testuser/projects/meta-hackathon-veer/meta/finetune/.venv-vllm/bin:$PATH"  # vLLM JIT-compiles FP8 kernels with ninja
cd "$(dirname "$0")/.." || exit 1
PIDF=logs/serve.pid
if [ "$1" = stop ]; then [ -f $PIDF ] && kill "$(cat $PIDF)" && rm -f $PIDF && echo stopped; exit 0; fi
[ -f outputs/exercise_check-v1-merged/model.safetensors.index.json ] || { echo "No merged model: run .venv/bin/python train/merge_lora.py --adapter outputs/exercise_check-v1 --out outputs/exercise_check-v1-merged"; exit 1; }
pgrep -f "vllm serve .*--port 8010" >/dev/null && { echo "Something is already serving on 8010 (post-training eval still running?). Wait for it."; exit 1; }
KEYF=~/.config/rally/glimmer.key
[ -f $KEYF ] || { mkdir -p ~/.config/rally; (umask 077; head -c 24 /dev/urandom | base64 | tr -d '/+=' > $KEYF); }
setsid nohup .venv-vllm/bin/vllm serve outputs/exercise_check-v1-merged --served-model-name exercise_check --quantization fp8 --max-num-seqs 8 \
  --host 127.0.0.1 --port 8010 --api-key "$(cat $KEYF)" \
  --limit-mm-per-prompt '{"image": 3}' --max-model-len 4096 --gpu-memory-utilization 0.40 \
  > logs/serve.log 2>&1 < /dev/null & echo $! > $PIDF
echo "Starting (takes ~5 min). Log: finetune/logs/serve.log"
for i in $(seq 1 60); do
  curl -sf -H "Authorization: Bearer $(cat $KEYF)" http://127.0.0.1:8010/v1/models | grep -q exercise_check && { echo "READY: model name = exercise_check"; echo "API key file: $KEYF (give it to whoever sets GLIMMER_PROOF_KEY; don't paste it in chat)"; exit 0; }
  kill -0 "$(cat $PIDF)" 2>/dev/null || { echo "vLLM exited; last log lines:"; tail -15 logs/serve.log; exit 1; }
  sleep 10
done
echo "Still loading after 10 min; check logs/serve.log"
