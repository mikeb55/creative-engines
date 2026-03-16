"""
Section Compiler — Deterministic IR → CompiledSong.
Same Song IR + same seed = same result.
"""

from typing import Any, Dict, List

try:
    from .song_ir_schema import SongIR, SectionIR
    from .song_ir_validator import validate_song_ir
    from .compiled_song_types import CompiledSong, CompiledSection, CompiledMelody, CompiledLyrics, CompiledHarmony
    from .chorus_compiler import compile_chorus
    from .verse_compiler import compile_verse
    from .prechorus_compiler import compile_prechorus
    from .bridge_compiler import compile_bridge
    from .final_chorus_compiler import compile_final_chorus
    from .outro_compiler import compile_outro
except ImportError:
    from song_ir_schema import SongIR, SectionIR
    from song_ir_validator import validate_song_ir
    from compiled_song_types import CompiledSong, CompiledSection, CompiledMelody, CompiledLyrics, CompiledHarmony
    from chorus_compiler import compile_chorus
    from verse_compiler import compile_verse
    from prechorus_compiler import compile_prechorus
    from bridge_compiler import compile_bridge
    from final_chorus_compiler import compile_final_chorus
    from outro_compiler import compile_outro

BAR_COUNT_BY_ROLE = {"verse": 8, "chorus": 8, "prechorus": 4, "bridge": 8, "outro": 4, "intro": 4, "final_chorus": 8}


def compile_song_from_ir(song_ir: SongIR) -> CompiledSong:
    """
    Validate Song IR, compile sections in order, return CompiledSong.
    Deterministic: same IR + seed = same result.
    """
    result = validate_song_ir(song_ir)
    if not result.valid:
        raise ValueError(f"Invalid Song IR: {'; '.join(result.errors)}")

    sections: List[CompiledSection] = []
    all_melody = []
    lyrics_by_section: Dict[str, List[str]] = {}
    all_harmony = []

    bar_start = 0
    verse_count = 0
    chorus_count = 0

    for i, role in enumerate(song_ir.section_order):
        section_roles = song_ir.section_roles or {}
        section_ir = section_roles.get(role)
        if section_ir is None:
            section_ir = SectionIR(role=role, bar_count=BAR_COUNT_BY_ROLE.get(role, 8))

        if role == "verse":
            verse_count += 1
            section_id = f"verse_{verse_count}"
        elif role == "chorus":
            chorus_count += 1
            section_id = f"chorus_{chorus_count}"
        elif role in ("prechorus", "bridge", "outro", "final_chorus"):
            section_id = role
        else:
            section_id = role

        if role == "chorus":
            compiled = compile_chorus(section_ir, song_ir, section_id, bar_start)
        elif role == "verse":
            compiled = compile_verse(section_ir, song_ir, section_id, bar_start, verse_count - 1)
        elif role == "prechorus":
            compiled = compile_prechorus(section_ir, song_ir, section_id, bar_start)
        elif role == "bridge":
            compiled = compile_bridge(section_ir, song_ir, section_id, bar_start)
        elif role == "final_chorus":
            compiled = compile_final_chorus(section_ir, song_ir, section_id, bar_start)
        elif role == "outro":
            compiled = compile_outro(section_ir, song_ir, section_id, bar_start)
        else:
            compiled = _compile_generic_section(section_ir, song_ir, section_id, bar_start)

        sections.append(compiled)
        all_melody.extend(compiled.melody_events)
        lyrics_by_section[section_id] = compiled.lyric_lines
        all_harmony.extend(compiled.harmony)
        bar_start = compiled.bar_end

    melody = CompiledMelody(events=all_melody)
    lyrics = CompiledLyrics(lines_by_section=lyrics_by_section)
    harmony = CompiledHarmony(chords=all_harmony)

    return CompiledSong(
        title=song_ir.title,
        sections=sections,
        melody=melody,
        lyrics=lyrics,
        harmony=harmony,
        metadata={
            "seed": song_ir.seed,
            "form": song_ir.form,
            "source": "song_ir",
            "musicxml_constraints": getattr(song_ir, "musicxml_constraints", None),
            "export_hints": getattr(song_ir, "export_hints", None),
        },
    )


def _compile_generic_section(section_ir: SectionIR, song_ir: SongIR, section_id: str, bar_start: int) -> CompiledSection:
    """Placeholder-safe compilation for prechorus, bridge, outro."""
    bars = section_ir.bar_count or BAR_COUNT_BY_ROLE.get(section_ir.role, 8)
    bar_end = bar_start + bars
    motif = song_ir.hook_dna.motif_cell or [60, 62, 64]
    events = []
    for b in range(bars):
        for i, p in enumerate(motif):
            events.append({
                "id": f"mel_{bar_start}_{b}_{i}",
                "pitch": p,
                "duration": 1.5,
                "measure": bar_start + b,
                "beat_position": i * 1.5,
                "section_id": section_id,
            })
    prog = song_ir.harmonic_plan.default_progression
    harmony = [{"symbol": prog[b % len(prog)], "measure": bar_start + b, "duration": 4} for b in range(bars)]
    lines = [f"Section {section_ir.role}"] * 2
    energy = song_ir.contrast_arc.section_energies.get(section_ir.role, 0.5)
    return CompiledSection(
        section_id=section_id,
        role=section_ir.role,
        bar_start=bar_start,
        bar_end=bar_end,
        melody_events=events,
        lyric_lines=lines,
        harmony=harmony,
        energy_level=energy,
    )
