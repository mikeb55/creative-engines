"""Tests for QD archive."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from song_ir_schema import SongIR, HookDNA, SectionIR
from qd_archive import QDArchive


def _make_ir(title: str, hook_energy: float, lyric_dens: float) -> SongIR:
    return SongIR(
        title=title,
        section_order=["verse", "chorus", "verse", "chorus"],
        hook_dna=HookDNA(energy_level=hook_energy, title_phrase=title),
        lyric_density=lyric_dens,
    )


def test_insert_elites():
    """Inserts elites correctly."""
    arch = QDArchive()
    ir1 = _make_ir("A", 0.8, 0.7)
    ir2 = _make_ir("B", 0.3, 0.4)
    assert arch.insert(ir1, 0.9)
    assert arch.insert(ir2, 0.6)
    elites = arch.get_elites()
    assert len(elites) == 2
    print("  [PASS] insert elites")


def test_one_best_per_niche():
    """Retains one best item per niche."""
    arch = QDArchive()
    ir1 = _make_ir("SameNiche", 0.8, 0.7)
    ir2 = _make_ir("SameNiche2", 0.82, 0.72)
    arch.insert(ir1, 0.7)
    arch.insert(ir2, 0.9)
    elites = arch.get_elites()
    assert len(elites) == 1
    assert elites[0][1] == 0.9
    print("  [PASS] one best per niche")


def test_archive_stats():
    """Archive stats are correct."""
    arch = QDArchive()
    arch.insert(_make_ir("X", 0.8, 0.8), 0.8)
    arch.insert(_make_ir("Y", 0.3, 0.3), 0.5)
    stats = arch.get_archive_stats()
    assert stats["elite_count"] >= 1
    assert stats["niche_count"] >= 1
    assert stats["min_quality"] <= stats["max_quality"]
    print("  [PASS] archive stats")


def test_sample_elites():
    """Elite sampling works."""
    arch = QDArchive()
    arch.insert(_make_ir("High", 0.9, 0.8), 0.95)
    arch.insert(_make_ir("Low", 0.4, 0.4), 0.4)
    sampled = arch.sample_elites(limit=1)
    assert len(sampled) == 1
    assert sampled[0][1] == 0.95
    print("  [PASS] sample elites")


if __name__ == "__main__":
    test_insert_elites()
    test_one_best_per_niche()
    test_archive_stats()
    test_sample_elites()
    print("All QD archive tests passed.")
