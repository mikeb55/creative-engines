"""
Chorus Compiler — Identity centre. Uses hook_dna directly.
Preserves asymmetry. Does not flatten the hook.
"""

from typing import Any, Dict, List

try:
    from .song_ir_schema import SongIR, SectionIR, HookDNA
    from .compiled_song_types import CompiledSection
except ImportError:
    from song_ir_schema import SongIR, SectionIR, HookDNA
    from compiled_song_types import CompiledSection

BAR_COUNT = 8
BEATS_PER_BAR = 4


def compile_chorus(section_ir: SectionIR, song_ir: SongIR, section_id: str, bar_start: int) -> CompiledSection:
    """
    Compile chorus from section IR and song IR.
    Uses hook_dna directly. Preserves title placement. Preserves asymmetry.
    """
    hook = song_ir.hook_dna
    bars = section_ir.bar_count if section_ir.bar_count else BAR_COUNT
    bar_end = bar_start + bars

    melody_idea = hook.chorus_melody_idea or hook.motif_cell or [60, 62, 64, 65, 67]
    phrase_lengths = section_ir.phrase_lengths or [4, 4, 4, 4]
    total_beats = bars * BEATS_PER_BAR

    events = []
    beat = 0.0
    event_id = 0
    while beat < total_beats:
        idx = int(beat / 2) % len(melody_idea)
        pitch = melody_idea[idx] if idx < len(melody_idea) else melody_idea[-1]
        measure = bar_start + int(beat // BEATS_PER_BAR)
        beat_pos = beat % BEATS_PER_BAR
        duration = 1.5
        events.append({
            "id": f"mel_{event_id}",
            "pitch": pitch,
            "duration": duration,
            "measure": measure,
            "beat_position": beat_pos,
            "section_id": section_id,
        })
        event_id += 1
        beat += duration

    title_phrase = hook.title_phrase or song_ir.title
    placement = section_ir.title_placement or song_ir.title_placements.get(section_id, "first_line")

    lines = []
    if title_phrase and placement == "first_line":
        lines.append(title_phrase)
    lines.append(_chorus_line_from_premise(song_ir.premise, song_ir.image_family))
    if title_phrase and placement != "first_line" and len(lines) < 4:
        lines.append(title_phrase)
    while len(lines) < 4:
        lines.append(_chorus_line_from_premise(song_ir.premise, song_ir.image_family))

    harm = song_ir.harmonic_plan
    prog = harm.section_overrides.get("chorus") or harm.default_progression
    harmony = []
    for m in range(bars):
        chord = prog[m % len(prog)]
        harmony.append({"symbol": chord, "measure": bar_start + m, "duration": 4})

    energy = song_ir.contrast_arc.section_energies.get("chorus", hook.energy_level)

    return CompiledSection(
        section_id=section_id,
        role="chorus",
        bar_start=bar_start,
        bar_end=bar_end,
        melody_events=events,
        lyric_lines=lines[:4],
        harmony=harmony,
        energy_level=energy,
    )


def _chorus_line_from_premise(premise: str, image_family: List[str]) -> str:
    """Generate simple lyric placeholder from premise and image family."""
    if image_family:
        return f"{image_family[0]} in the air"
    if premise:
        words = premise.split()[:4]
        return " ".join(words) if words else "Hold the line"
    return "Hold the line"
