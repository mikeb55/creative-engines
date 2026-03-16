"""
Hybrid Composer IR — Multi-engine composition plan.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class HybridComposerIR:
    """Composition plan delegating to multiple engines. Counterpoint-capable."""
    primary_engine: str = "wayne_shorter"  # melody / lead
    harmony_engine: str = "barry_harris"   # harmony
    counter_engine: Optional[str] = None    # countermelody
    rhythm_engine: Optional[str] = None    # rhythmic punctuation
    voice_count: int = 2
    voice_roles: Dict[str, str] = field(default_factory=dict)
    counterpoint_density: float = 0.5
    texture_strategy: str = "complementary"
    form_plan: str = "compact"
    section_order: List[str] = field(default_factory=lambda: ["primary", "contrast", "return"])
    phrase_plan: List[int] = field(default_factory=lambda: [4, 4, 4, 4])
    development_strategy: str = "integrated"
    title: str = "Untitled"
    seed: int = 0
    tempo_hint: int = 90
    metadata: Dict[str, Any] = field(default_factory=dict)

    @property
    def primary_melody_engine(self) -> str:
        return self.primary_engine

    @property
    def counterline_engine(self) -> Optional[str]:
        return self.counter_engine
