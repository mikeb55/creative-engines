"""Tests for hybrid style selector."""

import sys
import os

_engines = os.path.join(os.path.dirname(__file__), "..", "..", "engines")
if _engines not in sys.path:
    sys.path.insert(0, _engines)

from hybrid_engine.hybrid_generator import generate_hybrid_candidate
from hybrid_engine.hybrid_style_selector import (
    score_primary_engine_identity,
    score_harmony_engine_fit,
    score_hybrid_style_balance,
)


def test_score_primary_engine_identity():
    result = generate_hybrid_candidate(
        melody_engine="wayne_shorter",
        harmony_engine="barry_harris",
        input_text="Identity",
        seed=0,
    )
    score = score_primary_engine_identity(result, "wayne_shorter")
    assert 0 <= score <= 1


def test_score_harmony_engine_fit():
    result = generate_hybrid_candidate(
        melody_engine="wayne_shorter",
        harmony_engine="barry_harris",
        input_text="Harmony",
        seed=0,
    )
    score = score_harmony_engine_fit(result, "barry_harris")
    assert 0 <= score <= 1


def test_score_hybrid_style_balance():
    result = generate_hybrid_candidate(
        melody_engine="monk",
        harmony_engine="barry_harris",
        input_text="Balance",
        seed=0,
    )
    score = score_hybrid_style_balance(
        result,
        "monk",
        "barry_harris",
        None,
        None,
    )
    assert 0 <= score <= 1
