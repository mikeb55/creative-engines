"""
Songwriting Bridge — Build lead sheets from compositions.
"""

from typing import Any, Dict, List

from .lead_sheet_types import LeadSheet, VocalMelody, ChordSymbolTrack, LyricAlignment, SongFormSummary
from .melody_to_vocal_adapter import create_vocal_melody
from .lyric_alignment_adapter import create_lyric_placeholders, align_lyrics_to_melody
from .chord_symbol_extractor import simplify_harmony_for_lead_sheet
from .lead_sheet_exporter import export_lead_sheet_to_musicxml, export_lead_sheet_summary


def build_lead_sheet_from_composition(
    compiled_composition: Any,
    voice_type: str = "male_tenor",
) -> LeadSheet:
    """
    Build lead sheet: vocal melody, chord symbols, lyric placeholders, form summary.
    """
    title = getattr(compiled_composition, "title", "Untitled")
    vm = create_vocal_melody(compiled_composition, voice_type)
    chords = simplify_harmony_for_lead_sheet(compiled_composition)
    placeholders = create_lyric_placeholders(compiled_composition, "phrase_based")
    lyric_align = align_lyrics_to_melody(vm, placeholders)
    sections = []
    for i, sec in enumerate(getattr(compiled_composition, "sections", [])):
        role = getattr(sec, "role", "verse")
        bar_start = getattr(sec, "bar_start", i * 8)
        bar_end = getattr(sec, "bar_end", bar_start + 8)
        label = "chorus" if role == "contrast" else "verse"
        sections.append({"label": label, "bar_start": bar_start, "bar_end": bar_end, "role": role})
    form = SongFormSummary(sections=sections)
    return LeadSheet(
        title=title,
        vocal_melody=vm,
        chord_symbols=ChordSymbolTrack(symbols=chords),
        lyric_alignment=lyric_align,
        form_summary=form,
        metadata={"voice_type": voice_type},
    )


def build_lead_sheets_from_population(
    compositions: List[Any],
    voice_type: str = "male_tenor",
) -> List[LeadSheet]:
    """
    Build lead sheets from multiple compositions.
    """
    results = []
    for item in compositions:
        compiled = item.get("compiled", item) if isinstance(item, dict) else item
        results.append(build_lead_sheet_from_composition(compiled, voice_type))
    return results
