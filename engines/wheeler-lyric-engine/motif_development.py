"""
Wheeler Lyric Motif Development — Elongation, lyrical transformation.
"""

from typing import List

try:
    from .composer_ir import MotivicCell
except ImportError:
    from composer_ir import MotivicCell


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


def generate_motivic_cells(seed: int, count: int = 3) -> List[MotivicCell]:
    """Generate lyrical motivic cells."""
    cells = []
    for i in range(count):
        h = _hash_int(seed, i)
        ints = [5, 7, 4, 9, 2, -5, -7, -4]
        intervals = [ints[(h >> (j * 2)) % 8] for j in range(4)]
        intervals = intervals[:4] if intervals else [5, 7, -4]
        contour = ["arc", "wave", "lift"][h % 3]
        reg = 55 + (h % 14)
        cells.append(MotivicCell(intervals=intervals, contour=contour, registral_center=reg))
    return cells


def develop_motif_cell(cell: MotivicCell, operation: str) -> MotivicCell:
    """Develop motif: elongation, interval_softening, registral_lift, etc."""
    intervals = list(cell.intervals)
    if operation == "elongation":
        ext = [intervals[-1] // 2, -intervals[-1] // 2] if intervals else [2, -2]
        return MotivicCell(
            intervals=intervals + ext[:2],
            contour=cell.contour,
            rhythmic_weight="lyrical",
            registral_center=cell.registral_center,
        )
    if operation == "interval_softening":
        soft = [x if abs(x) <= 5 else (5 if x > 0 else -5) for x in intervals]
        return MotivicCell(
            intervals=soft,
            contour=cell.contour,
            rhythmic_weight="lyrical",
            registral_center=cell.registral_center,
        )
    if operation == "registral_lift":
        return MotivicCell(
            intervals=intervals,
            contour=cell.contour,
            rhythmic_weight="lyrical",
            registral_center=cell.registral_center + 7,
        )
    if operation == "contour_extension":
        ext = [intervals[0], intervals[-1]] if len(intervals) >= 2 else intervals
        return MotivicCell(
            intervals=intervals + ext,
            contour=cell.contour,
            rhythmic_weight="lyrical",
            registral_center=cell.registral_center,
        )
    if operation == "rhythmic_spread":
        return MotivicCell(
            intervals=intervals,
            contour=cell.contour,
            rhythmic_weight="spread",
            registral_center=cell.registral_center,
        )
    if operation == "echo_fragment":
        return MotivicCell(
            intervals=intervals[:2] if len(intervals) >= 2 else intervals,
            contour=cell.contour,
            rhythmic_weight="lyrical",
            registral_center=cell.registral_center,
        )
    if operation == "return_variation":
        return MotivicCell(
            intervals=intervals[::-1] if len(intervals) >= 2 else intervals,
            contour=cell.contour,
            rhythmic_weight="lyrical",
            registral_center=cell.registral_center + 5,
        )
    return cell


def build_development_plan(motivic_cells: List[MotivicCell], seed: int) -> dict:
    """Build development plan per section."""
    ops = ["elongation", "registral_lift", "interval_softening", "contour_extension", "return_variation"]
    h = _hash_int(seed)
    return {
        "primary": ["statement"],
        "contrast": [ops[(h >> 2) % len(ops)]],
        "return": ["return_variation", "registral_lift"],
    }
