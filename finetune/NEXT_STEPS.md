# Fine-tuned Rally proof check: what to do when training finishes

Everything here runs **on the DGX Spark**. SSH in, then `cd ~/projects/meta-hackathon-veer/meta`.
If a terminal with Claude Code is open (`tmux attach -t ml-training-task-triage`), you can just ask it to do these steps.

## 0. Where things stand (Nov 13, ~1 AM CT)
- A QLoRA fine-tune of Muse Glimmer 30B on the `exercise_check` task is training: 75 steps, ETA **~2:05 AM CT**.
- When it finishes, the DGX automatically serves it and scores it against Ember/Spark on the same test sets (~40 min).
  You don't need to start anything.
- Bar to beat (Ember, current prompt): **71.4%** all-fields on 84 real screen photos, **94.7%** on the 300-row held-out
  mix, **93.5%** on 124 single exercise photos, **0.8 s** median latency.

## 1. Check progress (any time, safe)
```bash
bash finetune/ops/status.sh
```
It shows the training step, eval progress, and the verdict once results exist. Logs live in `finetune/logs/`.

## 2. Read the results (~2:45 AM)
```bash
finetune/.venv/bin/python finetune/ops/results.py     # also writes finetune/RESULTS.md
```
**Ship rule:** only switch the app to the fine-tuned model if it beats Ember on the **real screen photos** by a clear
margin (≥ 5 points all-fields) and isn't worse on the other two sets. Otherwise do nothing: the app keeps using
on-device pose + Ember, which is already on `main` and works.

## 3. If it ships: serve it and expose it
```bash
bash finetune/ops/serve.sh        # waits until READY (~5 min); model name = exercise_check
bash finetune/ops/tunnel.sh       # prints a public https://….trycloudflare.com URL
```
- The server listens only on 127.0.0.1:8010 and needs an API key; the key is in `~/.config/rally/glimmer.key`.
  **Don't paste the key in group chats.** Put it straight into Vercel.
- **Never use port 8000.** It belongs to the DGX's own vLLM autoscaler.
- The tunnel URL changes if `tunnel.sh` restarts. Update Vercel if it does.

## 4. Turn it on in the app (Vercel)
1. Merge the PR **"Rally proof: env-gated self-hosted Glimmer…"** (branch `glimmer-proof-endpoint`). With no env vars
   set it changes nothing, so merging is safe even before step 3.
2. In Vercel → Project → Settings → Environment Variables (Production), set:
   - `GLIMMER_PROOF_URL` = the tunnel URL **plus `/v1`**
   - `GLIMMER_PROOF_KEY` = contents of `~/.config/rally/glimmer.key`
   - `GLIMMER_PROOF_MODEL` = `exercise_check`
3. Redeploy. Rally proof now asks Glimmer first; on any error or after 6 s it falls back to Ember, and if both fail the
   proof stays pending (no damage).

## 5. Turn it off / roll back
- Remove `GLIMMER_PROOF_URL` in Vercel and redeploy: back to Ember instantly.
- `bash finetune/ops/tunnel.sh stop` and `bash finetune/ops/serve.sh stop` free the GPU.

## 6. If something goes wrong
| Symptom | Fix |
|---|---|
| `status.sh` says the log is silent for > 10 min | Training stalled. Tell Veer; don't kill it without checking `nvidia-smi` first. |
| Eval says `VLLM_DIED` | Check `finetune/logs/vllm-eval.log` (usually memory). Stop other GPU users and ask Claude to rerun the eval. |
| `serve.sh` says something is on 8010 | The automatic eval is still running. Wait for `ALL_DONE` in `status.sh`. |
| Machine slow or out of memory | Other services (ComfyUI, Open WebUI, LoopRunner) share the 128 GB. Don't start a second model. |

## Also needed on production regardless of the fine-tune
- Run the DB migration once: `DATABASE_URL='<prod Neon URL>' pnpm db:setup` (schema only on a seeded DB; **never `--reset`**).
- `MODEL_API_KEY` must be set in Vercel: Rally proof fails closed without it.
- Optional: `QUIET_HOURS_TZ=America/Chicago` to enable push quiet hours (off by default).
