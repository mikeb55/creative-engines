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
        # Shorter fingerprint: bias toward 2nds, 3rds, 4ths
        # Sparse tritone/maj7 as color events
        INTERVAL_POOL = [
            2, 2, 2,      # major 2nd (high weight)
            -2, -2, -2,   # minor 2nd down
            3, 3,         # minor 3rd
            -3, -3,       # minor 3rd down
            4, 4,         # major 3rd
            5, 5,         # perfect 4th
            -5, -5,       # 4th down
            6,            # tritone (low, color)
            -7,           # major 7th down (color)
        ]
        intervals = []
        for j in range(3):
            h2 = _hash_int(h, j + 100)
            intervals.append(INTERVAL_POOL[h2 % len(INTERVAL_POOL)])
        contour = ["arch", "descent", "ascent", "wave"][h % 4]
        reg = 58 + (h % 12)
        cells.append(MotivicCell(intervals=intervals, contour=contour, registral_center=reg))
    return cells


def develop_motif_cell(cell: MotivicCell, operation: str) -> MotivicCell:
    """Apply development operation to cell."""
    intervals = list(cell.intervals)
    INTERVAL_POOL = [
        2, 2, 2,
        -2, -2, -2,
        3, 3,
        -3, -3,
        4, 4,
        5, 5,
        -5, -5,
        6,
        -7,
    ]
    h = _hash_int(cell.registral_center, sum(ord(c) for c in operation))
    r = (h % 10000) / 10000.0
    # Weighted Shorter-style transforms: repeat 0.20, transposition 0.30, fragmentation 0.25, contour/new pitches 0.25
    if r < 0.20:
        return MotivicCell(intervals=list(intervals), contour=cell.contour, registral_center=cell.registral_center)
    if r < 0.50:
        step_choices = [2, -2, 3, -3]
        step = step_choices[(h >> 8) % len(step_choices)]
        return MotivicCell(
            intervals=list(intervals),
            contour=cell.contour,
            registral_center=cell.registral_center + step,
        )
    if r < 0.75:
        return MotivicCell(
            intervals=intervals[:2] if len(intervals) >= 2 else list(intervals),
            contour=cell.contour,
            registral_center=cell.registral_center,
        )
    new_intervals = []
    for j in range(len(intervals) if intervals else 3):
        h2 = _hash_int(h, j + 50)
        new_intervals.append(INTERVAL_POOL[h2 % len(INTERVAL_POOL)])
    if not new_intervals:
        new_intervals = [2, 3, 5]
    return MotivicCell(intervals=new_intervals, contour=cell.contour, registral_center=cell.registral_center)


def build_development_plan(motivic_cells: List[MotivicCell], seed: int) -> dict:
    """Build development plan: operations per section role."""
    ops = ["statement", "transposition", "fragmentation", "inversion_lite", "interval_expansion"]
    h = _hash_int(seed)
    return {
        "primary": ["statement"],
        "contrast": [ops[(h >> 2) % len(ops)], ops[(h >> 5) % len(ops)]],
        "return": ["transposition", "fragmentation"],
    }
