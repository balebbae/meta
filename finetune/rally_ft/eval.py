"""Evaluate any OpenAI-compatible endpoint (Meta Model API, vLLM/SGLang/llama.cpp serving Glimmer) on a test split.

uv run python -m rally_ft.eval --task mapper --model muse-ember-1.0 --n 50
uv run python -m rally_ft.eval --task proof --base-url http://dgx:8000/v1 --model glimmer-lora --no-schema
uv run python -m rally_ft.eval --task proof --model muse-ember-1.0 --test-jsonl data/real_photos/labels.jsonl --n 0
uv run python -m rally_ft.eval --task exercise_check --model muse-ember-1.0 --test-jsonl data/real_clips/test.jsonl --n 0

Images in a user turn (proof: 1, exercise_check: 1 or 3 clip stills) are sent as image_url parts in order.
"""

from __future__ import annotations

import argparse
import base64
import json
import math
import mimetypes
import os
import statistics
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from rally_ft.build import TASKS
from rally_ft.common import extract_json


def _to_openai(messages: list[dict]) -> list[dict]:
    out = []
    for m in messages:
        c = m["content"]
        if isinstance(c, list):
            parts = []
            for p in c:
                if p["type"] == "image":
                    b64 = base64.b64encode(Path(p["image"]).read_bytes()).decode()
                    mime = mimetypes.guess_type(p["image"])[0] or "image/png"
                    parts.append({"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}})
                else:
                    parts.append({"type": "text", "text": p["text"]})
            c = parts
        out.append({"role": m["role"], "content": c})
    return out


def load_rows(args) -> list[dict]:
    """The synthetic test split, or an external JSONL (e.g. real photos) via the task's load_jsonl()."""
    mod = TASKS[args.task]
    if getattr(args, "test_jsonl", None):
        if not hasattr(mod, "load_jsonl"):
            raise SystemExit(f"--test-jsonl is not supported for task {args.task}")
        rows = mod.load_jsonl(args.test_jsonl)
    else:
        rows = [json.loads(line) for line in (args.data / args.task / "test.jsonl").open()]
    return rows[: args.n] if args.n > 0 else rows


def _pct(xs: list[float], q: float) -> float | None:
    """Nearest-rank percentile."""
    if not xs:
        return None
    xs = sorted(xs)
    return xs[min(len(xs) - 1, max(0, math.ceil(q * len(xs)) - 1))]


def summarize(results: list[dict]) -> dict:
    keys = list(results[0]["grade"]) if results else []
    # A grade of None means "doesn't apply to this row" (e.g. exercise_check numbers on non-screen rows).
    metrics, metric_n = {}, {}
    for k in keys:
        vals = [r["grade"][k] for r in results if r["grade"].get(k) is not None]
        metrics[k] = round(statistics.mean(vals), 3) if vals else None
        metric_n[k] = len(vals)
    out = {"metrics": metrics}
    if any(n != len(results) for n in metric_n.values()):
        out["metric_n"] = metric_n
    lat = [r["latency_s"] for r in results if r.get("latency_s") is not None]
    if lat:
        out["latency_p50_s"], out["latency_p95_s"] = round(_pct(lat, 0.5), 2), round(_pct(lat, 0.95), 2)
    cases: dict[str, list[dict]] = {}
    for r in results:
        if r.get("case"):
            cases.setdefault(r["case"], []).append(r)
    if cases:  # exercise_check: all-fields and approval accuracy per generated case
        out["by_case"] = {
            c: {
                "n": len(g),
                "all": round(statistics.mean(r["grade"]["all"] for r in g), 3),
                "approved": round(statistics.mean(r["grade"]["approved"] for r in g), 3),
            }
            for c, g in sorted(cases.items())
        }
    groups: dict[str, list[dict]] = {}
    for r in results:
        if isinstance(r["target"], dict) and "verdict" in r["target"]:
            groups.setdefault(r["target"]["verdict"], []).append(r)
    if groups:  # proof: all-fields score per true verdict
        out["by_verdict"] = {
            v: {"n": len(g), "all": round(statistics.mean(r["grade"]["all"] for r in g), 3)} for v, g in groups.items()
        }
    return out


def run(args) -> dict:
    from openai import OpenAI

    client = OpenAI(base_url=args.base_url, api_key=os.environ.get(args.api_key_env, "none"), timeout=120)
    mod = TASKS[args.task]
    rows = load_rows(args)

    def one(r):
        kw = {"model": args.model, "messages": _to_openai(r["messages"]), "max_completion_tokens": args.max_tokens}
        if args.effort:
            kw["reasoning_effort"] = args.effort
        if args.reasoning_strength:  # local Glimmer servers (vLLM/SGLang): match the strength used in training
            kw["extra_body"] = {"chat_template_kwargs": {"reasoning_strength": args.reasoning_strength}}
        if args.schema:
            kw["response_format"] = {
                "type": "json_schema",
                "json_schema": {"name": args.task, "strict": True, "schema": mod.SCHEMA},
            }
        t = time.time()
        try:
            text = client.chat.completions.create(**kw).choices[0].message.content or ""
        except Exception as e:  # noqa: BLE001 - report API errors as failed rows
            text = f"ERROR {e}"
        dt = time.time() - t
        pred = extract_json(text)
        if args.task == "private_muse":
            g = mod.grade(pred, r["target"], raw_text=text, secrets=r.get("secrets"))
        else:
            g = mod.grade(pred, r["target"])
        out = {"id": r["id"], "latency_s": round(dt, 3), "grade": g, "pred": pred, "target": r["target"], "raw": text[:500]}
        if r.get("case"):
            out["case"] = r["case"]
        if r.get("images"):
            out["n_images"] = len(r["images"])
        return out

    with ThreadPoolExecutor(args.workers) as ex:
        results = list(ex.map(one, rows))
    summary = {
        "task": args.task,
        "model": args.model,
        "base_url": args.base_url,
        "test_set": str(args.test_jsonl) if args.test_jsonl else "synthetic",
        "n": len(results),
        **summarize(results),
        "latency_median_s": round(statistics.median(r["latency_s"] for r in results), 2) if results else None,
    }
    args.report_dir.mkdir(parents=True, exist_ok=True)
    suffix = f"__{args.test_jsonl.parent.name}" if args.test_jsonl else ""
    name = f"{args.task}__{args.model.replace('/', '_')}{suffix}.json"
    (args.report_dir / name).write_text(json.dumps({"summary": summary, "rows": results}, indent=1))
    return summary


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--task", required=True, choices=list(TASKS))
    p.add_argument("--model", required=True)
    p.add_argument("--base-url", default="https://api.meta.ai/v1")
    p.add_argument("--api-key-env", default="META_API_KEY")
    p.add_argument("--effort", default="minimal", help="reasoning_effort; pass '' to omit (local servers)")
    p.add_argument("--reasoning-strength", default="", help="local Glimmer only, e.g. 'low' (matches train/sft.py)")
    p.add_argument("--no-schema", dest="schema", action="store_false", help="skip json_schema response_format")
    p.add_argument("--n", type=int, default=50, help="max rows; 0 = all")
    p.add_argument("--test-jsonl", type=Path, default=None, help="score this JSONL instead (real photos / clips)")
    p.add_argument("--workers", type=int, default=6)
    p.add_argument("--max-tokens", type=int, default=2000)
    p.add_argument("--data", type=Path, default=Path("data"))
    p.add_argument("--report-dir", type=Path, default=Path("reports"))
    print(json.dumps(run(p.parse_args()), indent=1))


if __name__ == "__main__":
    main()
