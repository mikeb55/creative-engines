"""
Crossover Engine — Combine two parent compositions into offspring.
"""

import random
from typing import Any, List, Optional

try:
    from shared_composer.compiled_composition_base import (
        CompiledCompositionBase,
        CompiledSectionBase,
        MelodyBlueprint,
        HarmonyBlueprint,
    )
except ImportError:
    import sys
    import os
    _base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if _base not in sys.path:
        sys.path.insert(0, _base)
    from shared_composer.compiled_composition_base import (
        CompiledCompositionBase,
        CompiledSectionBase,
        MelodyBlueprint,
        HarmonyBlueprint,
    )


def _get_sections(comp: Any) -> List[Any]:
    return getattr(comp, "sections", [])


def _copy_section(sec: Any) -> CompiledSectionBase:
    return CompiledSectionBase(
        section_id=getattr(sec, "section_id", ""),
        role=getattr(sec, "role", ""),
        bar_start=getattr(sec, "bar_start", 0),
        bar_end=getattr(sec, "bar_end", 0),
        melody_events=[dict(e) for e in getattr(sec, "melody_events", [])],
        harmony=[dict(h) for h in getattr(sec, "harmony", [])],
        phrase_lengths=list(getattr(sec, "phrase_lengths", [])),
        motif_refs=list(getattr(sec, "motif_refs", [])),
        register_hint=getattr(sec, "register_hint", 60),
    )


def crossover_melody(parent_a: Any, parent_b: Any, seed: Optional[int] = None) -> Any:
    """
    Crossover melody: take melody events from parent_a for some sections,
    parent_b for others. Preserves asymmetry.
    """
    rng = random.Random(seed)
    secs_a = _get_sections(parent_a)
    secs_b = _get_sections(parent_b)
    if not secs_a or not secs_b:
        return parent_a if secs_a else parent_b
    n = min(len(secs_a), len(secs_b))
    sections = []
    bar_start = 0
    for i in range(n):
        sec = _copy_section(secs_a[i] if rng.random() < 0.5 else secs_b[i])
        bars = sec.bar_end - sec.bar_start
        sec.bar_start = bar_start
        sec.bar_end = bar_start + bars
        bar_start = sec.bar_end
        sections.append(sec)
    for i in range(n, len(secs_a)):
        sec = _copy_section(secs_a[i])
        sec.bar_start = bar_start
        sec.bar_end = bar_start + (sec.bar_end - sec.bar_start)
        bar_start = sec.bar_end
        sections.append(sec)
    all_events = []
    all_chords = []
    for s in sections:
        all_events.extend(s.melody_events)
        all_chords.extend(s.harmony)
    return CompiledCompositionBase(
        title=getattr(parent_a, "title", "Crossover") + "_mel",
        sections=sections,
        melody=MelodyBlueprint(events=all_events),
        harmony=HarmonyBlueprint(chords=all_chords),
        metadata=dict(getattr(parent_a, "metadata", {})),
    )


def crossover_harmony(parent_a: Any, parent_b: Any, seed: Optional[int] = None) -> Any:
    """
    Crossover harmony: take harmony from parent_a for some sections,
    parent_b for others. Melody from parent_a.
    """
    rng = random.Random(seed)
    secs_a = _get_sections(parent_a)
    secs_b = _get_sections(parent_b)
    if not secs_a or not secs_b:
        return parent_a if secs_a else parent_b
    n = min(len(secs_a), len(secs_b))
    sections = []
    bar_start = 0
    for i in range(n):
        sec = _copy_section(secs_a[i])
        harm_src = secs_b[i] if rng.random() < 0.5 else secs_a[i]
        sec.harmony = [dict(h) for h in getattr(harm_src, "harmony", [])]
        bars = sec.bar_end - sec.bar_start
        sec.bar_start = bar_start
        sec.bar_end = bar_start + bars
        bar_start = sec.bar_end
        sections.append(sec)
    for i in range(n, len(secs_a)):
        sec = _copy_section(secs_a[i])
        sec.bar_start = bar_start
        sec.bar_end = bar_start + (sec.bar_end - sec.bar_start)
        bar_start = sec.bar_end
        sections.append(sec)
    all_events = []
    all_chords = []
    for s in sections:
        all_events.extend(s.melody_events)
        all_chords.extend(s.harmony)
    return CompiledCompositionBase(
        title=getattr(parent_a, "title", "Crossover") + "_harm",
        sections=sections,
        melody=MelodyBlueprint(events=all_events),
        harmony=HarmonyBlueprint(chords=all_chords),
        metadata=dict(getattr(parent_a, "metadata", {})),
    )


def crossover_motif(parent_a: Any, parent_b: Any, seed: Optional[int] = None) -> Any:
    """
    Crossover motif: take motif_refs and motivic head from one parent,
    rest from another per section.
    """
    rng = random.Random(seed)
    secs_a = _get_sections(parent_a)
    secs_b = _get_sections(parent_b)
    if not secs_a or not secs_b:
        return parent_a if secs_a else parent_b
    n = min(len(secs_a), len(secs_b))
    sections = []
    bar_start = 0
    for i in range(n):
        use_a = rng.random() < 0.5
        src = secs_a[i] if use_a else secs_b[i]
        other = secs_b[i] if use_a else secs_a[i]
        sec = _copy_section(src)
        ev_a = getattr(secs_a[i], "melody_events", [])
        ev_b = getattr(secs_b[i], "melody_events", [])
        if ev_a and ev_b:
            head_len = min(3, len(ev_a), len(ev_b))
            head = [dict(ev_a[j]) for j in range(head_len)] if use_a else [dict(ev_b[j]) for j in range(head_len)]
            tail_src = secs_b[i] if use_a else secs_a[i]
            tail_ev = getattr(tail_src, "melody_events", [])
            sec.melody_events = head + [dict(e) for e in tail_ev[head_len:]]
        sec.motif_refs = list(getattr(other, "motif_refs", [])) if sec.motif_refs else list(getattr(src, "motif_refs", []))
        bars = sec.bar_end - sec.bar_start
        sec.bar_start = bar_start
        sec.bar_end = bar_start + bars
        bar_start = sec.bar_end
        sections.append(sec)
    for i in range(n, len(secs_a)):
        sec = _copy_section(secs_a[i])
        sec.bar_start = bar_start
        sec.bar_end = bar_start + (sec.bar_end - sec.bar_start)
        bar_start = sec.bar_end
        sections.append(sec)
    all_events = []
    all_chords = []
    for s in sections:
        all_events.extend(s.melody_events)
        all_chords.extend(s.harmony)
    return CompiledCompositionBase(
        title=getattr(parent_a, "title", "Crossover") + "_motif",
        sections=sections,
        melody=MelodyBlueprint(events=all_events),
        harmony=HarmonyBlueprint(chords=all_chords),
        metadata=dict(getattr(parent_a, "metadata", {})),
    )
