"""
Bridge Compiler — Contrast with verse and chorus.
Different harmony region, different contour, premise reframing.
"""

from typing import List

try:
    from .song_ir_schema import SongIR, SectionIR
    from .compiled_song_types import CompiledSection
except ImportError:
    from song_ir_schema import SongIR, SectionIR
    from compiled_song_types import CompiledSection

BAR_COUNT = 8
BEATS_PER_BAR = 4


def compile_bridge(section_ir: SectionIR, song_ir: SongIR, section_id: str, bar_start: int) -> CompiledSection:
    """
    Compile bridge. Contrast harmony and contour. Premise reframing.
    Maintain motif connection to hook.
    """
    bars = section_ir.bar_count if section_ir.bar_count else BAR_COUNT
    bar_end = bar_start + bars

    motif = song_ir.hook_dna.motif_cell or [60, 62, 64]
    bridge_motif = [p - 3 for p in motif] + [p + 1 for p in motif[:2]]

    total_beats = bars * BEATS_PER_BAR
    events = []
    beat = 0.0
    event_id = 0
    while beat < total_beats:
        idx = int(beat / 2) % len(bridge_motif)
        pitch = bridge_motif[idx] if idx < len(bridge_motif) else bridge_motif[-1]
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

    lines = _bridge_lines(song_ir.premise, song_ir.image_family)

    harm = song_ir.harmonic_plan
    prog = harm.section_overrides.get("bridge") or ["F", "G", "Am", "Em"]
    harmony = []
    for m in range(bars):
        chord = prog[m % len(prog)]
        harmony.append({"symbol": chord, "measure": bar_start + m, "duration": 4})

    energy = song_ir.contrast_arc.section_energies.get("bridge", 0.5)

    return CompiledSection(
        section_id=section_id,
        role="bridge",
        bar_start=bar_start,
        bar_end=bar_end,
        melody_events=events,
        lyric_lines=lines,
        harmony=harmony,
        energy_level=energy,
    )


def _bridge_lines(premise: str, image_family: List[str]) -> List[str]:
    """Bridge lyrics: premise reframing, less title repetition."""
    lines = []
    if premise:
        words = premise.split()
        if len(words) >= 3:
            lines.append(" ".join(words[-3:]) + " again")
        else:
            lines.append("Looking back now")
    if image_family and len(image_family) >= 2:
        lines.append(f"Between {image_family[0]} and {image_family[1]}")
    if len(lines) < 4:
        defaults = ["Another angle", "The other side", "What we knew", "What we lost"]
        for i in range(4 - len(lines)):
            lines.append(defaults[i])
    return lines[:4]
