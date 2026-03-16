"""Tests for runtime cutover."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from runtime_cutover import (
    get_default_songwriting_engine_mode,
    set_new_engine_default,
    is_legacy_path_enabled,
    get_runtime_mode_summary,
)


def test_default_mode_is_song_ir():
    """Default mode is song_ir (new engine)."""
    assert get_default_songwriting_engine_mode() == "song_ir"
    print("  [PASS] default mode is song_ir")


def test_legacy_not_default():
    """Legacy path is not the default."""
    assert is_legacy_path_enabled() is False
    print("  [PASS] legacy not default")


def test_mode_summary():
    """Runtime mode summary is correct."""
    summary = get_runtime_mode_summary()
    assert summary["default_mode"] == "song_ir"
    assert summary["recommended_entrypoint"] == "run_songwriting_engine"
    assert summary["legacy_deprecated"] is True
    print("  [PASS] mode summary")


def test_set_new_engine_default():
    """set_new_engine_default is idempotent."""
    set_new_engine_default()
    assert get_default_songwriting_engine_mode() == "song_ir"
    print("  [PASS] set new engine default")


if __name__ == "__main__":
    test_default_mode_is_song_ir()
    test_legacy_not_default()
    test_mode_summary()
    test_set_new_engine_default()
    print("All runtime cutover tests passed.")
