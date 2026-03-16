"""Tests for studio_launcher_entry."""
import pytest
from composer_studio.studio_launcher_entry import run_studio_launcher, get_studio_status


def test_run_studio_launcher():
    r = run_studio_launcher("Launcher Test", "wheeler_lyric", 0)
    assert "finalists" in r
    assert "run_path" in r or "error" in r


def test_get_studio_status():
    s = get_studio_status()
    assert "presets" in s
    assert "engines" in s
    assert "wheeler_lyric" in s["presets"]
