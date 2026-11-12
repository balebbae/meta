"""Contrastive fine-tune of a small embedding model (default bge-small, 33M params; fits any GPU, even CPU).

python -m rally_embed.train --out outputs/rally-embed            # ~minutes on a 5070 Ti
python -m rally_embed.train --base BAAI/bge-base-en-v1.5 --out outputs/rally-embed-base
"""

from __future__ import annotations

import argparse


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--base", default="BAAI/bge-small-en-v1.5")
    p.add_argument("--out", required=True)
    p.add_argument("--pairs", type=int, default=6000)
    p.add_argument("--epochs", type=float, default=1.0)
    p.add_argument("--batch", type=int, default=12, help="<= number of activities (15): NO_DUPLICATES positives")
    p.add_argument("--lr", type=float, default=2e-5)
    a = p.parse_args()

    import torch
    from datasets import Dataset
    from sentence_transformers import (
        SentenceTransformer,
        SentenceTransformerTrainer,
        SentenceTransformerTrainingArguments,
    )
    from sentence_transformers.losses import MultipleNegativesRankingLoss
    from sentence_transformers.training_args import BatchSamplers

    from rally_embed.data import train_pairs

    model = SentenceTransformer(a.base)
    ds = Dataset.from_list(train_pairs(a.pairs))
    args = SentenceTransformerTrainingArguments(
        output_dir=a.out,
        num_train_epochs=a.epochs,
        per_device_train_batch_size=a.batch,
        learning_rate=a.lr,
        warmup_ratio=0.1,
        # duplicate positives in a batch would be false negatives for in-batch contrastive loss
        batch_sampler=BatchSamplers.NO_DUPLICATES,
        bf16=torch.cuda.is_available() and torch.cuda.is_bf16_supported(),
        logging_steps=20,
        save_strategy="no",
        report_to="none",
        seed=7,
    )
    trainer = SentenceTransformerTrainer(
        model=model, args=args, train_dataset=ds, loss=MultipleNegativesRankingLoss(model)
    )
    trainer.train()
    model.save(a.out)
    print("saved", a.out)


if __name__ == "__main__":
    main()
