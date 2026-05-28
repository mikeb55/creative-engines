"""
V69 P1 — Martino engine tests (Composer OS copy).
"""
import json
import subprocess
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from generator import build_activity_map, enforce_lfv, generate_musicxml, increment_version

ENGINE_DIR = Path(__file__).resolve().parent.parent
OUT_DIR = Path(__file__).resolve().parent.parent.parent / "temp" / "martino"
OUT_DIR.mkdir(parents=True, exist_ok=True)


def _run_cli_preset(preset: str) -> Path:
    proc = subprocess.run(
        ["py", str(ENGINE_DIR / "generator.py"), "--preset", preset, "--output-dir", str(OUT_DIR)],
        capture_output=True,
        text=True,
        check=True,
    )
    line = proc.stdout.strip().splitlines()[-1]
    return Path(line)


def test_beatrice_cli_produces_file():
    path = _run_cli_preset("beatrice")
    assert path.exists()
    assert path.suffix == ".musicxml"


def test_beatrice_xml_parses():
    with open(ENGINE_DIR / "presets" / "beatrice.json", encoding="utf-8") as f:
        config = json.load(f)
    config["output_dir"] = OUT_DIR
    config["version_prefix"] = "VTestBeatrice"
    path = generate_musicxml(config)
    ET.parse(path)


def test_beatrice_measure_count():
    with open(ENGINE_DIR / "presets" / "beatrice.json", encoding="utf-8") as f:
        config = json.load(f)
    config["output_dir"] = OUT_DIR
    config["version_prefix"] = "VTestBeatriceM"
    path = generate_musicxml(config)
    root = ET.parse(path).getroot()
    measures = root.find("part").findall("measure")
    assert len(measures) == 32


def test_every_measure_has_harmony():
    with open(ENGINE_DIR / "presets" / "orbit.json", encoding="utf-8") as f:
        config = json.load(f)
    config["output_dir"] = OUT_DIR
    config["version_prefix"] = "VTestOrbitHarm"
    path = generate_musicxml(config)
    root = ET.parse(path).getroot()
    measures = root.find("part").findall("measure")
    assert measures, "expected at least one measure"
    for i, meas in enumerate(measures, start=1):
        assert meas.find("harmony") is not None, f"measure {i} missing <harmony>"


def test_work_title_prefers_tune_field():
    config = {
        "tune": "Orbit 5X Version 2",
        "tune_name": "Martino Linear",
        "chords": ["Fmaj7", "G7", "Cmaj7", "Cmaj7"],
        "measures_per_chorus": 4,
        "choruses": 1,
        "melody": "auto",
        "output_dir": str(OUT_DIR),
        "version_prefix": "VTestTitle",
    }
    path = generate_musicxml(config)
    title = ET.parse(path).getroot().find("work/work-title").text or ""
    assert "Orbit 5X Version 2" in title
    assert "Martino Linear Expressions" in title
    assert "VTestTitle" in title
    assert "Martino Linear" not in title.split("–")[0].strip()


def test_beatrice_harmony_present():
    with open(ENGINE_DIR / "presets" / "beatrice.json", encoding="utf-8") as f:
        config = json.load(f)
    config["output_dir"] = OUT_DIR
    config["version_prefix"] = "VTestBeatriceH"
    path = generate_musicxml(config)
    part = ET.parse(path).getroot().find("part")
    assert any(m.findall("harmony") for m in part.findall("measure"))


def test_beatrice_no_rehearsal_marks_in_score():
    with open(ENGINE_DIR / "presets" / "beatrice.json", encoding="utf-8") as f:
        config = json.load(f)
    config["output_dir"] = OUT_DIR
    config["version_prefix"] = "VTestBeatriceR"
    path = generate_musicxml(config)
    root = ET.parse(path).getroot()
    for el in root.iter():
        tag = el.tag.split("}")[-1] if "}" in el.tag else el.tag
        assert tag != "rehearsal", "rehearsal marks must not appear in MusicXML score output"


def test_beatrice_measure_one_has_no_engine_metadata_words():
    with open(ENGINE_DIR / "presets" / "beatrice.json", encoding="utf-8") as f:
        config = json.load(f)
    config["output_dir"] = OUT_DIR
    config["version_prefix"] = "VTestBeatriceD"
    path = generate_musicxml(config)
    meas1 = ET.parse(path).getroot().find("part").find("measure")
    words = [
        w.text
        for d in meas1.findall("direction")
        for w in [d.find("direction-type/words")]
        if w is not None and w.text
    ]
    for text in words:
        upper = (text or "").upper()
        assert "ACTIVITY MAP" not in upper
        assert "LFV MAP" not in upper


def test_orbit_cli_produces_file():
    path = _run_cli_preset("orbit")
    assert path.exists()


def test_orbit_xml_parses():
    with open(ENGINE_DIR / "presets" / "orbit.json", encoding="utf-8") as f:
        config = json.load(f)
    config["output_dir"] = OUT_DIR
    config["version_prefix"] = "VTestOrbit"
    path = generate_musicxml(config)
    ET.parse(path)


def test_orbit_measure_count_28():
    with open(ENGINE_DIR / "presets" / "orbit.json", encoding="utf-8") as f:
        config = json.load(f)
    config["output_dir"] = OUT_DIR
    config["version_prefix"] = "VTestOrbitM"
    path = generate_musicxml(config)
    measures = ET.parse(path).getroot().find("part").findall("measure")
    assert len(measures) == 28


def test_orbit_no_rehearsal_marks_in_score():
    with open(ENGINE_DIR / "presets" / "orbit.json", encoding="utf-8") as f:
        config = json.load(f)
    config["output_dir"] = OUT_DIR
    config["version_prefix"] = "VTestOrbitR"
    path = generate_musicxml(config)
    root = ET.parse(path).getroot()
    for el in root.iter():
        tag = el.tag.split("}")[-1] if "}" in el.tag else el.tag
        assert tag != "rehearsal", "rehearsal marks must not appear in MusicXML score output"


def test_orbit_fmaj7sharp11_in_harmony():
    with open(ENGINE_DIR / "presets" / "orbit.json", encoding="utf-8") as f:
        config = json.load(f)
    config["output_dir"] = OUT_DIR
    config["version_prefix"] = "VTestOrbitF"
    path = generate_musicxml(config)
    meas1 = ET.parse(path).getroot().find("part").find("measure")
    harmony = meas1.find("harmony")
    assert harmony is not None
    root_step = harmony.find("root/root-step")
    assert root_step is not None and root_step.text == "F"
    kind = harmony.find("kind")
    assert kind is not None and (kind.text or "").strip() == "major-seventh"


def test_custom_progression_four_bars():
    config = {
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
        "output_dir": str(OUT_DIR),
        "lfv": {"min_fret": 5, "max_fret": 9},
        "version_prefix": "VTestCustom",
    }
    path = generate_musicxml(config)
    measures = ET.parse(path).getroot().find("part").findall("measure")
    assert len(measures) == 4


def test_enforce_lfv_in_range():
    adjusted, flags = enforce_lfv([{"step": "F", "octave": 3, "alter": None}], {"min_fret": 5, "max_fret": 9})
    assert adjusted[0]["in_lfv"] is True
    assert len(flags) == 0


def test_enforce_lfv_out_of_range():
    adjusted, flags = enforce_lfv([{"step": "C", "octave": 6, "alter": None}], {"min_fret": 5, "max_fret": 9})
    assert adjusted[0]["in_lfv"] is False
    assert len(flags) == 1


def test_increment_version():
    dummy = OUT_DIR / "V9.9_Test_1Chorus_MartinoLinearExpressions.musicxml"
    dummy.write_text("<?xml version='1.0'?><score-partwise/>", encoding="utf-8")
    assert increment_version("V9.9", OUT_DIR) == "V9.10"
    dummy.unlink(missing_ok=True)


def test_build_activity_map_nonempty():
    with open(ENGINE_DIR / "presets" / "orbit.json", encoding="utf-8") as f:
        config = json.load(f)
    text = build_activity_map(config)
    assert text.strip()
    assert "Orbit" in text


ALL_TESTS = [
    test_beatrice_cli_produces_file,
    test_beatrice_xml_parses,
    test_beatrice_measure_count,
    test_every_measure_has_harmony,
    test_work_title_prefers_tune_field,
    test_beatrice_harmony_present,
    test_beatrice_no_rehearsal_marks_in_score,
    test_beatrice_measure_one_has_no_engine_metadata_words,
    test_orbit_cli_produces_file,
    test_orbit_xml_parses,
    test_orbit_measure_count_28,
    test_orbit_no_rehearsal_marks_in_score,
    test_orbit_fmaj7sharp11_in_harmony,
    test_custom_progression_four_bars,
    test_enforce_lfv_in_range,
    test_enforce_lfv_out_of_range,
    test_increment_version,
    test_build_activity_map_nonempty,
]


if __name__ == "__main__":
    failed = 0
    for fn in ALL_TESTS:
        try:
            fn()
            print(f"PASS {fn.__name__}")
        except Exception as exc:  # noqa: BLE001
            failed += 1
            print(f"FAIL {fn.__name__}: {exc}")
    print(f"\n{len(ALL_TESTS) - failed}/{len(ALL_TESTS)} passed")
    sys.exit(1 if failed else 0)
