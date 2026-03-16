"""
Compiled Composition Types — Output of section compiler.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List


@dataclass
class CompiledMelodyBlueprint:
    """Melodic blueprint: pitch events, phrase boundaries."""
    events: List[Dict[str, Any]] = field(default_factory=list)
    phrase_boundaries: List[int] = field(default_factory=list)


@dataclass
class CompiledHarmonyPlan:
    """Harmony plan per measure."""
    chords: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class CompiledRhythmicPlan:
    """Rhythmic plan: durations, accents."""
    durations: List[float] = field(default_factory=list)


@dataclass
class CompiledSection:
    """Single compiled section."""
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
class CompiledComposition:
    """Full compiled composition."""
    title: str
    sections: List[CompiledSection] = field(default_factory=list)
    melody: CompiledMelodyBlueprint = field(default_factory=CompiledMelodyBlueprint)
    harmony: CompiledHarmonyPlan = field(default_factory=CompiledHarmonyPlan)
    metadata: Dict[str, Any] = field(default_factory=dict)
