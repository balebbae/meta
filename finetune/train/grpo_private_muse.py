"""GRPO for the Private Muse task with verifiable rewards (format, correctness, no-leak). Run on the DGX Spark.

    python train/grpo_private_muse.py --data data --init outputs/private_muse-lora --out outputs/private_muse-grpo

Start from the SFT adapter (--init) so completions are already well-formed; RL then targets the remaining
failures. Config mirrors Unsloth's Muse Glimmer GRPO notebook (TRL GRPOTrainer, dr_grpo loss).
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

os.environ.setdefault("UNSLOTH_GRPO_MAX_ROWS_PER_CHUNK", "128")


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--data", type=Path, default=Path("data"))
    p.add_argument("--init", default="meta-models/Muse-Glimmer-30B", help="base model or SFT adapter dir")
    p.add_argument("--out", type=Path, required=True)
    p.add_argument("--max-seq", type=int, default=3072)
    p.add_argument("--generations", type=int, default=4)
    p.add_argument("--steps", type=int, default=300)
    p.add_argument("--rank", type=int, default=16)
    a = p.parse_args()

    from unsloth import FastModel  # noqa: I001 - unsloth must be imported before transformers/trl
    from datasets import Dataset
    from trl import GRPOConfig, GRPOTrainer

    from rally_ft.tasks.private_muse import reward_correct, reward_format, reward_no_leak

    model, tokenizer = FastModel.from_pretrained(
        model_name=a.init,
        max_seq_length=a.max_seq,
        device_map_planner_kwargs={"retained_rows": a.generations * a.max_seq},
    )
    if not Path(a.init).exists():
        model = FastModel.get_peft_model(
            model,
            finetune_vision_layers=False,
            finetune_language_layers=True,
            finetune_attention_modules=True,
            finetune_mlp_modules=True,
            r=a.rank,
            lora_alpha=a.rank * 2,
            lora_dropout=0,
            bias="none",
            use_gradient_checkpointing="unsloth",
            random_state=3407,
        )
    rows = [json.loads(line) for line in (a.data / "private_muse" / "train.jsonl").open()]
    ds = Dataset.from_list(
        [
            {
                "prompt": r["messages"],
                "target": json.dumps(r["target"]),
                "secrets": r["secrets"],
                "chat_template_kwargs": {"reasoning_strength": "low"},
            }
            for r in rows
        ]
    )
    args = GRPOConfig(
        temperature=1.0,
        learning_rate=5e-6,
        adam_beta1=0.9,
        adam_beta2=0.99,
        weight_decay=0.1,
        warmup_steps=10,
        lr_scheduler_type="cosine",
        optim="adamw_8bit",
        max_grad_norm=0.1,
        logging_steps=1,
        per_device_train_batch_size=a.generations,
        gradient_accumulation_steps=1,
        num_generations=a.generations,
        max_completion_length=768,
        mask_truncated_completions=True,
        max_steps=a.steps,
        save_steps=100,
        report_to="none",
        output_dir=str(a.out),
        importance_sampling_level="sequence",
        loss_type="dr_grpo",
    )
    trainer = GRPOTrainer(
        model=model,
        processing_class=tokenizer,
        reward_funcs=[reward_format, reward_correct, reward_no_leak],
        args=args,
        train_dataset=ds,
    )
    trainer.train()
    model.save_pretrained(str(a.out))
    tokenizer.save_pretrained(str(a.out))


if __name__ == "__main__":
    main()
