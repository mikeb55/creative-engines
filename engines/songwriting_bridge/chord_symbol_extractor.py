"""
Chord Symbol Extractor — Extract chords from compiled composition for lead sheet.
"""

from typing import Any, Dict, List

CHORD_MAP = {
    (0, 0): "C", (0, 1): "Cm", (1, 0): "G", (1, 1): "Gm",
    (2, 0): "D", (2, 1): "Dm", (3, 0): "A", (3, 1): "Am",
    (4, 0): "E", (4, 1): "Em", (5, 0): "B", (5, 1): "Bm",
    (6, 0): "F", (6, 1): "Fm", (7, 0): "C", (7, 1): "Cm",
    (8, 0): "G", (8, 1): "Gm", (9, 0): "D", (9, 1): "Dm",
    (10, 0): "A", (10, 1): "Am", (11, 0): "E", (11, 1): "Em",
}


def _pitch_class_to_root(pc: int) -> str:
    roots = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]
    return roots[pc % 12]


def extract_chord_symbols(compiled_composition: Any) -> List[Dict[str, Any]]:
    """
    Extract chord symbols from harmony in compiled composition.
    """
    symbols = []
    for sec in getattr(compiled_composition, "sections", []):
        for h in getattr(sec, "harmony", []):
            root = h.get("root", 0)
            quality = h.get("quality", "major")
            m = h.get("measure", 0)
            beat = h.get("bar_position", 0)
            root_str = _pitch_class_to_root(root if isinstance(root, int) else 0)
            qual = "m" if quality == "minor" else ""
            symbols.append({
                "measure": m,
                "beat": beat,
                "chord": root_str + qual,
                "duration": 1.0,
            })
    if not symbols:
        for sec in getattr(compiled_composition, "sections", []):
            bar_start = getattr(sec, "bar_start", 0)
            symbols.append({"measure": bar_start, "beat": 0, "chord": "C", "duration": 4.0})
    return symbols


def simplify_harmony_for_lead_sheet(compiled_composition: Any) -> List[Dict[str, Any]]:
    """
    Simplify harmony to one chord per bar for lead sheet.
    """
    raw = extract_chord_symbols(compiled_composition)
    by_bar = {}
    for s in raw:
        m = s.get("measure", 0)
        if m not in by_bar:
            by_bar[m] = s
    return [by_bar[m] for m in sorted(by_bar.keys())]
