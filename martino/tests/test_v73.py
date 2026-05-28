"""V73 — ii–V penalty gating, LFV bridge threshold, anti-bebop targets."""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

ENGINE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ENGINE_DIR))

from gce.martinoScorers import check_hard_gates, score_anti_bebop_drift


def _minimal_plan(chords: list[str], activity: str = "A1_LINEAR_CORE") -> list[dict]:
    return [
        {
            "bar": i + 1,
            "chord": c,
            "activity": activity,
            "role": "opening",
            "lfv_ok": True,
        }
        for i, c in enumerate(chords)
    ]


def test_ii_v_stepwise_no_heavy_penalty():
    """Dm7→G7 with stepwise fingerprint: no 0.35 A1 penalty; score > 0.3."""
    plan = _minimal_plan(["Dm7", "G7", "Cmaj7", "Cmaj7"])
    stepwise_dm_g7 = [[1, 2, 1, 2], [2, 1, 2, 1], [1, 1, 2, 1], [2, 2, 1, 1]]
    result = score_anti_bebop_drift(
        plan,
        chords=["Dm7", "G7", "Cmaj7", "Cmaj7"],
        interval_fingerprints=stepwise_dm_g7,
    )
    assert result > 0.3, f"stepwise ii–V line should score >0.3, got {result}"


def test_octave_bridge_no_hard_gate():
    """Single-octave bar boundary (12 semitones) must not hard-gate."""
    plan = [
        {"bar": 1, "chord": "Dm7", "activity": "A1_LINEAR_CORE", "lfv_ok": True},
        {"bar": 2, "chord": "G7", "activity": "A2_DIAGONAL_BRIDGE", "lfv_ok": True},
    ]
    fps = [[1, 2, 0], [12, 1, 2]]
    hard, reasons = check_hard_gates(plan, interval_fingerprints=fps)
    jump_reasons = [r for r in reasons if "lfv_positional_jump" in r]
    assert not jump_reasons, f"octave bridge should not fire hard gate: {reasons}"
    assert not hard or not jump_reasons


def test_tenth_bridge_fires():
    """Minor tenth+ at bar boundary (15 semitones) must hard-gate."""
    plan = [
        {"bar": 1, "chord": "Dm7", "activity": "A1_LINEAR_CORE", "lfv_ok": True},
        {"bar": 2, "chord": "G7", "activity": "A2_DIAGONAL_BRIDGE", "lfv_ok": True},
    ]
    fps = [[1, 2, 0], [15, 1, 2]]
    hard, reasons = check_hard_gates(plan, interval_fingerprints=fps)
    assert any("lfv_positional_jump" in r for r in reasons), reasons
    assert hard


def test_lfv_real_jump_still_triggers():
    """Real positional jump above idiomatic octave still triggers (>14)."""
    plan = [
        {"bar": 3, "chord": "Cmaj7", "activity": "A4_ANCHOR_ARP", "lfv_ok": True},
        {"bar": 4, "chord": "Cmaj7", "activity": "A4_ANCHOR_ARP", "lfv_ok": True},
    ]
    fps = [[1, 0], [16, -1]]
    hard, reasons = check_hard_gates(plan, interval_fingerprints=fps)
    assert any("lfv_positional_jump" in r for r in reasons), reasons
    assert hard
