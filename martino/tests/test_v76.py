"""V76 — enclosure penalty tuning, chromatic passing note exemption."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

ENGINE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ENGINE_DIR))

from generator import generate_musicxml, provenance_json_path  # noqa: E402
from gce.martinoScorers import (  # noqa: E402
    _fingerprint_has_enclosure,
    _fingerprint_has_single_chromatic,
)

OUT_DIR = Path(__file__).resolve().parent.parent.parent / "temp" / "martino"
OUT_DIR.mkdir(parents=True, exist_ok=True)


def _dm7_cfg(**overrides) -> dict:
    cfg = {
        "tune_name": "V76Test",
        "chords": ["Dm7", "G7", "Cmaj7", "Cmaj7"],
        "measures_per_chorus": 4,
        "choruses": 1,
        "time_signature": {"beats": 4, "beat_type": 4},
        "divisions": 2,
        "key": {"fifths": -1, "mode": "major"},
        "melody": "auto",
        "primary_activity": "A1_LINEAR_CORE",
        "secondary_activities": [
            "A2_DIAGONAL_BRIDGE",
            "A3_PIVOT_CELL",
            "A4_ANCHOR_ARP",
        ],
        "output_dir": str(OUT_DIR),
        "version_prefix": "VTestV76",
    }
    cfg.update(overrides)
    return cfg


def _run_and_load(cfg: dict) -> dict:
    path = generate_musicxml(dict(cfg))
    sidecar = provenance_json_path(path)
    assert sidecar.exists()
    return json.loads(sidecar.read_text(encoding="utf-8"))


def test_true_bebop_enclosure_detected():
    """Opposite-direction semitone pair must be detected as enclosure."""
    assert _fingerprint_has_enclosure([1, -1, 3]) is True
    assert _fingerprint_has_enclosure([-1, 1, 3]) is True
    assert _fingerprint_has_enclosure([2, -1, 3]) is True


def test_single_chromatic_not_enclosure():
    """Single semitone not flanked by opposite-direction step is not enclosure."""
    assert _fingerprint_has_enclosure([1, 2, 3]) is False
    assert _fingerprint_has_enclosure([-1, -2, -3]) is False


def test_single_chromatic_helper():
    """_fingerprint_has_single_chromatic detects passing semitone."""
    assert _fingerprint_has_single_chromatic([2, 1, 3]) is True
    assert _fingerprint_has_single_chromatic([3, 4, 5]) is False


def test_enclosure_penalty_capped():
    """penalty_enclosure must not exceed 0.15 in debug output."""
    payload = _run_and_load(_dm7_cfg(version_prefix="VTestV76Cap"))
    debug = payload.get("anti_bebop_debug") or {}
    enc = float(debug.get("penalty_enclosure", 0))
    assert enc <= 0.15, f"enclosure penalty uncapped: {enc}"


def test_anti_bebop_above_point_45_live():
    """Live run must score anti_bebop_drift > 0.45 after V76."""
    payload = _run_and_load(_dm7_cfg(version_prefix="VTestV76Live"))
    score = float((payload.get("martinoGce") or {}).get("anti_bebop_drift", 0))
    assert score > 0.45, f"anti_bebop still below 0.45: {score}"
