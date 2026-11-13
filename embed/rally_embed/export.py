"""Export the fine-tuned embedder for the Next.js app (transformers.js) and write the 15 activity vectors.

python -m rally_embed.export --model outputs/rally-embed
  -> onnx/rally-embed/{config.json,tokenizer.json,onnx/model.onnx}  (git-ignored; lib/activities/classify.ts loads it)
  -> ../lib/activities/activity-vectors.json                        (committed constants; regenerate with the model)
"""

from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path

import numpy as np

from rally_embed.data import QUERY_PREFIX, activity_docs

ROOT = Path(__file__).resolve().parents[1]
VECTORS = ROOT.parent / "lib" / "activities" / "activity-vectors.json"


def main() -> None:
    from optimum.exporters.onnx import main_export
    from sentence_transformers import SentenceTransformer

    p = argparse.ArgumentParser()
    p.add_argument("--model", default="outputs/rally-embed")
    p.add_argument("--out", type=Path, default=ROOT / "onnx" / "rally-embed")
    a = p.parse_args()

    main_export(a.model, output=a.out, task="feature-extraction")
    (a.out / "onnx").mkdir(exist_ok=True)
    shutil.move(a.out / "model.onnx", a.out / "onnx" / "model.onnx")  # transformers.js looks in <model>/onnx/

    st = SentenceTransformer(a.model)
    pooling = st[1].pooling_mode
    assert pooling == "cls", f"classify.ts assumes CLS pooling, model uses {pooling}"
    docs = activity_docs()
    ids = list(docs)
    vecs = st.encode([docs[i] for i in ids], normalize_embeddings=True)

    # parity: ONNX CLS pooling must reproduce sentence-transformers for queries
    import onnxruntime as ort
    from transformers import AutoTokenizer

    tok = AutoTokenizer.from_pretrained(a.out)
    sess = ort.InferenceSession(str(a.out / "onnx" / "model.onnx"))
    q = [QUERY_PREFIX + "Wahoo trainer session"]
    enc = tok(q, return_tensors="np", padding=True)
    feeds = {i.name: enc[i.name].astype(np.int64) for i in sess.get_inputs() if i.name in enc}
    cls = sess.run(None, feeds)[0][:, 0]
    cls /= np.linalg.norm(cls, axis=1, keepdims=True)
    assert np.allclose(cls, st.encode(q, normalize_embeddings=True), atol=1e-4), "ONNX/ST mismatch"

    VECTORS.write_text(
        json.dumps(
            {
                "model": Path(a.model).name,
                "prefix": QUERY_PREFIX,
                "ids": ids,
                "vectors": [[round(float(x), 6) for x in v] for v in vecs],
            }
        )
        + "\n"
    )
    print("wrote", a.out, "and", VECTORS)


if __name__ == "__main__":
    main()
