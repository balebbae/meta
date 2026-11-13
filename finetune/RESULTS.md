# Rally proof check: hosted vs fine-tuned

Same prompts, schema and rows for every model. `all` = every field right.
Lower is better only for `false_reject` and latency.

## Held-out mix (300)

| Model | ex | reject | false_reject | numbers | all | p50 latency |
|---|---|---|---|---|---|---|
| Ember (hosted) | 97.5% | 100.0% | 1.1% | 93.2% | 94.7% | 0.80 s |
| Spark (hosted) | 97.5% | 100.0% | 0.0% | 93.2% | 94.7% | 4.56 s |
| Glimmer base (local) | — | — | — | — | — | — |
| Glimmer + LoRA (local) | 94.3% | 98.6% | 4.3% | 87.7% | 91.0% | 18.06 s |

## Single exercise photos (124)

| Model | ex | reject | false_reject | all | p50 latency |
|---|---|---|---|---|---|
| Ember (hosted) | 97.4% | 98.5% | 0.0% | 93.5% | 0.82 s |
| Spark (hosted) | 96.5% | 97.0% | 0.0% | 93.5% | 4.43 s |
| Glimmer base (local) | — | — | — | — | — |
| Glimmer + LoRA (local) | 97.4% | 97.0% | 1.8% | 92.7% | 13.76 s |

## Real screen photos (84)

| Model | verdict | kind | numbers | all | p50 latency |
|---|---|---|---|---|---|
| Ember (hosted) | 84.5% | 90.5% | 77.4% | 71.4% | 1.08 s |
| Spark (hosted) | 83.3% | 91.7% | 77.4% | 71.4% | 6.10 s |
| Glimmer base (local) | — | — | — | — | — |
| Glimmer + LoRA (local) | 78.6% | 83.3% | 34.5% | 28.6% | 22.54 s |

## Verdict

- Held-out mix (300): fine-tuned 91.0% vs Ember 94.7% (-3.7 points)
- Single exercise photos (124): fine-tuned 92.7% vs Ember 93.5% (-0.8 points)
- Real screen photos (84): fine-tuned 28.6% vs Ember 71.4% (-42.8 points)

Ship rule: switch the app to the fine-tuned endpoint only if it beats Ember on the real-photo set by a clear
margin (≥5 points all-fields) without losing on the other two sets; otherwise keep pose + Ember.
