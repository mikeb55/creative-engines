"""Tests for spacing_rules."""
import pytest
from orchestration_bridge.spacing_rules import apply_spacing_rules, score_spacing_clarity
from orchestration_bridge.instrument_profiles import get_ensemble_profile


def test_apply_spacing_rules():
    parts = [{"part_index": 0, "events": [{"pitch": 60}], "role": "melody"}]
    profile = get_ensemble_profile("string_quartet")
    result = apply_spacing_rules(parts, profile)
    assert len(result) == 1
    assert result[0]["spacing_applied"] is True


def test_score_spacing_clarity():
    parts = [{"events": [{"pitch": 60}], "role": "melody"}]
    score = score_spacing_clarity(parts)
    assert 0 <= score <= 1
