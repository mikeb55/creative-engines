"""
Shorter Form Motif Development — recontextualization, interval expansion, fragment return.
"""

from typing import List

try:
    from .composer_ir import MotivicCell
except ImportError:
    from composer_ir import MotivicCell


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


def generate_motivic_cells(seed: int, count: int = 3) -> List[MotivicCell]:
    """Generate Shorter-style motivic cells."""
    cells = []
    for i in range(count):
        h = _hash_int(seed, i)
        pool = [3, 5, 7, -3, -5, 6]
        intervals = [pool[(h >> (j * 2)) % len(pool)] for j in range(3)]
        contour = ["arch", "descent", "wave"][h % 3]
        reg = 58 + (h % 14)
        cells.append(MotivicCell(intervals=intervals, contour=contour, registral_center=reg))
    return cells


def develop_motif_cell(cell: MotivicCell, operation: str) -> MotivicCell:
    """Develop motif: motif_recontextualization, interval_expansion, fragment_return, etc."""
    intervals = list(cell.intervals)
    if operation == "motif_recontextualization":
        return MotivicCell(
            intervals=intervals[:2] if len(intervals) >= 2 else intervals,
            contour=cell.contour,
            rhythmic_weight=cell.rhythmic_weight,
            registral_center=cell.registral_center + 5,
        )
    if operation == "interval_expansion":
        ext = [intervals[-1] + 2] if intervals else [5]
        return MotivicCell(
            intervals=intervals + ext,
            contour=cell.contour,
            rhythmic_weight=cell.rhythmic_weight,
            registral_center=cell.registral_center,
        )
    if operation == "fragment_return":
        return MotivicCell(
            intervals=intervals[:1] if intervals else [5],
            contour=cell.contour,
            rhythmic_weight=cell.rhythmic_weight,
            registral_center=cell.registral_center - 7,
        )
    if operation == "rhythmic_mutation":
        return MotivicCell(
            intervals=intervals,
            contour=cell.contour,
            rhythmic_weight="offbeat" if cell.rhythmic_weight == "onbeat" else "mixed",
            registral_center=cell.registral_center,
        )
    if operation == "register_reposition":
        return MotivicCell(
            intervals=intervals,
            contour=cell.contour,
            rhythmic_weight=cell.rhythmic_weight,
            registral_center=cell.registral_center + 12,
        )
    if operation == "contour_reversal":
        return MotivicCell(
            intervals=[-x for x in intervals[::-1]],
            contour=cell.contour,
            rhythmic_weight=cell.rhythmic_weight,
            registral_center=cell.registral_center,
        )
    return cell


def build_development_plan(motivic_cells: List[MotivicCell], seed: int) -> dict:
    """Build development plan per section."""
    ops = ["motif_recontextualization", "interval_expansion", "fragment_return", "rhythmic_mutation", "register_reposition", "contour_reversal"]
    h = _hash_int(seed)
    return {
        "primary": ["statement"],
        "development": [ops[(h >> 2) % len(ops)]],
        "return": ["motif_recontextualization", "fragment_return"],
    }
