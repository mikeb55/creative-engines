"""
Messiaen Colour Composer IR — Modes of limited transposition, colour-chord, birdsong fragments.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple


@dataclass
class MotivicCell:
    """Colour motivic cell: intervals, contour, registral identity."""
    intervals: List[int]
    contour: str = "birdsong"
    rhythmic_weight: str = "additive"
    registral_center: int = 72


@dataclass
class IntervalLanguage:
    """Interval fingerprint: birdsong, luminous fourths, mode-coloured seconds."""
    primary_intervals: List[int] = field(default_factory=lambda: [5, 2, 6, 12])
    secondary_intervals: List[int] = field(default_factory=lambda: [4, 7, 9])
    avoid_intervals: List[int] = field(default_factory=list)
    tension_profile: str = "birdsong_fragment"


@dataclass
class HarmonicField:
    """Harmonic field: mode-2, mode-3, colour-chord, radiant axis."""
    centers: List[str] = field(default_factory=lambda: ["C", "Eb", "F#"])
    motion_type: str = "mode_2_field"
    chord_types: List[str] = field(default_factory=lambda: ["", "sus2", "add9"])
    mode_transpositions: int = 3


@dataclass
class PhrasePlan:
    """Phrase structure: asymmetric, colour-panel based."""
    phrase_lengths: List[int] = field(default_factory=lambda: [5, 7, 4])
    total_bars: int = 0
    asymmetry_level: float = 0.85


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
    tempo: int = 72
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
    """Messiaen Colour composition IR."""
    title: str
    seed: int = 0
    tempo_hint: int = 72
    meter_plan: Tuple[int, int] = (4, 4)
    form_plan: str = "colour_panels"
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
