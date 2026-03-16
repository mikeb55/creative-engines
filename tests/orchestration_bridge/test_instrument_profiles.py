"""Tests for instrument_profiles."""
import pytest
from orchestration_bridge.instrument_profiles import (
    get_ensemble_profile,
    ENSEMBLE_PROFILES,
    STRING_QUARTET,
    GUITAR_TRIO,
)


def test_get_ensemble_profile():
    p = get_ensemble_profile("string_quartet")
    assert p is not None
    assert p.ensemble_type == "string_quartet"
    assert len(p.instruments) == 4


def test_get_ensemble_profile_unknown():
    assert get_ensemble_profile("unknown") is None


def test_string_quartet_instruments():
    assert len(STRING_QUARTET.instruments) == 4
    names = [i.name for i in STRING_QUARTET.instruments]
    assert "Violin I" in names
    assert "Cello" in names


def test_guitar_trio():
    assert len(GUITAR_TRIO.instruments) == 3
    assert GUITAR_TRIO.preferred_texture == "melody + pad"


def test_all_ensemble_types():
    required = ["string_quartet", "chamber_jazz_quintet", "chamber_jazz_sextet",
               "big_band_basic", "guitar_trio", "guitar_string_quartet"]
    for t in required:
        assert t in ENSEMBLE_PROFILES
