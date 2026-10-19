"""Synthetic BountyJudge integration fixture. No runtime or deployment claim."""


def normalize_handle(value: str) -> str:
    return value.strip().lower()
