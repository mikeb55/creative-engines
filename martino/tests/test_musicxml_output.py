"""V69 P2 — Martino MusicXML output path, harmony schema, MX readiness."""
from __future__ import annotations

import json
import subprocess
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ENGINE_DIR = Path(__file__).resolve().parent.parent
BRIDGE = ENGINE_DIR / "martino_bridge.py"
LIBRARY_PREFIX = Path(r"C:\Users\mike\Documents\Mike Composer Files\Martino Linear")
FORBIDDEN_HARMONY_ATTRS = frozenset({"default_y", "relative_y", "default_x", "relative_x"})
HARMONY_ALLOWED_CHILDREN = frozenset({"root", "kind", "bass", "degree"})


def _local_tag(elem: ET.Element) -> str:
    tag = elem.tag
    if "}" in tag:
        return tag.rsplit("}", 1)[-1]
    return tag


def _run_bridge(tune_config: dict) -> dict:
    proc = subprocess.run(
        ["py", str(BRIDGE)],
        input=json.dumps({"tune_config": tune_config}),
        capture_output=True,
        text=True,
        cwd=str(ENGINE_DIR),
    )
    assert proc.returncode == 0 or proc.stdout.strip(), proc.stderr
    return json.loads(proc.stdout.strip())


def _dm7_progression_config() -> dict:
    return {
        "tune_name": "Dm7Gate",
        "chords": ["Dm7", "G7", "Cmaj7", "Cmaj7"],
        "measures_per_chorus": 4,
        "choruses": 1,
        "time_signature": {"beats": 4, "beat_type": 4},
        "divisions": 2,
        "key": {"fifths": -1, "mode": "major"},
        "melody": "auto",
        "version_prefix": "VTestDm7",
    }


def _beatrice_config() -> dict:
    with open(ENGINE_DIR / "presets" / "beatrice.json", encoding="utf-8") as f:
        cfg = json.load(f)
    cfg["version_prefix"] = "VTestBeatrice"
    cfg.pop("melody_bars", None)
    cfg["melody"] = "auto"
    return cfg


def test_output_path_in_library_folder():
    resp = _run_bridge(_dm7_progression_config())
    assert resp["ok"] is True
    out = Path(resp["outputPath"])
    assert str(out).startswith(str(LIBRARY_PREFIX))
    assert out.is_file()


def test_no_invalid_harmony_attributes():
    resp = _run_bridge(_dm7_progression_config())
    path = Path(resp["outputPath"])
    root = ET.parse(path).getroot()
    for h in root.iter():
        if _local_tag(h) != "harmony":
            continue
        for attr in h.attrib:
            assert attr not in FORBIDDEN_HARMONY_ATTRS, f"harmony has forbidden {attr!r}"


def test_mx_readiness_beatrice_at_least_3():
    resp = _run_bridge(_beatrice_config())
    assert resp["ok"] is True
    assert int(resp.get("readinessScore", 0)) >= 3


def test_sibelius_schema_clean():
    resp = _run_bridge(_dm7_progression_config())
    root = ET.parse(Path(resp["outputPath"])).getroot()
    assert _local_tag(root) == "score-partwise"
    parts = [e for e in root.iter() if _local_tag(e) == "part"]
    measures = [e for e in root.iter() if _local_tag(e) == "measure"]
    harmonies = [e for e in root.iter() if _local_tag(e) == "harmony"]
    assert parts and measures and harmonies
    for h in harmonies:
        assert not h.attrib, f"unexpected harmony attributes: {h.attrib}"
        for child in h:
            assert _local_tag(child) in HARMONY_ALLOWED_CHILDREN, _local_tag(child)


if __name__ == "__main__":
    import pytest

    raise SystemExit(pytest.main([__file__, "-v"]))
