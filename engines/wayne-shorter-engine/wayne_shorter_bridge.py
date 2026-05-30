#!/usr/bin/env python3
"""stdin JSON → Wayne Shorter compile → stdout JSON (harmony bars for MusicContext)."""
from __future__ import annotations

import json
import sys
import traceback
from typing import Any, Dict, List

try:
    from engine_adapter import WayneShorterEngine
    from shorter_section_compiler import compile_composition_from_ir
except ImportError:
    from engine_adapter import WayneShorterEngine
    from shorter_section_compiler import compile_composition_from_ir


def _emit(payload: dict) -> None:
    sys.stdout.write(json.dumps(payload))
    sys.stdout.flush()


def _harmony_bars_from_composition(comp: Any) -> List[str]:
    chords = getattr(getattr(comp, "harmony", None), "chords", None) or []
    if not chords:
        for section in getattr(comp, "sections", []) or []:
            for h in getattr(section, "harmony", []) or []:
                chords.append(h)
    ordered = sorted(
        chords,
        key=lambda h: int(h.get("measure", h.get("bar", 0)) or 0),
    )
    bars: List[str] = []
    for entry in ordered:
        sym = str(entry.get("symbol", "")).strip()
        if sym:
            bars.append(sym)
    return bars


def main() -> int:
    try:
        raw = sys.stdin.read()
        req = json.loads(raw) if raw.strip() else {}
        title = str(req.get("title") or "Untitled").strip() or "Untitled"
        seed = int(req.get("seed", 42))
        mode = str(req.get("mode") or "title")
        profile = str(req.get("profile") or "balanced")
        custom = req.get("custom_chords") or req.get("customChords")

        engine = WayneShorterEngine()
        ir = engine.generate_ir(title, mode=mode, seed=seed, profile=profile)
        composition = compile_composition_from_ir(
            ir,
            custom_chords=str(custom).strip() if custom else None,
        )
        harmony_bars = _harmony_bars_from_composition(composition)
        if not harmony_bars:
            raise ValueError("Wayne Shorter compile produced no harmony bars")

        tempo = int((composition.metadata or {}).get("tempo") or getattr(ir, "tempo_hint", 96) or 96)
        _emit(
            {
                "ok": True,
                "harmonyBars": harmony_bars,
                "tempo": tempo,
                "title": composition.title,
                "profile": profile,
                "form": (composition.metadata or {}).get("form"),
                "barCount": len(harmony_bars),
                "seed": seed,
                "stderrExcerpt": "",
            }
        )
        return 0
    except Exception as exc:  # noqa: BLE001
        print(traceback.format_exc(), file=sys.stderr)
        _emit(
            {
                "ok": False,
                "harmonyBars": [],
                "tempo": 0,
                "title": "",
                "profile": "",
                "form": None,
                "barCount": 0,
                "seed": 0,
                "stderrExcerpt": str(exc)[:500],
                "error": str(exc),
            }
        )
        return 1


if __name__ == "__main__":
    sys.exit(main())
