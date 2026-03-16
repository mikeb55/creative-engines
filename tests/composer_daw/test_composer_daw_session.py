"""Composer DAW session and generation tests."""
import os
import tempfile
import pytest

from composer_daw.composer_project_manager import create_project
from composer_daw.composer_session_manager import (
    create_session,
    run_generation_session,
    rank_session_candidates,
    select_session_winner,
)
from composer_daw.composer_project_types import ComposerProject


def test_create_session():
    """Session creation adds to project."""
    with tempfile.TemporaryDirectory() as d:
        p = create_project("SessionTest", base_dir=d)
        s = create_session(p, "My idea", "wheeler_lyric", seed=0)
        assert s.idea == "My idea"
        assert s.preset_name == "wheeler_lyric"
        assert s.session_id
        assert len(p.sessions) == 1


def test_run_generation_session():
    """Generation produces candidates."""
    with tempfile.TemporaryDirectory() as d:
        p = create_project("GenTest", base_dir=d)
        s = create_session(p, "Theme", "wheeler_lyric", seed=0)
        batch = run_generation_session(s, population_size=4, finalist_count=2)
        assert len(batch.candidates) >= 1
        assert s.batch is not None


def test_rank_session_candidates():
    """Rank returns candidates from batch."""
    with tempfile.TemporaryDirectory() as d:
        p = create_project("RankTest", base_dir=d)
        s = create_session(p, "Rank", "frisell_atmosphere", seed=0)
        run_generation_session(s, population_size=4, finalist_count=2)
        ranked = rank_session_candidates(s)
        assert len(ranked) >= 1


def test_select_session_winner():
    """Select winner sets selected_composition."""
    with tempfile.TemporaryDirectory() as d:
        p = create_project("SelectTest", base_dir=d)
        s = create_session(p, "Select", "wheeler_lyric", seed=0)
        run_generation_session(s, population_size=4, finalist_count=2)
        sel = select_session_winner(s, 0)
        assert sel is not None
        assert s.selected_composition is not None
        assert s.selected_index == 0
