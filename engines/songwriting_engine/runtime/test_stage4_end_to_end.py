"""Stage 4 end-to-end regression tests."""

import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from songwriting_engine_runtime import run_songwriting_engine
from runtime_cutover import get_default_songwriting_engine_mode, is_legacy_path_enabled
from launcher_entry import run_launcher_generation, save_launcher_outputs


def test_main_default_runtime_path():
    """Main default runtime path works."""
    result = run_songwriting_engine("River Road", mode="title", count=6, finalist_limit=2, seed=0)
    assert "finalists_compiled" in result
    assert "finalists_musicxml" in result
    assert "archive_stats" in result
    assert len(result["finalists_musicxml"]) >= 1
    for xml in result["finalists_musicxml"]:
        if xml:
            assert "<?xml" in xml
            assert "<score-partwise" in xml
    print("  [PASS] main default runtime path")


def test_launcher_generation_path():
    """Launcher generation path works."""
    result = run_launcher_generation("Edge of Night", mode="hook", count=4, finalist_limit=2, seed=42)
    assert result["finalists_compiled"]
    assert any(xml for xml in result["finalists_musicxml"])
    print("  [PASS] launcher generation path")


def test_output_packaging():
    """Output packaging produces valid files."""
    result = run_launcher_generation("Packaging Test", count=4, finalist_limit=2, seed=100)
    with tempfile.TemporaryDirectory() as tmp:
        folder = save_launcher_outputs(result, output_dir=Path(tmp))
        assert (folder / "finalists_musicxml").exists()
        assert (folder / "finalists_summary.json").exists()
        assert (folder / "run_summary.txt").exists()
        summary = json.loads((folder / "finalists_summary.json").read_text(encoding="utf-8"))
        assert summary["finalist_count"] >= 1
        xml_count = len(list((folder / "finalists_musicxml").glob("*.musicxml")))
        assert xml_count >= 1
    print("  [PASS] output packaging")


def test_musicxml_outputs_produced():
    """MusicXML outputs are valid."""
    result = run_songwriting_engine("XML Test", count=4, finalist_limit=2, seed=200)
    for xml in result["finalists_musicxml"]:
        if xml:
            assert "<work-title>" in xml
            assert "<measure " in xml
            assert "<note" in xml or "<note>" in xml
    print("  [PASS] MusicXML outputs produced")


def test_legacy_not_default():
    """Legacy path is not the default."""
    assert get_default_songwriting_engine_mode() == "song_ir"
    assert is_legacy_path_enabled() is False
    print("  [PASS] legacy not default")


def test_deterministic_behaviour():
    """Same input + seed = same output."""
    a = run_songwriting_engine("Deterministic", count=4, finalist_limit=2, seed=999)
    b = run_songwriting_engine("Deterministic", count=4, finalist_limit=2, seed=999)
    assert len(a["finalists_musicxml"]) == len(b["finalists_musicxml"])
    for x, y in zip(a["finalists_musicxml"], b["finalists_musicxml"]):
        assert x == y
    print("  [PASS] deterministic behaviour")


if __name__ == "__main__":
    test_main_default_runtime_path()
    test_launcher_generation_path()
    test_output_packaging()
    test_musicxml_outputs_produced()
    test_legacy_not_default()
    test_deterministic_behaviour()
    print("All Stage 4 end-to-end tests passed.")
