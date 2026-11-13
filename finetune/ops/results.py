"""Compare Ember / Spark / base Glimmer / fine-tuned Glimmer on the same test sets and write finetune/RESULTS.md.

    .venv/bin/python ops/results.py            # from finetune/

Reads reports/baseline-v2/*.json (Ember, Spark: final prompt) and reports/glimmer-v1/*.json (served by ops/serve.sh
or the post-training eval). Missing reports show as "—".
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MODELS = [
    ("Ember (hosted)", "baseline-v2", "muse-ember-1.0"),
    ("Spark (hosted)", "baseline-v2", "muse-spark-1.3"),
    ("Glimmer base (local)", "glimmer-v1", "glimmer-base"),
    ("Glimmer + LoRA (local)", "glimmer-v1", "exercise_check"),
]
SETS = [
    ("Held-out mix (300)", "exercise_check__{m}.json", ["ex", "reject", "false_reject", "numbers", "all"]),
    ("Single exercise photos (124)", "exercise_check__{m}__exercise_check.json", ["ex", "reject", "false_reject", "all"]),
    ("Real screen photos (84)", "proof__{m}__real_photos.json", ["verdict", "kind", "numbers", "all"]),
]


def load(folder: str, pattern: str, model: str) -> dict | None:
    names = {pattern.format(m=model), pattern.format(m=model.replace("/", "_"))}
    for name in names:
        p = ROOT / "reports" / folder / name
        if p.exists():
            return json.loads(p.read_text())["summary"]
    # the eval names external test sets after the file stem
    hits = sorted((ROOT / "reports" / folder).glob(pattern.format(m=model.replace("/", "_")).replace(".json", "*.json")))
    return json.loads(hits[0].read_text())["summary"] if hits else None


def pct(v) -> str:
    return "—" if v is None else f"{100 * v:.1f}%"


def main() -> None:
    out = ["# Rally proof check: hosted vs fine-tuned\n",
           "Same prompts, schema and rows for every model. `all` = every field right.",
           "Lower is better only for `false_reject` and latency.\n"]
    verdict = {}
    for title, pattern, keys in SETS:
        out += [f"## {title}\n", "| Model | " + " | ".join(keys) + " | p50 latency |", "|---|" + "---|" * (len(keys) + 1)]
        for label, folder, model in MODELS:
            s = load(folder, pattern, model)
            m = (s or {}).get("metrics", {})
            lat = "—" if not s else f"{s.get('latency_p50_s', 0):.2f} s"
            out.append(f"| {label} | " + " | ".join(pct(m.get(k)) for k in keys) + f" | {lat} |")
            if s:
                verdict.setdefault(title, {})[label] = m.get("all")
        out.append("")
    lines = []
    for title, scores in verdict.items():
        e, g = scores.get("Ember (hosted)"), scores.get("Glimmer + LoRA (local)")
        if e is not None and g is not None:
            d = 100 * (g - e)
            lines.append(f"- {title}: fine-tuned {pct(g)} vs Ember {pct(e)} ({d:+.1f} points)")
    out += ["## Verdict\n", *(lines or ["- Fine-tuned results not in yet."]),
            "", "Ship rule: switch the app to the fine-tuned endpoint only if it beats Ember on the real-photo set by a clear",
            "margin (≥5 points all-fields) without losing on the other two sets; otherwise keep pose + Ember.\n"]
    text = "\n".join(out)
    (ROOT / "RESULTS.md").write_text(text)
    print(text)


if __name__ == "__main__":
    main()
