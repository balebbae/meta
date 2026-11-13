#!/bin/bash
# Serve fine-tuned Glimmer (base + exercise_check LoRA) for the app, on 127.0.0.1:8010 only.
# Port 8000 belongs to the DGX's own vLLM autoscaler; never use it.
#   bash finetune/ops/serve.sh          # starts in the background, prints model name + key location
#   bash finetune/ops/serve.sh stop
cd "$(dirname "$0")/.." || exit 1
PIDF=logs/serve.pid
if [ "$1" = stop ]; then [ -f $PIDF ] && kill "$(cat $PIDF)" && rm -f $PIDF && echo stopped; exit 0; fi
[ -f outputs/exercise_check-v1/adapter_config.json ] || { echo "No adapter yet: training not finished."; exit 1; }
pgrep -f "vllm serve .*--port 8010" >/dev/null && { echo "Something is already serving on 8010 (post-training eval still running?). Wait for it."; exit 1; }
KEYF=~/.config/rally/glimmer.key
[ -f $KEYF ] || { mkdir -p ~/.config/rally; (umask 077; head -c 24 /dev/urandom | base64 | tr -d '/+=' > $KEYF); }
setsid nohup .venv-vllm/bin/vllm serve meta-models/Muse-Glimmer-30B \
  --host 127.0.0.1 --port 8010 --api-key "$(cat $KEYF)" \
  --enable-lora --lora-modules exercise_check=outputs/exercise_check-v1 --max-lora-rank 16 \
  --limit-mm-per-prompt '{"image": 3}' --max-model-len 4096 --gpu-memory-utilization 0.62 \
  > logs/serve.log 2>&1 < /dev/null & echo $! > $PIDF
echo "Starting (takes ~5 min). Log: finetune/logs/serve.log"
for i in $(seq 1 60); do
  curl -sf -H "Authorization: Bearer $(cat $KEYF)" http://127.0.0.1:8010/v1/models | grep -q exercise_check && { echo "READY: model name = exercise_check"; echo "API key file: $KEYF (give it to whoever sets GLIMMER_PROOF_KEY; don't paste it in chat)"; exit 0; }
  kill -0 "$(cat $PIDF)" 2>/dev/null || { echo "vLLM exited; last log lines:"; tail -15 logs/serve.log; exit 1; }
  sleep 10
done
echo "Still loading after 10 min; check logs/serve.log"
