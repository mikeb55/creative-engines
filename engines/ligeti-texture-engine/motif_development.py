"""
Ligeti Texture Motif Development — Density accumulation, cluster spread, register drift.
"""

from typing import List

try:
    from .composer_ir import MotivicCell
except ImportError:
    from composer_ir import MotivicCell


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


def generate_motivic_cells(seed: int, count: int = 4) -> List[MotivicCell]:
    """Generate texture motivic cells."""
    cells = []
    for i in range(count):
        h = _hash_int(seed, i)
        pool = [1, 2, 3, 5, -1, -2]
        intervals = [pool[(h >> (j * 2)) % len(pool)] for j in range(3)]
        contour = ["cloud", "swarm", "shimmer"][h % 3]
        reg = 52 + (h % 20)
        cells.append(MotivicCell(intervals=intervals, contour=contour, registral_center=reg))
    return cells


def develop_motif_cell(cell: MotivicCell, operation: str) -> MotivicCell:
    """Develop motif: density_accumulation, cluster_spread, register_drift, etc."""
    intervals = list(cell.intervals)
    if operation == "density_accumulation":
        ext = [intervals[-1] // 2] if intervals else [1]
        return MotivicCell(
            intervals=intervals + ext,
            contour=cell.contour,
            rhythmic_weight="suspended",
            registral_center=cell.registral_center,
        )
    if operation == "cluster_spread":
        return MotivicCell(
            intervals=intervals + [1, -1][:1],
            contour="cloud",
            rhythmic_weight="suspended",
            registral_center=cell.registral_center,
        )
    if operation == "register_drift":
        return MotivicCell(
            intervals=intervals,
            contour=cell.contour,
            rhythmic_weight="suspended",
            registral_center=cell.registral_center + 7,
        )
    if operation == "micropolyphonic_overlap":
        return MotivicCell(
            intervals=intervals[:2] if len(intervals) >= 2 else intervals,
            contour="cloud",
            rhythmic_weight="suspended",
            registral_center=cell.registral_center,
        )
    if operation == "swarm_rotation":
        return MotivicCell(
            intervals=intervals[::-1] if intervals else [1, 2],
            contour="swarm",
            rhythmic_weight="suspended",
            registral_center=cell.registral_center,
        )
    if operation == "texture_thinning":
        return MotivicCell(
            intervals=intervals[:1] if intervals else [1],
            contour=cell.contour,
            rhythmic_weight="suspended",
            registral_center=cell.registral_center,
        )
    return cell


def build_development_plan(motivic_cells: List[MotivicCell], seed: int) -> dict:
    """Build development plan per section."""
    ops = ["density_accumulation", "cluster_spread", "register_drift", "micropolyphonic_overlap", "swarm_rotation", "texture_thinning"]
    h = _hash_int(seed)
    return {
        "primary": ["statement"],
        "contrast": [ops[(h >> 2) % len(ops)]],
        "return": ["texture_thinning", "register_drift"],
    }
