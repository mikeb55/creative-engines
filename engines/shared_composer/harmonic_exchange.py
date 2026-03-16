"""
Harmonic Exchange — Transfer harmony between engines for hybrid composition.
"""

from typing import Any, Dict, List

try:
    from .compiled_composition_base import CompiledCompositionBase
except ImportError:
    from compiled_composition_base import CompiledCompositionBase


def extract_harmony(compiled_composition: Any) -> List[Dict[str, Any]]:
    """Extract harmony from compiled composition."""
    out = []
    sections = getattr(compiled_composition, "sections", [])
    for sec in sections:
        harm = getattr(sec, "harmony", [])
        for h in harm:
            if isinstance(h, dict):
                out.append(dict(h))
            else:
                out.append({"symbol": str(h), "measure": 0, "duration": 4})
    if not out:
        harmony = getattr(compiled_composition, "harmony", None)
        if harmony:
            chords = getattr(harmony, "chords", getattr(harmony, "chords", []))
            for i, c in enumerate(chords):
                if isinstance(c, dict):
                    out.append(dict(c))
                else:
                    out.append({"symbol": str(c), "measure": i, "duration": 4})
    return out


def translate_harmony_for_engine(harmony: List[Dict[str, Any]], target_engine: str) -> List[Dict[str, Any]]:
    """Translate chord symbols for target engine's harmonic language."""
    out = []
    for h in harmony:
        sym = h.get("symbol", "Cm7")
        measure = h.get("measure", 0)
        duration = h.get("duration", 4)
        if target_engine == "barry_harris":
            sym = _to_bh_style(sym)
        elif target_engine == "andrew_hill":
            sym = _to_hill_style(sym)
        elif target_engine == "monk":
            sym = _to_monk_style(sym)
        elif target_engine == "wayne_shorter":
            sym = _to_shorter_style(sym)
        out.append({"symbol": sym, "measure": measure, "duration": duration})
    return out


def _to_bh_style(sym: str) -> str:
    if "7" in sym and "m" not in sym and "dim" not in sym:
        return sym.replace("7", "6") if "7" in sym else sym + "6"
    return sym


def _to_hill_style(sym: str) -> str:
    if "sus" not in sym and "cluster" not in sym:
        return sym + "sus4" if "7" in sym else sym
    return sym


def _to_monk_style(sym: str) -> str:
    if "7" not in sym and "m" in sym:
        return sym + "7"
    return sym


def _to_shorter_style(sym: str) -> str:
    if "7" in sym:
        return sym.replace("7", "m7") if "M" not in sym else sym.replace("M7", "M7")
    return sym + "m7"


def inject_harmony(ir: Any, harmony: List[Dict[str, Any]]) -> Any:
    """Inject harmony into IR. Sets harmonic_override on section_roles if present."""
    if not hasattr(ir, "section_roles"):
        return ir
    symbols = [h.get("symbol", "Cm7") for h in harmony[:16]]
    for role, sp in ir.section_roles.items():
        if hasattr(sp, "harmonic_override"):
            sp.harmonic_override = symbols
    if hasattr(ir, "harmonic_field") and ir.harmonic_field and hasattr(ir.harmonic_field, "chord_types"):
        pass
    return ir
