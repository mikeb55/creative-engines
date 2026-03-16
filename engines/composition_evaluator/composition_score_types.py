"""
Composition Score Types — 0–10 scoring for compositions.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List


@dataclass
class CompositionScore:
    """Aggregate score for a composition. All scores 0–10."""
    total_score: float = 0.0
    motif_score: float = 0.0
    harmony_score: float = 0.0
    interval_score: float = 0.0
    form_score: float = 0.0
    voice_leading_score: float = 0.0
    asymmetry_score: float = 0.0
    breakdown: Dict[str, float] = field(default_factory=dict)
    style_fit_score: float = 0.0
    base_score: float = 0.0
