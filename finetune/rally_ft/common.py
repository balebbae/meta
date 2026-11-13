"""Shared helpers: chat-format examples, Glimmer reply-channel parsing, JSON extraction."""

from __future__ import annotations

import json
import re

USER_CHANNEL = "to=user"


def example(task: str, ex_id: str, system: str, user, target: dict, **extra) -> dict:
    """One training/eval row. `messages` excludes the answer; `target` is the gold JSON."""
    return {
        "id": ex_id,
        "task": task,
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        "target": target,
        **extra,
    }


def with_answer(row: dict, sort_keys: bool = True) -> list[dict]:
    """Messages including the assistant turn, for supervised fine-tuning.

    sort_keys=False keeps the target's own key order (exercise_check puts the decision after the evidence)."""
    return row["messages"] + [{"role": "assistant", "content": json.dumps(row["target"], sort_keys=sort_keys)}]


def split_channels(text: str | None) -> tuple[str, str]:
    """Split a raw Glimmer completion into (reasoning, reply). Plain text passes through as the reply."""
    if not text:
        return "", ""
    idx = text.rfind(USER_CHANNEL)
    if idx == -1:
        return "", text.strip()
    reasoning, reply = text[:idx], text[idx + len(USER_CHANNEL) :]
    reply = reply.replace("<|message|>", "")
    for marker in ("<|eom|>", "<|eot|>", "<|start|>"):
        reply = reply.split(marker)[0]
    return reasoning.strip(), reply.strip()


def extract_json(text: str | None) -> dict | None:
    _, reply = split_channels(text)
    reply = re.sub(r"^```(?:json)?|```$", "", reply.strip(), flags=re.M).strip()
    try:
        obj = json.loads(reply)
        return obj if isinstance(obj, dict) else None
    except (json.JSONDecodeError, TypeError):
        m = re.search(r"\{.*\}", reply, flags=re.S)
        if not m:
            return None
        try:
            obj = json.loads(m.group(0))
            return obj if isinstance(obj, dict) else None
        except json.JSONDecodeError:
            return None


def close(a, b, rel: float = 0.02, abs_tol: float = 0.05) -> bool:
    if a is None or b is None:
        return a is None and b is None
    try:
        a, b = float(a), float(b)
    except (TypeError, ValueError):
        return False
    return abs(a - b) <= max(abs_tol, rel * abs(b))
