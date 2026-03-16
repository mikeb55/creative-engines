"""
Composer IR — Typed instrumental composition intermediate representation.
Monk: angular shapes, rhythmic displacement, off-beat accents, blues-inflected, unexpected pauses.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple


@dataclass
class MotivicCell:
    intervals: List[int]
    contour: str = "angular"
    rhythmic_weight: str = "offbeat"
    registral_center: int = 60


@dataclass
class IntervalLanguage:
    primary_intervals: List[int] = field(default_factory=lambda: [6, 1, 5])  # tritone, m2, 4th
    secondary_intervals: List[int] = field(default_factory=lambda: [7, 11, 0])  # 5th, M7, repeat
    avoid_intervals: List[int] = field(default_factory=lambda: [])
    tension_profile: str = "angular"


@dataclass
class HarmonicField:
    centers: List[str] = field(default_factory=lambda: ["C", "Eb", "F"])
    motion_type: str = "blues_shadowed"
    chord_types: List[str] = field(default_factory=lambda: ["7", "m7", "7alt"])
    avoid_resolution: bool = True


@dataclass
class PhrasePlan:
    phrase_lengths: List[int] = field(default_factory=lambda: [4, 5, 4, 4])
    total_bars: int = 0
    asymmetry_level: float = 0.6


@dataclass
class ContrastPlan:
    section_contrasts: Dict[str, float] = field(default_factory=dict)
    harmony_shift: str = "chromatic_shift"
    motif_treatment: str = "displaced"


@dataclass
class DevelopmentPlan:
    section_operations: Dict[str, List[str]] = field(default_factory=dict)
    return_transformation: str = "repetition"


@dataclass
class SectionPlan:
    role: str
    bar_count: int = 8
    phrase_lengths: Optional[List[int]] = None
    harmonic_override: Optional[List[str]] = None
    motif_operation: str = "statement"


@dataclass
class ExportHints:
    tempo: int = 120
    key_hint: str = "C"
    part_name: str = "Melody"


@dataclass
class MusicXMLConstraints:
    divisions: int = 4
    supported_durations: List[str] = field(default_factory=lambda: ["quarter", "eighth", "half", "whole", "16th"])


@dataclass
class ComposerIR:
    title: str
    seed: int = 0
    tempo_hint: int = 120
    meter_plan: Tuple[int, int] = (4, 4)
    form_plan: str = "compact"
    section_order: List[str] = field(default_factory=lambda: ["primary", "contrast", "return"])
    section_roles: Dict[str, SectionPlan] = field(default_factory=dict)
    motivic_cells: List[MotivicCell] = field(default_factory=list)
    interval_language: IntervalLanguage = field(default_factory=IntervalLanguage)
    harmonic_field: HarmonicField = field(default_factory=HarmonicField)
    harmonic_motion_type: str = "blues_shadowed"
    asymmetry_profile: str = "explicit"
    phrase_plan: PhrasePlan = field(default_factory=PhrasePlan)
    registral_plan: Dict[str, int] = field(default_factory=dict)
    contrast_plan: ContrastPlan = field(default_factory=ContrastPlan)
    development_plan: DevelopmentPlan = field(default_factory=DevelopmentPlan)
    cadence_strategy: str = "open"
    export_hints: ExportHints = field(default_factory=ExportHints)
    musicxml_constraints: MusicXMLConstraints = field(default_factory=MusicXMLConstraints)
