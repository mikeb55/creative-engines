"""
Motif Exchange — Transfer motifs between engines for hybrid composition.
"""

from typing import Any, Dict, List

try:
    from .compiled_composition_base import CompiledCompositionBase, CompiledSectionBase
    from .composition_adapter import adapt_compiled
except ImportError:
    from compiled_composition_base import CompiledCompositionBase, CompiledSectionBase
    from composition_adapter import adapt_compiled



def extract_motifs(compiled_composition: Any) -> List[Dict[str, Any]]:
    """Extract motifs from compiled composition. Works with engine-specific or base types."""
    motifs = []
    sections = getattr(compiled_composition, "sections", [])
    for sec in sections:
        events = getattr(sec, "melody_events", [])
        motif_refs = getattr(sec, "motif_refs", [])
        reg = getattr(sec, "register_hint", 60)
        if events:
            intervals = _events_to_intervals(events)
            if intervals:
                motifs.append({
                    "intervals": intervals,
                    "contour": "arch",
                    "registral_center": reg,
                    "source_engine": getattr(compiled_composition, "metadata", {}).get("engine", "unknown"),
                })
    return motifs


def _events_to_intervals(events: List[Dict]) -> List[int]:
    """Derive interval sequence from melody events."""
    if len(events) < 2:
        return []
    out = []
    prev = events[0].get("pitch", 60)
    for e in events[1:]:
        p = e.get("pitch", prev)
        out.append(p - prev)
        prev = p
    return out[:8]


def transform_motif_for_engine(motif: Dict[str, Any], target_engine: str) -> Dict[str, Any]:
    """Transform motif for target engine's interval language."""
    intervals = motif.get("intervals", [])
    contour = motif.get("contour", "arch")
    reg = motif.get("registral_center", 60)
    if target_engine == "wayne_shorter":
        intervals = [max(-7, min(7, i)) for i in intervals]
    elif target_engine == "barry_harris":
        intervals = [max(-2, min(2, i)) if abs(i) <= 2 else (2 if i > 0 else -2) for i in intervals]
    elif target_engine == "andrew_hill":
        intervals = [i for i in intervals if abs(i) >= 1]
    elif target_engine == "monk":
        intervals = [max(-7, min(7, i)) for i in intervals]
    return {"intervals": intervals or [2, 5], "contour": contour, "registral_center": reg, "source_engine": target_engine}


def inject_motif(ir: Any, motif: Dict[str, Any]) -> Any:
    """Inject motif into IR. Modifies motivic_cells if present. Returns IR (may be modified in place)."""
    if not hasattr(ir, "motivic_cells"):
        return ir
    intervals = motif.get("intervals", [2, 5])
    contour = motif.get("contour", "arch")
    reg = motif.get("registral_center", 60)
    cells = list(ir.motivic_cells)
    if cells:
        CellClass = type(cells[0])
        old = cells[0]
        kw = {"intervals": intervals, "contour": contour, "registral_center": reg}
        if hasattr(old, "rhythmic_weight"):
            kw["rhythmic_weight"] = getattr(old, "rhythmic_weight", "mixed")
        cells[0] = CellClass(**kw)
    else:
        try:
            from dataclasses import make_dataclass
            CellClass = make_dataclass("MotivicCell", [("intervals", list), ("contour", str, "arch"), ("registral_center", int, 60)])
            cells = [CellClass(intervals=intervals, contour=contour, registral_center=reg)]
        except Exception:
            return ir
    ir.motivic_cells = cells
    return ir
