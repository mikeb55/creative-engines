"""
Composer IR — Typed instrumental composition intermediate representation.
Asymmetry, intervallic identity, harmonic ambiguity are explicit.
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
    """Interval fingerprint: preferred intervals, tension profile."""
    primary_intervals: List[int] = field(default_factory=lambda: [2, 5, 7])  # 2nd, 4th, 5th
    secondary_intervals: List[int] = field(default_factory=lambda: [6, 1])  # tritone, minor 2nd
    avoid_intervals: List[int] = field(default_factory=lambda: [])
    tension_profile: str = "balanced"  # balanced, angular, lyrical_ambiguous, quartal_colored


@dataclass
class HarmonicField:
    """Harmonic field: centers, motion type, ambiguity."""
    centers: List[str] = field(default_factory=lambda: ["C", "F"])
    motion_type: str = "ambiguous"  # ambiguous_modal, nonfunctional_cycle, blues_shadowed
    chord_types: List[str] = field(default_factory=lambda: ["m7", "M7", "sus"])
    avoid_resolution: bool = True


@dataclass
class PhrasePlan:
    """Phrase structure: bar counts per phrase, asymmetry explicit."""
    phrase_lengths: List[int] = field(default_factory=lambda: [4, 5, 4, 6])  # bars
    total_bars: int = 0  # derived if 0
    asymmetry_level: float = 0.7


@dataclass
class ContrastPlan:
    """Section contrast: energy, harmony shift, motif treatment."""
    section_contrasts: Dict[str, float] = field(default_factory=dict)
    harmony_shift: str = "modal_shift"  # modal_shift, key_shift, color_shift
    motif_treatment: str = "fragmented"  # fragmented, inverted, transposed


@dataclass
class DevelopmentPlan:
    """Motif development: operations per section."""
    section_operations: Dict[str, List[str]] = field(default_factory=dict)
    return_transformation: str = "transposed"  # transposed, fragmented, inverted


@dataclass
class SectionPlan:
    """Single section in form."""
    role: str  # primary, contrast, return, intro, coda
    bar_count: int = 8
    phrase_lengths: Optional[List[int]] = None
    harmonic_override: Optional[List[str]] = None
    motif_operation: str = "statement"


@dataclass
class ExportHints:
    """Export preferences."""
    tempo: int = 90
    key_hint: str = "C"
    part_name: str = "Melody"


@dataclass
class MusicXMLConstraints:
    """MusicXML export constraints."""
    divisions: int = 4
    supported_durations: List[str] = field(default_factory=lambda: ["quarter", "eighth", "half", "whole", "16th"])


@dataclass
class ComposerIR:
    """Instrumental composition intermediate representation."""
    title: str
    seed: int = 0
    tempo_hint: int = 90
    meter_plan: Tuple[int, int] = (4, 4)
    form_plan: str = "aba"
    section_order: List[str] = field(default_factory=lambda: ["primary", "contrast", "return"])
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
    cadence_strategy: str = "open"  # open, deferred, ambiguous
    export_hints: ExportHints = field(default_factory=ExportHints)
    musicxml_constraints: MusicXMLConstraints = field(default_factory=MusicXMLConstraints)
