"""LoRA SFT of Muse Glimmer 30B with Unsloth (run on the DGX Spark).

    python train/sft.py --task mapper --data data --out outputs/mapper-lora
    python train/sft.py --task proof  --data data --out outputs/proof-lora   # vision
    python train/sft.py --task exercise_check --data data --out outputs/exercise_check-lora   # vision, 1 or 3 images/row

Follows Unsloth's Muse Glimmer notebooks (transformers==5.15.0). bf16 LoRA needs >40 GB, which the
DGX Spark's 128 GB unified memory covers; pass --qlora to use the 4-bit checkpoint instead.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

# Glimmer chat-format markers used to train on the reply only (from Unsloth's notebooks).
INSTRUCTION_PART = "<|start|>user<|message|>"
RESPONSE_PART = "<|start|>assistant to=user<|message|>"
# Glimmer's template defaults to "Reasoning strength: high" unless the system text names one. Targets are
# reply-only (no reasoning), so train at a fixed low strength; serve with the same line or
# chat_template_kwargs={"reasoning_strength": "low"} so prompts match.
REASONING_LINE = "Reasoning strength: {}."
# Rows whose user turn holds images (exercise_check: 1 photo or 3 clip stills, in order).
VISION_TASKS = ("proof", "exercise_check")


def with_reasoning(messages: list[dict], strength: str) -> list[dict]:
    line = REASONING_LINE.format(strength)
    if not any(m["role"] == "system" for m in messages):
        # proof / exercise_check rows mirror the app (one user turn, no system prompt); serving with
        # chat_template_kwargs={"reasoning_strength": ...} renders the same system line.
        return [{"role": "system", "content": line}, *messages]
    out = []
    for m in messages:
        if m["role"] == "system" and isinstance(m["content"], str) and "reasoning strength" not in m["content"].lower():
            m = {**m, "content": f"{m['content']}\n\n{line}"}
        out.append(m)
    return out


def load_rows(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.open()]


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--task", required=True, choices=["mapper", "private_muse", "proof", "exercise_check"])
    p.add_argument("--data", type=Path, default=Path("data"))
    p.add_argument("--out", type=Path, required=True)
    p.add_argument("--qlora", action="store_true", help="4-bit base (unsloth bnb) instead of bf16")
    p.add_argument("--rank", type=int, default=16)
    p.add_argument("--reasoning", default="low", help="reasoning strength baked into the system prompt")
    p.add_argument("--epochs", type=float, default=1.0)
    p.add_argument("--max-steps", type=int, default=-1, help="cap optimizer steps (smoke tests)")
    p.add_argument("--limit", type=int, default=0, help="use only the first N training rows")
    p.add_argument("--max-seq", type=int, default=2048)
    p.add_argument("--lr", type=float, default=2e-4)
    p.add_argument("--batch", type=int, default=2)
    p.add_argument("--grad-accum", type=int, default=8)
    a = p.parse_args()

    from unsloth import FastModel  # noqa: I001 - unsloth must be imported before transformers/trl
    from trl import SFTConfig, SFTTrainer

    base = "unsloth/Muse-Glimmer-30B-unsloth-bnb-4bit" if a.qlora else "meta-models/Muse-Glimmer-30B"
    vision = a.task in VISION_TASKS
    model, processor = FastModel.from_pretrained(model_name=base, max_seq_length=a.max_seq, load_in_4bit=a.qlora)
    model = FastModel.get_peft_model(
        model,
        finetune_vision_layers=vision,
        finetune_language_layers=True,
        finetune_attention_modules=True,
        finetune_mlp_modules=True,
        r=a.rank,
        lora_alpha=a.rank,
        lora_dropout=0,
        bias="none",
        use_gradient_checkpointing="unsloth",
        random_state=3407,
    )
    rows = load_rows(a.data / a.task / "train.jsonl")
    if a.limit:
        rows = rows[: a.limit]
    common = dict(
        per_device_train_batch_size=a.batch,
        gradient_accumulation_steps=a.grad_accum,
        warmup_steps=10,
        num_train_epochs=a.epochs,
        max_steps=a.max_steps,
        learning_rate=a.lr,
        logging_steps=5,
        optim="adamw_8bit",
        weight_decay=0.001,
        lr_scheduler_type="linear",
        seed=3407,
        output_dir=str(a.out),
        report_to="none",
        loss_type="nll",
        max_length=a.max_seq,
    )

    if vision:
        from PIL import Image
        from unsloth.trainer import UnslothVisionDataCollator

        def to_conv(r):
            msgs = []
            for m in with_reasoning(r["sft_messages"], a.reasoning):
                c = m["content"]
                if isinstance(c, list):
                    c = [
                        {"type": "image", "image": Image.open(x["image"]).convert("RGB")} if x["type"] == "image" else x
                        for x in c
                    ]
                else:
                    c = [{"type": "text", "text": c}]
                msgs.append({"role": m["role"], "content": c})
            return {"messages": msgs}

        dataset = [to_conv(r) for r in rows]
        collator = UnslothVisionDataCollator(
            model,
            processor,
            max_seq_length=a.max_seq,
            train_on_responses_only=True,
            instruction_part=INSTRUCTION_PART,
            response_part=RESPONSE_PART,
        )
        trainer = SFTTrainer(
            model=model,
            train_dataset=dataset,
            processing_class=processor.tokenizer,
            data_collator=collator,
            args=SFTConfig(
                **common, remove_unused_columns=False, dataset_text_field="", dataset_kwargs={"skip_prepare_dataset": True}
            ),
        )
    else:
        from datasets import Dataset
        from unsloth.chat_templates import train_on_responses_only

        tok = processor
        texts = [
            tok.apply_chat_template(
                with_reasoning(r["sft_messages"], a.reasoning), tokenize=False, add_generation_prompt=False
            ).removeprefix(getattr(tok, "bos_token", "") or "")
            for r in rows
        ]
        trainer = SFTTrainer(
            model=model,
            tokenizer=tok,
            train_dataset=Dataset.from_dict({"text": texts}),
            args=SFTConfig(**common, dataset_text_field="text"),
        )
        trainer = train_on_responses_only(trainer, instruction_part=INSTRUCTION_PART, response_part=RESPONSE_PART)

    trainer.train()
    model.save_pretrained(str(a.out))
    processor.save_pretrained(str(a.out))
    print("saved LoRA adapter to", a.out)


if __name__ == "__main__":
    main()
