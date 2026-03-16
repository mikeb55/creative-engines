"""
Shorter Form Compiled Types — CompiledComposition, CompiledSection, etc.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class CompiledMelodyBlueprint:
    """Melody blueprint: intervals, durations, pitches."""
    intervals: List[int] = field(default_factory=list)
    durations: List[str] = field(default_factory=lambda: ["quarter", "eighth"])
    pitches: List[int] = field(default_factory=list)
    contour: str = "arch"


@dataclass
class CompiledHarmonyPlan:
    """Harmony plan per measure."""
    chords: List[str] = field(default_factory=list)
    centers: List[str] = field(default_factory=list)
    bars_per_chord: int = 2


@dataclass
class CompiledNarrativeArc:
    """Narrative arc metadata."""
    section_roles: Dict[str, str] = field(default_factory=dict)
    transformation_map: Dict[str, str] = field(default_factory=dict)


@dataclass
class CompiledSection:
    """Compiled section."""
    role: str
    bar_count: int = 8
    melody_blueprint: CompiledMelodyBlueprint = field(default_factory=CompiledMelodyBlueprint)
    harmony_plan: CompiledHarmonyPlan = field(default_factory=CompiledHarmonyPlan)
    motif_operation: str = "statement"


@dataclass
class CompiledComposition:
    """Compiled composition — form skeleton."""
    title: str
    sections: List[CompiledSection] = field(default_factory=list)
    narrative_arc: CompiledNarrativeArc = field(default_factory=CompiledNarrativeArc)
    tempo: int = 90
    meter: tuple = (4, 4)
    total_bars: int = 0
