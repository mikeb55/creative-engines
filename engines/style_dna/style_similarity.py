"""
Style Similarity — Compare profiles and score composition against reference style.
"""

from typing import Any, Dict

try:
    from style_dna.style_profile import StyleProfile
    from style_dna.style_feature_extractor import (
        extract_interval_fingerprint,
        extract_harmonic_fingerprint,
        extract_motif_fingerprint,
        extract_form_fingerprint,
        extract_rhythm_fingerprint,
        extract_asymmetry_fingerprint,
    )
except ImportError:
    import sys
    import os
    _base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if _base not in sys.path:
        sys.path.insert(0, _base)
    from style_dna.style_profile import StyleProfile
    from style_dna.style_feature_extractor import (
        extract_interval_fingerprint,
        extract_harmonic_fingerprint,
        extract_motif_fingerprint,
        extract_form_fingerprint,
        extract_rhythm_fingerprint,
        extract_asymmetry_fingerprint,
    )


def _dict_distance(a: Dict[str, float], b: Dict[str, float]) -> float:
    """Euclidean-like distance between two fingerprint dicts. Lower = more similar."""
    keys = set(a.keys()) | set(b.keys())
    if not keys:
        return 0.0
    ss = 0.0
    for k in keys:
        va = a.get(k, 0.0)
        vb = b.get(k, 0.0)
        ss += (va - vb) ** 2
    return (ss / len(keys)) ** 0.5


def _dict_similarity(a: Dict[str, float], b: Dict[str, float]) -> float:
    """Similarity 0–1. Higher = more similar."""
    d = _dict_distance(a, b)
    return max(0.0, min(1.0, 1.0 - d))


def compare_style_profiles(profile_a: StyleProfile, profile_b: StyleProfile) -> float:
    """
    Compare two style profiles. Returns similarity 0–1 (higher = more similar).
    """
    w = 1.0 / 6.0
    sim = 0.0
    sim += w * _dict_similarity(profile_a.interval_fingerprint, profile_b.interval_fingerprint)
    sim += w * _dict_similarity(profile_a.harmonic_fingerprint, profile_b.harmonic_fingerprint)
    sim += w * _dict_similarity(profile_a.motif_fingerprint, profile_b.motif_fingerprint)
    sim += w * _dict_similarity(profile_a.form_fingerprint, profile_b.form_fingerprint)
    sim += w * _dict_similarity(profile_a.rhythm_fingerprint, profile_b.rhythm_fingerprint)
    sim += w * _dict_similarity(profile_a.asymmetry_fingerprint, profile_b.asymmetry_fingerprint)
    return sim


def score_composition_against_style(compiled_composition: Any, reference_profile: StyleProfile) -> float:
    """
    Score how well a composition matches a reference style profile.
    Returns 0–1 (higher = better fit). Scale to 0–10 for evaluator integration.
    """
    comp_int = extract_interval_fingerprint(compiled_composition)
    comp_harm = extract_harmonic_fingerprint(compiled_composition)
    comp_motif = extract_motif_fingerprint(compiled_composition)
    comp_form = extract_form_fingerprint(compiled_composition)
    comp_rhythm = extract_rhythm_fingerprint(compiled_composition)
    comp_asym = extract_asymmetry_fingerprint(compiled_composition)
    w = 1.0 / 6.0
    sim = 0.0
    sim += w * _dict_similarity(comp_int, reference_profile.interval_fingerprint)
    sim += w * _dict_similarity(comp_harm, reference_profile.harmonic_fingerprint)
    sim += w * _dict_similarity(comp_motif, reference_profile.motif_fingerprint)
    sim += w * _dict_similarity(comp_form, reference_profile.form_fingerprint)
    sim += w * _dict_similarity(comp_rhythm, reference_profile.rhythm_fingerprint)
    sim += w * _dict_similarity(comp_asym, reference_profile.asymmetry_fingerprint)
    return sim
