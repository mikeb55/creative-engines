"""
Big Band Composer IR — Modern big band: sectional, layered, shout-capable.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple


@dataclass
class MotivicCell:
    """Sectional motivic cell: intervals, contour, section role."""
    intervals: List[int]
    contour: str = "sectional"
    rhythmic_weight: str = "ensemble"
    registral_center: int = 60


@dataclass
class IntervalLanguage:
    """Interval fingerprint: brass punch, sax counterline, shout leap."""
    primary_intervals: List[int] = field(default_factory=lambda: [5, 7, 12, 4])
    secondary_intervals: List[int] = field(default_factory=lambda: [2, 3, 9])
    avoid_intervals: List[int] = field(default_factory=list)
    tension_profile: str = "brass_punch"


@dataclass
class HarmonicField:
    """Harmonic field: modern big band modal, layered chromatic."""
    centers: List[str] = field(default_factory=lambda: ["C", "F", "Bb"])
    motion_type: str = "modern_big_band_modal"
    chord_types: List[str] = field(default_factory=lambda: ["7", "m7", "maj7"])
    avoid_resolution: bool = False


@dataclass
class PhrasePlan:
    """Phrase structure: asymmetrical, 5–7, 7–9, 9–13."""
    phrase_lengths: List[int] = field(default_factory=lambda: [5, 7, 9])
    total_bars: int = 0
    asymmetry_level: float = 0.85


@dataclass
class ContrastPlan:
    """Section contrast: density, texture."""
    section_contrasts: Dict[str, float] = field(default_factory=dict)
    harmony_shift: str = "sectional_shift"
    motif_treatment: str = "sectional_transfer"


@dataclass
class DevelopmentPlan:
    """Motif development: sectional operations."""
    section_operations: Dict[str, List[str]] = field(default_factory=dict)
    return_transformation: str = "density_growth"


@dataclass
class SectionPlan:
    """Single section in form."""
    role: str
    bar_count: int = 8
    phrase_lengths: Optional[List[int]] = None
    harmonic_override: Optional[List[str]] = None
    motif_operation: str = "statement"


@dataclass
class ExportHints:
    """Export preferences."""
    tempo: int = 120
    key_hint: str = "Bb"
    part_name: str = "Lead"


@dataclass
class MusicXMLConstraints:
    """MusicXML export constraints."""
    divisions: int = 4
    supported_durations: List[str] = field(default_factory=lambda: ["quarter", "eighth", "half", "whole", "16th"])


@dataclass
class ComposerIR:
    """Big band composition intermediate representation."""
    title: str
    seed: int = 0
    tempo_hint: int = 120
    meter_plan: Tuple[int, int] = (4, 4)
    form_plan: str = "chart_arc"
    section_order: List[str] = field(default_factory=lambda: ["primary", "contrast", "shout", "return"])
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
    # Big band specific
    sectional_roles: Dict[str, str] = field(default_factory=dict)
    density_plan: Dict[str, float] = field(default_factory=dict)
    brass_punch_plan: Dict[str, List[int]] = field(default_factory=dict)
    sax_texture_plan: Dict[str, str] = field(default_factory=dict)
    rhythm_section_plan: Dict[str, str] = field(default_factory=dict)
    shout_chorus_flag: bool = False
