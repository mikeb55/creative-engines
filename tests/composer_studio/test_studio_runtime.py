"""Tests for studio_runtime."""
import pytest
import os
import tempfile
from composer_studio.studio_runtime import run_composer_studio


def test_run_composer_studio():
    with tempfile.TemporaryDirectory() as d:
        result = run_composer_studio("Studio Test", "wheeler_lyric", seed=0, base_dir=d)
    assert "error" not in result or not result.get("error")
    assert "finalists" in result
    assert "run_path" in result
    assert "exported_paths" in result


def test_run_composer_studio_deterministic():
    r1 = run_composer_studio("Deterministic", "wheeler_lyric", seed=42)
    r2 = run_composer_studio("Deterministic", "wheeler_lyric", seed=42)
    assert len(r1.get("finalists", [])) == len(r2.get("finalists", []))
