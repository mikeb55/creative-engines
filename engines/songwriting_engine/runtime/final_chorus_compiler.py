"""
Final Chorus Compiler — Emotional climax.
Reuse hook DNA, increase energy, melodic peak, reinforce title.
"""

from typing import List

try:
    from .song_ir_schema import SongIR, SectionIR, HookDNA
    from .compiled_song_types import CompiledSection
except ImportError:
    from song_ir_schema import SongIR, SectionIR, HookDNA
    from compiled_song_types import CompiledSection

BAR_COUNT = 8
BEATS_PER_BAR = 4


def compile_final_chorus(section_ir: SectionIR, song_ir: SongIR, section_id: str, bar_start: int) -> CompiledSection:
    """
    Compile final chorus. Emotional climax.
    Higher energy, melodic peak, title reinforcement.
    """
    hook = song_ir.hook_dna
    bars = section_ir.bar_count if section_ir.bar_count else BAR_COUNT
    bar_end = bar_start + bars

    melody_idea = hook.chorus_melody_idea or hook.motif_cell or [60, 62, 64, 65, 67]
    melody_idea = [p + 2 for p in melody_idea]

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

    title_phrase = hook.title_phrase or song_ir.title
    lines = []
    lines.append(title_phrase)
    lines.append(_final_line(song_ir.premise, song_ir.image_family))
    lines.append(title_phrase)
    if song_ir.image_family:
        lines.append(f"{song_ir.image_family[0]} forever")
    else:
        lines.append("Hold the line")

    harm = song_ir.harmonic_plan
    prog = harm.section_overrides.get("final_chorus") or harm.section_overrides.get("chorus") or harm.default_progression
    harmony = []
    for m in range(bars):
        chord = prog[m % len(prog)]
        harmony.append({"symbol": chord, "measure": bar_start + m, "duration": 4})

    base_energy = song_ir.contrast_arc.section_energies.get("final_chorus") or song_ir.contrast_arc.section_energies.get("chorus", 0.8)
    energy = min(1.0, base_energy + 0.1) if song_ir.contrast_arc.final_chorus_peak else base_energy

    return CompiledSection(
        section_id=section_id,
        role="final_chorus",
        bar_start=bar_start,
        bar_end=bar_end,
        melody_events=events,
        lyric_lines=lines[:4],
        harmony=harmony,
        energy_level=energy,
    )


def _final_line(premise: str, image_family: List[str]) -> str:
    """Climactic lyric line."""
    if image_family:
        return f"Through the {image_family[0]}"
    if premise:
        return premise.split()[0] + " forever" if premise.split() else "Hold the line"
    return "Hold the line"
