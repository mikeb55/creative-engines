#!/usr/bin/env python3
"""Thin stdin/stdout bridge for Martino Linear Expressions Engine."""
from __future__ import annotations

import json
import sys
import traceback
from pathlib import Path

_ENGINE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(_ENGINE_DIR))

from generator import build_activity_map, enforce_lfv, generate_musicxml, increment_version  # noqa: E402
from mx_readiness import score_musicxml_path  # noqa: E402

_PROVENANCE_DIR = _ENGINE_DIR.parent / "temp" / "martino" / "provenance"

MARTINO_LIBRARY_DIR = Path(
    r"C:\Users\mike\Documents\Mike Composer Files\Martino Linear"
)


def _emit(payload: dict) -> None:
    sys.stdout.write(json.dumps(payload))
    sys.stdout.flush()


def main() -> int:
    try:
        raw = sys.stdin.read()
        req = json.loads(raw) if raw.strip() else {}
        tune_config = req.get("tune_config") or req
        if not isinstance(tune_config, dict):
            raise ValueError("tune_config must be an object")
        if not tune_config.get("chords"):
            raise ValueError("tune_config.chords is required")

        if not tune_config.get("output_dir"):
            MARTINO_LIBRARY_DIR.mkdir(parents=True, exist_ok=True)
            tune_config["output_dir"] = str(MARTINO_LIBRARY_DIR)

        out_path = generate_musicxml(tune_config)
        readiness_score, readiness_issues = score_musicxml_path(out_path)
        activity_map = build_activity_map(tune_config)
        phrase_plan = []
        bar_telemetry = []
        try:
            prov_path = _PROVENANCE_DIR / (Path(str(out_path)).stem + ".provenance.json")
            if not prov_path.exists():
                candidates = sorted(
                    _PROVENANCE_DIR.glob("*.provenance.json"),
                    key=lambda p: p.stat().st_mtime,
                    reverse=True
                )
                prov_path = candidates[0] if candidates else None
            if prov_path and Path(prov_path).exists():
                prov_data = json.loads(Path(prov_path).read_text(encoding="utf-8"))
                phrase_plan = prov_data.get("phrasePlan", [])
                bar_telemetry = prov_data.get("barTelemetry", [])
        except Exception:
            pass
        lfv_flags: list[dict] = []
        mb = tune_config.get("_melody_bars_list") or tune_config.get("melody_bars") or []
        if isinstance(mb, list):
            flat = []
            for bar in mb:
                if isinstance(bar, list):
                    for note in bar:
                        if isinstance(note, (list, tuple)):
                            flat.append({"step": note[0], "octave": note[1], "alter": note[2] if len(note) > 2 else None})
                        elif isinstance(note, dict):
                            flat.append(note)
            if flat:
                _, flags = enforce_lfv(flat, tune_config.get("lfv", {"min_fret": 5, "max_fret": 9}))
                lfv_flags = [{"index": i, "out_of_range": True} for i, _ in flags]

        version_used = tune_config.get("version_prefix") or "V5.3"
        warnings = [f"mx: {msg}" for msg in readiness_issues] if readiness_issues else []
        _emit(
            {
                "ok": True,
                "outputPath": str(out_path),
                "versionUsed": version_used,
                "readinessScore": readiness_score,
                "warnings": warnings,
                "activityMapText": activity_map,
                "lfvFlags": lfv_flags,
                "provenanceLog": tune_config.get("_provenance_log") or [],
                "phrasePlan": phrase_plan,
                "barTelemetry": bar_telemetry,
                "stderrExcerpt": "",
            }
        )
        return 0
    except Exception as exc:  # noqa: BLE001
        print(traceback.format_exc(), file=sys.stderr)
        _emit(
            {
                "ok": False,
                "outputPath": "",
                "versionUsed": "",
                "readinessScore": 0,
                "warnings": [],
                "activityMapText": "",
                "lfvFlags": [],
                "provenanceLog": [],
                "stderrExcerpt": str(exc)[:500],
                "error": str(exc),
            }
        )
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
