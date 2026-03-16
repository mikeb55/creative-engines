"""
Stravinsky Pulse Composer IR — Pulse-cell, accent displacement, block contrast.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple


@dataclass
class MotivicCell:
    """Pulse motivic cell: intervals, contour, rhythmic identity."""
    intervals: List[int]
    contour: str = "pulse"
    rhythmic_weight: str = "block"
    registral_center: int = 60


@dataclass
class IntervalLanguage:
    """Interval fingerprint: pulse-fifth, sharp-second, block-fourth."""
    primary_intervals: List[int] = field(default_factory=lambda: [7, 2, 5])
    secondary_intervals: List[int] = field(default_factory=lambda: [4, 9])
    avoid_intervals: List[int] = field(default_factory=list)
    tension_profile: str = "pulse_fifth"


@dataclass
class HarmonicField:
    """Harmonic field: block-modal, dry-axis, ostinato-center."""
    centers: List[str] = field(default_factory=lambda: ["C", "G", "F"])
    motion_type: str = "block_modal"
    chord_types: List[str] = field(default_factory=lambda: ["", "m", "sus2"])


@dataclass
class PhrasePlan:
    """Phrase structure: asymmetric, block-based."""
    phrase_lengths: List[int] = field(default_factory=lambda: [5, 3, 4])
    total_bars: int = 0
    asymmetry_level: float = 0.8


@dataclass
class SectionPlan:
    """Single section in form."""
    role: str
    bar_count: int = 6
    phrase_lengths: Optional[List[int]] = None
    harmonic_override: Optional[List[str]] = None
    motif_operation: str = "statement"


@dataclass
class ExportHints:
    tempo: int = 120
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
    """Stravinsky Pulse composition IR."""
    title: str
    seed: int = 0
    tempo_hint: int = 120
    meter_plan: Tuple[int, int] = (4, 4)
    form_plan: str = "block_contrast"
    section_order: List[str] = field(default_factory=lambda: ["primary", "contrast", "return"])
    section_roles: Dict[str, SectionPlan] = field(default_factory=dict)
    motivic_cells: List[MotivicCell] = field(default_factory=list)
    interval_language: IntervalLanguage = field(default_factory=IntervalLanguage)
    harmonic_field: HarmonicField = field(default_factory=HarmonicField)
    phrase_plan: PhrasePlan = field(default_factory=PhrasePlan)
    registral_plan: Dict[str, int] = field(default_factory=dict)
    development_plan: DevelopmentPlan = field(default_factory=DevelopmentPlan)
    export_hints: ExportHints = field(default_factory=ExportHints)
    musicxml_constraints: MusicXMLConstraints = field(default_factory=MusicXMLConstraints)
