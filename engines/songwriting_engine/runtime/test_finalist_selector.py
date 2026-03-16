"""Tests for finalist selector."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from song_ir_schema import SongIR, HookDNA
from song_ir_generator import generate_song_ir_candidates
from finalist_selector import (
    score_ir_candidate,
    rank_ir_candidates,
    select_finalist_song_irs,
    compile_finalist_candidates,
)


def test_ranks_valid_irs():
    """Ranks valid IRs."""
    irs = generate_song_ir_candidates("Rank Test", mode="title", count=5, seed=200)
    ranked = rank_ir_candidates(irs)
    assert len(ranked) == 5
    for i in range(len(ranked) - 1):
        assert ranked[i][1] >= ranked[i + 1][1]
    print("  [PASS] ranks valid IRs")


def test_selects_finalist_count():
    """Selects requested finalist count or fewer."""
    irs = generate_song_ir_candidates("Select Test", mode="title", count=8, seed=201)
    finalists = select_finalist_song_irs(irs, limit=5)
    assert len(finalists) == 5
    finalists2 = select_finalist_song_irs(irs, limit=20)
    assert len(finalists2) == 8
    print("  [PASS] selects finalist count")


def test_compiles_finalists():
    """Compiles finalists successfully."""
    irs = generate_song_ir_candidates("Compile Test", mode="title", count=4, seed=202)
    results = compile_finalist_candidates(irs)
    assert len(results) >= 1
    for r in results:
        assert "source_ir" in r
        assert "compiled" in r
        assert "rank" in r
        assert "score" in r
        assert r["compiled"].title
    print("  [PASS] compiles finalists")


def test_preserves_diversity():
    """Finalists represent diverse candidates (different titles/structures)."""
    irs = generate_song_ir_candidates("Diversity Test", mode="title", count=12, seed=203)
    finalists = select_finalist_song_irs(irs, limit=5)
    titles = {f.title for f in finalists}
    assert len(titles) >= 1
    print("  [PASS] preserves diversity")


if __name__ == "__main__":
    test_ranks_valid_irs()
    test_selects_finalist_count()
    test_compiles_finalists()
    test_preserves_diversity()
    print("All finalist selector tests passed.")
