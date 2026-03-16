"""
Composer IR — Typed instrumental composition intermediate representation.
Barry Harris: 6th diminished, bebop logic, voice-leading.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple


@dataclass
class MotivicCell:
    """Motivic cell: intervals, contour, identity."""
    intervals: List[int]  # semitones
    contour: str = "arch"  # arch, descent, ascent, wave
    rhythmic_weight: str = "mixed"  # onbeat, offbeat, mixed
    registral_center: int = 60  # MIDI


@dataclass
class IntervalLanguage:
    """Interval fingerprint: step motion, chromatic enclosure."""
    primary_intervals: List[int] = field(default_factory=lambda: [1, 2, -1, -2])  # step, enclosure
    secondary_intervals: List[int] = field(default_factory=lambda: [3, 4, 7])  # thirds, fourths
    avoid_intervals: List[int] = field(default_factory=lambda: [])
    tension_profile: str = "bebop_step"  # bebop_step, enclosure_heavy, scalar_embellish


@dataclass
class HarmonicField:
    """Harmonic field: 6th diminished, tonic/dominant conversion."""
    centers: List[str] = field(default_factory=lambda: ["C", "G"])
    motion_type: str = "major6_dim"  # major6_dim, minor6_dim, dominant_dim, minor_conversion
    chord_types: List[str] = field(default_factory=lambda: ["6", "dim7", "m6"])
    avoid_resolution: bool = False  # BH favors resolution via voice-leading


@dataclass
class PhrasePlan:
    """Phrase structure: 8 or 16 bar cycles."""
    phrase_lengths: List[int] = field(default_factory=lambda: [4, 4, 4, 4])
    total_bars: int = 0
    asymmetry_level: float = 0.3  # BH favors symmetry in form


@dataclass
class ContrastPlan:
    """Section contrast."""
    section_contrasts: Dict[str, float] = field(default_factory=dict)
    harmony_shift: str = "modal_shift"
    motif_treatment: str = "embellished"


@dataclass
class DevelopmentPlan:
    """Motif development: bebop cells, enclosure."""
    section_operations: Dict[str, List[str]] = field(default_factory=dict)
    return_transformation: str = "embellished"


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
    tempo: int = 180
    key_hint: str = "C"
    part_name: str = "Melody"


@dataclass
class MusicXMLConstraints:
    """MusicXML export constraints."""
    divisions: int = 4
    supported_durations: List[str] = field(default_factory=lambda: ["quarter", "eighth", "half", "whole", "16th"])


@dataclass
class ComposerIR:
    """Instrumental composition IR."""
    title: str
    seed: int = 0
    tempo_hint: int = 180
    meter_plan: Tuple[int, int] = (4, 4)
    form_plan: str = "aaba"
    section_order: List[str] = field(default_factory=lambda: ["primary", "contrast", "return"])
    section_roles: Dict[str, SectionPlan] = field(default_factory=dict)
    motivic_cells: List[MotivicCell] = field(default_factory=list)
    interval_language: IntervalLanguage = field(default_factory=IntervalLanguage)
    harmonic_field: HarmonicField = field(default_factory=HarmonicField)
    harmonic_motion_type: str = "major6_dim"
    asymmetry_profile: str = "explicit"
    phrase_plan: PhrasePlan = field(default_factory=PhrasePlan)
    registral_plan: Dict[str, int] = field(default_factory=dict)
    contrast_plan: ContrastPlan = field(default_factory=ContrastPlan)
    development_plan: DevelopmentPlan = field(default_factory=DevelopmentPlan)
    cadence_strategy: str = "resolved"  # BH: resolved, voice-led
    export_hints: ExportHints = field(default_factory=ExportHints)
    musicxml_constraints: MusicXMLConstraints = field(default_factory=MusicXMLConstraints)
