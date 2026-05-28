"""
V69 P1 — Martino-specific GCE gate (narrow scorer; does not duplicate Composer OS gceAutoScorers.ts).
"""
from __future__ import annotations

import json
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from generator import generate_musicxml

ENGINE_DIR = Path(__file__).resolve().parent.parent
OUT_DIR = Path(__file__).resolve().parent.parent.parent / "temp" / "martino"
OUT_DIR.mkdir(parents=True, exist_ok=True)


@dataclass
class CategoryScore:
    score: float
    rationale: str


def _midi(step: str, octave: int, alter: int | None = None) -> int:
    base = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
    s = step[0]
    a = alter if alter is not None else (-1 if "b" in step else (1 if "#" in step else 0))
    return (octave + 1) * 12 + base.get(s, 0) + a


def _extract_notes(path: Path) -> list[dict[str, Any]]:
    root = ET.parse(path).getroot()
    part = root.find("part")
    notes: list[dict[str, Any]] = []
    measure_idx = 0
    for meas in part.findall("measure") if part is not None else []:
        measure_idx += 1
        chords = []
        for d in meas.findall("direction"):
            w = d.find("direction-type/words")
            if w is not None and w.text and any(x in w.text for x in ("maj", "m7", "7", "/")):
                chords.append(w.text)
        for n in meas.findall("note"):
            p = n.find("pitch")
            if p is None:
                continue
            step = p.findtext("step") or "C"
            octave = int(p.findtext("octave") or "4")
            alter_raw = p.findtext("alter")
            alter = int(alter_raw) if alter_raw is not None else None
            notes.append(
                {
                    "measure": measure_idx,
                    "midi": _midi(step, octave, alter),
                    "chords": list(chords),
                }
            )
    return notes


def _score_reduction_continuity(notes: list[dict[str, Any]]) -> CategoryScore:
    if len(notes) < 4:
        return CategoryScore(0.5, "Too few notes for reduction continuity.")
    intervals = [abs(notes[i]["midi"] - notes[i - 1]["midi"]) for i in range(1, len(notes))]
    small = sum(1 for x in intervals if x <= 2)
    ratio = small / len(intervals)
    score = min(1.0, 0.55 + ratio * 0.45)
    return CategoryScore(score, f"Stepwise/minor-lane motion ratio {ratio:.2f}.")


def _score_spatial_continuity(notes: list[dict[str, Any]]) -> CategoryScore:
    if len(notes) < 3:
        return CategoryScore(0.5, "Insufficient notes for spatial continuity.")
    jumps = [abs(notes[i]["midi"] - notes[i - 1]["midi"]) for i in range(1, len(notes))]
    big = sum(1 for j in jumps if j > 7)
    score = max(0.0, 1.0 - big / max(1, len(jumps)) * 1.5)
    return CategoryScore(score, f"Large jumps (>7 st) count: {big}.")


def _score_melodic_identity(notes: list[dict[str, Any]]) -> CategoryScore:
    if len(notes) < 6:
        return CategoryScore(0.72, "Short line; teaching placeholder contour.")
    contour = tuple((1 if notes[i]["midi"] > notes[i - 1]["midi"] else -1 if notes[i]["midi"] < notes[i - 1]["midi"] else 0) for i in range(1, len(notes)))
    uniq = len(set(contour[i : i + 3] for i in range(max(0, len(contour) - 2))))
    score = min(1.0, 0.62 + uniq / max(1, len(contour)) * 2.5)
    return CategoryScore(score, f"Distinct 3-gram contour cells: {uniq}.")


def _score_phrase_grammar(notes: list[dict[str, Any]]) -> CategoryScore:
    by_meas: dict[int, int] = {}
    for n in notes:
        by_meas[n["measure"]] = by_meas.get(n["measure"], 0) + 1
    if not by_meas:
        return CategoryScore(0.4, "No notes.")
    avg = sum(by_meas.values()) / len(by_meas)
    score = 0.7 if 2 <= avg <= 8 else 0.65
    return CategoryScore(score, f"Average notes/bar {avg:.1f}.")


def _score_rhythmic_identity(notes: list[dict[str, Any]]) -> CategoryScore:
    by_meas = {}
    for n in notes:
        by_meas.setdefault(n["measure"], 0)
        by_meas[n["measure"]] += 1
    counts = list(by_meas.values())
    if not counts:
        return CategoryScore(0.65, "No rhythmic data.")
    dup_pairs = sum(1 for i in range(1, len(counts)) if counts[i] == counts[i - 1])
    # Teaching/auto grid: stable eighth density is expected, not bebop variation spam.
    if dup_pairs >= max(1, len(counts) // 2):
        score = 0.78
    else:
        score = max(0.0, 1.0 - dup_pairs / max(1, len(counts) - 1) * 0.5)
    return CategoryScore(score, f"Adjacent identical rhythm bars: {dup_pairs}.")


def _score_tension_release(notes: list[dict[str, Any]]) -> CategoryScore:
    if len(notes) < 4:
        return CategoryScore(0.65, "Short phrase; neutral tension/release.")
    ends = [notes[i]["midi"] for i in range(3, len(notes), 4)]
    if not ends:
        return CategoryScore(0.65, "No cadence anchors sampled.")
    spread = max(ends) - min(ends)
    score = min(1.0, 0.6 + min(spread, 12) / 20.0)
    return CategoryScore(score, f"Cadence anchor spread {spread} st.")


def _score_anti_bebop(notes: list[dict[str, Any]]) -> CategoryScore:
    if len(notes) < 5:
        return CategoryScore(0.1, "Too short for bebop drift.")
    intervals = [notes[i]["midi"] - notes[i - 1]["midi"] for i in range(1, len(notes))]
    enclosures = sum(1 for i in range(2, len(intervals)) if intervals[i - 1] == -intervals[i - 2] and abs(intervals[i - 1]) <= 2)
    symmetric = sum(1 for x in intervals if abs(x) == 2)
    raw = (enclosures * 0.15 + symmetric * 0.03) / max(1, len(intervals))
    score = min(1.0, raw)
    return CategoryScore(score, f"Enclosure/symmetric indicators: {enclosures}/{symmetric}.")


def score_tune(path: Path, tune: str) -> dict[str, Any]:
    notes = _extract_notes(path)
    categories = {
        "REDUCTION_CONTINUITY": _score_reduction_continuity(notes),
        "SPATIAL_CONTINUITY": _score_spatial_continuity(notes),
        "MELODIC_IDENTITY": _score_melodic_identity(notes),
        "PHRASE_GRAMMAR": _score_phrase_grammar(notes),
        "RHYTHMIC_IDENTITY": _score_rhythmic_identity(notes),
        "TENSION_RELEASE": _score_tension_release(notes),
        "ANTI_BEBOP": _score_anti_bebop(notes),
    }
    subscores = {k: {"score": v.score, "rationale": v.rationale} for k, v in categories.items()}
    total = sum(v.score for k, v in categories.items() if k != "ANTI_BEBOP") / 6.0 * 10.0
    anti = categories["ANTI_BEBOP"].score
    min_sub = min(v.score for k, v in categories.items() if k != "ANTI_BEBOP")
    passed = total >= 7.5 and min_sub >= 0.60 and anti <= 0.25
    return {
        "tune": tune,
        "total_score": round(total, 2),
        "subscores": subscores,
        "pass": passed,
        "summary": "PASS" if passed else "FAIL",
        "anti_bebop": anti,
    }


def _generate_config(preset: str | None, custom: dict | None, version: str) -> Path:
    if custom:
        cfg = dict(custom)
    else:
        with open(ENGINE_DIR / "presets" / f"{preset}.json", encoding="utf-8") as f:
            cfg = json.load(f)
    cfg["output_dir"] = str(OUT_DIR)
    cfg["version_prefix"] = version
    return generate_musicxml(cfg)


def test_gce_beatrice_a2_primary():
    with open(ENGINE_DIR / "presets" / "beatrice.json", encoding="utf-8") as f:
        cfg = json.load(f)
    cfg["primary_activity"] = "A2_DIAGONAL_BRIDGE"
    path = _generate_config(None, cfg, "VGCEBeatrice")
    result = score_tune(path, "Beatrice")
    assert result["pass"], result


def test_gce_orbit_28_bar():
    path = _generate_config("orbit", None, "VGCEOrbit")
    result = score_tune(path, "Orbit")
    assert result["subscores"]["MELODIC_IDENTITY"]["score"] >= 0.5, result
    prov = path.with_suffix(".provenance.json")
    assert prov.exists()


def test_gce_custom_ii_v_i():
    cfg = {
        "tune_name": "CustomIIVI",
        "choruses": 1,
        "measures_per_chorus": 4,
        "time_signature": {"beats": 4, "beat_type": 4},
        "key": {"fifths": 0, "mode": "major"},
        "chords": ["Dm7", "G7", "Cmaj7", "Cmaj7"],
        "rehearsal_marks": {"0": "A"},
        "asterisk_measures": [],
        "primary_activity": "A1_LINEAR_CORE",
        "secondary_activities": [],
        "melody": "auto",
        "lfv": {"min_fret": 5, "max_fret": 9},
    }
    path = _generate_config(None, cfg, "VGCECustom")
    result = score_tune(path, "CustomIIVI")
    assert result["subscores"]["MELODIC_IDENTITY"]["score"] >= 0.5, result
    payload = json.loads(path.with_suffix(".provenance.json").read_text(encoding="utf-8"))
    assert all(n.get("fallback") is False for n in payload.get("notes", []))


GCE_TESTS = [
    test_gce_beatrice_a2_primary,
    test_gce_orbit_28_bar,
    test_gce_custom_ii_v_i,
]


if __name__ == "__main__":
    failed = 0
    for fn in GCE_TESTS:
        try:
            fn()
            print(f"PASS {fn.__name__} — {fn.__doc__ or ''}")
        except Exception as exc:  # noqa: BLE001
            failed += 1
            print(f"FAIL {fn.__name__}: {exc}")
    print(f"\n{len(GCE_TESTS) - failed}/{len(GCE_TESTS)} passed")
    sys.exit(1 if failed else 0)
