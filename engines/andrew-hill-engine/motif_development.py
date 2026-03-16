"""
Hill Motif Development — Fragmentation, registral displacement, irregular transformation.
"""

from typing import List

try:
    from .composer_ir import MotivicCell
except ImportError:
    from composer_ir import MotivicCell


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


def generate_motivic_cells(seed: int, count: int = 3) -> List[MotivicCell]:
    cells = []
    for i in range(count):
        h = _hash_int(seed, i)
        intervals = [((h >> (j * 3)) % 13) - 6 for j in range(4)]
        intervals = [x for x in intervals if x != 0][:3] or [6, 1, 11]
        contour = ["angular", "arch", "wave"][h % 3]
        reg = 55 + (h % 12)
        cells.append(MotivicCell(intervals=intervals, contour=contour, registral_center=reg))
    return cells


def develop_motif_cell(cell: MotivicCell, operation: str) -> MotivicCell:
    intervals = list(cell.intervals)
    if operation == "fragmentation":
        return MotivicCell(intervals=intervals[:2] if len(intervals) >= 2 else intervals, contour=cell.contour, registral_center=cell.registral_center)
    if operation == "registral_displacement":
        return MotivicCell(intervals=intervals, contour=cell.contour, registral_center=cell.registral_center + 12)
    if operation == "irregular_transformation":
        return MotivicCell(intervals=[-x for x in intervals], contour=cell.contour, registral_center=cell.registral_center - 5)
    if operation == "transposition":
        return MotivicCell(intervals=intervals, contour=cell.contour, registral_center=cell.registral_center + 7)
    return cell


def build_development_plan(motivic_cells: List[MotivicCell], seed: int) -> dict:
    ops = ["statement", "fragmentation", "registral_displacement", "irregular_transformation"]
    h = _hash_int(seed)
    return {
        "primary": ["statement"],
        "contrast": [ops[(h >> 2) % len(ops)]],
        "return": ["registral_displacement", "fragmentation"],
    }
