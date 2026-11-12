"""Pre-training sanity check (no training, no full weight download). Run on the DGX Spark after `rally_ft.build`.

    python train/check_setup.py [--model meta-models/Muse-Glimmer-30B] [--max-seq 2048]

Checks: CUDA + versions, free disk, dataset files, and that Glimmer's chat template renders the exact
INSTRUCTION_PART / RESPONSE_PART markers sft.py masks on. If the markers are missing, train_on_responses_only
would mask every token and training would silently learn nothing. Also reports token lengths vs --max-seq.
"""

from __future__ import annotations

import argparse
import json
import shutil
import statistics
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from sft import INSTRUCTION_PART, RESPONSE_PART, with_reasoning  # noqa: E402

TASKS = ["mapper", "private_muse", "proof"]


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--model", default="meta-models/Muse-Glimmer-30B")
    p.add_argument("--data", type=Path, default=Path("data"))
    p.add_argument("--max-seq", type=int, default=2048)
    p.add_argument("--sample", type=int, default=200)
    a = p.parse_args()
    problems: list[str] = []

    import torch
    import transformers

    print(f"torch {torch.__version__}  transformers {transformers.__version__}  cuda {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        free, total = torch.cuda.mem_get_info()
        name, bf16 = torch.cuda.get_device_name(0), torch.cuda.is_bf16_supported()
        print(f"gpu {name}  free {free / 2**30:.0f}/{total / 2**30:.0f} GiB  bf16 {bf16}")
    else:
        problems.append("CUDA not available")
    if transformers.__version__ != "5.15.0":
        problems.append(f"transformers is {transformers.__version__}, expected 5.15.0")
    disk = shutil.disk_usage(Path.home()).free / 2**30
    print(f"free disk under ~: {disk:.0f} GiB")
    if disk < 150:
        problems.append(f"only {disk:.0f} GiB free disk (want ~150)")
    for mod in ("unsloth", "trl", "datasets"):
        try:
            m = __import__(mod)
            print(f"{mod} {getattr(m, '__version__', '?')}")
        except Exception as e:  # noqa: BLE001 - report any import failure
            problems.append(f"import {mod} failed: {e}")

    from transformers import AutoTokenizer

    tok = AutoTokenizer.from_pretrained(a.model)
    for task in TASKS:
        path = a.data / task / "train.jsonl"
        if not path.exists():
            problems.append(f"missing {path} (run rally_ft.build)")
            continue
        rows = [json.loads(line) for _, line in zip(range(a.sample), path.open(), strict=False)]
        lens = []
        for i, r in enumerate(rows):
            msgs = [
                {
                    "role": m["role"],
                    "content": m["content"]
                    if isinstance(m["content"], str)
                    else " ".join(x.get("text", "") for x in m["content"]),
                }
                for m in with_reasoning(r["sft_messages"], "low")
            ]
            text = tok.apply_chat_template(msgs, tokenize=False)
            if i == 0:
                print(f"\n--- {task} rendered sample (tail) ---\n{text[-400:]}\n")
                if "Reasoning strength: high" in text:
                    problems.append(f"{task}: template still defaults to high reasoning strength")
                for name, marker in (("INSTRUCTION_PART", INSTRUCTION_PART), ("RESPONSE_PART", RESPONSE_PART)):
                    if marker not in text:
                        problems.append(f"{task}: {name} {marker!r} not in rendered chat template")
            lens.append(len(tok(text)["input_ids"]))
        lens.sort()
        p95 = lens[int(0.95 * (len(lens) - 1))]
        note = " (proof adds image tokens on top)" if task == "proof" else ""
        print(f"{task}: tokens median {statistics.median(lens):.0f}  p95 {p95}  max {lens[-1]}{note}")
        if lens[-1] > a.max_seq:
            problems.append(f"{task}: longest example {lens[-1]} tokens > --max-seq {a.max_seq}")

    print("\nOK: ready to train" if not problems else "\nPROBLEMS:\n- " + "\n- ".join(problems))
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
