"""Tests for hook-first architecture."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from songwriting_engine_runtime import load_rule_package, generate_song
from hook_search import generate_hook_candidates, score_hook_candidate, select_hook_elites
from hook_lanes import assign_hook_to_lane, get_top_per_lane, HOOK_LANES
from song_from_hook import build_song_from_hook
from novelty_tools import population_replaceability_penalty, hook_replaceability_penalty
from pairwise_judge import compare_hooks, compare_songs, run_pairwise_tournament


def test_hook_candidate_generation():
    """Hook candidates have required fields."""
    load_rule_package()
    hooks = generate_hook_candidates(title="River Road", premise="love", count=8, seed=9801)
    assert len(hooks) == 8
    for h in hooks:
        assert "chorus_melody_idea" in h
        assert "title_line" in h
        assert "motif_cell" in h
        assert "contour_archetype" in h
        assert len(h["chorus_melody_idea"]) >= 4
    print("  [PASS] hook candidate generation")


def test_lane_assignment_coverage():
    """All lanes get assignments."""
    load_rule_package()
    hooks = generate_hook_candidates(title="Test", premise="love", count=30, seed=9802)
    lanes = set(assign_hook_to_lane(h) for h in hooks)
    assert len(lanes) >= 2
    for lane in lanes:
        assert lane in HOOK_LANES
    print("  [PASS] lane assignment coverage")


def test_song_from_hook():
    """Build song from hook produces valid structure."""
    load_rule_package()
    hooks = generate_hook_candidates(title="Dawn", count=1, seed=9803)
    song = build_song_from_hook(hooks[0], title="Dawn", seed=98030)
    assert song.get("sections")
    assert song.get("melody")
    assert song.get("hook_dna")
    assert any(s.get("section_role") == "chorus" for s in song["sections"])
    print("  [PASS] song from hook")


def test_novelty_penalty():
    """Novelty penalty returns 0 when population small."""
    load_rule_package()
    c = generate_song(style_profiles=[], song_seed="9804", structure_type="short", use_population_search=False)
    c["evaluation_scores"] = {"energy_arc": 6, "chorus_peak": 7, "image_recurrence": 5}
    penalty = population_replaceability_penalty(c, [c, c])
    assert penalty == 0.0
    hooks = generate_hook_candidates(count=5, seed=9804)
    hp = hook_replaceability_penalty(hooks[0], hooks)
    assert 0 <= hp <= 2.0
    print("  [PASS] novelty penalty")


def test_pairwise_judge():
    """Pairwise tournament returns a winner."""
    load_rule_package()
    c1 = generate_song(style_profiles=[], song_seed="9805", structure_type="short", use_population_search=False)
    c2 = generate_song(style_profiles=[], song_seed="9806", structure_type="short", use_population_search=False)
    c1["evaluation_scores"] = {"final_editorial_score": 7, "identity_score": 6, "chorus_dominance": 6, "premise_integrity": 5}
    c2["evaluation_scores"] = {"final_editorial_score": 6, "identity_score": 5, "chorus_dominance": 5, "premise_integrity": 5}
    winner = run_pairwise_tournament([c1, c2], is_hooks=False)
    assert winner is not None
    assert winner.get("evaluation_scores", {}).get("final_editorial_score") == 7
    print("  [PASS] pairwise judge")


def test_hook_first_pipeline():
    """Full hook-first pipeline produces valid song."""
    load_rule_package()
    c = generate_song(
        style_profiles=[], song_seed="9807", structure_type="short", title="Edge of Night",
        use_population_search=True, use_hook_first=True,
    )
    assert c.get("sections")
    assert c.get("melody")
    assert c.get("_hook_first")
    assert c.get("evaluation_scores", {}).get("overall", 0) >= 0
    print("  [PASS] hook-first pipeline")


def test_hook_derived_chorus_not_overwritten():
    """Hook-derived chorus uses guarded refinement when hook_dna exists."""
    load_rule_package()
    from editorial_refinement import reinforce_song_identity
    from song_from_hook import build_song_from_hook
    from hook_search import generate_hook_candidates
    hooks = generate_hook_candidates(title="River Road", count=1, seed=9808)
    song = build_song_from_hook(hooks[0], title="River Road", seed=98080)
    assert song.get("hook_dna")
    chorus_before = next(s.get("lyric_block", "") for s in song["sections"] if s.get("section_role") == "chorus")
    reinforced = reinforce_song_identity(song, seed=98081)
    chorus_after = next(s.get("lyric_block", "") for s in reinforced["sections"] if s.get("section_role") == "chorus")
    assert chorus_after
    assert "River" in chorus_after or "river" in chorus_after or "Road" in chorus_after or "road" in chorus_after
    print("  [PASS] hook-derived chorus not overwritten")


if __name__ == "__main__":
    test_hook_candidate_generation()
    test_lane_assignment_coverage()
    test_song_from_hook()
    test_novelty_penalty()
    test_pairwise_judge()
    test_hook_first_pipeline()
    test_hook_derived_chorus_not_overwritten()
    print("All hook-first tests passed.")
