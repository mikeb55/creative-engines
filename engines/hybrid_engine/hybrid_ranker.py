"""
Hybrid Ranker — Evaluate and rank hybrid composition candidates.
"""

from typing import Any, List, Optional

try:
    from composition_evaluator.composition_evaluator import evaluate_composition
    from hybrid_engine.hybrid_candidate_types import HybridCandidate
    from hybrid_engine.hybrid_style_selector import (
        score_hybrid_style_balance,
        score_primary_engine_identity,
        score_harmony_engine_fit,
    )
except ImportError:
    import sys
    import os
    _base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if _base not in sys.path:
        sys.path.insert(0, _base)
    from composition_evaluator.composition_evaluator import evaluate_composition
    from hybrid_engine.hybrid_candidate_types import HybridCandidate
    from hybrid_engine.hybrid_style_selector import (
        score_hybrid_style_balance,
        score_primary_engine_identity,
        score_harmony_engine_fit,
    )

BASE_WEIGHT = 0.4
STYLE_WEIGHT = 0.3
BALANCE_WEIGHT = 0.2
IDENTITY_WEIGHT = 0.1


def evaluate_hybrid_candidate(candidate: dict) -> HybridCandidate:
    """
    Evaluate a hybrid candidate (dict from generate_hybrid_candidate).
    Returns HybridCandidate with scores.
    """
    compiled = candidate.get("compiled")
    if not compiled:
        return HybridCandidate(
            hybrid_ir=candidate.get("hybrid_ir"),
            compiled_result=candidate,
            base_score=0.0,
            style_fit_score=0.0,
            adjusted_score=0.0,
            melody_engine=candidate.get("melody_engine", ""),
            harmony_engine=candidate.get("harmony_engine", ""),
            counter_engine=candidate.get("counter_engine"),
            rhythm_engine=candidate.get("rhythm_engine"),
        )
    mel = candidate.get("melody_engine", "wayne_shorter")
    harm = candidate.get("harmony_engine", "barry_harris")
    cnt = candidate.get("counter_engine")
    rhy = candidate.get("rhythm_engine")
    score_obj = evaluate_composition(compiled, engine_name=mel)
    base_score = score_obj.base_score if score_obj.base_score > 0 else score_obj.total_score
    style_fit = score_obj.style_fit_score / 10.0 if score_obj.style_fit_score > 0 else (
        score_obj.total_score - base_score
    ) / 10.0 if base_score > 0 else 0.5
    if style_fit <= 0:
        style_fit = score_obj.total_score / 10.0
    balance = score_hybrid_style_balance(candidate, mel, harm, cnt, rhy)
    identity = score_primary_engine_identity(candidate, mel)
    harm_fit = score_harmony_engine_fit(candidate, harm)
    raw = (
        base_score * BASE_WEIGHT
        + style_fit * 10.0 * STYLE_WEIGHT
        + balance * 10.0 * BALANCE_WEIGHT
        + identity * 10.0 * IDENTITY_WEIGHT * 0.5
        + harm_fit * 10.0 * IDENTITY_WEIGHT * 0.5
    )
    adjusted = max(0.0, min(10.0, raw))
    return HybridCandidate(
        hybrid_ir=candidate.get("hybrid_ir"),
        compiled_result=candidate,
        base_score=base_score,
        style_fit_score=style_fit * 10.0,
        adjusted_score=adjusted,
        melody_engine=mel,
        harmony_engine=harm,
        counter_engine=cnt,
        rhythm_engine=rhy,
    )


def rank_hybrid_candidates(candidates: List[dict]) -> List[HybridCandidate]:
    """Rank hybrid candidates by adjusted score descending."""
    evaluated = [evaluate_hybrid_candidate(c) for c in candidates]
    evaluated.sort(key=lambda x: x.adjusted_score, reverse=True)
    return evaluated


def select_top_hybrids(candidates: List[dict], top_n: int = 5) -> List[HybridCandidate]:
    """Evaluate, rank, and return top N hybrid candidates."""
    ranked = rank_hybrid_candidates(candidates)
    return ranked[:top_n]
