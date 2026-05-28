"""V70 P2 — DCR evaluation, directional persistence, interval DNA, anti-bebop."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

ENGINE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ENGINE_DIR))

from generator import generate_musicxml, provenance_json_path  # noqa: E402
from gce.martinoScorers import MARTINO_GCE_DIMENSIONS, score_martino_gce  # noqa: E402

OUT_DIR = Path(__file__).resolve().parent.parent.parent / "temp" / "martino"
OUT_DIR.mkdir(parents=True, exist_ok=True)


def _dm7_cfg(**overrides) -> dict:
    cfg = {
        "tune_name": "DcrDirection",
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
        "version_prefix": "VTestDcr",
    }
    cfg.update(overrides)
    return cfg


def _run_and_load(cfg: dict) -> dict:
    cfg = dict(cfg)
    path = generate_musicxml(cfg)
    sidecar = provenance_json_path(path)
    assert sidecar.exists(), "provenance sidecar missing"
    return json.loads(sidecar.read_text(encoding="utf-8"))


def _bars_from_payload(payload: dict) -> list[dict]:
    plan = payload.get("phrasePlan") or []
    if plan:
        return sorted(plan, key=lambda r: int(r["bar"]))
    telemetry = payload.get("barTelemetry") or []
    if telemetry:
        return sorted(telemetry, key=lambda r: int(r["bar"]))
    by_meas: dict[int, dict] = {}
    for note in payload.get("notes", []):
        m = int(note["measure"])
        if m not in by_meas:
            by_meas[m] = note
    return [by_meas[k] for k in sorted(by_meas)]


def test_dcr_runs_three_variants():
    payload = _run_and_load(_dm7_cfg(version_prefix="VTestDcrVariants"))
    assert payload.get("dcr_variants_scored") == 3
    assert payload.get("dcr_winner") in ("A", "B", "C")
    dcr = payload.get("dcr") or {}
    assert dcr.get("dcr_variants_scored") == 3


def test_directional_arc_tracked_eight_bars():
    payload = _run_and_load(
        _dm7_cfg(
            version_prefix="VTestDcrDirection",
            measures_per_chorus=8,
            chords=["Dm7", "G7", "Cmaj7", "Cmaj7", "Dm7", "G7", "Cmaj7", "Cmaj7"],
        )
    )
    bars = _bars_from_payload(payload)
    assert len(bars) >= 8
    for row in bars[:8]:
        assert row.get("direction_vector") in ("ascending", "descending", "pivot")
        assert isinstance(row.get("arc_bar_count"), int)

    vectors = [str(row.get("direction_vector")) for row in bars[:8]]
    reversals = 0
    for i in range(1, len(vectors)):
        a, b = vectors[i - 1], vectors[i]
        if a != "pivot" and b != "pivot" and a != b:
            reversals += 1
    assert reversals <= 3


def test_anti_loop_no_triple_identical_fingerprints():
    payload = _run_and_load(
        _dm7_cfg(
            version_prefix="VTestDcrAntiLoop",
            measures_per_chorus=12,
            chords=["Dm7", "G7", "Cmaj7", "Cmaj7"] * 3,
        )
    )
    bars = _bars_from_payload(payload)
    fps = [tuple(row.get("interval_fingerprint") or []) for row in bars]
    for i in range(2, len(fps)):
        if fps[i] and fps[i - 1] and fps[i - 2]:
            assert not (fps[i] == fps[i - 1] == fps[i - 2])


def test_anti_bebop_gate_triggers_rerun():
    phrase_rows = [
        {"bar": 1, "chord": "Dm7", "reduction_pc": 2, "reduction": "Dm", "transpose": 0, "lfv_ok": True},
        {"bar": 2, "chord": "G7", "reduction_pc": 2, "reduction": "Dm", "transpose": 0, "lfv_ok": True},
        {"bar": 3, "chord": "Cmaj7", "reduction_pc": 0, "reduction": "C", "transpose": 0, "lfv_ok": True},
        {"bar": 4, "chord": "Cmaj7", "reduction_pc": 0, "reduction": "C", "transpose": 0, "lfv_ok": True},
    ]
    bad_plan = [
        {
            "bar": i + 1,
            "chord": phrase_rows[i]["chord"],
            "reduction_pc": phrase_rows[i]["reduction_pc"],
            "reduction": phrase_rows[i]["reduction"],
            "activity": "A1_LINEAR_CORE",
            "role": "opening",
            "transpose": 0,
            "lfv_ok": True,
            "interval_fingerprint": [2, 2, 2],
            "rhythmic_signature": "1,1,1,1",
        }
        for i in range(4)
    ]
    gce = score_martino_gce(
        bad_plan,
        interval_fingerprints=[r["interval_fingerprint"] for r in bad_plan],
        direction_vectors=["ascending"] * 4,
        rhythmic_signatures=[r["rhythmic_signature"] for r in bad_plan],
        chords=[r["chord"] for r in bad_plan],
    )
    assert gce.dimensions["anti_bebop_drift"] <= 0.3

    payload = _run_and_load(_dm7_cfg(version_prefix="VTestDcrAntiBebop"))
    dcr = payload.get("dcr") or {}
    assert payload.get("martinoGce", {}).get("anti_bebop_drift", 1.0) >= 0.3 or dcr.get("dcr_anti_bebop_rerun")
    activities = [str(r.get("activity", "")) for r in payload.get("phrasePlan", [])]
    if len(activities) >= 2:
        assert not (
            activities[0].startswith("A1")
            and "G7" in str((payload.get("phrasePlan") or [{}])[1].get("chord", ""))
            and activities[0] == activities[1]
        )


def test_all_eight_martino_gce_dimensions_scored():
    payload = _run_and_load(_dm7_cfg(version_prefix="VTestDcrGceDims"))
    gce = payload.get("martinoGce") or {}
    for dim in MARTINO_GCE_DIMENSIONS:
        assert dim in gce, f"missing dimension {dim}"
        val = float(gce[dim])
        assert 0.0 <= val <= 1.0, f"{dim} out of range: {val}"
