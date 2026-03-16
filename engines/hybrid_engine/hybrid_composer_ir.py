"""
Hybrid Composer IR — Multi-engine composition plan.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class HybridComposerIR:
    """Composition plan delegating to multiple engines."""
    primary_engine: str = "wayne_shorter"  # melody
    harmony_engine: str = "barry_harris"   # harmony
    counter_engine: Optional[str] = None    # countermelody
    rhythm_engine: Optional[str] = None    # rhythmic punctuation
    form_plan: str = "compact"
    section_order: List[str] = field(default_factory=lambda: ["primary", "contrast", "return"])
    phrase_plan: List[int] = field(default_factory=lambda: [4, 4, 4, 4])
    development_strategy: str = "integrated"
    title: str = "Untitled"
    seed: int = 0
    tempo_hint: int = 90
    metadata: Dict[str, Any] = field(default_factory=dict)
