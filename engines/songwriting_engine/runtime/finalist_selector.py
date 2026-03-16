"""
Finalist Selector — Rank IR candidates, select finalists, compile.
Identity-aware ranking. Avoid median blandness.
"""

from typing import Any, Dict, List, Tuple

try:
    from .song_ir_schema import SongIR
    from .song_ir_validator import validate_song_ir
    from .section_compiler import compile_song_from_ir
except ImportError:
    from song_ir_schema import SongIR
    from song_ir_validator import validate_song_ir
    from section_compiler import compile_song_from_ir


def score_ir_candidate(song_ir: SongIR) -> float:
    """
    Quality score: hook clarity, title integration, contrast arc, compile readiness, premise clarity.
    """
    score = 0.0

    # Hook clarity
    hook = getattr(song_ir, "hook_dna", None)
    if hook:
        energy = getattr(hook, "energy_level", 0.5)
        melody = getattr(hook, "chorus_melody_idea", [])
        title_phrase = getattr(hook, "title_phrase", "")
        score += energy * 0.25
        score += min(0.2, len(melody) / 10)
        if title_phrase and title_phrase == song_ir.title:
            score += 0.15

    # Title integration
    if song_ir.title:
        score += 0.1

    # Contrast arc plausibility
    arc = getattr(song_ir, "contrast_arc", None)
    if arc:
        energies = getattr(arc, "section_energies", {}) or {}
        chorus_e = energies.get("chorus", 0.5)
        verse_e = energies.get("verse", 0.4)
        if chorus_e > verse_e:
            score += 0.1

    # Compile readiness (validation)
    r = validate_song_ir(song_ir)
    if r.valid:
        score += 0.2
    else:
        return 0.0

    # Premise clarity
    premise = getattr(song_ir, "premise", "") or ""
    if premise:
        score += 0.05
    if getattr(song_ir, "image_family", []):
        score += 0.05

    return min(1.0, score)


def rank_ir_candidates(song_irs: List[SongIR]) -> List[Tuple[SongIR, float]]:
    """Rank by quality score descending."""
    scored = [(ir, score_ir_candidate(ir)) for ir in song_irs]
    return sorted(scored, key=lambda x: x[1], reverse=True)


def select_finalist_song_irs(song_irs: List[SongIR], limit: int = 5) -> List[SongIR]:
    """Select top finalists. Preserves diversity by taking top-ranked (no dedup by niche here)."""
    ranked = rank_ir_candidates(song_irs)
    return [ir for ir, _ in ranked[:limit]]


def compile_finalist_candidates(song_irs: List[SongIR]) -> List[Dict[str, Any]]:
    """Compile finalists. Returns list of {source_ir, compiled, rank, score}."""
    ranked = rank_ir_candidates(song_irs)
    out = []
    for i, (ir, score) in enumerate(ranked):
        try:
            compiled = compile_song_from_ir(ir)
            out.append({
                "source_ir": ir,
                "compiled": compiled,
                "rank": i + 1,
                "score": score,
            })
        except (ValueError, Exception):
            continue
    return out
