#!/usr/bin/env python3
"""
Scrape / parse lvm/tidal-drum-patterns (Sound/Tidal/Drum/*.hs) and emit
engines/composer-os-v2/core/percussion/data/tonyAllenPatterns.json

Feel mapping (library has no literal “Tony Allen” modules — Afro* / Swing* / Rock
patterns stand in for afrobeat / swing / straight grids).
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Dict, List
from urllib.error import URLError
from urllib.request import Request, urlopen

REPO_RAW = "https://raw.githubusercontent.com/lvm/tidal-drum-patterns/master"

# One representative module per feel (16th-note brackets flattened + padded to 16).
FEEL_MODULES: Dict[str, str] = {
    "straight": "Sound/Tidal/Drum/Rock1a.hs",
    "swing": "Sound/Tidal/Drum/Swing3a.hs",
    "afrobeat": "Sound/Tidal/Drum/Afro2a.hs",
}

ASSIGN_RE = re.compile(r'^\s*(\w+)\s*=\s*"([^"]*)"', re.MULTILINE)
BRACKET_CHUNK_RE = re.compile(r"\[([^\]]*)\]")


def fetch_hs(rel_path: str) -> str:
    url = f"{REPO_RAW}/{rel_path}"
    req = Request(url, headers={"User-Agent": "creative-engines extractTonyAllenPatterns"})
    with urlopen(req, timeout=90) as resp:
        return resp.read().decode("utf-8")


def parse_assignments(src: str) -> Dict[str, str]:
    return {m.group(1): m.group(2) for m in ASSIGN_RE.finditer(src)}


def flatten_tokens(pattern_str: str) -> List[str]:
    """Order-preserving t / ~ tokens inside each [...] bracket."""
    out: List[str] = []
    for inner in BRACKET_CHUNK_RE.findall(pattern_str):
        for c in inner:
            if c == "t" or c == "~":
                out.append(c)
    return out


def to_len16(tokens: List[str]) -> List[int]:
    hits = [1 if c == "t" else 0 for c in tokens]
    target = 16
    if len(hits) < target:
        return hits + [0] * (target - len(hits))
    if len(hits) > target:
        return hits[:target]
    return hits


def or_merge(*rows: List[int]) -> List[int]:
    n = len(rows[0])
    return [1 if any(rows[j][i] for j in range(len(rows))) else 0 for i in range(n)]


def build_straight(assigns: Dict[str, str]) -> Dict[str, List[int]]:
    kick = to_len16(flatten_tokens(assigns["bd"]))
    snare = to_len16(flatten_tokens(assigns["sn"]))
    hi_hat = to_len16(flatten_tokens(assigns["ch"]))
    bell = to_len16(flatten_tokens(assigns.get("ac", ""))) if "ac" in assigns else [0] * 16
    return {
        "kick": kick,
        "snare": snare,
        "hiHat": hi_hat,
        "bell": bell,
        "conga": [0] * 16,
    }


def build_swing(assigns: Dict[str, str]) -> Dict[str, List[int]]:
    kick = to_len16(flatten_tokens(assigns["bd"]))
    snare = to_len16(flatten_tokens(assigns["sn"]))
    hi_hat = or_merge(
        to_len16(flatten_tokens(assigns["oh"])),
        to_len16(flatten_tokens(assigns["cy"])),
    )
    bell = to_len16(flatten_tokens(assigns["cy"]))
    conga = to_len16(flatten_tokens(assigns["mt"]))
    return {"kick": kick, "snare": snare, "hiHat": hi_hat, "bell": bell, "conga": conga}


def afrobeat_bell_row_quarters() -> List[int]:
    """
    Afro2a.hs exposes bd/ch/lt/mt/rm only — no bell/cowbell token row.
    Author a quarter-note cowbell/agogo layer at sixteenth indices 0,4,8,12 (beats 1–4).
    Matches typical Lagos Afrobeat ensemble practice: bell locks four quarter pulses while
    hats/kicks carry syncopation (Tony Allen–era Zombie/Afrobeat recordings).
    """
    return [1 if i % 4 == 0 else 0 for i in range(16)]


def build_afrobeat(assigns: Dict[str, str]) -> Dict[str, List[int]]:
    kick = to_len16(flatten_tokens(assigns["bd"]))
    snare = to_len16(flatten_tokens(assigns.get("sn", "")))
    if not any(snare):
        snare = to_len16(flatten_tokens(assigns.get("rm", "")))
    hi_hat = to_len16(flatten_tokens(assigns["ch"]))
    # Upstream pattern file has no bell — see afrobeat_bell_row_quarters docstring.
    bell = afrobeat_bell_row_quarters()
    conga = or_merge(
        to_len16(flatten_tokens(assigns.get("lt", ""))),
        to_len16(flatten_tokens(assigns.get("mt", ""))),
        to_len16(flatten_tokens(assigns.get("ht", ""))),
    )
    return {"kick": kick, "snare": snare, "hiHat": hi_hat, "bell": bell, "conga": conga}


def main() -> int:
    repo_root = Path(__file__).resolve().parents[1]
    out_path = (
        repo_root
        / "engines"
        / "composer-os-v2"
        / "core"
        / "percussion"
        / "data"
        / "tonyAllenPatterns.json"
    )
    out_path.parent.mkdir(parents=True, exist_ok=True)

    feels: Dict[str, Dict[str, List[int]]] = {}
    meta_sources: Dict[str, str] = {}

    builders = {
        "straight": build_straight,
        "swing": build_swing,
        "afrobeat": build_afrobeat,
    }

    try:
        for feel, rel in FEEL_MODULES.items():
            raw = fetch_hs(rel)
            assigns = parse_assignments(raw)
            feels[feel] = builders[feel](assigns)
            meta_sources[feel] = rel
    except URLError as e:
        print(f"[extractTonyAllenPatterns] fetch failed: {e}", file=sys.stderr)
        return 1

    payload = {
        "$schema": "./tonyAllenPatterns.schema.json",
        "schemaVersion": 1,
        "title": "Tony Allen–style percussion grids (derived from lvm/tidal-drum-patterns)",
        "generatedFrom": REPO_RAW,
        "meta": {
            "description": "kick/snare/hiHat/bell/conga — one bar, 16 steps per voice (16th-note grid)",
            "sources": meta_sources,
            "afrobeatBell": (
                "Afro2a.hs has no bell pattern in upstream repo; afrobeat bell row is "
                "hand-authored quarter-note cowbell/agogo at steps 0,4,8,12 (see extractTonyAllenPatterns.py)."
            ),
        },
        "feels": feels,
    }

    out_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
