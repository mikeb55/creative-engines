"""
Ensemble Planner — Plan ensemble arrangement from compiled composition.
"""

import random
from typing import Any, Dict, List, Optional

from .instrument_profiles import EnsembleProfile, get_ensemble_profile
from .range_allocator import allocate_registers, assign_parts
from .spacing_rules import apply_spacing_rules, score_spacing_clarity
from .texture_mapper import assign_texture_layers, map_texture_strategy


def plan_ensemble_arrangement(
    compiled_composition: Any,
    ensemble_type: str,
    seed: int = 0,
    hybrid_result: Optional[Dict] = None,
) -> Dict[str, Any]:
    """
    Plan full ensemble arrangement: parts, registers, spacing, texture.
    Deterministic for same seed.
    """
    rng = random.Random(seed)
    profile = get_ensemble_profile(ensemble_type)
    if not profile:
        return {"parts": [], "strategy": "melody + pad", "clarity": 0.5}
    parts = assign_parts(compiled_composition, profile, hybrid_result)
    parts = apply_spacing_rules(parts, profile)
    layers = assign_texture_layers(compiled_composition, profile, hybrid_result)
    strategy = map_texture_strategy(compiled_composition, profile, hybrid_result)
    clarity = score_spacing_clarity(parts)
    return {
        "ensemble_type": ensemble_type,
        "profile": profile,
        "parts": parts,
        "texture_layers": layers,
        "strategy": strategy,
        "clarity": clarity,
        "compiled": compiled_composition if not hybrid_result else hybrid_result.get("compiled"),
        "hybrid_result": hybrid_result,
    }
