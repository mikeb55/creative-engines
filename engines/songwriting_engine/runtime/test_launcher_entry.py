"""Tests for launcher entry."""

import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from launcher_entry import run_launcher_generation, save_launcher_outputs, get_launcher_status
from launcher_config import get_launcher_defaults, get_supported_input_modes


def test_run_launcher_generation():
    """Launcher generation runs successfully."""
    result = run_launcher_generation("Test Song", mode="title", count=4, finalist_limit=2, seed=0)
    assert "finalists_compiled" in result
    assert "finalists_musicxml" in result
    assert "archive_stats" in result
    assert len(result["finalists_musicxml"]) >= 1
    print("  [PASS] launcher generation")


def test_save_launcher_outputs():
    """Output packaging works."""
    result = run_launcher_generation("Save Test", mode="title", count=4, finalist_limit=2, seed=1)
    with tempfile.TemporaryDirectory() as tmp:
        folder = save_launcher_outputs(result, output_dir=Path(tmp))
        assert folder.exists()
        assert (folder / "finalists_musicxml").exists()
        assert (folder / "finalists_summary.json").exists()
        assert (folder / "run_summary.txt").exists()
        summary = json.loads((folder / "finalists_summary.json").read_text(encoding="utf-8"))
        assert "input_text" in summary
        assert "archive_stats" in summary
        xml_files = list((folder / "finalists_musicxml").glob("*.musicxml"))
        assert len(xml_files) >= 1
    print("  [PASS] save launcher outputs")


def test_get_launcher_status():
    """Launcher status returns valid structure."""
    status = get_launcher_status()
    assert "last_run" in status
    assert "output_base" in status
    assert "output_base_exists" in status
    print("  [PASS] launcher status")


def test_supported_modes():
    """Supported modes include title, premise, hook."""
    modes = get_supported_input_modes()
    assert "title" in modes
    assert "premise" in modes
    assert "hook" in modes
    print("  [PASS] supported modes")


if __name__ == "__main__":
    test_run_launcher_generation()
    test_save_launcher_outputs()
    test_get_launcher_status()
    test_supported_modes()
    print("All launcher entry tests passed.")
