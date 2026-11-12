# embed: activity embedding model

Small sentence-embedding model that maps any feed text (Reels captions, Event blurbs, Marketplace titles, workout logs) to the Activities ontology. It's for Discover search, the activity filter chips, and "gear for your quest" matching. Each lookup takes milliseconds and needs no Muse call.

- **Base:** `BAAI/bge-small-en-v1.5` (33M params, MIT). It's contrastively fine-tuned (MultipleNegativesRankingLoss) on query→activity pairs generated from `finetune/`'s mapper generator, so no user data is used.
- **Held-out test:** `rally_embed/realistic_test.jsonl` has 82 hand-written, real-world-style strings ("Concept2 Model D erg, PM5 monitor", "Couch to 5K week 3 done"). The generator never produces them, and a test checks that.

## Results (retrieval over the 15 activities)
| Model | Realistic top-1 | Realistic top-3 | Templated top-1 | ms/query (CPU) |
|---|---|---|---|---|
| bge-small (base) | 0.768 | 0.927 | 0.817 | 3.3 |
| bge-base (base, 110M) | 0.878 | 0.939 | 0.938 | 5.9 |
| **bge-small fine-tuned** (recommended) | **0.866** | **0.951** | 1.000 | 2.4 |
| bge-base fine-tuned | 0.866 | 0.951 | 1.000 | ~6 |

- Templated top-1 only measures in-distribution fit. The realistic column is the one that counts.
- Fine-tuning lifts bge-small by ~10 points, to the level of the 3x larger bge-base, at half the latency. Fine-tuning bge-base doesn't help: the synthetic templates are the ceiling, not model size.
- Without the alias templates, bge-small scored 0.890. That run never trained pilates, stretch or dance. With 82 test rows, 2 points is two examples, i.e. noise.
- **Remaining misses** are niche gear and gym slang: "Wahoo KICKR smart trainer", "Leg day: squats 5x5", "Track Tuesday: 8x400". The next gain comes from realistic training text (brand and gear alias lists, real captions), not more templates.
- **For the UI,** show the top 2–3 activities as suggested chips. Top-3 is 95%.

## Use
```sh
cd embed
uv venv && uv pip install -e ../finetune -e . pytest ruff     # on the 5070 Ti, install torch with CUDA (cu128) first
.venv/bin/pytest -q
.venv/bin/python -m rally_embed.train --out outputs/rally-embed            # bge-small: ~3 min on CPU, under a minute on a 5070 Ti
.venv/bin/python -m rally_embed.train --base BAAI/bge-base-en-v1.5 --out outputs/rally-embed-base
.venv/bin/python -m rally_embed.evaluate --model BAAI/bge-small-en-v1.5 --model outputs/rally-embed --show-misses
```
- **Queries** need the bge prefix `Represent this sentence for searching relevant passages: `. Activity documents don't (see `rally_embed/data.py`).
- **In the Next.js app:**
  - Export to ONNX (`optimum-cli export onnx --model outputs/rally-embed onnx/`) and run it with `@huggingface/transformers` (transformers.js) in a route handler.
  - Or precompute embeddings for every feed item and store them with pgvector on Neon.
  - The 15 activity vectors are a constant: a query is one embedding plus 15 dot products.
