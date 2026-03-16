"""
QD Axes — Behavioural dimensions for MAP-Elites archive.
Deterministic scoring. Compact discrete bins.
"""

from typing import Any, Tuple

try:
    from .song_ir_schema import SongIR
except ImportError:
    from song_ir_schema import SongIR

BINS = 2  # low=0, high=1 per axis


def score_hook_boldness(song_ir: SongIR) -> float:
    """0–1. Higher = stronger hook identity."""
    hook = getattr(song_ir, "hook_dna", None)
    if not hook:
        return 0.3
    energy = getattr(hook, "energy_level", 0.5)
    melody_len = len(getattr(hook, "chorus_melody_idea", []))
    title_phrase = getattr(hook, "title_phrase", "") or ""
    clarity = 0.2 if title_phrase and title_phrase == song_ir.title else 0.0
    return min(1.0, energy * 0.7 + (melody_len / 8) * 0.2 + clarity + 0.1)


def score_asymmetry(song_ir: SongIR) -> float:
    """0–1. Higher = more asymmetry."""
    roles = getattr(song_ir, "section_roles", None) or {}
    total = 0.0
    count = 0
    for role, ir in roles.items():
        pl = getattr(ir, "phrase_lengths", None)
        if pl and len(pl) >= 2:
            mn, mx = min(pl), max(pl)
            if mx > 0:
                total += (mx - mn) / mx
            count += 1
    if count == 0:
        return 0.0
    return min(1.0, total / max(1, count) * 2)


def score_lyric_density(song_ir: SongIR) -> float:
    """0–1. Higher = denser lyrics."""
    return min(1.0, max(0.0, getattr(song_ir, "lyric_density", 0.7)))


def score_harmonic_adventurousness(song_ir: SongIR) -> float:
    """0–1. Higher = more chord variety."""
    plan = getattr(song_ir, "harmonic_plan", None)
    if not plan:
        return 0.3
    prog = getattr(plan, "default_progression", ["C", "Am", "F", "G"])
    overrides = getattr(plan, "section_overrides", {}) or {}
    base = min(1.0, len(prog) / 6) if prog else 0.3
    return min(1.0, base + len(overrides) * 0.15)


def score_emotional_temperature(song_ir: SongIR) -> float:
    """0–1. Higher = more intense."""
    arc = getattr(song_ir, "contrast_arc", None)
    if not arc:
        return 0.5
    energies = getattr(arc, "section_energies", {}) or {}
    if not energies:
        return 0.5
    chorus_e = energies.get("chorus", 0.5)
    verse_e = energies.get("verse", 0.4)
    return min(1.0, (chorus_e + verse_e) / 2 + 0.1)


def get_qd_coordinates(song_ir: SongIR) -> Tuple[int, int, int, int, int]:
    """Return (hook_bin, asym_bin, lyric_bin, harm_bin, temp_bin). Each 0 or 1."""
    h = score_hook_boldness(song_ir)
    a = score_asymmetry(song_ir)
    l = score_lyric_density(song_ir)
    ha = score_harmonic_adventurousness(song_ir)
    t = score_emotional_temperature(song_ir)
    threshold = 0.5
    return (
        1 if h >= threshold else 0,
        1 if a >= threshold else 0,
        1 if l >= threshold else 0,
        1 if ha >= threshold else 0,
        1 if t >= threshold else 0,
    )
