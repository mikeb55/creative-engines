"""
Scofield Holland Composer IR — Groove-led modern jazz, chromatic riff, blues/funk hybrid.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple


@dataclass
class MotivicCell:
    """Groove riff cell: intervals, contour, rhythmic identity."""
    intervals: List[int]
    contour: str = "groove"
    rhythmic_weight: str = "pocket"
    registral_center: int = 60
    repeat_count: int = 1


@dataclass
class IntervalLanguage:
    """Interval fingerprint: chromatic riff, blues-modern, groove cell."""
    primary_intervals: List[int] = field(default_factory=lambda: [1, 4, 6, -1])
    secondary_intervals: List[int] = field(default_factory=lambda: [5, 7, 2])
    avoid_intervals: List[int] = field(default_factory=list)
    tension_profile: str = "chromatic_riff"


@dataclass
class HarmonicField:
    """Harmonic field: funk-blues, chromatic dominant, bass-axis."""
    centers: List[str] = field(default_factory=lambda: ["C", "F", "G"])
    motion_type: str = "funk_blues_modern"
    chord_types: List[str] = field(default_factory=lambda: ["7", "m7", "7sus"])
    bass_axis: bool = True
    avoid_resolution: bool = False  # compatibility


@dataclass
class PhrasePlan:
    """Phrase structure: asymmetric, pocket-based."""
    phrase_lengths: List[int] = field(default_factory=lambda: [6, 7, 8])
    total_bars: int = 0
    asymmetry_level: float = 0.7


@dataclass
class SectionPlan:
    """Single section in form."""
    role: str
    bar_count: int = 7
    phrase_lengths: Optional[List[int]] = None
    harmonic_override: Optional[List[str]] = None
    motif_operation: str = "statement"


@dataclass
class ExportHints:
    """Export preferences."""
    tempo: int = 100
    key_hint: str = "C"
    part_name: str = "Melody"


@dataclass
class DevelopmentPlan:
    """Motif development per section."""
    section_operations: Dict[str, List[str]] = field(default_factory=dict)


@dataclass
class MusicXMLConstraints:
    """MusicXML export constraints."""
    divisions: int = 4
    supported_durations: List[str] = field(default_factory=lambda: ["quarter", "eighth", "half", "16th"])


@dataclass
class ComposerIR:
    """Scofield Holland composition intermediate representation."""
    title: str
    seed: int = 0
    tempo_hint: int = 100
    meter_plan: Tuple[int, int] = (4, 4)
    form_plan: str = "groove_head_form"
    section_order: List[str] = field(default_factory=lambda: ["primary", "contrast", "return"])
    section_roles: Dict[str, SectionPlan] = field(default_factory=dict)
    motivic_cells: List[MotivicCell] = field(default_factory=list)
    interval_language: IntervalLanguage = field(default_factory=IntervalLanguage)
    harmonic_field: HarmonicField = field(default_factory=HarmonicField)
    harmonic_motion_type: str = "groove"
    asymmetry_profile: str = "pocket"
    phrase_plan: PhrasePlan = field(default_factory=PhrasePlan)
    registral_plan: Dict[str, int] = field(default_factory=dict)
    development_plan: DevelopmentPlan = field(default_factory=DevelopmentPlan)
    cadence_strategy: str = "groove_resolution"
    export_hints: ExportHints = field(default_factory=ExportHints)
    musicxml_constraints: MusicXMLConstraints = field(default_factory=MusicXMLConstraints)
