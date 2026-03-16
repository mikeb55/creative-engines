"""
Compiled Song Types — Output of section compiler.
Compiled representation, not final polished art. Coherent and internally consistent.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class CompiledMelody:
    """Melody blueprint: pitch, duration, measure, section_id."""
    events: List[Dict[str, Any]] = field(default_factory=list)
    # each event: {"pitch": int, "duration": float, "measure": int, "beat_position": float, "section_id": str}


@dataclass
class CompiledLyrics:
    """Lyric lines per section."""
    lines_by_section: Dict[str, List[str]] = field(default_factory=dict)


@dataclass
class CompiledHarmony:
    """Harmony plan: chord per measure."""
    chords: List[Dict[str, Any]] = field(default_factory=list)
    # each: {"symbol": str, "measure": int, "duration": int}


@dataclass
class CompiledSection:
    """Single compiled section."""
    section_id: str
    role: str
    bar_start: int
    bar_end: int
    melody_events: List[Dict[str, Any]] = field(default_factory=list)
    lyric_lines: List[str] = field(default_factory=list)
    harmony: List[Dict[str, Any]] = field(default_factory=list)
    energy_level: float = 0.5


@dataclass
class CompiledSong:
    """Full compiled song output."""
    title: str
    sections: List[CompiledSection] = field(default_factory=list)
    melody: CompiledMelody = field(default_factory=CompiledMelody)
    lyrics: CompiledLyrics = field(default_factory=CompiledLyrics)
    harmony: CompiledHarmony = field(default_factory=CompiledHarmony)
    metadata: Dict[str, Any] = field(default_factory=dict)
