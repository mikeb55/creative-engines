"""
Hybrid Planner — Plan hybrid composition using engines from registry.
"""

from typing import Any, Optional

import sys
import os
_base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _base not in sys.path:
    sys.path.insert(0, _base)
from shared_composer.engine_registry import get_engine, list_engines, ensure_engines_loaded
try:
    from hybrid_engine.hybrid_composer_ir import HybridComposerIR
except ImportError:
    from hybrid_composer_ir import HybridComposerIR


def plan_hybrid_composition(
    melody_engine: str = "wayne_shorter",
    harmony_engine: str = "barry_harris",
    counter_engine: Optional[str] = None,
    rhythm_engine: Optional[str] = None,
    seed: int = 0,
    title: str = "Untitled",
) -> HybridComposerIR:
    """Produce HybridComposerIR using engines from registry."""
    ensure_engines_loaded()
    available = list_engines()
    if melody_engine not in available:
        melody_engine = available[0] if available else "wayne_shorter"
    if harmony_engine not in available:
        harmony_engine = available[1 % len(available)] if available else "barry_harris"
    if counter_engine and counter_engine not in available:
        counter_engine = None
    if rhythm_engine and rhythm_engine not in available:
        rhythm_engine = None
    voice_count = 2
    if counter_engine:
        voice_count = 3
    return HybridComposerIR(
        primary_engine=melody_engine,
        harmony_engine=harmony_engine,
        counter_engine=counter_engine,
        rhythm_engine=rhythm_engine,
        voice_count=voice_count,
        voice_roles={"lead": melody_engine, "counterline": counter_engine or ""},
        counterpoint_density=0.5,
        texture_strategy="complementary",
        form_plan="compact",
        section_order=["primary", "contrast", "return"],
        phrase_plan=[4, 4, 4, 4],
        development_strategy="integrated",
        title=title,
        seed=seed,
        tempo_hint=90,
        metadata={"melody_engine": melody_engine, "harmony_engine": harmony_engine},
    )
