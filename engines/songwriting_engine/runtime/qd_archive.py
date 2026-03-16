"""
QD Archive — MAP-Elites style. One best elite per niche.
Deterministic, testable.
"""

from typing import Any, Dict, List, Optional, Tuple

try:
    from .qd_axes import get_qd_coordinates
    from .song_ir_schema import SongIR
except ImportError:
    from qd_axes import get_qd_coordinates
    from song_ir_schema import SongIR


class QDArchive:
    """Quality-diversity archive. One best SongIR per niche."""

    def __init__(self):
        self._archive: Dict[Tuple[int, ...], Tuple[SongIR, float]] = {}

    def insert(self, song_ir: SongIR, quality_score: float) -> bool:
        """Insert if better than current niche elite. Returns True if inserted."""
        coords = get_qd_coordinates(song_ir)
        if coords not in self._archive or quality_score > self._archive[coords][1]:
            self._archive[coords] = (song_ir, quality_score)
            return True
        return False

    def get_elites(self) -> List[Tuple[SongIR, float]]:
        """All elites as (song_ir, quality_score)."""
        return list(self._archive.values())

    def get_archive_stats(self) -> Dict[str, Any]:
        """Archive statistics."""
        elites = self.get_elites()
        scores = [q for _, q in elites]
        return {
            "niche_count": len(self._archive),
            "elite_count": len(elites),
            "min_quality": min(scores) if scores else 0,
            "max_quality": max(scores) if scores else 0,
            "avg_quality": sum(scores) / len(scores) if scores else 0,
        }

    def sample_elites(self, limit: Optional[int] = None) -> List[Tuple[SongIR, float]]:
        """Return elites sorted by quality descending. Optional limit."""
        elites = sorted(self.get_elites(), key=lambda x: x[1], reverse=True)
        if limit is not None:
            elites = elites[:limit]
        return elites
