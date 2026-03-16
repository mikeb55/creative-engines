"""
BH Motif Development — Bebop cells, enclosure figures, scalar embellishment.
"""

from typing import List

try:
    from .composer_ir import MotivicCell
except ImportError:
    from composer_ir import MotivicCell


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


def generate_motivic_cells(seed: int, count: int = 3) -> List[MotivicCell]:
    """Generate bebop-style cells. Deterministic."""
    cells = []
    for i in range(count):
        h = _hash_int(seed, i)
        intervals = [
            ((h >> (j * 2)) % 5) - 2 for j in range(4)
        ]
        intervals = [x for x in intervals if x != 0][:4] or [1, 2, -1, -2]
        contour = ["arch", "descent", "ascent"][h % 3]
        reg = 58 + (h % 10)
        cells.append(MotivicCell(intervals=intervals, contour=contour, registral_center=reg))
    return cells


def develop_motif_cell(cell: MotivicCell, operation: str) -> MotivicCell:
    """Bebop cells, enclosure, scalar embellishment."""
    intervals = list(cell.intervals)
    if operation == "bebop_cell":
        return MotivicCell(intervals=intervals + [1] if len(intervals) < 4 else intervals, contour=cell.contour, registral_center=cell.registral_center)
    if operation == "enclosure":
        return MotivicCell(intervals=[1, -1, intervals[0]] if intervals else [1, -1, 2], contour=cell.contour, registral_center=cell.registral_center)
    if operation == "scalar_embellish":
        return MotivicCell(intervals=intervals + [2, -2][:2], contour=cell.contour, registral_center=cell.registral_center)
    if operation == "transposition":
        return MotivicCell(intervals=intervals, contour=cell.contour, registral_center=cell.registral_center + 5)
    if operation == "fragmentation":
        return MotivicCell(intervals=intervals[:2] if len(intervals) >= 2 else intervals, contour=cell.contour, registral_center=cell.registral_center)
    return cell


def build_development_plan(motivic_cells: List[MotivicCell], seed: int) -> dict:
    ops = ["statement", "bebop_cell", "enclosure", "scalar_embellish"]
    h = _hash_int(seed)
    return {
        "primary": ["statement"],
        "contrast": [ops[(h >> 2) % len(ops)]],
        "return": ["enclosure", "scalar_embellish"],
    }
