"""
Shorter Motif Development — Central, not decorative.
Transposition, expansion, contraction, fragmentation, inversion-lite.
"""

from typing import List, Optional

try:
    from .composer_ir import MotivicCell
except ImportError:
    from composer_ir import MotivicCell


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


def generate_motivic_cells(seed: int, count: int = 3) -> List[MotivicCell]:
    """Generate motivic cells. Deterministic."""
    cells = []
    for i in range(count):
        h = _hash_int(seed, i)
        intervals = [
            ((h >> (j * 3)) % 7) - 3 for j in range(4)
        ]
        intervals = [x for x in intervals if x != 0][:3] or [2, 5]
        contour = ["arch", "descent", "ascent", "wave"][h % 4]
        reg = 58 + (h % 12)
        cells.append(MotivicCell(intervals=intervals, contour=contour, registral_center=reg))
    return cells


def develop_motif_cell(cell: MotivicCell, operation: str) -> MotivicCell:
    """Apply development operation to cell."""
    intervals = list(cell.intervals)
    if operation == "transposition":
        return MotivicCell(intervals=intervals, contour=cell.contour, registral_center=cell.registral_center + 5)
    if operation == "interval_expansion":
        new_i = [x * 2 if abs(x) <= 2 else x for x in intervals]
        return MotivicCell(intervals=new_i, contour=cell.contour, registral_center=cell.registral_center)
    if operation == "contraction":
        new_i = [x // 2 if x % 2 == 0 else x for x in intervals]
        return MotivicCell(intervals=new_i or [1], contour=cell.contour, registral_center=cell.registral_center)
    if operation == "fragmentation":
        return MotivicCell(intervals=intervals[:2] if len(intervals) >= 2 else intervals, contour=cell.contour, registral_center=cell.registral_center)
    if operation == "inversion_lite":
        return MotivicCell(intervals=[-x for x in intervals], contour=cell.contour, registral_center=cell.registral_center)
    if operation == "registral_shift":
        return MotivicCell(intervals=intervals, contour=cell.contour, registral_center=cell.registral_center + 12)
    return cell


def build_development_plan(motivic_cells: List[MotivicCell], seed: int) -> dict:
    """Build development plan: operations per section role."""
    ops = ["statement", "transposition", "fragmentation", "inversion_lite", "interval_expansion"]
    h = _hash_int(seed)
    return {
        "primary": ["statement"],
        "contrast": [ops[(h >> 2) % len(ops)], ops[(h >> 5) % len(ops)]],
        "return": ["transposition", "fragmentation"],
    }
