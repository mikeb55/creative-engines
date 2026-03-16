"""Tests for style ranker."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines"))

from style_dna.style_ranker import rank_compositions_by_style_fit, style_adjusted_score
from shared_composer.engine_registry import get_engine, ensure_engines_loaded


def _make_compiled(engine_name: str, seed: int):
    ensure_engines_loaded()
    eng = get_engine(engine_name)
    ir = eng.generate_ir("Test", mode="title", seed=seed)
    return eng.compile_from_ir(ir)


def test_rank_compositions_by_style_fit():
    comps = [_make_compiled("wayne_shorter", i) for i in range(3)]
    ranked = rank_compositions_by_style_fit(comps, "wayne_shorter")
    assert len(ranked) == 3
    scores = [s for _, s in ranked]
    assert scores == sorted(scores, reverse=True)


def test_style_adjusted_score():
    comp = _make_compiled("wayne_shorter", 0)
    base = 6.0
    adjusted = style_adjusted_score(comp, "wayne_shorter", base)
    assert 0 <= adjusted <= 10
    assert adjusted != base or base == 0
