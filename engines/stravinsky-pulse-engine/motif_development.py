"""
Stravinsky Pulse Motif Development — Pulse-repeat, accent-shift, block-cut.
"""

from typing import List

try:
    from .composer_ir import MotivicCell
except ImportError:
    from composer_ir import MotivicCell

try:
    import sys
    import os
    _base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if _base not in sys.path:
        sys.path.insert(0, _base)
    from shared_rhythm_disruption.pulse_cells import build_pulse_cell
    from shared_rhythm_disruption.accent_displacement import displace_accents
    from shared_rhythm_disruption.asymmetrical_cycle_tools import build_asymmetrical_cycle
except ImportError:
    build_pulse_cell = None
    displace_accents = None
    build_asymmetrical_cycle = None


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


def generate_motivic_cells(seed: int, count: int = 3) -> List[MotivicCell]:
    """Generate pulse motivic cells."""
    cells = []
    ints = [7, 2, 5, 4, 0, 12]
    for i in range(count):
        h = _hash_int(seed, i)
        intervals = [ints[(h >> (j * 2)) % len(ints)] for j in range(4)]
        contour = ["pulse", "block", "dry"][h % 3]
        reg = 55 + (h % 14)
        cells.append(MotivicCell(intervals=intervals, contour=contour, registral_center=reg))
    return cells


def develop_motif_cell(cell: MotivicCell, operation: str) -> MotivicCell:
    """Develop motif: pulse_repeat, accent_shift, block_cut, etc."""
    intervals = list(cell.intervals)
    if operation == "pulse_repeat":
        return MotivicCell(intervals=intervals[:2] * 2 if len(intervals) >= 2 else intervals, contour=cell.contour, registral_center=cell.registral_center)
    if operation == "accent_shift":
        shifted = intervals[1:] + intervals[:1] if intervals else []
        return MotivicCell(intervals=shifted or [7], contour=cell.contour, registral_center=cell.registral_center)
    if operation == "block_cut":
        return MotivicCell(intervals=intervals[:2] if len(intervals) >= 2 else intervals, contour=cell.contour, registral_center=cell.registral_center)
    if operation == "registral_jump":
        return MotivicCell(intervals=intervals, contour=cell.contour, registral_center=cell.registral_center + 12)
    if operation == "cycle_extension":
        ext = [intervals[-1]] if intervals else [7]
        return MotivicCell(intervals=intervals + ext, contour=cell.contour, registral_center=cell.registral_center)
    if operation == "rhythmic_rebarring":
        return MotivicCell(intervals=intervals[::-1] if len(intervals) > 1 else intervals, contour=cell.contour, registral_center=cell.registral_center)
    return cell


def build_development_plan(cells: List[MotivicCell], seed: int) -> dict:
    """Build development plan per section."""
    ops = ["pulse_repeat", "accent_shift", "block_cut", "registral_jump", "cycle_extension", "rhythmic_rebarring"]
    h = _hash_int(seed)
    return {
        "primary": ["statement"],
        "contrast": [ops[(h >> 2) % len(ops)]],
        "return": ["pulse_repeat", "registral_jump"],
    }
