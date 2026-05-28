"""V71 — anti-bebop positive scoring, reduction continuity, refinement pass."""
from __future__ import annotations
import json
import sys
from pathlib import Path
import pytest

ENGINE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ENGINE_DIR))

from generator import generate_musicxml, provenance_json_path, _build_reduction_map
from gce.martinoScorers import score_anti_bebop_drift, score_martino_gce

OUT_DIR = Path(__file__).resolve().parent.parent.parent / "temp" / "martino"
OUT_DIR.mkdir(parents=True, exist_ok=True)

def _dm7_cfg(**overrides) -> dict:
    cfg = {
        "tune_name": "V71Test",
        "chords": ["Dm7", "G7", "Cmaj7", "Cmaj7"],
        "measures_per_chorus": 4,
        "choruses": 1,
        "time_signature": {"beats": 4, "beat_type": 4},
        "divisions": 2,
        "key": {"fifths": -1, "mode": "major"},
        "melody": "auto",
        "primary_activity": "A1_LINEAR_CORE",
        "secondary_activities": ["A2_DIAGONAL_BRIDGE", "A3_PIVOT_CELL", "A4_ANCHOR_ARP"],
        "output_dir": str(OUT_DIR),
        "version_prefix": "VTestV71",
    }
    cfg.update(overrides)
    return cfg

def _run_and_load(cfg: dict) -> dict:
    path = generate_musicxml(dict(cfg))
    sidecar = provenance_json_path(path)
    assert sidecar.exists(), "provenance sidecar missing"
    return json.loads(sidecar.read_text(encoding="utf-8"))


def test_anti_bebop_stepwise_reward():
    """Pure stepwise line should score >0.85 (reward lifts above penalty-only)."""
    plan = [
        {"bar": i+1, "chord": "Dm7", "reduction_pc": 2, "reduction": "Dm",
         "activity": "A1_LINEAR_CORE", "role": "opening",
         "transpose": 0, "lfv_ok": True}
        for i in range(4)
    ]
    # All-stepwise fingerprints: semitone 1 or 2 only
    stepwise_fps = [[1, 2, 1, 2], [2, 1, 2, 1], [1, 1, 2, 1], [2, 2, 1, 1]]
    result = score_anti_bebop_drift(plan, chords=["Dm7"]*4,
                                    interval_fingerprints=stepwise_fps)
    assert result > 0.85, f"stepwise reward too low: {result}"


def test_reduction_continuity_dm7_g7():
    """Dm7→G7 must map to same minor centre (sustained through nearby harmony)."""
    chords = ["Dm7", "G7", "Cmaj7"]
    cfg = {"measures_per_chorus": len(chords), "choruses": 1}
    rows = _build_reduction_map(chords, cfg)
    centres = {r["chord"]: r["reduction_pc"] for r in rows}
    dm_centre = centres.get("Dm7")
    g_centre = centres.get("G7")
    assert dm_centre == g_centre, (
        f"Dm7 and G7 should share minor centre, got {dm_centre} vs {g_centre}"
    )
    assert centres.get("Cmaj7") is not None


def test_refinement_pass_key_in_provenance():
    """dcr_refinement_applied must exist in provenance output."""
    payload = _run_and_load(_dm7_cfg(version_prefix="VTestV71Refine"))
    assert "dcr_refinement_applied" in payload or \
           "dcr_refinement_applied" in (payload.get("dcr") or {}), \
        "dcr_refinement_applied missing from provenance"


def test_gate_failed_key_in_provenance():
    """gce_gate_failed must be present in provenance output."""
    payload = _run_and_load(_dm7_cfg(version_prefix="VTestV71Gate"))
    has_key = (
        "gce_gate_failed" in payload
        or "gce_gate_failed" in (payload.get("dcr") or {})
        or "gate_failed" in (payload.get("martinoGce") or {})
    )
    assert has_key, "gce_gate_failed missing from provenance"


def test_anti_bebop_score_above_baseline_live():
    """Live Dm7 G7 Cmaj7 Cmaj7 run: anti_bebop_drift must be > 0.0 (V70 was 0.0)."""
    payload = _run_and_load(_dm7_cfg(version_prefix="VTestV71AntiBebop"))
    score = float((payload.get("martinoGce") or {}).get("anti_bebop_drift", 0.0))
    assert score > 0.0, f"anti_bebop_drift still 0.0 after V71 — stepwise reward not wiring through"
