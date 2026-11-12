"""Evaluate any OpenAI-compatible endpoint (Meta Model API, vLLM/SGLang/llama.cpp serving Glimmer) on a test split.

uv run python -m rally_ft.eval --task mapper --model muse-ember-1.0 --n 50
uv run python -m rally_ft.eval --task proof --base-url http://dgx:8000/v1 --model glimmer-lora --no-schema
"""

from __future__ import annotations

import argparse
import base64
import json
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
                    parts.append({"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}})
                else:
                    parts.append({"type": "text", "text": p["text"]})
            c = parts
        out.append({"role": m["role"], "content": c})
    return out


def run(args) -> dict:
    from openai import OpenAI

    client = OpenAI(base_url=args.base_url, api_key=os.environ.get(args.api_key_env, "none"), timeout=120)
    mod = TASKS[args.task]
    rows = [json.loads(line) for line in (args.data / args.task / "test.jsonl").open()][: args.n]

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
        return {"id": r["id"], "latency_s": round(dt, 2), "grade": g, "pred": pred, "target": r["target"], "raw": text[:500]}

    with ThreadPoolExecutor(args.workers) as ex:
        results = list(ex.map(one, rows))
    keys = results[0]["grade"].keys() if results else []
    summary = {
        "task": args.task,
        "model": args.model,
        "base_url": args.base_url,
        "n": len(results),
        "metrics": {k: round(statistics.mean(r["grade"][k] for r in results), 3) for k in keys},
        "latency_median_s": round(statistics.median(r["latency_s"] for r in results), 2) if results else None,
    }
    args.report_dir.mkdir(parents=True, exist_ok=True)
    name = f"{args.task}__{args.model.replace('/', '_')}.json"
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
    p.add_argument("--n", type=int, default=50)
    p.add_argument("--workers", type=int, default=6)
    p.add_argument("--max-tokens", type=int, default=2000)
    p.add_argument("--data", type=Path, default=Path("data"))
    p.add_argument("--report-dir", type=Path, default=Path("reports"))
    print(json.dumps(run(p.parse_args()), indent=1))


if __name__ == "__main__":
    main()
