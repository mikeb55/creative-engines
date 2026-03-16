"""
Song IR Schema — Minimal typed Song Intermediate Representation.
Deterministic, testable, preserves asymmetry.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class HookDNA:
    """Hook identity: motif, contour, rhythm, title phrase."""
    motif_cell: List[int] = field(default_factory=lambda: [60, 62, 64])
    contour_archetype: str = "arch"
    rhythmic_signature: str = "motif_repeat"
    title_phrase: str = ""
    chorus_melody_idea: List[int] = field(default_factory=lambda: [60, 62, 64, 65, 67])
    energy_level: float = 0.75


@dataclass
class MotifTransform:
    """Motif transformation rule."""
    source_motif: List[int]
    transform_type: str  # "transpose", "invert", "retrograde", "rhythm_vary"
    offset: int = 0


@dataclass
class HarmonicPlan:
    """Harmony plan per section or global."""
    default_progression: List[str] = field(default_factory=lambda: ["C", "Am", "F", "G"])
    section_overrides: Dict[str, List[str]] = field(default_factory=dict)


@dataclass
class ContrastArc:
    """Section energy and contrast plan."""
    section_energies: Dict[str, float] = field(default_factory=dict)
    verse_2_intensify: bool = False
    final_chorus_peak: bool = True


@dataclass
class ExportHints:
    """Export preferences."""
    vocal_target: str = "male_tenor"
    key_center: str = "C"
    tempo: int = 90


@dataclass
class MusicXMLConstraints:
    """MusicXML export constraints."""
    divisions: int = 4
    supported_durations: List[str] = field(default_factory=lambda: ["quarter", "eighth", "half", "whole"])
    lyric_syllabic_required: bool = True
    harmony_as_chord_symbols: bool = True


@dataclass
class SectionIR:
    """Single section in Song IR."""
    role: str  # verse, chorus, prechorus, bridge, outro
    bar_count: int = 8
    phrase_lengths: Optional[List[int]] = None  # beats per phrase, allows asymmetry
    lyric_density: float = 0.7
    title_placement: Optional[str] = None  # "first_line", "last_line", "hook_bar", None


@dataclass
class SongIR:
    """Minimal Song Intermediate Representation."""
    title: str
    premise: str = ""
    seed: int = 0
    form: str = "short"
    section_order: List[str] = field(default_factory=lambda: ["verse", "chorus", "verse", "chorus"])
    section_roles: Dict[str, SectionIR] = field(default_factory=dict)
    hook_dna: HookDNA = field(default_factory=HookDNA)
    motif_transforms: List[MotifTransform] = field(default_factory=list)
    image_family: List[str] = field(default_factory=list)
    lyric_density: float = 0.7
    harmonic_plan: HarmonicPlan = field(default_factory=HarmonicPlan)
    contrast_arc: ContrastArc = field(default_factory=ContrastArc)
    title_placements: Dict[str, str] = field(default_factory=dict)
    export_hints: ExportHints = field(default_factory=ExportHints)
    musicxml_constraints: MusicXMLConstraints = field(default_factory=MusicXMLConstraints)
