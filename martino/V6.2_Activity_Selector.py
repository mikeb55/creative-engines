#!/usr/bin/env python3
"""
V6.2 Activity Selector. No music/MusicXML. Uses V6.1 diagnostics to output Activity Selection Summary.
Usage: py V6.2_Activity_Selector.py [TUNE]
TUNE = "Orbit 5X Version 2" | "Orbit5X_Version2" | "Beatrice"
"""
from __future__ import annotations

from pathlib import Path

_ENGINE_DIR = Path(__file__).resolve().parent

# From V6.1 diagnostics: total asterisks per activity (low to high) and role.
ORBIT_RANK = [("A2", 3), ("A1", 5), ("A3", 6), ("A4", 11)]
BEATRICE_RANK = [("A2", 2), ("A3", 3), ("A1", 4), ("A4", 9)]

DATA = {
    "Orbit 5X Version 2": ORBIT_RANK,
    "Orbit5X_Version2": ORBIT_RANK,
    "Beatrice": BEATRICE_RANK,
}

LFV_RANGE = "5-9"


def summary(tune_name: str) -> str:
    rank = DATA.get(tune_name)
    if not rank:
        return f"TUNE: {tune_name}\n(No diagnostic data.)"
    default = rank[0][0]
    rescue = rank[1][0]
    limited = rank[2][0]
    avoid = rank[3][0]
    return f"""TUNE: {tune_name}
DEFAULT ACTIVITY: {default}
RESCUE ACTIVITY: {rescue}
LIMITED USE: {limited}
AVOID: {avoid}
LFV RANGE: {LFV_RANGE}"""


def main() -> None:
    import sys
    if len(sys.argv) > 1:
        tune = sys.argv[1].strip()
        print(summary(tune))
    else:
        for name in ["Orbit 5X Version 2", "Beatrice"]:
            print(summary(name))
            print()


if __name__ == "__main__":
    main()
