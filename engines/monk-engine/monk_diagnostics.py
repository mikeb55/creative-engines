"""Monk bridge diagnostics — harmonic language metrics for MusicContext receipt."""
from __future__ import annotations

import re
from typing import Any, Dict, List, Sequence

_CHROMATIC = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]


def _root_pc(symbol: str) -> int | None:
    base = str(symbol or "").split("/")[0].strip()
    m = re.match(r"^([A-Ga-g])([#b]?)", base)
    if not m:
        return None
    pitch = m.group(1).upper() + (m.group(2) or "")
    try:
        return _CHROMATIC.index(pitch)
    except ValueError:
        aliases = {"Cb": "B", "B#": "C", "E#": "F", "Fb": "E"}
        mapped = aliases.get(pitch)
        if mapped:
            return _CHROMATIC.index(mapped)
    return None


def _is_dissonant(symbol: str) -> bool:
    s = str(symbol or "").lower()
    return any(tok in s for tok in ("alt", "b9", "#9", "dim", "ø", "m7b5", "aug"))


def _is_consonant_resolution(symbol: str) -> bool:
    s = str(symbol or "").lower()
    return "maj7" in s or s.endswith("6") or (s.endswith("m7") and "b5" not in s and "ø" not in s)


def compute_monk_realisation_metrics(
    harmony_bars: Sequence[str],
    composition: Any | None = None,
) -> Dict[str, float | int]:
    bars = [str(b).strip() for b in harmony_bars if str(b).strip()]
    if len(bars) < 2:
        return {
            "chromaticNeighbourRate": 0.0,
            "tritoneShiftCount": 0,
            "rhythmicMotifConsistency": 0.0,
            "dissonanceResolutionScore": 0.0,
        }

    pcs = [_root_pc(b) for b in bars]
    chromatic_moves = 0
    tritone_shifts = 0
    total_moves = 0
    for i in range(1, len(pcs)):
        a, b = pcs[i - 1], pcs[i]
        if a is None or b is None:
            continue
        delta = min((b - a) % 12, (a - b) % 12)
        total_moves += 1
        if delta == 1:
            chromatic_moves += 1
        if delta == 6:
            tritone_shifts += 1

    chromatic_neighbour_rate = chromatic_moves / total_moves if total_moves else 0.0

    # Repeated harmonic cells with displacement (2-bar and 4-bar windows)
    motif_hits = 0
    motif_windows = 0
    for size in (2, 4):
        for i in range(0, len(bars) - size):
            motif_windows += 1
            pattern = bars[i : i + size]
            for j in range(i + size, len(bars) - size + 1):
                if bars[j : j + size] == pattern:
                    motif_hits += 1
                    break
    rhythmic_motif_consistency = motif_hits / motif_windows if motif_windows else 0.0

    resolution_scores: List[float] = []
    for i in range(len(bars) - 1):
        if not _is_dissonant(bars[i]):
            continue
        nxt = bars[i + 1]
        if _is_consonant_resolution(nxt):
            resolution_scores.append(0.35)
        elif _is_dissonant(nxt):
            resolution_scores.append(0.85)
        else:
            resolution_scores.append(0.55)
    dissonance_resolution_score = (
        sum(resolution_scores) / len(resolution_scores) if resolution_scores else 0.5
    )

    if composition is not None:
        meta = getattr(composition, "metadata", None) or {}
        if isinstance(meta, dict) and meta.get("rhythmic_motif_consistency") is not None:
            rhythmic_motif_consistency = float(meta["rhythmic_motif_consistency"])

    return {
        "chromaticNeighbourRate": round(min(1.0, chromatic_neighbour_rate), 4),
        "tritoneShiftCount": int(tritone_shifts),
        "rhythmicMotifConsistency": round(min(1.0, rhythmic_motif_consistency), 4),
        "dissonanceResolutionScore": round(min(1.0, dissonance_resolution_score), 4),
    }
