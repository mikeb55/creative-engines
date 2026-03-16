"""
Population Types — Data structures for population-based composition search.
"""

from dataclasses import dataclass, field
from typing import Any, List


@dataclass
class PopulationCandidate:
    """Single candidate in a population."""
    composition: Any
    score: float
    engine_source: str


@dataclass
class Population:
    """Population of scored candidates."""
    candidates: List[PopulationCandidate] = field(default_factory=list)
    generation_number: int = 0
