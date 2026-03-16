"""Tests for engine registry."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines"))

from shared_composer.engine_registry import list_engines, get_engine, ensure_engines_loaded


def test_list_engines():
    ensure_engines_loaded()
    engines = list_engines()
    assert "wayne_shorter" in engines
    assert "barry_harris" in engines
    assert "andrew_hill" in engines
    assert "monk" in engines


def test_get_engine():
    ensure_engines_loaded()
    eng = get_engine("wayne_shorter")
    assert eng.engine_name == "wayne_shorter"


def test_get_engine_unknown_raises():
    ensure_engines_loaded()
    try:
        get_engine("nonexistent")
        assert False
    except KeyError as e:
        assert "nonexistent" in str(e)
