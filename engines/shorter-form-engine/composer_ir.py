"""
Shorter Form Composer IR — Modern jazz form intelligence: narrative arcs, asymmetry, transformation.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple


@dataclass
class MotivicCell:
    """Motivic cell: intervals, contour, identity."""
    intervals: List[int]
    contour: str = "arch"
    rhythmic_weight: str = "mixed"
    registral_center: int = 60


@dataclass
class IntervalLanguage:
    """Interval fingerprint: shorter leap, angular modal, tritone axis."""
    primary_intervals: List[int] = field(default_factory=lambda: [3, 5, 7])
    secondary_intervals: List[int] = field(default_factory=lambda: [6, 1])
    avoid_intervals: List[int] = field(default_factory=list)
    tension_profile: str = "shorter_leap"


@dataclass
class HarmonicField:
    """Harmonic field: modal shift, chromatic drift, suspended axis."""
    centers: List[str] = field(default_factory=lambda: ["C", "F", "Eb"])
    motion_type: str = "shorter_modal_shift"
    chord_types: List[str] = field(default_factory=lambda: ["m7", "M7", "sus"])
    avoid_resolution: bool = True


@dataclass
class PhrasePlan:
    """Phrase structure: 5–7, 7–9, 9–11 bars."""
    phrase_lengths: List[int] = field(default_factory=lambda: [5, 7, 9])
    total_bars: int = 0
    asymmetry_level: float = 0.85


@dataclass
class ContrastPlan:
    """Section contrast: harmony shift, motif treatment."""
    section_contrasts: Dict[str, float] = field(default_factory=dict)
    harmony_shift: str = "modal_shift"
    motif_treatment: str = "fragmented"


@dataclass
class DevelopmentPlan:
    """Motif development: operations per section."""
    section_operations: Dict[str, List[str]] = field(default_factory=dict)
    return_transformation: str = "transformed"


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
    tempo: int = 90
    key_hint: str = "C"
    part_name: str = "Form"


@dataclass
class MusicXMLConstraints:
    """MusicXML export constraints."""
    divisions: int = 4
    supported_durations: List[str] = field(default_factory=lambda: ["quarter", "eighth", "half", "whole", "16th"])


@dataclass
class ComposerIR:
    """Shorter form composition intermediate representation — form intelligence only."""
    title: str
    seed: int = 0
    tempo_hint: int = 90
    meter_plan: Tuple[int, int] = (4, 4)
    form_plan: str = "narrative_arc_form"
    section_order: List[str] = field(default_factory=lambda: ["primary", "development", "return"])
    section_roles: Dict[str, SectionPlan] = field(default_factory=dict)
    motivic_cells: List[MotivicCell] = field(default_factory=list)
    interval_language: IntervalLanguage = field(default_factory=IntervalLanguage)
    harmonic_field: HarmonicField = field(default_factory=HarmonicField)
    harmonic_motion_type: str = "ambiguous"
    asymmetry_profile: str = "explicit"
    phrase_plan: PhrasePlan = field(default_factory=PhrasePlan)
    registral_plan: Dict[str, int] = field(default_factory=dict)
    contrast_plan: ContrastPlan = field(default_factory=ContrastPlan)
    development_plan: DevelopmentPlan = field(default_factory=DevelopmentPlan)
    cadence_strategy: str = "open"
    export_hints: ExportHints = field(default_factory=ExportHints)
    musicxml_constraints: MusicXMLConstraints = field(default_factory=MusicXMLConstraints)
    # Shorter-specific
    narrative_arc: Dict[str, str] = field(default_factory=dict)
    section_transformation_map: Dict[str, str] = field(default_factory=dict)
    theme_variation_plan: Dict[str, str] = field(default_factory=dict)
    modular_section_map: Dict[str, List[str]] = field(default_factory=dict)
