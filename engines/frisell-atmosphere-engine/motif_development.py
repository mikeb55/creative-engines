"""
Frisell Atmosphere Motif Development — Echo, registral drift, silence spacing.
"""

from typing import List

try:
    from .composer_ir import MotivicCell
except ImportError:
    from composer_ir import MotivicCell


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


def generate_motivic_cells(seed: int, count: int = 3) -> List[MotivicCell]:
    """Generate sparse lyric-like motivic cells."""
    cells = []
    for i in range(count):
        h = _hash_int(seed, i)
        ints = [5, 7, 4, 2, -5, -7, -4]
        intervals = [ints[(h >> (j * 2)) % 7] for j in range(3)]
        contour = ["open", "drift", "echo"][h % 3]
        reg = 52 + (h % 14)
        cells.append(MotivicCell(intervals=intervals, contour=contour, registral_center=reg))
    return cells


def develop_motif_cell(cell: MotivicCell, operation: str) -> MotivicCell:
    """Develop motif: echo, registral_drift, elongation, etc."""
    intervals = list(cell.intervals)
    if operation == "echo":
        return MotivicCell(
            intervals=intervals[:2] if len(intervals) >= 2 else intervals,
            contour=cell.contour,
            rhythmic_weight="spacious",
            registral_center=cell.registral_center,
        )
    if operation == "registral_drift":
        return MotivicCell(
            intervals=intervals,
            contour=cell.contour,
            rhythmic_weight="spacious",
            registral_center=cell.registral_center + 5,
        )
    if operation == "elongation":
        ext = [intervals[-1] // 2] if intervals else [2]
        return MotivicCell(
            intervals=intervals + ext,
            contour=cell.contour,
            rhythmic_weight="spacious",
            registral_center=cell.registral_center,
        )
    if operation == "silence_spacing":
        return MotivicCell(
            intervals=intervals,
            contour=cell.contour,
            rhythmic_weight="spaced",
            registral_center=cell.registral_center,
        )
    if operation == "contour_softening":
        soft = [x if abs(x) <= 7 else (7 if x > 0 else -7) for x in intervals]
        return MotivicCell(
            intervals=soft,
            contour=cell.contour,
            rhythmic_weight="spacious",
            registral_center=cell.registral_center,
        )
    if operation == "harmonic_shadow":
        return MotivicCell(
            intervals=[-x for x in intervals[:2]] if len(intervals) >= 2 else intervals,
            contour=cell.contour,
            rhythmic_weight="spacious",
            registral_center=cell.registral_center - 5,
        )
    return cell


def build_development_plan(motivic_cells: List[MotivicCell], seed: int) -> dict:
    """Build development plan per section."""
    ops = ["echo", "registral_drift", "elongation", "silence_spacing", "harmonic_shadow"]
    h = _hash_int(seed)
    return {
        "primary": ["statement"],
        "contrast": [ops[(h >> 2) % len(ops)]],
        "return": ["harmonic_shadow", "registral_drift"],
    }
