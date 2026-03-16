"""
Counterpoint Planner — Plan 2–4 voice counterpoint layout.
"""

from typing import Any, Dict, List

try:
    from hybrid_engine.hybrid_composer_ir import HybridComposerIR
    from hybrid_engine.hybrid_voice_types import CounterpointLayout, VoiceRole
except ImportError:
    from hybrid_composer_ir import HybridComposerIR
    from hybrid_voice_types import CounterpointLayout, VoiceRole


def plan_counterpoint_layout(hybrid_ir: HybridComposerIR) -> CounterpointLayout:
    """Plan counterpoint layout from hybrid IR. Supports 2–4 voices."""
    roles = []
    roles.append(VoiceRole(role="lead", engine=hybrid_ir.primary_engine, register_low=55, register_high=84, density=0.8))
    voice_count = 2
    if getattr(hybrid_ir, "counterline_engine", None) or getattr(hybrid_ir, "counter_engine", None):
        c_eng = getattr(hybrid_ir, "counterline_engine", None) or getattr(hybrid_ir, "counter_engine", None)
        roles.append(VoiceRole(role="counterline", engine=c_eng, register_low=48, register_high=72, density=0.5))
        voice_count = 3
    if getattr(hybrid_ir, "voice_count", 2) >= 3 and len(roles) >= 2:
        voice_count = 3
    if getattr(hybrid_ir, "voice_count", 2) >= 4:
        voice_count = 4
        roles.append(VoiceRole(role="inner_voice", engine=hybrid_ir.harmony_engine, register_low=40, register_high=60, density=0.3))
    if voice_count == 2 and len(roles) == 1:
        roles.append(VoiceRole(role="counterline", engine=hybrid_ir.harmony_engine, register_low=48, register_high=72, density=0.4))
    strategy = getattr(hybrid_ir, "texture_strategy", "complementary")
    return CounterpointLayout(
        voice_roles=roles[:4],
        voice_count=min(4, len(roles)),
        texture_strategy=strategy,
        asymmetry_preserved=True,
    )


def score_counterpoint_balance(layout: CounterpointLayout) -> float:
    """Score 0–1: higher = better voice balance."""
    if not layout.voice_roles:
        return 0.0
    lead = next((r for r in layout.voice_roles if r.role == "lead"), None)
    if not lead or lead.density < 0.5:
        return 0.3
    others = [r for r in layout.voice_roles if r.role != "lead"]
    if not others:
        return 0.7
    avg_density = sum(r.density for r in others) / len(others)
    if avg_density > lead.density:
        return 0.4  # counterlines too dense
    return min(1.0, 0.6 + (lead.density - avg_density) * 0.5)
