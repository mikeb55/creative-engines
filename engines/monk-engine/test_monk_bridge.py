"""Monk bridge stdin/stdout tests."""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ENGINE_DIR = Path(__file__).resolve().parent
BRIDGE = ENGINE_DIR / "monk_bridge.py"


def _run_bridge(payload: dict) -> dict:
    proc = subprocess.run(
        [sys.executable, str(BRIDGE)],
        input=json.dumps(payload),
        capture_output=True,
        text=True,
        cwd=str(ENGINE_DIR),
    )
    assert proc.stdout.strip(), f"empty stdout stderr={proc.stderr}"
    return json.loads(proc.stdout.strip())


def test_monk_bridge_ok():
    resp = _run_bridge({"title": "Blue Monk", "seed": 4242, "profile": "angular"})
    assert resp["ok"] is True
    assert len(resp["harmonyBars"]) > 0
    assert resp["barCount"] == len(resp["harmonyBars"])
    assert 0 <= resp["chromaticNeighbourRate"] <= 1
    assert resp["tritoneShiftCount"] >= 0
    assert 0 <= resp["rhythmicMotifConsistency"] <= 1
    assert 0 <= resp["dissonanceResolutionScore"] <= 1


def test_monk_bridge_metrics_present_on_failure_shape():
    resp = _run_bridge({"title": "", "seed": 1, "profile": "angular"})
    assert "chromaticNeighbourRate" in resp
    assert "tritoneShiftCount" in resp
