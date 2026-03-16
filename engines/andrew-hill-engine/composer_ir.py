"""
Composer IR — Typed instrumental composition intermediate representation.
Andrew Hill: angular, intervallic, cluster harmonies, irregular forms.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple


@dataclass
class MotivicCell:
    intervals: List[int]
    contour: str = "angular"
    rhythmic_weight: str = "displaced"
    registral_center: int = 60


@dataclass
class IntervalLanguage:
    primary_intervals: List[int] = field(default_factory=lambda: [6, 11, 1])  # tritone, M7, m2
    secondary_intervals: List[int] = field(default_factory=lambda: [5, 7, 10])
    avoid_intervals: List[int] = field(default_factory=lambda: [])
    tension_profile: str = "angular"


@dataclass
class HarmonicField:
    centers: List[str] = field(default_factory=lambda: ["C", "F#"])
    motion_type: str = "cluster_based"
    chord_types: List[str] = field(default_factory=lambda: ["cluster", "m7", "sus"])
    avoid_resolution: bool = True


@dataclass
class PhrasePlan:
    phrase_lengths: List[int] = field(default_factory=lambda: [5, 7, 5])
    total_bars: int = 0
    asymmetry_level: float = 0.8


@dataclass
class ContrastPlan:
    section_contrasts: Dict[str, float] = field(default_factory=dict)
    harmony_shift: str = "modal_shift"
    motif_treatment: str = "fragmented"


@dataclass
class DevelopmentPlan:
    section_operations: Dict[str, List[str]] = field(default_factory=dict)
    return_transformation: str = "displaced"


@dataclass
class SectionPlan:
    role: str
    bar_count: int = 8
    phrase_lengths: Optional[List[int]] = None
    harmonic_override: Optional[List[str]] = None
    motif_operation: str = "statement"


@dataclass
class ExportHints:
    tempo: int = 90
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
    tempo_hint: int = 90
    meter_plan: Tuple[int, int] = (4, 4)
    form_plan: str = "irregular"
    section_order: List[str] = field(default_factory=lambda: ["primary", "contrast", "return"])
    section_roles: Dict[str, SectionPlan] = field(default_factory=dict)
    motivic_cells: List[MotivicCell] = field(default_factory=list)
    interval_language: IntervalLanguage = field(default_factory=IntervalLanguage)
    harmonic_field: HarmonicField = field(default_factory=HarmonicField)
    harmonic_motion_type: str = "cluster_based"
    asymmetry_profile: str = "explicit"
    phrase_plan: PhrasePlan = field(default_factory=PhrasePlan)
    registral_plan: Dict[str, int] = field(default_factory=dict)
    contrast_plan: ContrastPlan = field(default_factory=ContrastPlan)
    development_plan: DevelopmentPlan = field(default_factory=DevelopmentPlan)
    cadence_strategy: str = "open"
    export_hints: ExportHints = field(default_factory=ExportHints)
    musicxml_constraints: MusicXMLConstraints = field(default_factory=MusicXMLConstraints)
