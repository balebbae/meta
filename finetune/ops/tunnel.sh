#!/bin/bash
# Give the local Glimmer server (127.0.0.1:8010, API-key protected) a public HTTPS URL via a Cloudflare quick tunnel.
# Run only after ops/serve.sh says READY and only if RESULTS.md says ship. The URL changes every time this restarts.
#   bash finetune/ops/tunnel.sh        # prints https://<random>.trycloudflare.com
#   bash finetune/ops/tunnel.sh stop
cd "$(dirname "$0")/.." || exit 1
PIDF=logs/tunnel.pid
if [ "$1" = stop ]; then [ -f $PIDF ] && kill "$(cat $PIDF)" && rm -f $PIDF && echo stopped; exit 0; fi
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8010/v1/models | grep -q 401 || { echo "Glimmer isn't serving on 8010 (or has no API key). Run ops/serve.sh first."; exit 1; }
setsid nohup cloudflared tunnel --no-autoupdate --url http://127.0.0.1:8010 > logs/tunnel.log 2>&1 < /dev/null & echo $! > $PIDF
for i in $(seq 1 30); do
  url=$(grep -oE "https://[a-z0-9-]+\.trycloudflare\.com" logs/tunnel.log | head -1)
  [ -n "$url" ] && { echo "PUBLIC URL: $url"; echo "Set in Vercel: GLIMMER_PROOF_URL=$url/v1  GLIMMER_PROOF_MODEL=exercise_check  GLIMMER_PROOF_KEY=<contents of ~/.config/rally/glimmer.key>"; exit 0; }
  sleep 2
done
echo "No URL yet; see logs/tunnel.log"
