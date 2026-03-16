"""
Hybrid Voice Types — Voice roles, register ranges, counterpoint layout.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class VoiceRole:
    """Single voice role in polyphonic texture."""
    role: str  # lead, counterline, inner_voice, bass_motion
    engine: Optional[str] = None
    register_low: int = 40
    register_high: int = 84
    density: float = 0.5  # 0=sparse, 1=dense


@dataclass
class CounterpointLayout:
    """Layout for 2–4 voice counterpoint."""
    voice_roles: List[VoiceRole] = field(default_factory=list)
    voice_count: int = 2
    texture_strategy: str = "complementary"  # complementary, contrast, shadow
    asymmetry_preserved: bool = True
