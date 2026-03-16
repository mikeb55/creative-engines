"""
Lead Sheet Types — Data structures for lead sheet output.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class VocalMelody:
    """Vocal melody with adapted range."""
    events: List[Dict[str, Any]]
    voice_type: str
    original_range: tuple
    adapted_range: tuple


@dataclass
class ChordSymbolTrack:
    """Chord symbols aligned to measures/beats."""
    symbols: List[Dict[str, Any]]  # {measure, beat, chord, duration}


@dataclass
class LyricAlignment:
    """Lyrics aligned to melody events."""
    placeholders: List[Dict[str, Any]]  # {measure, beat, syllable, phrase_id}
    mode: str
    section_labels: List[str]


@dataclass
class SongFormSummary:
    """Form summary: verse, chorus, bridge, etc."""
    sections: List[Dict[str, Any]]  # {label, bar_start, bar_end, role}


@dataclass
class LeadSheet:
    """Complete lead sheet: vocal melody, chords, lyrics, form."""
    title: str
    vocal_melody: VocalMelody
    chord_symbols: ChordSymbolTrack
    lyric_alignment: LyricAlignment
    form_summary: SongFormSummary
    metadata: Dict[str, Any] = field(default_factory=dict)
