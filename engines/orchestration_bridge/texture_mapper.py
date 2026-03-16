"""
Texture Mapper — Map texture strategy and assign texture layers.
"""

from typing import Any, Dict, List, Optional

from .instrument_profiles import EnsembleProfile, get_ensemble_profile
from .range_allocator import assign_parts


TEXTURE_TYPES = [
    "unison",
    "melody + pad",
    "melody + counterline",
    "polyphonic chamber",
    "sectional spread",
]


def map_texture_strategy(
    compiled_composition: Any,
    ensemble_profile: EnsembleProfile,
    hybrid_result: Optional[Dict] = None,
) -> str:
    """
    Map composition to texture type based on ensemble and content.
    """
    profile = ensemble_profile if isinstance(ensemble_profile, EnsembleProfile) else get_ensemble_profile(str(ensemble_profile))
    if not profile:
        return "melody + pad"
    pref = profile.preferred_texture
    if pref in TEXTURE_TYPES:
        return pref
    if "chamber" in pref.lower():
        return "polyphonic chamber"
    if "counterline" in pref.lower():
        return "melody + counterline"
    if "sectional" in pref.lower():
        return "sectional spread"
    return "melody + pad"


def assign_texture_layers(
    compiled_composition: Any,
    ensemble_profile: EnsembleProfile,
    hybrid_result: Optional[Dict] = None,
) -> List[Dict[str, Any]]:
    """
    Assign texture layers to parts: melody, pad, counterline, etc.
    Returns list of {part_index, layer, weight}.
    """
    profile = ensemble_profile if isinstance(ensemble_profile, EnsembleProfile) else get_ensemble_profile(str(ensemble_profile))
    if not profile:
        return []
    parts = assign_parts(compiled_composition, profile, hybrid_result)
    strategy = map_texture_strategy(compiled_composition, profile, hybrid_result)
    layers = []
    for i, p in enumerate(parts):
        role = p.get("role", "harmony")
        if role == "melody":
            layers.append({"part_index": i, "layer": "melody", "weight": 1.0})
        elif role == "counterline":
            layers.append({"part_index": i, "layer": "counterline", "weight": 0.9})
        elif role == "bass":
            layers.append({"part_index": i, "layer": "bass", "weight": 0.9})
        elif role == "harmony":
            layers.append({"part_index": i, "layer": "pad", "weight": 0.7})
        else:
            layers.append({"part_index": i, "layer": "pad", "weight": 0.6})
    return layers
