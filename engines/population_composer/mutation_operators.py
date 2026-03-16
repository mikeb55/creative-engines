"""
Mutation Operators — Mutate compiled compositions. Preserve asymmetry.
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


def _deep_copy_compiled(comp: Any) -> Any:
    sections = []
    for sec in _get_sections(comp):
        events = [dict(e) for e in getattr(sec, "melody_events", [])]
        harmony = [dict(h) for h in getattr(sec, "harmony", [])]
        pl = list(getattr(sec, "phrase_lengths", []))
        mr = list(getattr(sec, "motif_refs", []))
        sections.append(CompiledSectionBase(
            section_id=getattr(sec, "section_id", ""),
            role=getattr(sec, "role", ""),
            bar_start=getattr(sec, "bar_start", 0),
            bar_end=getattr(sec, "bar_end", 0),
            melody_events=events,
            harmony=harmony,
            phrase_lengths=pl,
            motif_refs=mr,
            register_hint=getattr(sec, "register_hint", 60),
        ))
    melody = getattr(comp, "melody", None)
    if melody:
        mel_events = [dict(e) for e in getattr(melody, "events", [])]
        melody = MelodyBlueprint(events=mel_events)
    else:
        melody = MelodyBlueprint()
    harmony_plan = getattr(comp, "harmony", None)
    if harmony_plan:
        chords = [dict(c) for c in getattr(harmony_plan, "chords", [])]
        harmony_plan = HarmonyBlueprint(chords=chords)
    else:
        harmony_plan = HarmonyBlueprint()
    return CompiledCompositionBase(
        title=getattr(comp, "title", "Mutated"),
        sections=sections,
        melody=melody,
        harmony=harmony_plan,
        metadata=dict(getattr(comp, "metadata", {})),
    )


def mutate_intervals(compiled: Any, strength: float = 0.3, seed: Optional[int] = None) -> Any:
    """
    Mutate melodic intervals by shifting pitches. Preserves asymmetry.
    strength: fraction of events to mutate; 0–1.
    """
    rng = random.Random(seed)
    out = _deep_copy_compiled(compiled)
    sections = _get_sections(out)
    for sec in sections:
        events = getattr(sec, "melody_events", [])
        if not events:
            continue
        n_mutate = max(1, int(len(events) * strength))
        indices = rng.sample(range(len(events)), min(n_mutate, len(events)))
        for i in indices:
            e = events[i]
            delta = rng.choice([-2, -1, 1, 2])
            p = e.get("pitch", 60)
            e["pitch"] = max(36, min(84, p + delta))
    return out


def mutate_harmony(compiled: Any, strength: float = 0.25, seed: Optional[int] = None) -> Any:
    """
    Mutate harmony by substituting chord symbols. Preserves asymmetry.
    """
    rng = random.Random(seed)
    out = _deep_copy_compiled(compiled)
    substitutes = [
        ("Cm7", "Dm7", "Em7", "Fm7", "Gm7", "Am7", "Bm7"),
        ("C7", "D7", "E7", "F7", "G7", "A7", "B7"),
        ("Cmaj7", "Dmaj7", "Fmaj7", "Gmaj7"),
        ("C-7", "D-7", "E-7", "F-7", "G-7", "A-7", "B-7"),
    ]
    sections = _get_sections(out)
    for sec in sections:
        harmony = getattr(sec, "harmony", [])
        if not harmony:
            continue
        n_mutate = max(1, int(len(harmony) * strength))
        indices = rng.sample(range(len(harmony)), min(n_mutate, len(harmony)))
        for i in indices:
            h = harmony[i]
            sym = h.get("symbol", str(h))
            for pool in substitutes:
                if sym in pool:
                    idx = pool.index(sym)
                    new_idx = (idx + rng.choice([-1, 1])) % len(pool)
                    h["symbol"] = pool[new_idx]
                    break
    return out


def mutate_motif(compiled: Any, strength: float = 0.3, seed: Optional[int] = None) -> Any:
    """
    Mutate motivic intervals (first few events per section). Preserves asymmetry.
    """
    rng = random.Random(seed)
    out = _deep_copy_compiled(compiled)
    sections = _get_sections(out)
    for sec in sections:
        events = getattr(sec, "melody_events", [])
        if len(events) < 3:
            continue
        head = min(4, len(events))
        for i in range(head):
            if rng.random() < strength:
                e = events[i]
                delta = rng.choice([-3, -2, -1, 1, 2, 3])
                p = e.get("pitch", 60)
                e["pitch"] = max(36, min(84, p + delta))
    return out


def mutate_phrase_lengths(compiled: Any, strength: float = 0.4, seed: Optional[int] = None) -> Any:
    """
    Mutate phrase lengths. Preserves asymmetry: favors odd lengths, avoids equalizing.
    """
    rng = random.Random(seed)
    out = _deep_copy_compiled(compiled)
    sections = _get_sections(out)
    for sec in sections:
        pl = getattr(sec, "phrase_lengths", [])
        if not pl:
            continue
        new_pl = []
        for p in pl:
            if rng.random() < strength:
                delta = rng.choice([-2, -1, 1, 2])
                new_p = max(2, p + delta)
                if new_p % 2 == 0 and rng.random() < 0.5:
                    new_p += 1
                new_pl.append(new_p)
            else:
                new_pl.append(p)
        sec.phrase_lengths = new_pl
    return out


def mutate_form(compiled: Any, strength: float = 0.5, seed: Optional[int] = None) -> Any:
    """
    Mutate form: reorder sections or swap roles. Preserves asymmetry.
    """
    rng = random.Random(seed)
    out = _deep_copy_compiled(compiled)
    sections = _get_sections(out)
    if len(sections) < 2:
        return out
    if rng.random() < strength:
        i, j = rng.sample(range(len(sections)), 2)
        sections[i], sections[j] = sections[j], sections[i]
        bar_start = 0
        for sec in sections:
            bars = sec.bar_end - sec.bar_start
            sec.bar_start = bar_start
            sec.bar_end = bar_start + bars
            bar_start = sec.bar_end
    return out
