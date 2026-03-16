"""
Shared Rhythm/Disruption — Accent displacement for Stravinsky/Zappa engines.
"""

from typing import List


def displace_accents(pattern: List[int], amount: int) -> List[int]:
    """Displace accent positions by amount. Wraps within length."""
    if not pattern:
        return []
    n = len(pattern)
    amount = amount % n
    if amount == 0:
        return list(pattern)
    return pattern[-amount:] + pattern[:-amount]


def score_accent_instability(pattern: List[int]) -> float:
    """Score 0–1: accent instability (higher = more displaced)."""
    if not pattern:
        return 0.0
    n = len(pattern)
    if n == 1:
        return 0.0
    # Variance from "expected" positions
    expected = sum(i for i in range(n)) / n
    var = sum((i - expected) ** 2 for i in range(n) if pattern[i] != 0) / max(1, n)
    return min(1.0, var / (n * n) * 4)
