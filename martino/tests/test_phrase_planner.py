"""V70 P1 — Activity role system + phrase planner."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

ENGINE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ENGINE_DIR))

from generator import generate_musicxml, provenance_json_path  # noqa: E402
from master_loader import build_canonical_melody  # noqa: E402

OUT_DIR = Path(__file__).resolve().parent.parent.parent / "temp" / "martino"
OUT_DIR.mkdir(parents=True, exist_ok=True)

BRIDGE_PIVOT = frozenset({"A2_DIAGONAL_BRIDGE", "A3_PIVOT_CELL", "A2", "A3"})
ANCHOR = frozenset({"A4_ANCHOR_ARP", "A4"})


def _dm7_cfg(**overrides) -> dict:
    cfg = {
        "tune_name": "PhrasePlanner",
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
        "version_prefix": "VTestPhrase",
    }
    cfg.update(overrides)
    return cfg


def _phrase_plan_from_config(cfg: dict) -> list[dict]:
    cfg = dict(cfg)
    generate_musicxml(cfg)
    sidecar = provenance_json_path(
        next(OUT_DIR.glob(f"{cfg['version_prefix']}_*.musicxml"))
    )
    payload = json.loads(sidecar.read_text(encoding="utf-8"))
    return payload.get("phrasePlan") or []


def _activities_per_bar(plan: list[dict]) -> list[str]:
    return [str(row["activity"]) for row in sorted(plan, key=lambda r: int(r["bar"]))]


def test_activity_variety_enforced():
    cfg = _dm7_cfg(version_prefix="VTestPhraseVariety")
    plan = _phrase_plan_from_config(cfg)
    assert len(plan) == 4
    assert len(set(_activities_per_bar(plan))) >= 2


def test_dominant_gets_bridge_or_pivot():
    cfg = _dm7_cfg(version_prefix="VTestPhraseDom")
    plan = _phrase_plan_from_config(cfg)
    dom_bars = [row for row in plan if row.get("chord") == "G7"]
    assert dom_bars, "expected a G7 bar in plan"
    for row in dom_bars:
        assert row["activity"] in BRIDGE_PIVOT, f"dominant bar activity {row['activity']!r}"


def test_phrase_final_gets_anchor():
    cfg = _dm7_cfg(version_prefix="VTestPhraseAnchor")
    plan = _phrase_plan_from_config(cfg)
    last = max(plan, key=lambda r: int(r["bar"]))
    assert last["activity"] in ANCHOR


def test_no_a1_loop_more_than_two_consecutive():
    cfg = _dm7_cfg(
        version_prefix="VTestPhraseNoLoop",
        measures_per_chorus=8,
        choruses=1,
        chords=["Dm7", "G7", "Cmaj7", "Cmaj7", "Dm7", "G7", "Cmaj7", "Cmaj7"],
    )
    _, prov = build_canonical_melody(cfg)
    by_meas: dict[int, str] = {}
    for entry in prov:
        by_meas[int(entry["measure"])] = str(entry.get("activity") or entry.get("source_activity"))
    measures = sorted(by_meas)
    run = 0
    prev = None
    for m in measures:
        act = by_meas[m]
        is_a1 = act in ("A1_LINEAR_CORE", "A1")
        if is_a1 and prev in ("A1_LINEAR_CORE", "A1"):
            run += 1
        elif is_a1:
            run = 1
        else:
            run = 0
        prev = act
        assert run <= 2, f"A1_LINEAR_CORE more than 2 consecutive bars ending at m.{m}"


def test_reduction_continuity_dm7_g7():
    cfg = _dm7_cfg(version_prefix="VTestPhraseReduction")
    plan = _phrase_plan_from_config(cfg)
    first_two = sorted(plan, key=lambda r: int(r["bar"]))[:2]
    assert first_two[0]["reduction"] == "Dm"
    assert first_two[1]["reduction"] == "Dm"
    assert first_two[0]["transpose"] == first_two[1]["transpose"]
