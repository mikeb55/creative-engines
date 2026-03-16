"""
Instrument Profiles — Ensemble definitions with ranges, roles, density constraints.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class InstrumentSpec:
    """Single instrument in an ensemble."""
    name: str
    midi_low: int
    midi_high: int
    preferred_role: str  # melody, harmony, bass, counterline, pad
    density_weight: float = 1.0


@dataclass
class EnsembleProfile:
    """Profile for an ensemble type."""
    ensemble_type: str
    instruments: List[InstrumentSpec]
    max_low_register_density: float = 0.6
    min_spacing_semitones: int = 3
    preferred_texture: str = "chamber"


STRING_QUARTET = EnsembleProfile(
    ensemble_type="string_quartet",
    instruments=[
        InstrumentSpec("Violin I", 55, 88, "melody", 1.0),
        InstrumentSpec("Violin II", 55, 84, "harmony", 0.9),
        InstrumentSpec("Viola", 48, 76, "harmony", 0.85),
        InstrumentSpec("Cello", 36, 72, "bass", 0.9),
    ],
    max_low_register_density=0.5,
    min_spacing_semitones=4,
    preferred_texture="polyphonic chamber",
)

CHAMBER_JAZZ_QUINTET = EnsembleProfile(
    ensemble_type="chamber_jazz_quintet",
    instruments=[
        InstrumentSpec("Trumpet", 58, 81, "melody", 1.0),
        InstrumentSpec("Alto Sax", 49, 81, "melody", 0.95),
        InstrumentSpec("Piano", 21, 108, "harmony", 0.8),
        InstrumentSpec("Bass", 28, 55, "bass", 0.9),
        InstrumentSpec("Drums", 35, 81, "rhythm", 0.7),
    ],
    max_low_register_density=0.55,
    min_spacing_semitones=3,
    preferred_texture="melody + pad",
)

CHAMBER_JAZZ_SEXTET = EnsembleProfile(
    ensemble_type="chamber_jazz_sextet",
    instruments=[
        InstrumentSpec("Trumpet", 58, 81, "melody", 1.0),
        InstrumentSpec("Alto Sax", 49, 81, "melody", 0.95),
        InstrumentSpec("Tenor Sax", 40, 76, "counterline", 0.9),
        InstrumentSpec("Piano", 21, 108, "harmony", 0.8),
        InstrumentSpec("Bass", 28, 55, "bass", 0.9),
        InstrumentSpec("Drums", 35, 81, "rhythm", 0.7),
    ],
    max_low_register_density=0.5,
    min_spacing_semitones=3,
    preferred_texture="melody + counterline",
)

BIG_BAND_BASIC = EnsembleProfile(
    ensemble_type="big_band_basic",
    instruments=[
        InstrumentSpec("Lead Trumpet", 58, 88, "melody", 1.0),
        InstrumentSpec("Trumpet 2", 55, 81, "harmony", 0.8),
        InstrumentSpec("Trumpet 3", 55, 76, "harmony", 0.75),
        InstrumentSpec("Alto 1", 49, 81, "melody", 0.9),
        InstrumentSpec("Alto 2", 49, 76, "harmony", 0.8),
        InstrumentSpec("Tenor 1", 40, 76, "counterline", 0.85),
        InstrumentSpec("Tenor 2", 40, 72, "harmony", 0.75),
        InstrumentSpec("Bari Sax", 28, 60, "bass", 0.8),
        InstrumentSpec("Piano", 21, 108, "harmony", 0.7),
        InstrumentSpec("Bass", 28, 55, "bass", 0.9),
        InstrumentSpec("Drums", 35, 81, "rhythm", 0.6),
    ],
    max_low_register_density=0.45,
    min_spacing_semitones=2,
    preferred_texture="sectional spread",
)

GUITAR_TRIO = EnsembleProfile(
    ensemble_type="guitar_trio",
    instruments=[
        InstrumentSpec("Lead Guitar", 40, 88, "melody", 1.0),
        InstrumentSpec("Rhythm Guitar", 40, 76, "harmony", 0.85),
        InstrumentSpec("Bass Guitar", 28, 55, "bass", 0.9),
    ],
    max_low_register_density=0.6,
    min_spacing_semitones=4,
    preferred_texture="melody + pad",
)

GUITAR_STRING_QUARTET = EnsembleProfile(
    ensemble_type="guitar_string_quartet",
    instruments=[
        InstrumentSpec("Guitar I", 40, 88, "melody", 1.0),
        InstrumentSpec("Guitar II", 40, 76, "harmony", 0.9),
        InstrumentSpec("Guitar III", 36, 72, "harmony", 0.85),
        InstrumentSpec("Bass Guitar", 28, 55, "bass", 0.9),
    ],
    max_low_register_density=0.5,
    min_spacing_semitones=4,
    preferred_texture="polyphonic chamber",
)

ENSEMBLE_PROFILES: Dict[str, EnsembleProfile] = {
    "string_quartet": STRING_QUARTET,
    "chamber_jazz_quintet": CHAMBER_JAZZ_QUINTET,
    "chamber_jazz_sextet": CHAMBER_JAZZ_SEXTET,
    "big_band_basic": BIG_BAND_BASIC,
    "guitar_trio": GUITAR_TRIO,
    "guitar_string_quartet": GUITAR_STRING_QUARTET,
}


def get_ensemble_profile(ensemble_type: str) -> Optional[EnsembleProfile]:
    """Return profile for ensemble type or None."""
    return ENSEMBLE_PROFILES.get(ensemble_type)
