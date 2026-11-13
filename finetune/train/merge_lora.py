"""Merge a PEFT LoRA adapter into Muse Glimmer's bf16 weights by streaming one tensor at a time.

    .venv/bin/python train/merge_lora.py --adapter outputs/exercise_check-v1 --out outputs/exercise_check-v1-merged

Why: vLLM only applies LoRA to language-model layers, and this adapter also tunes the vision tower. Merging bakes
every layer in, so vLLM serves it as a plain checkpoint (e.g. with --quantization fp8). Streaming keeps peak memory
to one ~5 GB output shard; loading the whole 60 GB model in transformers OOM-killed this machine before.
W' = W + (alpha / r) * B @ A, computed in fp32 and stored as bf16.
"""

from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path

import torch
from huggingface_hub import snapshot_download
from safetensors import safe_open
from safetensors.torch import save_file

SHARD_BYTES = 5 * 1024**3


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--adapter", type=Path, required=True)
    p.add_argument("--out", type=Path, required=True)
    p.add_argument("--base", default="meta-models/Muse-Glimmer-30B")
    a = p.parse_args()

    base = Path(snapshot_download(a.base, allow_patterns=["*.json", "*.safetensors", "*.jinja", "*.txt", "*.model"]))
    cfg = json.loads((a.adapter / "adapter_config.json").read_text())
    if cfg.get("use_dora") or cfg.get("use_rslora"):
        raise SystemExit("DoRA/rsLoRA adapters are not supported by this merger")
    scale = cfg["lora_alpha"] / cfg["r"]

    lora: dict[str, dict[str, torch.Tensor]] = {}
    with safe_open(a.adapter / "adapter_model.safetensors", "pt") as f:
        for k in f.keys():
            name = k.replace("base_model.model.", "", 1)
            part = "A" if ".lora_A." in name else "B"
            target = name.replace(f".lora_{part}.weight", ".weight")
            lora.setdefault(target, {})[part] = f.get_tensor(k)

    index = json.loads((base / "model.safetensors.index.json").read_text())["weight_map"]
    missing = sorted(set(lora) - set(index))
    if missing:
        raise SystemExit(f"{len(missing)} adapter targets not in the base model, e.g. {missing[:3]}")

    a.out.mkdir(parents=True, exist_ok=True)
    new_map: dict[str, str] = {}
    buf: dict[str, torch.Tensor] = {}
    size = n_shard = merged = 0

    def flush() -> None:
        nonlocal buf, size, n_shard
        if not buf:
            return
        n_shard += 1
        name = f"model-{n_shard:05d}.safetensors"
        save_file(buf, a.out / name, metadata={"format": "pt"})
        for k in buf:
            new_map[k] = name
        print(f"wrote {name} ({size / 1024**3:.1f} GiB, {len(buf)} tensors)", flush=True)
        buf, size = {}, 0

    for shard in sorted(set(index.values())):
        with safe_open(base / shard, "pt") as f:
            for k in f.keys():
                w = f.get_tensor(k)
                if k in lora:
                    ab = lora[k]
                    delta = (ab["B"].float() @ ab["A"].float()) * scale
                    if delta.shape != w.shape:
                        raise SystemExit(f"shape mismatch for {k}: {tuple(delta.shape)} vs {tuple(w.shape)}")
                    w = (w.float() + delta).to(w.dtype)
                    merged += 1
                buf[k] = w.contiguous()
                size += w.numel() * w.element_size()
                if size >= SHARD_BYTES:
                    flush()
    flush()
    if merged != len(lora):
        raise SystemExit(f"merged {merged} of {len(lora)} adapter targets")

    total = sum((a.out / s).stat().st_size for s in set(new_map.values()))
    (a.out / "model.safetensors.index.json").write_text(json.dumps({"metadata": {"total_size": total}, "weight_map": new_map}, indent=2))
    for extra in base.iterdir():
        if extra.suffix != ".safetensors" and extra.name != "model.safetensors.index.json" and extra.is_file():
            shutil.copy(extra, a.out / extra.name)
    print(f"merged {merged} LoRA targets (scale {scale}) into {a.out}")


if __name__ == "__main__":
    main()
