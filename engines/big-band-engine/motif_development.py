"""
Big Band Motif Development — Sectional transfer, density growth, brass punch, sax fragmentation.
"""

from typing import List

try:
    from .composer_ir import MotivicCell
except ImportError:
    from composer_ir import MotivicCell


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


def generate_motivic_cells(seed: int, count: int = 4) -> List[MotivicCell]:
    """Generate sectional motivic cells."""
    cells = []
    for i in range(count):
        h = _hash_int(seed, i)
        pool = [5, 7, 4, 12, -5, -7]
        intervals = [pool[(h >> (j * 2)) % len(pool)] for j in range(3)]
        contour = ["sectional", "brass_punch", "sax_line"][h % 3]
        reg = 58 + (h % 14)
        cells.append(MotivicCell(intervals=intervals, contour=contour, registral_center=reg))
    return cells


def develop_motif_cell(cell: MotivicCell, operation: str) -> MotivicCell:
    """Develop motif: sectional_transfer, density_growth, brass_punch_expansion, etc."""
    intervals = list(cell.intervals)
    if operation == "sectional_transfer":
        return MotivicCell(
            intervals=intervals[:2] if len(intervals) >= 2 else intervals,
            contour=cell.contour,
            rhythmic_weight="ensemble",
            registral_center=cell.registral_center + 7,
        )
    if operation == "density_growth":
        ext = [intervals[-1] // 2] if intervals else [2]
        return MotivicCell(
            intervals=intervals + ext,
            contour=cell.contour,
            rhythmic_weight="ensemble",
            registral_center=cell.registral_center,
        )
    if operation == "brass_punch_expansion":
        return MotivicCell(
            intervals=intervals + [12, -12][:1],
            contour="brass_punch",
            rhythmic_weight="ensemble",
            registral_center=cell.registral_center + 12,
        )
    if operation == "sax_fragmentation":
        return MotivicCell(
            intervals=intervals[:2] if len(intervals) >= 2 else intervals,
            contour="sax_line",
            rhythmic_weight="ensemble",
            registral_center=cell.registral_center - 5,
        )
    if operation == "counterline_extension":
        ext = [intervals[0], -intervals[0]] if intervals else [5, -5]
        return MotivicCell(
            intervals=intervals + ext[:2],
            contour=cell.contour,
            rhythmic_weight="ensemble",
            registral_center=cell.registral_center,
        )
    if operation == "rhythm_hit_variation":
        return MotivicCell(
            intervals=intervals,
            contour=cell.contour,
            rhythmic_weight="hit",
            registral_center=cell.registral_center,
        )
    return cell


def build_development_plan(motivic_cells: List[MotivicCell], seed: int) -> dict:
    """Build development plan per section."""
    ops = ["sectional_transfer", "density_growth", "brass_punch_expansion", "sax_fragmentation", "counterline_extension"]
    h = _hash_int(seed)
    return {
        "primary": ["statement"],
        "contrast": [ops[(h >> 2) % len(ops)]],
        "shout": ["brass_punch_expansion", "density_growth"],
        "return": ["sectional_transfer", "density_growth"],
    }
