"""
Ligeti Texture Composer IR — Micropolyphony, cluster clouds, registral swarms.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple


@dataclass
class MotivicCell:
    """Texture cell: intervals, contour, density hint."""
    intervals: List[int]
    contour: str = "cloud"
    rhythmic_weight: str = "suspended"
    registral_center: int = 60


@dataclass
class IntervalLanguage:
    """Interval fingerprint: cluster semitone, micropoly step, swarm fourth."""
    primary_intervals: List[int] = field(default_factory=lambda: [1, 2, 5])
    secondary_intervals: List[int] = field(default_factory=lambda: [3, 4, 6])
    avoid_intervals: List[int] = field(default_factory=list)
    tension_profile: str = "cluster_semitone"


@dataclass
class HarmonicField:
    """Harmonic field: cluster mass, static cloud, chromatic swarm."""
    centers: List[str] = field(default_factory=lambda: ["C", "Db", "Eb"])
    motion_type: str = "cluster_mass"
    chord_types: List[str] = field(default_factory=lambda: ["cluster", "cloud", "swarm"])
    avoid_resolution: bool = True


@dataclass
class PhrasePlan:
    """Phrase structure: 3–5, 5–8, 7–11 bars."""
    phrase_lengths: List[int] = field(default_factory=lambda: [3, 5, 7])
    total_bars: int = 0
    asymmetry_level: float = 0.9


@dataclass
class ContrastPlan:
    """Section contrast: density, texture."""
    section_contrasts: Dict[str, float] = field(default_factory=dict)
    harmony_shift: str = "texture_shift"
    motif_treatment: str = "density_accumulation"


@dataclass
class DevelopmentPlan:
    """Texture development: density, cluster, register operations."""
    section_operations: Dict[str, List[str]] = field(default_factory=dict)
    return_transformation: str = "texture_thinning"


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
    tempo: int = 72
    key_hint: str = "C"
    part_name: str = "Texture"


@dataclass
class MusicXMLConstraints:
    """MusicXML export constraints."""
    divisions: int = 4
    supported_durations: List[str] = field(default_factory=lambda: ["quarter", "eighth", "half", "whole", "16th"])


@dataclass
class ComposerIR:
    """Ligeti-style texture composition intermediate representation."""
    title: str
    seed: int = 0
    tempo_hint: int = 72
    meter_plan: Tuple[int, int] = (4, 4)
    form_plan: str = "density_arc"
    section_order: List[str] = field(default_factory=lambda: ["primary", "contrast", "return"])
    section_roles: Dict[str, SectionPlan] = field(default_factory=dict)
    motivic_cells: List[MotivicCell] = field(default_factory=list)
    interval_language: IntervalLanguage = field(default_factory=IntervalLanguage)
    harmonic_field: HarmonicField = field(default_factory=HarmonicField)
    harmonic_motion_type: str = "static"
    asymmetry_profile: str = "explicit"
    phrase_plan: PhrasePlan = field(default_factory=PhrasePlan)
    registral_plan: Dict[str, int] = field(default_factory=dict)
    contrast_plan: ContrastPlan = field(default_factory=ContrastPlan)
    development_plan: DevelopmentPlan = field(default_factory=DevelopmentPlan)
    cadence_strategy: str = "open"
    export_hints: ExportHints = field(default_factory=ExportHints)
    musicxml_constraints: MusicXMLConstraints = field(default_factory=MusicXMLConstraints)
    # Texture-specific
    texture_plan: Dict[str, str] = field(default_factory=dict)
    density_curve: List[float] = field(default_factory=list)
    cluster_field_type: str = "chromatic_cloud"
    register_cloud_map: Dict[str, List[int]] = field(default_factory=dict)
    micropolyphony_flag: bool = True
    swarm_profile: str = "registral_shimmer"
