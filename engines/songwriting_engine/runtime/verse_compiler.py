"""
Verse Compiler — Supports premise and image world.
Inherits hook DNA indirectly. Lower identity pressure than chorus.
"""

from typing import Any, Dict, List

try:
    from .song_ir_schema import SongIR, SectionIR
    from .compiled_song_types import CompiledSection
except ImportError:
    from song_ir_schema import SongIR, SectionIR
    from compiled_song_types import CompiledSection

BAR_COUNT = 8
BEATS_PER_BAR = 4


def compile_verse(section_ir: SectionIR, song_ir: SongIR, section_id: str, bar_start: int, verse_index: int) -> CompiledSection:
    """
    Compile verse. Supports premise, image family. Inherits hook DNA indirectly.
    Lower identity pressure than chorus. Preserves asymmetry.
    """
    bars = section_ir.bar_count if section_ir.bar_count else BAR_COUNT
    bar_end = bar_start + bars

    motif = song_ir.hook_dna.motif_cell or [60, 62, 64]
    verse_motif = [p - 2 for p in motif]
    melody_idea = verse_motif + motif[:2]

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

    lines = _verse_lines_from_premise(song_ir.premise, song_ir.image_family, verse_index)

    harm = song_ir.harmonic_plan
    prog = harm.section_overrides.get("verse") or harm.default_progression
    harmony = []
    for m in range(bars):
        chord = prog[m % len(prog)]
        harmony.append({"symbol": chord, "measure": bar_start + m, "duration": 4})

    energy = song_ir.contrast_arc.section_energies.get("verse", 0.45)
    if verse_index == 1 and song_ir.contrast_arc.verse_2_intensify:
        energy = min(0.55, energy + 0.05)

    return CompiledSection(
        section_id=section_id,
        role="verse",
        bar_start=bar_start,
        bar_end=bar_end,
        melody_events=events,
        lyric_lines=lines,
        harmony=harmony,
        energy_level=energy,
    )


def _verse_lines_from_premise(premise: str, image_family: List[str], verse_index: int) -> List[str]:
    """Generate verse lyric placeholders from premise and image family."""
    lines = []
    if image_family:
        lines.append(f"{image_family[0]} in the air")
        if len(image_family) > 1:
            lines.append(f"Past the {image_family[1]}")
    if premise:
        words = premise.split()
        if words:
            lines.append(" ".join(words[:5]))
    if len(lines) < 4:
        defaults = ["The streetlamps blur", "Rain on the glass", "Dawn breaks over", "Hold the line"]
        for i in range(4 - len(lines)):
            lines.append(defaults[(verse_index * 2 + i) % len(defaults)])
    return lines[:4]
