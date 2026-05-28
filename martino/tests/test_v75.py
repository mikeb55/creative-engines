"""V75 — whole-step cap, ii–V cap, reward rebalance."""
from __future__ import annotations
import json
import sys
from pathlib import Path

ENGINE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ENGINE_DIR))

from generator import generate_musicxml, provenance_json_path
from gce.martinoScorers import score_anti_bebop_drift

OUT_DIR = Path(__file__).resolve().parent.parent.parent / "temp" / "martino"
OUT_DIR.mkdir(parents=True, exist_ok=True)

def _dm7_cfg(**overrides) -> dict:
    cfg = {
        "tune_name": "V75Test",
        "chords": ["Dm7", "G7", "Cmaj7", "Cmaj7"],
        "measures_per_chorus": 4,
        "choruses": 1,
        "time_signature": {"beats": 4, "beat_type": 4},
        "divisions": 2,
        "key": {"fifths": -1, "mode": "major"},
        "melody": "auto",
        "primary_activity": "A1_LINEAR_CORE",
        "secondary_activities": ["A2_DIAGONAL_BRIDGE", "A3_PIVOT_CELL",
                                  "A4_ANCHOR_ARP"],
        "output_dir": str(OUT_DIR),
        "version_prefix": "VTestV75",
    }
    cfg.update(overrides)
    return cfg

def _run_and_load(cfg: dict) -> dict:
    path = generate_musicxml(dict(cfg))
    sidecar = provenance_json_path(path)
    assert sidecar.exists()
    return json.loads(sidecar.read_text(encoding="utf-8"))


def test_whole_step_template_not_over_penalised():
    """Template with 50% whole steps (normal Martino) should score > 0.35."""
    plan = [
        {"bar": i+1, "chord": "Dm7", "reduction_pc": 2,
         "reduction": "Dm", "activity": "A1_LINEAR_CORE",
         "role": "opening", "lfv_ok": True}
        for i in range(4)
    ]
    # 50% whole steps — within Martino vocabulary
    mixed_fps = [[2, 1, 2, 3, 2, 1, 4, 2, 1, 2, 3, 1, 2, 4, 2]] * 4
    result = score_anti_bebop_drift(
        plan, chords=["Dm7"]*4, interval_fingerprints=mixed_fps
    )
    assert result > 0.35, f"over-penalised Martino template: {result}"


def test_ii_v_penalty_capped():
    """penalty_ii_v must not exceed 0.20 in debug output."""
    payload = _run_and_load(_dm7_cfg(version_prefix="VTestV75IIV"))
    debug = payload.get("anti_bebop_debug") or {}
    ii_v = float(debug.get("penalty_ii_v", 0))
    assert ii_v <= 0.20, f"ii–V penalty uncapped: {ii_v}"


def test_whole_step_spam_capped():
    """penalty_whole_step_spam must not exceed 0.15 in debug output."""
    payload = _run_and_load(_dm7_cfg(version_prefix="VTestV75WS"))
    debug = payload.get("anti_bebop_debug") or {}
    ws = float(debug.get("penalty_whole_step_spam", 0))
    assert ws <= 0.15, f"whole-step spam penalty uncapped: {ws}"


def test_anti_bebop_live_above_point_three():
    """Live run must now score anti_bebop_drift > 0.3."""
    payload = _run_and_load(_dm7_cfg(version_prefix="VTestV75Live"))
    score = float(
        (payload.get("martinoGce") or {}).get("anti_bebop_drift", 0)
    )
    assert score > 0.30, f"anti_bebop still below 0.3: {score}"
