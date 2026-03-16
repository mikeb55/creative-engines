"""
Compiled Composition Base — Shared compiled output types.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List


@dataclass
class MelodyBlueprint:
    """Shared melody blueprint."""
    events: List[Dict[str, Any]] = field(default_factory=list)
    phrase_boundaries: List[int] = field(default_factory=list)


@dataclass
class HarmonyBlueprint:
    """Shared harmony blueprint."""
    chords: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class CompiledSectionBase:
    """Shared compiled section."""
    section_id: str
    role: str
    bar_start: int
    bar_end: int
    melody_events: List[Dict[str, Any]] = field(default_factory=list)
    harmony: List[Dict[str, Any]] = field(default_factory=list)
    phrase_lengths: List[int] = field(default_factory=list)
    motif_refs: List[str] = field(default_factory=list)
    register_hint: int = 60


@dataclass
class CompiledCompositionBase:
    """Shared compiled composition."""
    title: str
    sections: List[CompiledSectionBase] = field(default_factory=list)
    melody: MelodyBlueprint = field(default_factory=MelodyBlueprint)
    harmony: HarmonyBlueprint = field(default_factory=HarmonyBlueprint)
    metadata: Dict[str, Any] = field(default_factory=dict)
