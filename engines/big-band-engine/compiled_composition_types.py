"""
Big Band Compiled Composition Types — Output of section compiler.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List


@dataclass
class CompiledMelodyBlueprint:
    events: List[Dict[str, Any]] = field(default_factory=list)
    phrase_boundaries: List[int] = field(default_factory=list)


@dataclass
class CompiledHarmonyPlan:
    chords: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class CompiledRhythmicPlan:
    """Per-section rhythm support: comp, sparse, shout styles."""
    section_plans: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    global_style: str = "comp"


@dataclass
class CompiledSection:
    section_id: str
    role: str
    bar_start: int
    bar_end: int
    melody_events: List[Dict[str, Any]] = field(default_factory=list)
    harmony: List[Dict[str, Any]] = field(default_factory=list)
    phrase_lengths: List[int] = field(default_factory=list)
    motif_refs: List[str] = field(default_factory=list)
    register_hint: int = 60
    sax_support_events: List[Dict[str, Any]] = field(default_factory=list)
    brass_support_events: List[Dict[str, Any]] = field(default_factory=list)
    rhythm_section_plan: Dict[str, Any] = field(default_factory=dict)


@dataclass
class CompiledComposition:
    title: str
    sections: List[CompiledSection] = field(default_factory=list)
    melody: CompiledMelodyBlueprint = field(default_factory=CompiledMelodyBlueprint)
    harmony: CompiledHarmonyPlan = field(default_factory=CompiledHarmonyPlan)
    rhythmic_plan: CompiledRhythmicPlan = field(default_factory=CompiledRhythmicPlan)
    metadata: Dict[str, Any] = field(default_factory=dict)
