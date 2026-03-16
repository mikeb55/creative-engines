"""
Prechorus Compiler — Lift into chorus. Increase tension.
Inherits motif from hook_dna. Stronger harmonic motion.
"""

from typing import List

try:
    from .song_ir_schema import SongIR, SectionIR
    from .compiled_song_types import CompiledSection
except ImportError:
    from song_ir_schema import SongIR, SectionIR
    from compiled_song_types import CompiledSection

BAR_COUNT = 4
BEATS_PER_BAR = 4


def compile_prechorus(section_ir: SectionIR, song_ir: SongIR, section_id: str, bar_start: int) -> CompiledSection:
    """
    Compile prechorus. Increase tension toward chorus.
    Inherit motif hints, slightly higher lyric density, stronger harmony.
    """
    bars = section_ir.bar_count if section_ir.bar_count else BAR_COUNT
    bar_end = bar_start + bars

    motif = song_ir.hook_dna.motif_cell or [60, 62, 64]
    melody_idea = [p + 1 for p in motif] + [p + 2 for p in motif[:2]]

    total_beats = bars * BEATS_PER_BAR
    events = []
    beat = 0.0
    event_id = 0
    while beat < total_beats:
        idx = int(beat / 1.5) % len(melody_idea)
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

    lyric_dens = section_ir.lyric_density if section_ir.lyric_density else 0.75
    lines = _prechorus_lines(song_ir.premise, song_ir.image_family, lyric_dens)

    harm = song_ir.harmonic_plan
    prog = harm.section_overrides.get("prechorus") or ["Am", "F", "G", "C"]
    harmony = []
    for m in range(bars):
        chord = prog[m % len(prog)]
        harmony.append({"symbol": chord, "measure": bar_start + m, "duration": 4})

    energy = song_ir.contrast_arc.section_energies.get("prechorus", 0.6)

    return CompiledSection(
        section_id=section_id,
        role="prechorus",
        bar_start=bar_start,
        bar_end=bar_end,
        melody_events=events,
        lyric_lines=lines,
        harmony=harmony,
        energy_level=energy,
    )


def _prechorus_lines(premise: str, image_family: List[str], density: float) -> List[str]:
    """Prechorus lyrics: tension-building, slightly denser."""
    lines = []
    if image_family:
        lines.append(f"Waiting at the {image_family[0]}")
        if len(image_family) > 1:
            lines.append(f"Before the {image_family[1]} falls")
    if premise:
        words = premise.split()[:5]
        if words:
            lines.append(" ".join(words) + " now")
    if len(lines) < 3:
        defaults = ["Rising to the moment", "Hold your breath", "Here it comes"]
        for i in range(3 - len(lines)):
            lines.append(defaults[i])
    return lines[:4]
