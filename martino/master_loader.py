"""Load canonical Gm activity masters and transpose for tune generation."""
from __future__ import annotations

import json
import os
from pathlib import Path

ENGINE_DIR = Path(__file__).resolve().parent
MASTERS_DIR = ENGINE_DIR / "masters" / "activities"

STEP_SEMI = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]

ACTIVITY_ALIASES = {
    "A1_LINEAR_CORE": "A1",
    "A2_DIAGONAL_BRIDGE": "A2",
    "A3_PIVOT_CELL": "A3",
    "A4_ANCHOR_ARP": "A4",
    "A5_FREE_MIX": "A5",
    "LINEAR_CORE": "A1",
    "DIAGONAL_BRIDGE": "A2",
    "PIVOT_CELL": "A3",
    "ANCHOR_ARP": "A4",
    "FREE_MIX": "A5",
}


def _pc(step: str, alter: int | None) -> int:
    base = STEP_SEMI.get(step[0], 0)
    if alter is not None:
        base += alter
    elif len(step) > 1 and step[1] == "b":
        base -= 1
    elif len(step) > 1 and step[1] == "#":
        base += 1
    return base % 12


def _from_pc(pc: int, prefer_flat: bool = False) -> tuple[str, int | None]:
    name = NAMES[pc % 12]
    alter = -1 if "b" in name and len(name) > 1 else (1 if "#" in name else None)
    step = name[0] if alter is None else name[0]
    return step, alter


def transpose_bar(bar: list, semitones: int) -> list:
    out = []
    for item in bar:
        step, octv, alt, dur = item[0], int(item[1]), item[2], int(item[3])
        pc = (_pc(str(step), int(alt) if alt is not None else None) + semitones) % 12
        new_step, new_alt = _from_pc(pc)
        octave_shift = ( _pc(str(step), int(alt) if alt is not None else None) + semitones) // 12
        if (_pc(str(step), int(alt) if alt is not None else None) + semitones) < 0:
            octave_shift -= 1
        out.append([new_step, octv + octave_shift, new_alt, dur])
    return out


def resolve_activity_key(primary_activity: str) -> str:
    raw = str(primary_activity or "A1_LINEAR_CORE")
    for token in raw.replace("(", " ").replace(")", " ").split():
        if token in ACTIVITY_ALIASES:
            return ACTIVITY_ALIASES[token]
    for k, v in ACTIVITY_ALIASES.items():
        if k in raw:
            return v
    return "A1"


def load_master_bars(activity_key: str) -> list[list]:
    path = MASTERS_DIR / f"{activity_key}.json"
    if not path.exists():
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    return data.get("bars_gm") or []


def build_melody_bars(tune_config: dict) -> list[list]:
    if os.environ.get("MARTINO_DEV_PLACEHOLDER"):
        return []
    primary = resolve_activity_key(tune_config.get("primary_activity", "A1_LINEAR_CORE"))
    bars_gm = load_master_bars(primary)
    if not bars_gm:
        return []
    mpc = int(tune_config.get("measures_per_chorus", 16))
    choruses = int(tune_config.get("choruses", 1))
    total = mpc * choruses
    semitones = int(tune_config.get("transpose_semitones", 0))
    melody: list[list] = []
    for i in range(total):
        template = bars_gm[i % len(bars_gm)]
        melody.append(transpose_bar(template, semitones) if semitones else template)
    return melody
