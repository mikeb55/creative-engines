"""
Texture to Sectional Plan — Translate texture to big band sectional layers.
"""

import importlib.util
import os
import sys
from typing import Any, Dict, List

_base = os.path.dirname(os.path.abspath(__file__))
_engines = os.path.dirname(_base)
_bb = os.path.join(_engines, "big-band-engine")
for p in [_engines, _bb]:
    if p not in sys.path:
        sys.path.append(p)

_spec = importlib.util.spec_from_file_location("bb_composer_ir", os.path.join(_bb, "composer_ir.py"))
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)
ComposerIR = _mod.ComposerIR


def translate_texture_to_big_band_sections(
    ligeti_texture_ir: Any,
    big_band_ir: ComposerIR,
) -> Dict[str, str]:
    """Translate texture plan to big band sax_texture_plan."""
    texture_plan = getattr(ligeti_texture_ir, "texture_plan", {})
    swarm = getattr(ligeti_texture_ir, "swarm_profile", "cloud")
    out = dict(getattr(big_band_ir, "sax_texture_plan", None) or {})
    for role, tex in texture_plan.items():
        out[role] = str(tex) if tex else swarm
    return out


def build_sectional_texture_layers(
    ligeti_texture_ir: Any,
    big_band_ir: ComposerIR,
    section_order: List[str],
) -> Dict[str, Dict[str, Any]]:
    """Build per-section texture layer hints for big band."""
    texture_plan = getattr(ligeti_texture_ir, "texture_plan", {})
    density_curve = getattr(ligeti_texture_ir, "density_curve", [])
    cluster = getattr(ligeti_texture_ir, "cluster_field_type", "chromatic_cloud")
    out = {}
    for i, role in enumerate(section_order):
        tex = texture_plan.get(role, "cloud")
        dens = density_curve[i] if i < len(density_curve) else 0.5
        out[role] = {
            "texture_type": tex,
            "density": min(1.0, max(0.0, dens)),
            "cluster_field": cluster,
        }
    return out
