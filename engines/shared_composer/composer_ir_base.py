"""
Composer IR Base — Minimal shared fields common to all engines.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Tuple


@dataclass
class PhrasePlanBase:
    """Shared phrase structure."""
    phrase_lengths: List[int] = field(default_factory=lambda: [4, 4])
    total_bars: int = 0
    asymmetry_level: float = 0.5


@dataclass
class ExportHintsBase:
    """Shared export preferences."""
    tempo: int = 90
    key_hint: str = "C"
    part_name: str = "Melody"


@dataclass
class MusicXMLConstraintsBase:
    """Shared MusicXML constraints."""
    divisions: int = 4
    supported_durations: List[str] = field(default_factory=lambda: ["quarter", "eighth", "half", "whole", "16th"])


@dataclass
class ComposerIRBase:
    """Minimal shared IR fields. Engine IRs expose these via duck typing or inheritance."""
    title: str
    seed: int = 0
    tempo_hint: int = 90
    meter_plan: Tuple[int, int] = (4, 4)
    form_plan: str = ""
    section_order: List[str] = field(default_factory=list)
    phrase_plan: PhrasePlanBase = field(default_factory=PhrasePlanBase)
    export_hints: ExportHintsBase = field(default_factory=ExportHintsBase)
    musicxml_constraints: MusicXMLConstraintsBase = field(default_factory=MusicXMLConstraintsBase)
