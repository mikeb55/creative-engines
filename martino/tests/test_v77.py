"""V77 — reduction integrity, cadence/contour penalty tuning."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ENGINE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ENGINE_DIR))

from generator import generate_musicxml, provenance_json_path  # noqa: E402
from gce.martinoScorers import score_reduction_integrity  # noqa: E402

OUT_DIR = Path(__file__).resolve().parent.parent.parent / "temp" / "martino"
OUT_DIR.mkdir(parents=True, exist_ok=True)


def _dm7_cfg(**overrides) -> dict:
    cfg = {
        "tune_name": "V77Test",
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
        "version_prefix": "VTestV77",
    }
    cfg.update(overrides)
    return cfg


def _run_and_load(cfg: dict) -> dict:
    path = generate_musicxml(dict(cfg))
    sidecar = provenance_json_path(path)
    assert sidecar.exists()
    return json.loads(sidecar.read_text(encoding="utf-8"))


def test_sustained_centre_scores_high():
    """Dm7→G7 same centre (pc 2) should score > 0.80."""
    plan = [
        {"bar": 1, "chord": "Dm7", "reduction_pc": 2, "reduction": "Dm"},
        {"bar": 2, "chord": "G7", "reduction_pc": 2, "reduction": "Dm"},
        {"bar": 3, "chord": "Cmaj7", "reduction_pc": 9, "reduction": "Am"},
        {"bar": 4, "chord": "Cmaj7", "reduction_pc": 9, "reduction": "Am"},
    ]
    score = score_reduction_integrity(plan)
    assert score > 0.80, f"sustained centre scored too low: {score}"


def test_all_changes_scores_low():
    """Every bar shifting centre should score < 0.60."""
    plan = [
        {"bar": i + 1, "chord": "X", "reduction_pc": i * 3}
        for i in range(4)
    ]
    score = score_reduction_integrity(plan)
    assert score < 0.60, f"all-change plan scored too high: {score}"


def test_reduction_integrity_above_point_8_live():
    """Live run reduction_integrity must reach > 0.80."""
    payload = _run_and_load(_dm7_cfg(version_prefix="VTestV77Red"))
    score = float(
        (payload.get("martinoGce") or {}).get("reduction_integrity", 0)
    )
    assert score > 0.80, f"reduction_integrity below 0.80: {score}"


def test_overall_above_point_85_live():
    """Live run martinoGceOverall must reach > 0.85."""
    payload = _run_and_load(_dm7_cfg(version_prefix="VTestV77Overall"))
    score = float(payload.get("martinoGceOverall", 0))
    assert score > 0.85, f"overall below 0.85: {score}"
