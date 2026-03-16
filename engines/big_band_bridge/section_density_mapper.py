"""
Section Density Mapper — Map texture density to big band sections.
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


def map_density_to_sections(
    texture_plan: Dict[str, Any],
    form_plan: Dict[str, Any],
    big_band_ir: ComposerIR,
) -> Dict[str, float]:
    """Map texture density curve to big band section roles."""
    section_order = form_plan.get("section_order") or big_band_ir.section_order
    density_curve = texture_plan.get("density_curve", [])
    if not density_curve:
        density_curve = [0.5 + (i * 0.1) for i in range(len(section_order))]
    out = {}
    for i, role in enumerate(section_order):
        d = density_curve[i] if i < len(density_curve) else 0.5
        out[role] = min(1.0, max(0.0, float(d)))
    return out


def assign_density_roles(
    density_map: Dict[str, float],
    big_band_ir: ComposerIR,
) -> ComposerIR:
    """Assign density map to big_band_ir.density_plan."""
    from dataclasses import replace
    existing = getattr(big_band_ir, "density_plan", None) or {}
    merged = {**existing, **density_map}
    if hasattr(big_band_ir, "density_plan"):
        return replace(big_band_ir, density_plan=merged)
    return big_band_ir
