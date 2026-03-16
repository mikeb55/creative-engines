"""
Messiaen Colour Motif Development — Mode shift, registral illumination, birdsong fragmentation.
"""

from typing import List

try:
    from .composer_ir import MotivicCell
except ImportError:
    from composer_ir import MotivicCell


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


def generate_motivic_cells(seed: int, count: int = 3) -> List[MotivicCell]:
    """Generate colour motivic cells: birdsong-like fragments."""
    ints = [2, 5, 6, 12, 7, 4, 9, 1]
    cells = []
    for i in range(count):
        h = _hash_int(seed, i)
        intervals = [ints[(h >> (j * 2)) % len(ints)] for j in range(4)]
        contour = ["birdsong", "luminous", "ecstatic"][h % 3]
        reg = 68 + (h % 12)
        cells.append(MotivicCell(intervals=intervals, contour=contour, registral_center=reg))
    return cells


def develop_motif_cell(cell: MotivicCell, operation: str) -> MotivicCell:
    """Develop motif: mode_shift, registral_illumination, birdsong_fragmentation, etc."""
    intervals = list(cell.intervals)
    if operation == "mode_shift":
        shifted = [x + 1 if -11 <= x <= 11 else x for x in intervals]
        return MotivicCell(intervals=shifted, contour=cell.contour, registral_center=cell.registral_center)
    if operation == "registral_illumination":
        return MotivicCell(intervals=intervals, contour=cell.contour, registral_center=cell.registral_center + 12)
    if operation == "rhythmic_addition":
        ext = [intervals[-1]] if intervals else [5]
        return MotivicCell(intervals=intervals + ext, contour=cell.contour, registral_center=cell.registral_center)
    if operation == "nonretrogradable_reflection":
        return MotivicCell(intervals=intervals + intervals[::-1], contour=cell.contour, registral_center=cell.registral_center)
    if operation == "birdsong_fragmentation":
        return MotivicCell(intervals=intervals[:2] if len(intervals) >= 2 else intervals, contour="birdsong", registral_center=cell.registral_center)
    if operation == "colour_repetition":
        return MotivicCell(intervals=intervals[:2] * 2 if len(intervals) >= 2 else intervals, contour=cell.contour, registral_center=cell.registral_center)
    if operation == "echo_transposition":
        transposed = [x + 5 for x in intervals]
        return MotivicCell(intervals=intervals + transposed, contour=cell.contour, registral_center=cell.registral_center)
    return cell


def build_development_plan(cells: List[MotivicCell], seed: int) -> dict:
    ops = ["mode_shift", "registral_illumination", "rhythmic_addition", "nonretrogradable_reflection", "birdsong_fragmentation", "colour_repetition", "echo_transposition"]
    h = _hash_int(seed)
    return {
        "primary": ["statement"],
        "contrast": [ops[(h >> 2) % len(ops)]],
        "return": ["registral_illumination", "colour_repetition"],
    }
