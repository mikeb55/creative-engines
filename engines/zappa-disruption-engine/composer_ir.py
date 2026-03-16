"""
Zappa Disruption Composer IR — Abrupt cuts, interruption, genre-collision.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple


@dataclass
class MotivicCell:
    """Disruption motivic cell: intervals, contour."""
    intervals: List[int]
    contour: str = "jagged"
    rhythmic_weight: str = "cut"
    registral_center: int = 60


@dataclass
class IntervalLanguage:
    """Interval fingerprint: jagged-cut, chromatic-burst, disruption-cell."""
    primary_intervals: List[int] = field(default_factory=lambda: [1, 6, 11, -3])
    secondary_intervals: List[int] = field(default_factory=lambda: [4, 8])
    avoid_intervals: List[int] = field(default_factory=list)
    tension_profile: str = "jagged_cut"


@dataclass
class HarmonicField:
    """Harmonic field: collision-field, altered-shift, abrupt-modal-cut."""
    centers: List[str] = field(default_factory=lambda: ["C", "F#", "Eb"])
    motion_type: str = "collision_field"
    chord_types: List[str] = field(default_factory=lambda: ["7", "m7", "7#11"])


@dataclass
class PhrasePlan:
    phrase_lengths: List[int] = field(default_factory=lambda: [3, 4, 2])
    total_bars: int = 0
    asymmetry_level: float = 0.9


@dataclass
class SectionPlan:
    role: str
    bar_count: int = 4
    phrase_lengths: Optional[List[int]] = None
    harmonic_override: Optional[List[str]] = None
    motif_operation: str = "statement"


@dataclass
class ExportHints:
    tempo: int = 140
    key_hint: str = "C"
    part_name: str = "Melody"


@dataclass
class DevelopmentPlan:
    section_operations: Dict[str, List[str]] = field(default_factory=dict)


@dataclass
class MusicXMLConstraints:
    divisions: int = 4
    supported_durations: List[str] = field(default_factory=lambda: ["quarter", "eighth", "half", "16th"])


@dataclass
class ComposerIR:
    """Zappa Disruption composition IR."""
    title: str
    seed: int = 0
    tempo_hint: int = 140
    meter_plan: Tuple[int, int] = (4, 4)
    form_plan: str = "interruption_form"
    section_order: List[str] = field(default_factory=lambda: ["primary", "cut", "return"])
    section_roles: Dict[str, SectionPlan] = field(default_factory=dict)
    motivic_cells: List[MotivicCell] = field(default_factory=list)
    interval_language: IntervalLanguage = field(default_factory=IntervalLanguage)
    harmonic_field: HarmonicField = field(default_factory=HarmonicField)
    phrase_plan: PhrasePlan = field(default_factory=PhrasePlan)
    registral_plan: Dict[str, int] = field(default_factory=dict)
    development_plan: DevelopmentPlan = field(default_factory=DevelopmentPlan)
    export_hints: ExportHints = field(default_factory=ExportHints)
    musicxml_constraints: MusicXMLConstraints = field(default_factory=MusicXMLConstraints)
