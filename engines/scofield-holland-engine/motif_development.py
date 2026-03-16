"""
Scofield Holland Motif Development — Riff-centred, rhythm-aware, groove-first.
"""

from typing import List

try:
    from .composer_ir import MotivicCell
except ImportError:
    from composer_ir import MotivicCell


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


def generate_motivic_cells(seed: int, count: int = 3) -> List[MotivicCell]:
    """Generate groove riff motivic cells."""
    cells = []
    for i in range(count):
        h = _hash_int(seed, i)
        ints = [1, 4, 6, -1, 0, 5, -4]
        intervals = [ints[(h >> (j * 2)) % 7] for j in range(4)]
        contour = ["groove", "angular", "pocket"][h % 3]
        reg = 55 + (h % 12)
        repeat = 1 + (h % 2)
        cells.append(MotivicCell(intervals=intervals, contour=contour, registral_center=reg, repeat_count=repeat))
    return cells


def develop_motif_cell(cell: MotivicCell, operation: str) -> MotivicCell:
    """Develop motif: riff_repeat, chromatic_shift, rhythmic_displacement, etc."""
    intervals = list(cell.intervals)
    if operation == "riff_repeat":
        return MotivicCell(
            intervals=intervals[:2] * 2 if len(intervals) >= 2 else intervals + intervals[:1],
            contour=cell.contour,
            rhythmic_weight="pocket",
            registral_center=cell.registral_center,
            repeat_count=cell.repeat_count + 1,
        )
    if operation == "chromatic_shift":
        shifted = [x + (1 if x > 0 else -1) for x in intervals]
        return MotivicCell(
            intervals=shifted,
            contour=cell.contour,
            rhythmic_weight=cell.rhythmic_weight,
            registral_center=cell.registral_center,
        )
    if operation == "rhythmic_displacement":
        return MotivicCell(
            intervals=intervals,
            contour=cell.contour,
            rhythmic_weight="syncopated",
            registral_center=cell.registral_center,
        )
    if operation == "blues_inflection":
        inf = [x if abs(x) != 4 else (5 if x > 0 else -5) for x in intervals]
        return MotivicCell(
            intervals=inf,
            contour=cell.contour,
            rhythmic_weight=cell.rhythmic_weight,
            registral_center=cell.registral_center,
        )
    if operation == "registral_punch":
        return MotivicCell(
            intervals=intervals,
            contour=cell.contour,
            rhythmic_weight="pocket",
            registral_center=cell.registral_center + 7,
        )
    if operation == "syncopated_extension":
        ext = [intervals[-1]] if intervals else [1]
        return MotivicCell(
            intervals=intervals + ext,
            contour=cell.contour,
            rhythmic_weight="syncopated",
            registral_center=cell.registral_center,
        )
    if operation == "groove_fragmentation":
        return MotivicCell(
            intervals=intervals[:2] if len(intervals) >= 2 else intervals,
            contour=cell.contour,
            rhythmic_weight="pocket",
            registral_center=cell.registral_center,
        )
    return cell


def build_development_plan(motivic_cells: List[MotivicCell], seed: int) -> dict:
    """Build development plan per section."""
    ops = ["riff_repeat", "chromatic_shift", "rhythmic_displacement", "blues_inflection", "registral_punch", "syncopated_extension", "groove_fragmentation"]
    h = _hash_int(seed)
    return {
        "primary": ["statement"],
        "contrast": [ops[(h >> 2) % len(ops)]],
        "return": ["riff_repeat", "registral_punch"],
    }
