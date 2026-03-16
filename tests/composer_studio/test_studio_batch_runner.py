"""Tests for studio_batch_runner."""
import pytest
from composer_studio.studio_batch_runner import run_batch_generation


def test_run_batch_generation():
    result = run_batch_generation("wheeler_lyric", "Test Tune", seed=0)
    assert "error" not in result or not result["error"]
    assert "finalists" in result
    assert len(result["finalists"]) >= 1


def test_run_batch_generation_unknown_preset():
    result = run_batch_generation("unknown_preset", "Test", seed=0)
    assert "error" in result
