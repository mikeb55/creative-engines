"""
Voice Assignment — Assign voice roles and register ranges from hybrid IR.
"""

from typing import Any, Dict, List

try:
    from hybrid_engine.hybrid_composer_ir import HybridComposerIR
    from hybrid_engine.hybrid_voice_types import VoiceRole
except ImportError:
    from hybrid_composer_ir import HybridComposerIR
    from hybrid_voice_types import VoiceRole


def assign_voice_roles(hybrid_ir: HybridComposerIR) -> List[VoiceRole]:
    """Assign voice roles from hybrid IR."""
    roles = []
    roles.append(VoiceRole(role="lead", engine=hybrid_ir.primary_engine, register_low=55, register_high=84, density=0.8))
    c_eng = getattr(hybrid_ir, "counterline_engine", None) or getattr(hybrid_ir, "counter_engine", None)
    if c_eng:
        roles.append(VoiceRole(role="counterline", engine=c_eng, register_low=48, register_high=72, density=0.5))
    vc = getattr(hybrid_ir, "voice_count", 2)
    if vc >= 3:
        roles.append(VoiceRole(role="inner_voice", engine=hybrid_ir.harmony_engine, register_low=40, register_high=60, density=0.3))
    if vc >= 4:
        roles.append(VoiceRole(role="bass_motion", engine=hybrid_ir.harmony_engine, register_low=36, register_high=52, density=0.4))
    return roles


def assign_register_ranges(hybrid_ir: HybridComposerIR) -> Dict[str, tuple]:
    """Assign (low, high) MIDI register per role."""
    return {
        "lead": (55, 84),
        "counterline": (48, 72),
        "inner_voice": (40, 60),
        "bass_motion": (36, 52),
    }
