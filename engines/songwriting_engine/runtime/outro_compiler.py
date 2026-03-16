"""
Outro Compiler — Closure. Reinforce title/motif, resolve harmony.
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


def compile_outro(section_ir: SectionIR, song_ir: SongIR, section_id: str, bar_start: int) -> CompiledSection:
    """
    Compile outro. Closure, resolve tension.
    Echo chorus melody fragments, shorter lyric density.
    """
    bars = section_ir.bar_count if section_ir.bar_count else BAR_COUNT
    bar_end = bar_start + bars

    motif = song_ir.hook_dna.motif_cell or [60, 62, 64]
    outro_motif = motif[:2] + [motif[0] - 2]

    total_beats = bars * BEATS_PER_BAR
    events = []
    beat = 0.0
    event_id = 0
    while beat < total_beats:
        idx = int(beat / 2) % len(outro_motif)
        pitch = outro_motif[idx] if idx < len(outro_motif) else outro_motif[-1]
        measure = bar_start + int(beat // BEATS_PER_BAR)
        beat_pos = beat % BEATS_PER_BAR
        duration = 2.0
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

    title = song_ir.title
    lines = [title] if title else ["Fade out"]

    harm = song_ir.harmonic_plan
    prog = harm.section_overrides.get("outro") or ["C", "G", "C"]
    harmony = []
    for m in range(bars):
        chord = prog[m % len(prog)]
        harmony.append({"symbol": chord, "measure": bar_start + m, "duration": 4})

    energy = song_ir.contrast_arc.section_energies.get("outro", 0.35)

    return CompiledSection(
        section_id=section_id,
        role="outro",
        bar_start=bar_start,
        bar_end=bar_end,
        melody_events=events,
        lyric_lines=lines,
        harmony=harmony,
        energy_level=energy,
    )
