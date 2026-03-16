"""
Style DNA Analyzer — Build engine profiles and analyze composition style.
"""

from typing import Any, Dict, List

try:
    from shared_composer.engine_registry import get_engine
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
    from shared_composer.engine_registry import get_engine
    from style_dna.style_profile import StyleProfile
    from style_dna.style_feature_extractor import (
        extract_interval_fingerprint,
        extract_harmonic_fingerprint,
        extract_motif_fingerprint,
        extract_form_fingerprint,
        extract_rhythm_fingerprint,
        extract_asymmetry_fingerprint,
    )


def _merge_fingerprints(fingerprints: List[Dict[str, float]]) -> Dict[str, float]:
    """Average multiple fingerprints into one."""
    if not fingerprints:
        return {}
    keys = set()
    for fp in fingerprints:
        keys.update(fp.keys())
    out = {}
    for k in keys:
        vals = [fp.get(k, 0.0) for fp in fingerprints]
        out[k] = sum(vals) / len(vals)
    return out


def build_engine_style_profile(engine_name: str, sample_count: int = 12, seed: int = 0) -> StyleProfile:
    """
    Build a StyleProfile for an engine by generating sample compositions and aggregating fingerprints.
    Deterministic for given seed.
    """
    engine = get_engine(engine_name)
    int_fps = []
    harm_fps = []
    motif_fps = []
    form_fps = []
    rhythm_fps = []
    asym_fps = []
    for i in range(sample_count):
        ir = engine.generate_ir("StyleDNA", mode="title", seed=seed + i)
        compiled = engine.compile_from_ir(ir)
        int_fps.append(extract_interval_fingerprint(compiled))
        harm_fps.append(extract_harmonic_fingerprint(compiled))
        motif_fps.append(extract_motif_fingerprint(compiled))
        form_fps.append(extract_form_fingerprint(compiled))
        rhythm_fps.append(extract_rhythm_fingerprint(compiled))
        asym_fps.append(extract_asymmetry_fingerprint(compiled))
    return StyleProfile(
        engine_name=engine_name,
        interval_fingerprint=_merge_fingerprints(int_fps),
        harmonic_fingerprint=_merge_fingerprints(harm_fps),
        motif_fingerprint=_merge_fingerprints(motif_fps),
        form_fingerprint=_merge_fingerprints(form_fps),
        rhythm_fingerprint=_merge_fingerprints(rhythm_fps),
        asymmetry_fingerprint=_merge_fingerprints(asym_fps),
    )


_PROFILE_CACHE: Dict[str, StyleProfile] = {}


def build_all_style_profiles(sample_count: int = 12, seed: int = 0) -> Dict[str, StyleProfile]:
    """
    Build StyleProfiles for all registered engines.
    Cached for reuse.
    """
    engine_names = ["wayne_shorter", "barry_harris", "andrew_hill", "monk", "bartok_night", "wheeler_lyric", "frisell_atmosphere", "scofield_holland", "stravinsky_pulse", "zappa_disruption", "messiaen_colour"]
    out = {}
    for name in engine_names:
        try:
            p = _get_profile(name, sample_count, seed)
            out[name] = p
        except Exception:
            pass
    return out


def _get_profile(engine_name: str, sample_count: int = 12, seed: int = 0) -> StyleProfile:
    cache_key = f"{engine_name}_{sample_count}_{seed}"
    if cache_key not in _PROFILE_CACHE:
        _PROFILE_CACHE[cache_key] = build_engine_style_profile(engine_name, sample_count, seed)
    return _PROFILE_CACHE[cache_key]


def analyze_composition_style(compiled_composition: Any, engine_name: str) -> float:
    """
    Analyze how well a composition matches the given engine's style.
    Returns style fit score 0–1.
    """
    from style_dna.style_similarity import score_composition_against_style
    profile = _get_profile(engine_name)
    return score_composition_against_style(compiled_composition, profile)
