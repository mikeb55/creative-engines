"""Composer DAW export tests."""
import os
import tempfile
import pytest

from composer_daw.composer_project_manager import create_project
from composer_daw.composer_session_manager import (
    create_session,
    run_generation_session,
    select_session_winner,
)
from composer_daw.composer_export_manager import export_composition


def test_export_composition():
    """Export produces MusicXML files."""
    with tempfile.TemporaryDirectory() as d:
        p = create_project("ExportTest", base_dir=d)
        s = create_session(p, "Export theme", "wheeler_lyric", seed=0)
        run_generation_session(s, population_size=4, finalist_count=2)
        select_session_winner(s, 0)
        records = export_composition(p, s, export_type="composition")
        assert len(records) >= 1
        assert os.path.isfile(records[0].file_path)
        assert records[0].file_path.endswith(".musicxml")


def test_export_ensemble():
    """Export ensemble produces orchestrated MusicXML."""
    with tempfile.TemporaryDirectory() as d:
        p = create_project("EnsembleTest", base_dir=d)
        s = create_session(p, "Ensemble", "chamber_jazz", seed=0)
        run_generation_session(s, population_size=4, finalist_count=2)
        select_session_winner(s, 0)
        records = export_composition(p, s, export_type="ensemble", ensemble_type="string_quartet")
        assert len(records) >= 1
        assert os.path.isfile(records[0].file_path)


def test_export_lead_sheet():
    """Export lead sheet produces MusicXML."""
    with tempfile.TemporaryDirectory() as d:
        p = create_project("LeadSheetTest", base_dir=d)
        s = create_session(p, "Song", "lead_sheet_song", seed=0)
        run_generation_session(s, population_size=4, finalist_count=2)
        select_session_winner(s, 0)
        records = export_composition(p, s, export_type="lead_sheet")
        assert len(records) >= 1
        assert os.path.isfile(records[0].file_path)
