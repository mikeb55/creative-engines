"""
Style Profile Types — Compact fingerprints for engine style identity.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List


@dataclass
class StyleProfile:
    """Aggregated style fingerprint for a composer engine."""
    engine_name: str
    interval_fingerprint: Dict[str, float] = field(default_factory=dict)
    harmonic_fingerprint: Dict[str, float] = field(default_factory=dict)
    motif_fingerprint: Dict[str, float] = field(default_factory=dict)
    form_fingerprint: Dict[str, float] = field(default_factory=dict)
    rhythm_fingerprint: Dict[str, float] = field(default_factory=dict)
    asymmetry_fingerprint: Dict[str, float] = field(default_factory=dict)
