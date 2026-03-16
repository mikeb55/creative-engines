"""Tests for counterpoint planner."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines"))

from hybrid_engine.hybrid_composer_ir import HybridComposerIR
from hybrid_engine.counterpoint_planner import plan_counterpoint_layout, score_counterpoint_balance


def test_plan_layout_two_voices():
    ir = HybridComposerIR(primary_engine="wayne_shorter", harmony_engine="barry_harris", counter_engine=None)
    layout = plan_counterpoint_layout(ir)
    assert layout.voice_count >= 2
    assert any(r.role == "lead" for r in layout.voice_roles)


def test_plan_layout_with_counter():
    ir = HybridComposerIR(primary_engine="wayne_shorter", harmony_engine="barry_harris", counter_engine="bartok_night")
    layout = plan_counterpoint_layout(ir)
    assert layout.voice_count >= 2
    assert any(r.role == "counterline" for r in layout.voice_roles)


def test_score_counterpoint_balance():
    ir = HybridComposerIR(primary_engine="wayne_shorter", harmony_engine="barry_harris", counter_engine="bartok_night")
    layout = plan_counterpoint_layout(ir)
    s = score_counterpoint_balance(layout)
    assert 0 <= s <= 1
