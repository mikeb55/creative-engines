"""
Monk Motif Development — Repetition, displacement, rhythmic stabs, silence punctuation.
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
        intervals = [((h >> (j * 3)) % 9) - 4 for j in range(4)]
        intervals = [x for x in intervals if x != 0][:3] or [6, 1, 5]
        contour = ["angular", "arch", "wave"][h % 3]
        reg = 56 + (h % 14)
        cells.append(MotivicCell(intervals=intervals, contour=contour, registral_center=reg))
    return cells


def develop_motif_cell(cell: MotivicCell, operation: str) -> MotivicCell:
    intervals = list(cell.intervals)
    if operation == "repetition":
        return MotivicCell(intervals=intervals + intervals[:1], contour=cell.contour, registral_center=cell.registral_center)
    if operation == "displacement":
        return MotivicCell(intervals=intervals, contour=cell.contour, registral_center=cell.registral_center + 7)
    if operation == "rhythmic_stab":
        return MotivicCell(intervals=intervals[:2] if len(intervals) >= 2 else intervals, contour=cell.contour, registral_center=cell.registral_center)
    if operation == "silence_punctuation":
        return MotivicCell(intervals=intervals, contour=cell.contour, registral_center=cell.registral_center)
    if operation == "transposition":
        return MotivicCell(intervals=intervals, contour=cell.contour, registral_center=cell.registral_center + 5)
    return cell


def build_development_plan(motivic_cells: List[MotivicCell], seed: int) -> dict:
    ops = ["statement", "repetition", "displacement", "rhythmic_stab"]
    h = _hash_int(seed)
    return {
        "primary": ["statement"],
        "contrast": [ops[(h >> 2) % len(ops)]],
        "return": ["repetition", "displacement"],
    }
