"""
Hybrid Candidate Types — Data structures for hybrid composition search.
"""

from dataclasses import dataclass, field
from typing import Any, List, Optional


@dataclass
class HybridCandidate:
    """Single hybrid composition candidate."""
    hybrid_ir: Any
    compiled_result: Any
    base_score: float
    style_fit_score: float
    adjusted_score: float
    melody_engine: str
    harmony_engine: str
    counter_engine: Optional[str] = None
    rhythm_engine: Optional[str] = None


@dataclass
class HybridPopulation:
    """Population of hybrid candidates."""
    candidates: List[HybridCandidate] = field(default_factory=list)
    generation_number: int = 0
