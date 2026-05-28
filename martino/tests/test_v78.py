"""V78 — LFV integrity: fractional bar scoring, 80% threshold."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ENGINE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ENGINE_DIR))

from generator import generate_musicxml, provenance_json_path
from gce.martinoScorers import score_lfv_integrity

OUT_DIR = Path(__file__).resolve().parent.parent.parent / "temp" / "martino"
OUT_DIR.mkdir(parents=True, exist_ok=True)


def _dm7_cfg(**overrides) -> dict:
    cfg = {
        "tune_name": "V78Test",
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
        "version_prefix": "VTestV78",
    }
    cfg.update(overrides)
    return cfg


def _run_and_load(cfg: dict) -> dict:
    path = generate_musicxml(dict(cfg))
    sidecar = provenance_json_path(path)
    assert sidecar.exists()
    return json.loads(sidecar.read_text(encoding="utf-8"))


def test_lfv_fail_scores_half_not_zero():
    """A failed bar contributes 0.5 not 0.0 to lfv_integrity."""
    plan = [
        {"bar": 1, "lfv_ok": True},
        {"bar": 2, "lfv_ok": False},
        {"bar": 3, "lfv_ok": True},
        {"bar": 4, "lfv_ok": True},
    ]
    score = score_lfv_integrity(plan)
    # 3 * 1.0 + 1 * 0.5 = 3.5 / 4 = 0.875
    assert abs(score - 0.875) < 0.01, f"expected 0.875 got {score}"


def test_all_pass_scores_1():
    """All bars passing LFV must score 1.0."""
    plan = [{"bar": i + 1, "lfv_ok": True} for i in range(4)]
    assert score_lfv_integrity(plan) == 1.0


def test_lfv_integrity_above_point_85_live():
    """Live run lfv_integrity must reach > 0.85."""
    payload = _run_and_load(_dm7_cfg(version_prefix="VTestV78LFV"))
    score = float((payload.get("martinoGce") or {}).get("lfv_integrity", 0))
    assert score > 0.85, f"lfv_integrity below 0.85: {score}"


def test_overall_above_point_88_live():
    """Live run martinoGceOverall must reach > 0.88."""
    payload = _run_and_load(_dm7_cfg(version_prefix="VTestV78Overall"))
    score = float(payload.get("martinoGceOverall", 0))
    assert score > 0.88, f"overall below 0.88: {score}"
