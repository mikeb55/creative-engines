"""
Wheeler Lyric Composer IR — Long-arc lyrical melody, suspended harmony, chamber-jazz.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple


@dataclass
class MotivicCell:
    """Lyrical motivic cell: intervals, contour, identity."""
    intervals: List[int]
    contour: str = "arc"
    rhythmic_weight: str = "lyrical"
    registral_center: int = 60


@dataclass
class IntervalLanguage:
    """Interval fingerprint: 4ths, 5ths, 6ths, 9th-like, wide but singable."""
    primary_intervals: List[int] = field(default_factory=lambda: [5, 7, 9, 4])
    secondary_intervals: List[int] = field(default_factory=lambda: [2, 3])
    avoid_intervals: List[int] = field(default_factory=lambda: [])
    lyric_profile: str = "lyrical_wide"


@dataclass
class HarmonicField:
    """Harmonic field: suspended, spacious, nonfunctional but warm."""
    centers: List[str] = field(default_factory=lambda: ["C", "F", "G"])
    motion_type: str = "suspended_lyric"
    chord_types: List[str] = field(default_factory=lambda: ["sus4", "maj7", "sus2"])
    avoid_resolution: bool = True


@dataclass
class PhrasePlan:
    """Phrase structure: long arc, asymmetric."""
    phrase_lengths: List[int] = field(default_factory=lambda: [5, 7, 9])
    total_bars: int = 0
    asymmetry_level: float = 0.85


@dataclass
class ContrastPlan:
    """Section contrast: emotional lift, transformed return."""
    section_contrasts: Dict[str, float] = field(default_factory=dict)
    harmony_shift: str = "registral_lift"
    motif_treatment: str = "elongation"


@dataclass
class DevelopmentPlan:
    """Motif development: elongation, lyrical transformation."""
    section_operations: Dict[str, List[str]] = field(default_factory=dict)
    return_transformation: str = "return_variation"


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
    tempo: int = 72
    key_hint: str = "C"
    part_name: str = "Melody"


@dataclass
class MusicXMLConstraints:
    """MusicXML export constraints."""
    divisions: int = 4
    supported_durations: List[str] = field(default_factory=lambda: ["quarter", "half", "eighth", "whole", "16th"])


@dataclass
class ComposerIR:
    """Wheeler lyric composition intermediate representation."""
    title: str
    seed: int = 0
    tempo_hint: int = 72
    meter_plan: Tuple[int, int] = (4, 4)
    form_plan: str = "lyrical_songform"
    section_order: List[str] = field(default_factory=lambda: ["primary", "contrast", "return"])
    section_roles: Dict[str, SectionPlan] = field(default_factory=dict)
    motivic_cells: List[MotivicCell] = field(default_factory=list)
    interval_language: IntervalLanguage = field(default_factory=IntervalLanguage)
    harmonic_field: HarmonicField = field(default_factory=HarmonicField)
    harmonic_motion_type: str = "suspended"
    asymmetry_profile: str = "explicit"
    phrase_plan: PhrasePlan = field(default_factory=PhrasePlan)
    registral_plan: Dict[str, int] = field(default_factory=dict)
    contrast_plan: ContrastPlan = field(default_factory=ContrastPlan)
    development_plan: DevelopmentPlan = field(default_factory=DevelopmentPlan)
    cadence_strategy: str = "open"
    export_hints: ExportHints = field(default_factory=ExportHints)
    musicxml_constraints: MusicXMLConstraints = field(default_factory=MusicXMLConstraints)
