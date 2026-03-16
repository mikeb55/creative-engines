"""Composer DAW runtime and pipeline tests."""
import os
import tempfile
import pytest

from composer_daw.composer_daw_runtime import run_composer_daw, get_project_status


def test_run_composer_daw_creates_project():
    """run_composer_daw creates project and runs generation."""
    with tempfile.TemporaryDirectory() as d:
        r = run_composer_daw("RuntimeTest", idea="Test", preset_name="wheeler_lyric", seed=0, base_dir=d)
        assert not r.get("error")
        status = r.get("status", {})
        assert status.get("session_count", 0) >= 1
        assert status.get("composition_count", 0) >= 1


def test_run_composer_daw_deterministic():
    """Same seed produces same output."""
    with tempfile.TemporaryDirectory() as d:
        r1 = run_composer_daw("Det1", idea="Same", preset_name="wheeler_lyric", seed=42, base_dir=d)
        r2 = run_composer_daw("Det2", idea="Same", preset_name="wheeler_lyric", seed=42, base_dir=d)
        assert not r1.get("error") and not r2.get("error")
        assert r1["status"]["composition_count"] == r2["status"]["composition_count"]


def test_run_composer_daw_export():
    """run_composer_daw exports when export_mode is all."""
    with tempfile.TemporaryDirectory() as d:
        r = run_composer_daw(
            "ExportRun",
            idea="Export",
            preset_name="wheeler_lyric",
            seed=0,
            base_dir=d,
            export_mode="all",
        )
        assert not r.get("error")
        assert r["status"].get("export_count", 0) >= 1
        for rec in r["status"].get("export_history", []):
            assert os.path.isfile(rec["path"])


def test_get_project_status():
    """get_project_status returns correct structure."""
    with tempfile.TemporaryDirectory() as d:
        r = run_composer_daw("StatusTest", idea="Status", preset_name="wheeler_lyric", seed=0, base_dir=d)
        project = r.get("project")
        assert project is not None
        status = get_project_status(project)
        assert "session_count" in status
        assert "composition_count" in status
        assert "export_history" in status
