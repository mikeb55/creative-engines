"""
Frisell Atmosphere Composer IR — Open harmony, Americana/ambient spaciousness, pedal tones.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple


@dataclass
class MotivicCell:
    """Sparse lyric-like motif: intervals, contour, identity."""
    intervals: List[int]
    contour: str = "open"
    rhythmic_weight: str = "spacious"
    registral_center: int = 60


@dataclass
class IntervalLanguage:
    """Interval fingerprint: open fifths, ambient fourths, folk shadow."""
    primary_intervals: List[int] = field(default_factory=lambda: [5, 7, 4])
    secondary_intervals: List[int] = field(default_factory=lambda: [2, 12])
    avoid_intervals: List[int] = field(default_factory=lambda: [])
    tension_profile: str = "open_fifths"


@dataclass
class HarmonicField:
    """Harmonic field: pedal, open, slow-moving, warm ambiguity."""
    centers: List[str] = field(default_factory=lambda: ["C", "G", "F"])
    motion_type: str = "pedal_field"
    chord_types: List[str] = field(default_factory=lambda: ["sus4", "maj7", "5"])
    avoid_resolution: bool = True


@dataclass
class PhrasePlan:
    """Phrase structure: asymmetric, spacious."""
    phrase_lengths: List[int] = field(default_factory=lambda: [5, 7, 6])
    total_bars: int = 0
    asymmetry_level: float = 0.8


@dataclass
class ContrastPlan:
    """Section contrast: texture, registral drift."""
    section_contrasts: Dict[str, float] = field(default_factory=dict)
    harmony_shift: str = "registral_drift"
    motif_treatment: str = "echo"


@dataclass
class DevelopmentPlan:
    """Motif development: echo, silence spacing."""
    section_operations: Dict[str, List[str]] = field(default_factory=dict)
    return_transformation: str = "harmonic_shadow"


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
    tempo: int = 66
    key_hint: str = "C"
    part_name: str = "Melody"


@dataclass
class MusicXMLConstraints:
    """MusicXML export constraints."""
    divisions: int = 4
    supported_durations: List[str] = field(default_factory=lambda: ["quarter", "half", "eighth", "whole", "16th"])


@dataclass
class ComposerIR:
    """Frisell atmosphere composition intermediate representation."""
    title: str
    seed: int = 0
    tempo_hint: int = 66
    meter_plan: Tuple[int, int] = (4, 4)
    form_plan: str = "open_songform"
    section_order: List[str] = field(default_factory=lambda: ["primary", "contrast", "return"])
    section_roles: Dict[str, SectionPlan] = field(default_factory=dict)
    motivic_cells: List[MotivicCell] = field(default_factory=list)
    interval_language: IntervalLanguage = field(default_factory=IntervalLanguage)
    harmonic_field: HarmonicField = field(default_factory=HarmonicField)
    harmonic_motion_type: str = "pedal"
    asymmetry_profile: str = "explicit"
    phrase_plan: PhrasePlan = field(default_factory=PhrasePlan)
    registral_plan: Dict[str, int] = field(default_factory=dict)
    contrast_plan: ContrastPlan = field(default_factory=ContrastPlan)
    development_plan: DevelopmentPlan = field(default_factory=DevelopmentPlan)
    cadence_strategy: str = "open"
    export_hints: ExportHints = field(default_factory=ExportHints)
    musicxml_constraints: MusicXMLConstraints = field(default_factory=MusicXMLConstraints)
