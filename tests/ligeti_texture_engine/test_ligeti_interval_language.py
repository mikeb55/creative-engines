"""Tests for Ligeti Texture interval language."""

from interval_language import build_interval_language, derive_texture_cells, score_textural_identity


def test_build_interval_language():
    il = build_interval_language(0, "cluster_semitone")
    assert il.primary_intervals
    assert il.tension_profile == "cluster_semitone"


def test_build_all_profiles():
    for p in ["cluster_semitone", "micropoly_step", "swarm_fourth", "chromatic_cloud", "registral_shimmer"]:
        il = build_interval_language(0, p)
        assert il.tension_profile == p


def test_derive_texture_cells():
    il = build_interval_language(0, "cluster_semitone")
    cells = derive_texture_cells(il)
    assert len(cells) >= 4
    assert all(isinstance(c, list) for c in cells)


def test_score_textural_identity():
    il = build_interval_language(0, "cluster_semitone")
    s = score_textural_identity(il)
    assert 0 <= s <= 1.0
