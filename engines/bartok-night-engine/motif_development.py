"""
Bartók Night Motif Development — Isolated gestures, fragmentation, silence.
"""

from typing import List

try:
    from .composer_ir import MotivicCell
except ImportError:
    from composer_ir import MotivicCell


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


def generate_motivic_cells(seed: int, count: int = 3) -> List[MotivicCell]:
    """Generate fragment-like motivic cells."""
    cells = []
    for i in range(count):
        h = _hash_int(seed, i)
        intervals = [((h >> (j * 2)) % 7) - 3 for j in range(4)]
        intervals = [x for x in intervals if x != 0][:3] or [1, 6, -1]
        contour = ["fragment", "arch", "wave"][h % 3]
        reg = 52 + (h % 16)
        cells.append(MotivicCell(intervals=intervals, contour=contour, registral_center=reg))
    return cells


def develop_motif_cell(cell: MotivicCell, operation: str) -> MotivicCell:
    """Develop motif: fragmentation, registral_shift, rhythmic_isolation, etc."""
    intervals = list(cell.intervals)
    if operation == "fragmentation":
        return MotivicCell(
            intervals=intervals[:2] if len(intervals) >= 2 else intervals,
            contour=cell.contour,
            rhythmic_weight="isolated",
            registral_center=cell.registral_center,
        )
    if operation == "registral_shift":
        return MotivicCell(
            intervals=intervals,
            contour=cell.contour,
            rhythmic_weight="isolated",
            registral_center=cell.registral_center + 12,
        )
    if operation == "rhythmic_isolation":
        return MotivicCell(
            intervals=intervals,
            contour=cell.contour,
            rhythmic_weight="isolated",
            registral_center=cell.registral_center,
        )
    if operation == "cluster_expansion":
        expanded = intervals + [1, -1] if intervals else [1, -1, 1]
        return MotivicCell(
            intervals=expanded[:4],
            contour=cell.contour,
            rhythmic_weight="isolated",
            registral_center=cell.registral_center,
        )
    if operation == "interval_widening":
        widened = [x * 2 if abs(x) <= 3 else x for x in intervals]
        return MotivicCell(
            intervals=widened,
            contour=cell.contour,
            rhythmic_weight="isolated",
            registral_center=cell.registral_center,
        )
    if operation == "silence_insertion":
        return MotivicCell(
            intervals=intervals,
            contour=cell.contour,
            rhythmic_weight="isolated",
            registral_center=cell.registral_center,
        )
    return cell


def build_development_plan(motivic_cells: List[MotivicCell], seed: int) -> dict:
    """Build development plan per section."""
    ops = ["fragmentation", "registral_shift", "rhythmic_isolation", "cluster_expansion", "interval_widening"]
    h = _hash_int(seed)
    return {
        "primary": ["statement"],
        "contrast": [ops[(h >> 2) % len(ops)]],
        "return": ["registral_shift", "fragmentation"],
    }
