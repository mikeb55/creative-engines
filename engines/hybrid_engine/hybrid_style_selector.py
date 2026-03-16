"""
Hybrid Style Selector — Score hybrid compositions for style balance and engine identity.
"""

from typing import Any, Dict, Optional

try:
    from style_dna.style_dna_analyzer import analyze_composition_style
    from style_dna.style_dna_analyzer import _get_profile
    from style_dna.style_similarity import score_composition_against_style
except ImportError:
    import sys
    import os
    _base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if _base not in sys.path:
        sys.path.insert(0, _base)
    from style_dna.style_dna_analyzer import analyze_composition_style
    from style_dna.style_dna_analyzer import _get_profile
    from style_dna.style_similarity import score_composition_against_style


def score_primary_engine_identity(compiled_result: Any, melody_engine: str) -> float:
    """
    Score how well the melody/main material reflects the primary (melody) engine.
    Returns 0-1.
    """
    compiled = compiled_result.get("compiled") if isinstance(compiled_result, dict) else compiled_result
    if not compiled:
        return 0.5
    return analyze_composition_style(compiled, melody_engine)


def score_harmony_engine_fit(compiled_result: Any, harmony_engine: str) -> float:
    """
    Score how well the harmony reflects the harmony engine.
    Uses harmonic fingerprint similarity.
    """
    compiled = compiled_result.get("compiled") if isinstance(compiled_result, dict) else compiled_result
    if not compiled:
        return 0.5
    return analyze_composition_style(compiled, harmony_engine)


def score_counter_engine_fit(compiled_result: Any, counter_engine: Optional[str]) -> float:
    """
    Score counterline engine fit. If no counter engine, returns 0.5 (neutral).
    """
    if not counter_engine:
        return 0.5
    compiled = compiled_result.get("compiled") if isinstance(compiled_result, dict) else compiled_result
    if not compiled:
        return 0.5
    return analyze_composition_style(compiled, counter_engine)


def score_rhythm_engine_fit(compiled_result: Any, rhythm_engine: Optional[str]) -> float:
    """
    Score rhythm engine fit. If no rhythm engine, returns 0.5 (neutral).
    """
    if not rhythm_engine:
        return 0.5
    compiled = compiled_result.get("compiled") if isinstance(compiled_result, dict) else compiled_result
    if not compiled:
        return 0.5
    return analyze_composition_style(compiled, rhythm_engine)


def score_hybrid_style_balance(
    compiled_result: Any,
    melody_engine: str,
    harmony_engine: str,
    counter_engine: Optional[str],
    rhythm_engine: Optional[str],
) -> float:
    """
    Score overall style balance: primary identity strong, other engines contribute.
    Penalize bland averaging; reward clear primary with complementary support.
    Returns 0-1.
    """
    compiled = compiled_result.get("compiled") if isinstance(compiled_result, dict) else compiled_result
    if not compiled:
        return 0.5
    primary = score_primary_engine_identity(compiled_result, melody_engine)
    harm = score_harmony_engine_fit(compiled_result, harmony_engine)
    cnt = score_counter_engine_fit(compiled_result, counter_engine)
    rhy = score_rhythm_engine_fit(compiled_result, rhythm_engine)
    w_primary = 0.5
    w_harm = 0.3
    w_cnt = 0.1
    w_rhy = 0.1
    balance = primary * w_primary + harm * w_harm + cnt * w_cnt + rhy * w_rhy
    if primary < 0.3:
        balance *= 0.7
    return max(0.0, min(1.0, balance))
