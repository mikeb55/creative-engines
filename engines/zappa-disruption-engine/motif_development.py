"""
Zappa Disruption Motif Development — Interruption, sudden_reentry, genre_cut.
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
    from shared_rhythm_disruption.interruption_patterns import build_interruption_pattern
    from shared_rhythm_disruption.asymmetrical_cycle_tools import build_asymmetrical_cycle
except ImportError:
    build_interruption_pattern = None
    build_asymmetrical_cycle = None


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


def generate_motivic_cells(seed: int, count: int = 3) -> List[MotivicCell]:
    ints = [1, 6, 11, -3, 4, 8, -5]
    cells = []
    for i in range(count):
        h = _hash_int(seed, i)
        intervals = [ints[(h >> (j * 2)) % len(ints)] for j in range(4)]
        contour = ["jagged", "cut", "snap"][h % 3]
        reg = 52 + (h % 16)
        cells.append(MotivicCell(intervals=intervals, contour=contour, registral_center=reg))
    return cells


def develop_motif_cell(cell: MotivicCell, operation: str) -> MotivicCell:
    intervals = list(cell.intervals)
    if operation == "interruption":
        return MotivicCell(intervals=intervals[:2] if len(intervals) >= 2 else intervals, contour="cut", registral_center=cell.registral_center)
    if operation == "sudden_reentry":
        return MotivicCell(intervals=intervals[-2:] + intervals[:2] if len(intervals) >= 4 else intervals, contour=cell.contour, registral_center=cell.registral_center + 7)
    if operation == "genre_cut":
        return MotivicCell(intervals=intervals[::-1] if len(intervals) > 1 else intervals, contour="jagged", registral_center=cell.registral_center)
    if operation == "registral_snap":
        return MotivicCell(intervals=intervals, contour=cell.contour, registral_center=cell.registral_center + 12)
    if operation == "rhythmic_break":
        return MotivicCell(intervals=intervals[1:] + intervals[:1] if intervals else [], contour="cut", registral_center=cell.registral_center)
    if operation == "motif_collision":
        rev = intervals[::-1]
        return MotivicCell(intervals=intervals[:2] + rev[:2] if len(intervals) >= 2 else intervals, contour="jagged", registral_center=cell.registral_center)
    return cell


def build_development_plan(cells: List[MotivicCell], seed: int) -> dict:
    ops = ["interruption", "sudden_reentry", "genre_cut", "registral_snap", "rhythmic_break", "motif_collision"]
    h = _hash_int(seed)
    return {
        "primary": ["statement"],
        "cut": [ops[(h >> 2) % len(ops)]],
        "return": ["sudden_reentry", "motif_collision"],
    }
