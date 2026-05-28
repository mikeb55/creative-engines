"""V69 P2 — Martino bridge round-trip gate tests (stdlib runner)."""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ENGINE_DIR = Path(__file__).resolve().parent.parent
BRIDGE = ENGINE_DIR / "martino_bridge.py"
OUT_DIR = Path(__file__).resolve().parent.parent.parent / "temp" / "martino"
OUT_DIR.mkdir(parents=True, exist_ok=True)


def _run_bridge(tune_config: dict) -> dict:
    proc = subprocess.run(
        ["py", str(BRIDGE)],
        input=json.dumps({"tune_config": tune_config}),
        capture_output=True,
        text=True,
        cwd=str(ENGINE_DIR),
    )
    assert proc.stdout.strip(), f"empty stdout stderr={proc.stderr}"
    assert "\n" not in proc.stdout.strip().split("{", 1)[0], "stdout not pure JSON"
    return json.loads(proc.stdout.strip())


def _beatrice_config() -> dict:
    with open(ENGINE_DIR / "presets" / "beatrice.json", encoding="utf-8") as f:
        cfg = json.load(f)
    cfg["output_dir"] = str(OUT_DIR)
    cfg["version_prefix"] = "VBridgeBeatrice"
    cfg["primary_activity"] = "A2_DIAGONAL_BRIDGE"
    cfg.pop("melody_bars", None)
    cfg["melody"] = "auto"
    return cfg


def test_bridge_beatrice_ok():
    resp = _run_bridge(_beatrice_config())
    assert resp["ok"] is True


def test_bridge_output_path_exists():
    resp = _run_bridge(_beatrice_config())
    assert Path(resp["outputPath"]).exists()


def test_bridge_activity_map_nonempty():
    resp = _run_bridge(_beatrice_config())
    assert resp.get("activityMapText", "").strip()


def test_bridge_invalid_config_ok_false():
    resp = _run_bridge({"chords": []})
    assert resp["ok"] is False


def test_bridge_stdout_pure_json():
    proc = subprocess.run(
        ["py", str(BRIDGE)],
        input=json.dumps({"tune_config": _beatrice_config()}),
        capture_output=True,
        text=True,
        cwd=str(ENGINE_DIR),
    )
    parsed = json.loads(proc.stdout.strip())
    assert isinstance(parsed, dict)


def test_bridge_not_placeholder_stepwise_f_minor():
    resp = _run_bridge(_beatrice_config())
    path = Path(resp["outputPath"])
    xml = path.read_text(encoding="utf-8")
    # Placeholder auto lane is strict F-minor stepwise only; canonical masters include A and E naturals etc.
    assert "E" in xml or "A" in xml
    assert xml.count("<step>F</step>") < xml.count("<note>")


TESTS = [
    test_bridge_beatrice_ok,
    test_bridge_output_path_exists,
    test_bridge_activity_map_nonempty,
    test_bridge_invalid_config_ok_false,
    test_bridge_stdout_pure_json,
    test_bridge_not_placeholder_stepwise_f_minor,
]

if __name__ == "__main__":
    failed = 0
    for fn in TESTS:
        try:
            fn()
            print(f"PASS {fn.__name__}")
        except Exception as exc:  # noqa: BLE001
            failed += 1
            print(f"FAIL {fn.__name__}: {exc}")
    print(f"\n{len(TESTS) - failed}/{len(TESTS)} passed")
    sys.exit(1 if failed else 0)
