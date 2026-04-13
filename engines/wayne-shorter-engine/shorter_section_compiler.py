"""
Shorter Section Compiler — IR → CompiledComposition.
Deterministic: same IR + seed = same result.
"""

import random
from typing import Any, Dict, List, Optional

try:
    from .composer_ir import ComposerIR, SectionPlan, MotivicCell
    from .composer_ir_validator import validate_composer_ir
    from .compiled_composition_types import CompiledComposition, CompiledSection, CompiledMelodyBlueprint, CompiledHarmonyPlan
    from .shorter_harmonic_fields import derive_section_harmony, _next_root
    from .shorter_motif_development import develop_motif_cell
    from .bebop_phrasing import apply_bebop_phrasing
except ImportError:
    from composer_ir import ComposerIR, SectionPlan, MotivicCell
    from composer_ir_validator import validate_composer_ir
    from compiled_composition_types import CompiledComposition, CompiledSection, CompiledMelodyBlueprint, CompiledHarmonyPlan
    from shorter_harmonic_fields import derive_section_harmony, _next_root
    from shorter_motif_development import develop_motif_cell
    from bebop_phrasing import apply_bebop_phrasing


NOTE_TO_PC = {
    "C": 0,
    "B#": 0,
    "C#": 1,
    "Db": 1,
    "D": 2,
    "D#": 3,
    "Eb": 3,
    "E": 4,
    "Fb": 4,
    "E#": 5,
    "F": 5,
    "F#": 6,
    "Gb": 6,
    "G": 7,
    "G#": 8,
    "Ab": 8,
    "A": 9,
    "A#": 10,
    "Bb": 10,
    "B": 11,
    "Cb": 11,
}

DEGREES = {
    "1": 0,
    "b3": 3,
    "3": 4,
    "4": 5,
    "#11": 6,
    "5": 7,
    "b7": 10,
    "7": 11,
    "9": 2,
    "11": 5,
    "13": 9,
    "b9": 1,
    "#9": 3,
    "b13": 8,
}

CHORD_TEMPLATES = {
    "maj7#11": (
        ["1", "3", "5", "7", "9", "#11", "13"],
        {"1": 0.1, "3": 0.8, "5": 0.1, "7": 0.8, "9": 1.1, "#11": 1.4, "13": 1.0},
    ),
    "maj7": (
        ["1", "3", "5", "7", "9", "#11", "13"],
        {"1": 0.2, "3": 0.9, "5": 0.2, "7": 0.9, "9": 1.2, "#11": 1.2, "13": 1.0},
    ),
    "13sus": (
        ["1", "4", "5", "b7", "9", "13"],
        {"1": 0.2, "4": 0.9, "5": 0.1, "b7": 1.0, "9": 1.2, "13": 1.1},
    ),
    "sus": (
        ["1", "4", "5", "b7", "9", "13"],
        {"1": 0.2, "4": 0.9, "5": 0.1, "b7": 0.9, "9": 1.1, "13": 1.0},
    ),
    "m11": (
        ["1", "b3", "5", "b7", "9", "11"],
        {"1": 0.2, "b3": 0.9, "5": 0.2, "b7": 1.0, "9": 1.1, "11": 0.8},
    ),
    "m9": (
        ["1", "b3", "5", "b7", "9", "11", "13"],
        {"1": 0.2, "b3": 0.9, "5": 0.2, "b7": 1.0, "9": 1.2, "11": 0.8, "13": 0.9},
    ),
    "m7": (
        ["1", "b3", "5", "b7", "9", "11", "13"],
        {"1": 0.2, "b3": 0.9, "5": 0.2, "b7": 1.0, "9": 1.1, "11": 0.8, "13": 0.9},
    ),
    "7alt": (
        ["1", "3", "b7", "b9", "#9", "#11", "b13"],
        {"1": 0.1, "3": 0.8, "b7": 0.9, "b9": 1.0, "#9": 1.0, "#11": 1.1, "b13": 1.0},
    ),
    "7": (
        ["1", "3", "5", "b7", "9", "#11", "13"],
        {"1": 0.2, "3": 0.8, "5": 0.1, "b7": 0.9, "9": 1.1, "#11": 1.0, "13": 1.0},
    ),
}

import re as _re

# Melody register (A3–G5)
MELODY_PITCH_LO = 57
MELODY_PITCH_HI = 84

# divisions=4 per quarter; each pattern sums to 16 (one 4/4 bar)
RHYTHM_PATTERNS = [
    [8, 8],
    [4, 4, 4, 4],
    [4, 8, 4],
    [8, 4, 4],
    [6, 2, 4, 4],
    [4, 6, 2, 4],
    [12, 4],
    [4, 12],
]


def _chord_midi_in_range(pcs: dict, lo: int, hi: int) -> List[int]:
    """Sorted MIDI pitches in [lo, hi] that match a chord tone class."""
    out: List[int] = []
    for midi in range(lo, hi + 1):
        if any((midi % 12) == (pc % 12) for pc in pcs.values()):
            out.append(midi)
    return sorted(set(out))


def _avoid_consecutive_repeat(
    prev_midi: Optional[int],
    chosen: int,
    pcs: Optional[dict],
    weights: Optional[dict],
    lo: int,
    hi: int,
) -> int:
    """If chosen equals previous melodic pitch, move to nearest other chord tone (or chromatic nudge)."""
    if prev_midi is None or chosen != prev_midi:
        return chosen
    if pcs and weights:
        cands = _chord_midi_in_range(pcs, lo, hi)
        up = [m for m in cands if m > chosen]
        down = [m for m in cands if m < chosen]
        if up:
            return min(up)
        if down:
            return max(down)
        for delta in (12, -12, 24, -24):
            alt = chosen + delta
            if lo <= alt <= hi and alt != prev_midi:
                return alt
    if chosen < hi:
        return chosen + 1
    return chosen - 1


def _parse_chord_field(symbol: str):
    """Parse chord symbol into pitch classes and weights."""
    m = _re.match(r"([A-G](?:b|#)?)", symbol)
    if not m:
        return None, None
    root = NOTE_TO_PC.get(m.group(1), 0)
    q = symbol[len(m.group(1)) :]
    q_low = q.lower()
    if "maj7#11" in q_low or "maj7+11" in q_low:
        kind = "maj7#11"
    elif "maj7" in q_low:
        kind = "maj7"
    elif "13sus" in q_low or "sus13" in q_low:
        kind = "13sus"
    elif "sus" in q_low:
        kind = "sus"
    elif "m11" in q_low:
        kind = "m11"
    elif "m9" in q_low:
        kind = "m9"
    elif "m7" in q_low or "min7" in q_low:
        kind = "m7"
    elif "7alt" in q_low or "alt" in q_low:
        kind = "7alt"
    elif "7" in q_low or "13" in q_low:
        kind = "7"
    else:
        kind = "maj7"
    degs, weights = CHORD_TEMPLATES[kind]
    pcs = {d: (root + DEGREES[d]) % 12 for d in degs}
    return pcs, weights


def _nearest_weighted_pitch(
    target: int,
    pcs: dict,
    weights: dict,
    lo: int = MELODY_PITCH_LO,
    hi: int = MELODY_PITCH_HI,
) -> int:
    """Find nearest pitch in chord field, weighted toward extensions."""
    best_score = None
    best_midi = target
    for midi in range(lo, hi + 1):
        matches = [d for d, pc in pcs.items() if pc == midi % 12]
        if not matches:
            continue
        d = max(matches, key=lambda x: weights[x])
        score = weights[d] - 0.08 * abs(midi - target)
        if abs(midi - target) <= 2:
            score += 0.2
        if d in ("1", "5"):
            score -= 0.35
        if best_score is None or score > best_score:
            best_score = score
            best_midi = midi
    return best_midi


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


def _extend_harm(harm_list: List[str], needed: int, seed: int) -> List[str]:
    """Extend a chord pattern to `needed` length; avoid repeating the same symbol consecutively."""
    hl = list(harm_list)
    if not hl:
        return ["C"] * needed
    result: List[str] = []
    last: Optional[str] = None
    repeat_count = 0
    while len(result) < needed:
        candidate = hl[len(result) % len(hl)]
        if candidate == last:
            repeat_count += 1
            if repeat_count >= 1:
                m = _re.match(r"^([A-G](?:b|#)?)", candidate)
                root = m.group(1) if m else "C"
                h = (seed * 31 + len(result) * 37) & 0xFFFFFFFF
                new_root = _next_root(root, h)
                suffix = _re.sub(r"^[A-G](?:b|#)?", "", candidate)
                candidate = new_root + suffix
                repeat_count = 0
        else:
            repeat_count = 0
        last = candidate
        result.append(candidate)
    return result


def compile_composition_from_ir(composer_ir: ComposerIR) -> CompiledComposition:
    """Compile ComposerIR to CompiledComposition. Deterministic."""
    r = validate_composer_ir(composer_ir)
    if not r.valid:
        raise ValueError(f"Invalid ComposerIR: {'; '.join(r.errors)}")
    _bebop_rng = random.Random(composer_ir.seed)
    generation_seed = _bebop_rng.randint(0, 2**31)
    sections = []
    all_events = []
    bar_start = 0
    for role in composer_ir.section_order:
        sp = composer_ir.section_roles.get(role)
        if sp is None:
            sp = SectionPlan(role=role, bar_count=8)
        compiled = compile_section(sp, composer_ir, role, bar_start, generation_seed)
        sections.append(compiled)
        all_events.extend(compiled.melody_events)
        bar_start = compiled.bar_end
    melody = CompiledMelodyBlueprint(events=all_events)
    all_chords = []
    for s in sections:
        all_chords.extend(s.harmony)
    harmony = CompiledHarmonyPlan(chords=all_chords)
    key_hint = composer_ir.export_hints.key_hint if composer_ir.export_hints else "C"
    return CompiledComposition(
        title=composer_ir.title,
        sections=sections,
        melody=melody,
        harmony=harmony,
        metadata={
            "seed": composer_ir.seed,
            "form": composer_ir.form_plan,
            "tempo": composer_ir.tempo_hint,
            "key_hint": key_hint,
        },
    )


def compile_section(
    section_plan: SectionPlan,
    composer_ir: ComposerIR,
    section_id: str,
    bar_start: int,
    generation_seed: int,
) -> CompiledSection:
    """Compile single section."""
    if section_plan.role == "primary":
        return compile_primary_theme(section_plan, composer_ir, section_id, bar_start, generation_seed)
    if section_plan.role == "contrast":
        return compile_contrast_section(section_plan, composer_ir, section_id, bar_start, generation_seed)
    if section_plan.role in ("return", "coda"):
        return compile_return_section(section_plan, composer_ir, section_id, bar_start, generation_seed)
    return _compile_generic_section(section_plan, composer_ir, section_id, bar_start, generation_seed)


def compile_primary_theme(
    section_plan: SectionPlan,
    composer_ir: ComposerIR,
    section_id: str,
    bar_start: int,
    generation_seed: int,
) -> CompiledSection:
    """Compile primary thematic section."""
    bars = section_plan.bar_count or 8
    bar_end = bar_start + bars
    cell = composer_ir.motivic_cells[0] if composer_ir.motivic_cells else MotivicCell(intervals=[2, 5, 7])
    reg = composer_ir.registral_plan.get("primary", cell.registral_center)
    reg = max(MELODY_PITCH_LO, reg)
    harm = derive_section_harmony(
        composer_ir.harmonic_field,
        "primary",
        template_title=composer_ir.title if hasattr(composer_ir, "title") else None,
    )
    harmony = [{"symbol": harm[i % len(harm)], "measure": bar_start + i, "duration": 4} for i in range(bars)]
    bar_harmony = {h.get("measure", h.get("bar", 0)): h.get("symbol", "") for h in harmony}
    events = _melody_from_cell(
        cell, bars, bar_start, section_id, reg, bar_harmony=bar_harmony, generation_seed=generation_seed
    )
    pl = section_plan.phrase_lengths or [4, 4]
    return CompiledSection(
        section_id=section_id,
        role="primary",
        bar_start=bar_start,
        bar_end=bar_end,
        melody_events=events,
        harmony=harmony,
        phrase_lengths=pl,
        motif_refs=["m1"],
        register_hint=reg,
    )


def compile_contrast_section(
    section_plan: SectionPlan,
    composer_ir: ComposerIR,
    section_id: str,
    bar_start: int,
    generation_seed: int,
) -> CompiledSection:
    """Compile contrast section: different but related."""
    bars = section_plan.bar_count or 6
    bar_end = bar_start + bars
    cell = composer_ir.motivic_cells[1] if len(composer_ir.motivic_cells) > 1 else composer_ir.motivic_cells[0] if composer_ir.motivic_cells else MotivicCell(intervals=[2, 5, 7])
    developed = develop_motif_cell(cell, "fragmentation")
    reg = composer_ir.registral_plan.get("contrast", cell.registral_center - 3)
    reg = max(MELODY_PITCH_LO, reg)
    harm = derive_section_harmony(
        composer_ir.harmonic_field,
        "contrast",
        template_title=composer_ir.title if hasattr(composer_ir, "title") else None,
    )
    harm_ext = _extend_harm(harm, bars, composer_ir.seed)
    harmony = [{"symbol": harm_ext[i], "measure": bar_start + i, "duration": 4} for i in range(bars)]
    bar_harmony = {h.get("measure", h.get("bar", 0)): h.get("symbol", "") for h in harmony}
    events = _melody_from_cell(
        developed,
        bars,
        bar_start,
        section_id,
        reg,
        bar_harmony=bar_harmony,
        generation_seed=generation_seed,
    )
    pl = section_plan.phrase_lengths or [3, 3]
    return CompiledSection(
        section_id=section_id,
        role="contrast",
        bar_start=bar_start,
        bar_end=bar_end,
        melody_events=events,
        harmony=harmony,
        phrase_lengths=pl,
        motif_refs=["m2_frag"],
        register_hint=reg,
    )


def compile_return_section(
    section_plan: SectionPlan,
    composer_ir: ComposerIR,
    section_id: str,
    bar_start: int,
    generation_seed: int,
) -> CompiledSection:
    """Compile return: transformed, not flat repeat."""
    bars = section_plan.bar_count or 8
    bar_end = bar_start + bars
    cell = composer_ir.motivic_cells[0] if composer_ir.motivic_cells else MotivicCell(intervals=[2, 5, 7])
    developed = develop_motif_cell(cell, "transposition")
    reg = composer_ir.registral_plan.get("return", cell.registral_center + 5)
    reg = max(MELODY_PITCH_LO, reg)
    harm = derive_section_harmony(
        composer_ir.harmonic_field,
        "primary",
        template_title=composer_ir.title if hasattr(composer_ir, "title") else None,
    )
    harmony = [{"symbol": harm[i % len(harm)], "measure": bar_start + i, "duration": 4} for i in range(bars)]
    bar_harmony = {h.get("measure", h.get("bar", 0)): h.get("symbol", "") for h in harmony}
    events = _melody_from_cell(
        developed,
        bars,
        bar_start,
        section_id,
        reg,
        bar_harmony=bar_harmony,
        generation_seed=generation_seed,
    )
    pl = section_plan.phrase_lengths or [4, 4]
    return CompiledSection(
        section_id=section_id,
        role="return",
        bar_start=bar_start,
        bar_end=bar_end,
        melody_events=events,
        harmony=harmony,
        phrase_lengths=pl,
        motif_refs=["m1_trans"],
        register_hint=reg,
    )


def _compile_generic_section(
    section_plan: SectionPlan,
    composer_ir: ComposerIR,
    section_id: str,
    bar_start: int,
    generation_seed: int,
) -> CompiledSection:
    """Generic section (intro, etc)."""
    bars = section_plan.bar_count or 4
    bar_end = bar_start + bars
    cell = composer_ir.motivic_cells[0] if composer_ir.motivic_cells else MotivicCell(intervals=[2, 5])
    reg = max(MELODY_PITCH_LO, cell.registral_center)
    harm = derive_section_harmony(
        composer_ir.harmonic_field,
        "primary",
        template_title=composer_ir.title if hasattr(composer_ir, "title") else None,
    )
    harmony = [{"symbol": harm[i % len(harm)], "measure": bar_start + i, "duration": 4} for i in range(bars)]
    bar_harmony = {h.get("measure", h.get("bar", 0)): h.get("symbol", "") for h in harmony}
    events = _melody_from_cell(
        cell, bars, bar_start, section_id, reg, bar_harmony=bar_harmony, generation_seed=generation_seed
    )
    return CompiledSection(
        section_id=section_id,
        role=section_plan.role,
        bar_start=bar_start,
        bar_end=bar_end,
        melody_events=events,
        harmony=harmony,
        phrase_lengths=[bars],
        register_hint=reg,
    )


def _melody_from_cell(
    cell: MotivicCell,
    bars: int,
    bar_start: int,
    section_id: str,
    reg: int,
    bar_harmony: Optional[Dict[int, str]] = None,
    generation_seed: int = 0,
) -> List[Dict]:
    """Generate melody events from motivic cell."""
    events: List[Dict] = []
    pitch = max(MELODY_PITCH_LO, min(MELODY_PITCH_HI, reg))
    idx = 0
    bh = bar_harmony or {}
    last_bar_last_pitch: Optional[int] = None

    for local_bar in range(bars):
        measure = bar_start + local_bar
        pattern = RHYTHM_PATTERNS[measure % 8]
        beat_in_bar = 0.0
        bar_chord_tones: List[Dict] = []
        last_note_pitch = last_bar_last_pitch

        for divs in pattern:
            dur_beats = divs / 4.0
            inc = cell.intervals[idx % len(cell.intervals)]
            chord_sym = None
            if hasattr(cell, "chord_symbol"):
                chord_sym = getattr(cell, "chord_symbol", None)
            if chord_sym is None and bh:
                chord_sym = bh.get(measure)
            pcs, weights = None, None
            if chord_sym:
                parsed = _parse_chord_field(chord_sym)
                pcs, weights = parsed[0], parsed[1]
                if pcs and weights:
                    target = max(MELODY_PITCH_LO, min(MELODY_PITCH_HI, pitch + inc))
                    pitch = _nearest_weighted_pitch(
                        target, pcs, weights, lo=MELODY_PITCH_LO, hi=MELODY_PITCH_HI
                    )
                    pitch = _avoid_consecutive_repeat(
                        last_note_pitch, pitch, pcs, weights, MELODY_PITCH_LO, MELODY_PITCH_HI
                    )
                else:
                    pitch = max(MELODY_PITCH_LO, min(MELODY_PITCH_HI, pitch + inc))
                    pitch = _avoid_consecutive_repeat(
                        last_note_pitch, pitch, None, None, MELODY_PITCH_LO, MELODY_PITCH_HI
                    )
            else:
                pitch = max(MELODY_PITCH_LO, min(MELODY_PITCH_HI, pitch + inc))
                pitch = _avoid_consecutive_repeat(
                    last_note_pitch, pitch, None, None, MELODY_PITCH_LO, MELODY_PITCH_HI
                )
            if pitch < MELODY_PITCH_LO or pitch > MELODY_PITCH_HI:
                pitch = max(MELODY_PITCH_LO, min(MELODY_PITCH_HI, pitch))
            bar_chord_tones.append({
                "pitch": pitch,
                "duration": divs,
                "beat_position": beat_in_bar,
            })
            last_note_pitch = pitch
            idx += 1
            beat_in_bar += dur_beats

        chord_sym_bar = getattr(cell, "chord_symbol", None)
        if chord_sym_bar is None and bh:
            chord_sym_bar = bh.get(measure)
        current_chord = chord_sym_bar or ""
        next_chord = (bh.get(measure + 1) if bh else None) or current_chord

        bar_events = apply_bebop_phrasing(
            bar_notes=bar_chord_tones,
            chord_symbol=current_chord,
            next_chord_symbol=next_chord,
            bar_index=measure,
            prev_pitch=last_bar_last_pitch,
            generation_seed=generation_seed,
        )
        for ev in bar_events:
            off_div = int(ev.get("offset", 0))
            events.append({
                "pitch": int(ev["pitch"]),
                "duration": int(ev["duration"]),
                "offset": off_div,
                "type": ev.get("type"),
                "dot": ev.get("dot", False),
                "time_mod": ev.get("time_mod"),
                "measure": measure,
                "beat_position": off_div / 4.0,
                "section_id": section_id,
                "bebop_rhythm": True,
            })
        if bar_events:
            last_bar_last_pitch = int(bar_events[-1]["pitch"])

    for e in events:
        if e.get("pitch", 0) == 0:
            e["is_rest"] = True
    return events
