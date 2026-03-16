"""Tests for shared rhythm/disruption block_form_tools."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines"))

from shared_rhythm_disruption.block_form_tools import build_block_contrast_plan, score_block_contrast


def test_build_block_contrast_plan():
    plan = build_block_contrast_plan(0, "block_contrast")
    assert plan.block_lengths
    assert plan.energy_levels
    assert len(plan.block_lengths) == len(plan.energy_levels)


def test_score_block_contrast():
    plan = build_block_contrast_plan(0, "cut_collage")
    s = score_block_contrast(plan)
    assert 0 <= s <= 1
