"""V69 P3 — Canonical master provenance gate."""
from __future__ import annotations

import json
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

import pytest

ENGINE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ENGINE_DIR))

from generator import generate_musicxml, provenance_json_path  # noqa: E402
from master_loader import (  # noqa: E402
    TemplateUnavailableError,
    build_canonical_melody,
    load_master_bars,
    note_to_midi,
    semitones_gm_to_target,
    transpose_bar,
)
from martino_convert import martino_convert  # noqa: E402

OUT_DIR = Path(__file__).resolve().parent.parent.parent / "temp" / "martino"
OUT_DIR.mkdir(parents=True, exist_ok=True)

FORBIDDEN_WORDS = ("ACTIVITY", "LFV", "TUNE=", "STRINGS", "FRETS", "BRIDGE")


def _local_tag(elem: ET.Element) -> str:
    tag = elem.tag
    if "}" in tag:
        return tag.rsplit("}", 1)[-1]
    return tag


def _intervals(bar: list) -> list[int]:
    midis = [note_to_midi(str(n[0]), int(n[1]), int(n[2]) if n[2] is not None else None) for n in bar]
    return [midis[i + 1] - midis[i] for i in range(len(midis) - 1)]


def test_a1_gm_to_am_transposition_preserves_intervals():
    master = load_master_bars("A1")
    assert master, "A1 master must exist"
    template_bar = master[0]
    conversion = martino_convert("Am7")
    semitones = semitones_gm_to_target(int(conversion["minorRootPc"]))
    assert semitones == 2
    transposed = transpose_bar(template_bar, semitones)
    assert _intervals(template_bar) == _intervals(transposed)
    assert [n[3] for n in template_bar] == [n[3] for n in transposed]


def test_dm7_progression_uses_templates_only():
    cfg = {
        "tune_name": "ProvenanceGate",
        "chords": ["Dm7", "G7", "Cmaj7", "Cmaj7"],
        "measures_per_chorus": 4,
        "choruses": 1,
        "time_signature": {"beats": 4, "beat_type": 4},
        "divisions": 2,
        "key": {"fifths": -1, "mode": "major"},
        "melody": "auto",
        "primary_activity": "A1_LINEAR_CORE",
        "output_dir": str(OUT_DIR),
        "version_prefix": "VTestProvDm7",
    }
    bars, prov = build_canonical_melody(cfg)
    assert len(bars) == 4
    assert len(prov) > 0
    assert all(entry.get("fallback") is False for entry in prov)
    path = generate_musicxml(cfg)
    assert path.exists()
    sidecar = provenance_json_path(path)
    assert sidecar.exists()
    payload = json.loads(sidecar.read_text(encoding="utf-8"))
    assert all(n.get("fallback") is False for n in payload.get("notes", []))


def test_missing_template_raises_and_writes_no_musicxml():
    cfg = {
        "tune_name": "FailTune",
        "chords": ["Cmaj7"],
        "measures_per_chorus": 4,
        "choruses": 1,
        "melody": "auto",
        "output_dir": str(OUT_DIR),
        "version_prefix": "VTestProvFail",
        "_force_template_failure": True,
    }
    out_glob = list(OUT_DIR.glob("VTestProvFail_*.musicxml"))
    with pytest.raises(TemplateUnavailableError) as exc:
        generate_musicxml(cfg)
    assert "Do not invent material" in str(exc.value)
    new_files = [p for p in OUT_DIR.glob("VTestProvFail_*.musicxml") if p not in out_glob]
    assert not new_files


def test_metadata_absent_and_voice_before_type():
    cfg = {
        "tune_name": "CleanScore",
        "chords": ["Dm7", "G7", "Cmaj7", "Cmaj7"],
        "measures_per_chorus": 4,
        "choruses": 1,
        "time_signature": {"beats": 4, "beat_type": 4},
        "divisions": 2,
        "melody": "auto",
        "primary_activity": "A1_LINEAR_CORE",
        "output_dir": str(OUT_DIR),
        "version_prefix": "VTestProvClean",
    }
    path = generate_musicxml(cfg)
    root = ET.parse(path).getroot()
    for el in root.iter():
        if _local_tag(el) == "rehearsal":
            raise AssertionError("rehearsal marks must not appear in MusicXML score output")
    for words in root.iter():
        if _local_tag(words) != "words":
            continue
        text = (words.text or "").upper()
        for token in FORBIDDEN_WORDS:
            assert token not in text, f"forbidden metadata {token!r} in {words.text!r}"
    for note in root.iter():
        if _local_tag(note) != "note":
            continue
        children = [_local_tag(c) for c in note]
        if "voice" in children and "type" in children:
            assert children.index("voice") < children.index("type")
