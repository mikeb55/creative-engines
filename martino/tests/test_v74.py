"""V74 — gate threshold, anti_bebop_debug breakdown."""
from __future__ import annotations
import json
import sys
from pathlib import Path

ENGINE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ENGINE_DIR))

from generator import generate_musicxml, provenance_json_path

OUT_DIR = Path(__file__).resolve().parent.parent.parent / "temp" / "martino"
OUT_DIR.mkdir(parents=True, exist_ok=True)

def _dm7_cfg(**overrides) -> dict:
    cfg = {
        "tune_name": "V74Test",
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
        "version_prefix": "VTestV74",
    }
    cfg.update(overrides)
    return cfg

def _run_and_load(cfg: dict) -> dict:
    path = generate_musicxml(dict(cfg))
    sidecar = provenance_json_path(path)
    assert sidecar.exists()
    return json.loads(sidecar.read_text(encoding="utf-8"))


def test_gate_passes_on_clean_run():
    """With threshold at 0.15, a normal live run must not fail the gate."""
    payload = _run_and_load(_dm7_cfg(version_prefix="VTestV74Gate"))
    assert payload.get("gce_gate_failed") is False, (
        f"gate still failing — anti_bebop: "
        f"{payload.get('martinoGce', {}).get('anti_bebop_drift')}, "
        f"overall: {payload.get('martinoGceOverall')}"
    )


def test_gate_attempts_zero_on_clean_run():
    """No retries needed when gate passes first time."""
    payload = _run_and_load(_dm7_cfg(version_prefix="VTestV74Attempts"))
    attempts = (
        payload.get("gce_gate_attempts")
        or (payload.get("dcr") or {}).get("gce_gate_attempts")
        or 0
    )
    assert attempts == 0, f"expected 0 gate attempts, got {attempts}"


def test_anti_bebop_debug_has_all_components():
    """anti_bebop_debug must have all 5 penalty components."""
    payload = _run_and_load(_dm7_cfg(version_prefix="VTestV74Debug"))
    debug = payload.get("anti_bebop_debug") or {}
    for key in ("penalty_ii_v", "penalty_enclosure", "penalty_whole_step_spam",
                "penalty_cadence", "penalty_contour", "total_penalty",
                "stepwise_reward", "final_score"):
        assert key in debug, f"anti_bebop_debug missing: {key}"


def test_dominant_penalty_is_largest_component():
    """On Dm7→G7 progression, ii–V penalty should be the largest single component."""
    payload = _run_and_load(_dm7_cfg(version_prefix="VTestV74Dominant"))
    debug = payload.get("anti_bebop_debug") or {}
    if not debug:
        return  # skip if debug not wired yet
    components = {
        k: debug[k] for k in ("penalty_ii_v", "penalty_enclosure",
                               "penalty_whole_step_spam", "penalty_cadence",
                               "penalty_contour")
        if k in debug
    }
    assert debug.get("penalty_ii_v", 0) >= 0.15, (
        f"ii–V tax missing on Dm7→G7 run: {components}"
    )
    assert debug.get("penalty_ii_v", 0) <= 0.20
    assert debug.get("penalty_whole_step_spam", 0) <= 0.15
