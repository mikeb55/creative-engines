"""Tests for studio_presets."""
import pytest
from composer_studio.studio_presets import get_preset, list_presets, PRESETS


def test_get_preset():
    p = get_preset("wheeler_lyric")
    assert p is not None
    assert p.melody_engine == "wheeler_lyric"


def test_get_preset_unknown():
    assert get_preset("unknown") is None


def test_list_presets():
    names = list_presets()
    assert "wheeler_lyric" in names
    assert "hybrid_counterpoint" in names


def test_chamber_jazz_has_ensemble():
    p = get_preset("chamber_jazz")
    assert p.bridge_orchestration is True
    assert p.ensemble_type == "chamber_jazz_sextet"
