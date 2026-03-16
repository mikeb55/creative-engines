"""
Bartók Night Composer IR — Night music: sparse, atmospheric, asymmetric.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple


@dataclass
class MotivicCell:
    """Motivic fragment: intervals, contour, identity."""
    intervals: List[int]
    contour: str = "fragment"
    rhythmic_weight: str = "isolated"
    registral_center: int = 60


@dataclass
class IntervalLanguage:
    """Interval fingerprint: m2, tritone, P4/P5, isolated leaps."""
    primary_intervals: List[int] = field(default_factory=lambda: [1, 6, 5, 7])
    secondary_intervals: List[int] = field(default_factory=lambda: [11, 4])
    avoid_intervals: List[int] = field(default_factory=lambda: [])
    tension_profile: str = "night_music"


@dataclass
class HarmonicField:
    """Harmonic field: nonfunctional, cluster-rich, modal but unstable."""
    centers: List[str] = field(default_factory=lambda: ["C", "F#"])
    motion_type: str = "cluster_field"
    chord_types: List[str] = field(default_factory=lambda: ["cluster", "sus4", "m7"])
    avoid_resolution: bool = True


@dataclass
class PhrasePlan:
    """Phrase structure: irregular, asymmetric."""
    phrase_lengths: List[int] = field(default_factory=lambda: [3, 5, 7, 4])
    total_bars: int = 0
    asymmetry_level: float = 0.9


@dataclass
class ContrastPlan:
    """Section contrast: texture, not harmony."""
    section_contrasts: Dict[str, float] = field(default_factory=dict)
    harmony_shift: str = "texture_shift"
    motif_treatment: str = "fragmented"


@dataclass
class DevelopmentPlan:
    """Motif development: fragmentation, isolation."""
    section_operations: Dict[str, List[str]] = field(default_factory=dict)
    return_transformation: str = "registral_shift"


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
    tempo: int = 60
    key_hint: str = "C"
    part_name: str = "Melody"


@dataclass
class MusicXMLConstraints:
    """MusicXML export constraints."""
    divisions: int = 4
    supported_durations: List[str] = field(default_factory=lambda: ["quarter", "eighth", "half", "whole", "16th"])


@dataclass
class ComposerIR:
    """Bartók night composition intermediate representation."""
    title: str
    seed: int = 0
    tempo_hint: int = 60
    meter_plan: Tuple[int, int] = (4, 4)
    form_plan: str = "atmospheric_sections"
    section_order: List[str] = field(default_factory=lambda: ["primary", "contrast", "return"])
    section_roles: Dict[str, SectionPlan] = field(default_factory=dict)
    motivic_cells: List[MotivicCell] = field(default_factory=list)
    interval_language: IntervalLanguage = field(default_factory=IntervalLanguage)
    harmonic_field: HarmonicField = field(default_factory=HarmonicField)
    harmonic_motion_type: str = "nonfunctional"
    asymmetry_profile: str = "explicit"
    phrase_plan: PhrasePlan = field(default_factory=PhrasePlan)
    registral_plan: Dict[str, int] = field(default_factory=dict)
    contrast_plan: ContrastPlan = field(default_factory=ContrastPlan)
    development_plan: DevelopmentPlan = field(default_factory=DevelopmentPlan)
    cadence_strategy: str = "open"
    export_hints: ExportHints = field(default_factory=ExportHints)
    musicxml_constraints: MusicXMLConstraints = field(default_factory=MusicXMLConstraints)
