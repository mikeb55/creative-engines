"""
Slonimsky Harmonic Engine — V1 intervallic patterns aligned with
`engines/composer-os-v2/core/slonimsky/slonimskyEngine.ts` (SLONIMSKY_PATTERNS + selectSlonimskyPattern).
"""

from __future__ import annotations

import os
import sys
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

# Ensure bartok-night-engine is on path for shared types
_base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_bartok = os.path.join(_base, "bartok-night-engine")
if _base not in sys.path:
    sys.path.insert(0, _base)
if _bartok not in sys.path:
    sys.path.insert(0, _bartok)

from composer_ir import (
    ComposerIR,
    MotivicCell,
    IntervalLanguage,
    HarmonicField,
    SectionPlan,
    ExportHints,
)
from compiled_composition_types import (
    CompiledComposition,
    CompiledSection,
    CompiledMelodyBlueprint,
    CompiledHarmonyPlan,
)
from musicxml_exporter import export_composition_to_musicxml

# --- V1 pattern table (ids + intervals + tension 1–3) — matches TS SLONIMSKY_PATTERNS ---

SLONIMSKY_PATTERNS_V1: Tuple[Dict[str, Any], ...] = (
    {
        "id": "p_minorThirdCycle",
        "name": "Minor 3rd Cycle Cell",
        "intervals": [3, 3, 3],
        "symmetry_type": "equalDivision",
        "tension_level": 3,
        "semantic": "shock",
    },
    {
        "id": "p_majorThirdCycle",
        "name": "Major 3rd Cycle Cell",
        "intervals": [4, 4],
        "symmetry_type": "equalDivision",
        "tension_level": 3,
        "semantic": "shock",
    },
    {
        "id": "p_tritonePole",
        "name": "Tritone Pole Alternation",
        "intervals": [6, -6],
        "symmetry_type": "equalDivision",
        "tension_level": 3,
        "semantic": "shock",
    },
    {
        "id": "p_wholeTone",
        "name": "Whole-Tone Segment",
        "intervals": [2, 2, 2],
        "symmetry_type": "equalDivision",
        "tension_level": 1,
        "semantic": "float",
    },
    {
        "id": "p_asymCell123",
        "name": "Asymmetric 1-2-3 Cell",
        "intervals": [1, 2, 3],
        "symmetry_type": "asymmetric",
        "tension_level": 2,
        "semantic": "float",
    },
    {
        "id": "p_chromaticInterp",
        "name": "Chromatic Interpolation",
        "intervals": [1, 1, 1],
        "symmetry_type": "equalDivision",
        "tension_level": 2,
        "semantic": "build",
    },
    {
        "id": "p_expanding",
        "name": "Expanding Interval Cell 1-2-3-4",
        "intervals": [1, 2, 3, 4],
        "symmetry_type": "asymmetric",
        "tension_level": 3,
        "semantic": "build",
    },
    {
        "id": "p_contracting",
        "name": "Contracting Interval Cell 4-3-2-1",
        "intervals": [4, 3, 2, 1],
        "symmetry_type": "asymmetric",
        "tension_level": 1,
        "semantic": "release",
    },
)

GUITAR_MIDI_MIN = 48
GUITAR_MIDI_MAX = 84

_SEMANTIC_ORDER: Tuple[str, ...] = ("shock", "build", "float", "release")

# Harmony rows per phrase intent (tonic/dominant flavour — not bar-specific voice-leading)
_HARMONY_BY_SEMANTIC: Dict[str, Tuple[str, ...]] = {
    "shock": ("C7alt", "F#7b9", "Bb7#11", "E7b9"),
    "build": ("G9", "C13", "F7", "Bb9"),
    "float": ("Cmaj7", "Dm7", "Esus4", "Fmaj7"),
    "release": ("Cmaj7", "Fmaj9", "Dm7", "Bbmaj7"),
}

_MOTION_BY_SEMANTIC: Dict[str, str] = {
    "shock": "altered_dominant",
    "build": "dominant",
    "float": "modal_maj7",
    "release": "tonic",
}


def _clamp_midi(m: int) -> int:
    return max(GUITAR_MIDI_MIN, min(GUITAR_MIDI_MAX, m))


def _resolve_phrase_intent(seed: int, kwargs: Dict[str, Any]) -> str:
    explicit = kwargs.get("phrase_intent") or kwargs.get("slonimsky_phrase_intent")
    if explicit in ("shock", "build", "float", "release"):
        return str(explicit)
    # Deterministic rotation (matches exploratory behaviour; no random)
    return _SEMANTIC_ORDER[abs(seed) % 4]


def _resolve_allowed_outside_level(kwargs: Dict[str, Any]) -> int:
    raw = kwargs.get("allowed_outside_level")
    if raw is None:
        return 2
    try:
        v = int(raw)
        return max(0, min(2, v))
    except (TypeError, ValueError):
        return 2


def _resolve_functional_strength(kwargs: Dict[str, Any]) -> str:
    s = kwargs.get("functional_strength", "medium")
    if s in ("strong", "medium", "weak"):
        return str(s)
    return "medium"


def select_slonimsky_pattern(
    phrase_intent: str,
    seed: int,
    allowed_outside_level: int = 2,
    functional_strength: str = "medium",
) -> Optional[Dict[str, Any]]:
    """
    Match TS `selectSlonimskyPattern`: filter by tension + intent family.
    """
    if allowed_outside_level == 0:
        return None
    max_tension = min(3, allowed_outside_level + 1)
    filtered: List[Dict[str, Any]] = [
        p for p in SLONIMSKY_PATTERNS_V1 if int(p["tension_level"]) <= max_tension
    ]
    if functional_strength == "strong":
        filtered = [p for p in filtered if int(p["tension_level"]) <= 1]

    intent = phrase_intent
    if intent == "shock":
        want = {"p_minorThirdCycle", "p_majorThirdCycle", "p_tritonePole"}
        filtered = [p for p in filtered if p["id"] in want]
    elif intent == "build":
        want = {"p_expanding", "p_chromaticInterp"}
        filtered = [p for p in filtered if p["id"] in want]
    elif intent == "float":
        want = {"p_wholeTone", "p_asymCell123"}
        filtered = [p for p in filtered if p["id"] in want]
    elif intent == "release":
        want = {"p_contracting"}
        filtered = [p for p in filtered if p["id"] in want]
    else:
        return None

    if not filtered:
        return None
    return filtered[abs(seed) % len(filtered)]


def _harmonic_field_for_semantic(semantic: str) -> HarmonicField:
    """Shock = altered/dominant; float = modal/maj7; build = dominant; release = tonic."""
    motion = _MOTION_BY_SEMANTIC.get(semantic, "dominant")
    if semantic == "shock":
        return HarmonicField(
            centers=["C", "F#", "Bb", "E"],
            motion_type=motion,
            chord_types=["7alt", "7b9", "7#11", "7b9"],
        )
    if semantic == "float":
        return HarmonicField(
            centers=["C", "D", "E", "F"],
            motion_type=motion,
            chord_types=["maj7", "m7", "sus4", "maj7"],
        )
    if semantic == "build":
        return HarmonicField(
            centers=["G", "C", "F", "Bb"],
            motion_type=motion,
            chord_types=["9", "13", "7", "9"],
        )
    # release / tonic
    return HarmonicField(
        centers=["C", "F", "Dm", "Bb"],
        motion_type=motion,
        chord_types=["maj7", "maj9", "m7", "maj7"],
    )


def _pitch_sequence_from_root(root_midi: int, intervals: List[int]) -> List[int]:
    """Walk intervals from root (one note per step, TS-style stack)."""
    out = [_clamp_midi(root_midi)]
    cur = out[0]
    for iv in intervals:
        cur = _clamp_midi(cur + iv)
        out.append(cur)
    return out


def _parse_slonimsky_meta(ir: ComposerIR) -> Tuple[str, str]:
    """Recover semantic + pattern id from IntervalLanguage.tension_profile."""
    tp = getattr(ir.interval_language, "tension_profile", "") or ""
    if tp.startswith("slonimsky_v1:"):
        parts = tp.split(":")
        if len(parts) >= 3:
            return parts[1], parts[2]
    return "build", "p_expanding"


def _bar_chord_symbols(total_bars: int, semantic: str) -> List[str]:
    row = _HARMONY_BY_SEMANTIC.get(semantic, _HARMONY_BY_SEMANTIC["build"])
    return [row[i % len(row)] for i in range(total_bars)]


def generate_ir(input_text: str, mode: str = "title", seed: int = 0, **kwargs: Any) -> ComposerIR:
    """Generate ComposerIR using V1 Slonimsky pattern selection and interval-driven cells."""
    title = (input_text or "Untitled").strip() or "Slonimsky Study"
    phrase_intent = _resolve_phrase_intent(seed, kwargs)
    allowed_outside = _resolve_allowed_outside_level(kwargs)
    functional = _resolve_functional_strength(kwargs)

    pattern = select_slonimsky_pattern(
        phrase_intent,
        seed,
        allowed_outside_level=allowed_outside,
        functional_strength=functional,
    )
    if pattern is None:
        # Fallback: whole-tone float (tension 1) always eligible when outside >= 1
        pattern = next(p for p in SLONIMSKY_PATTERNS_V1 if p["id"] == "p_wholeTone")

    root_midi = _clamp_midi(int(kwargs.get("base_pitch", 60 + (seed % 12))))
    intervals: List[int] = list(pattern["intervals"])

    cell = MotivicCell(
        intervals=intervals,
        contour="slonimsky_cycle",
        registral_center=root_midi,
    )
    profile_tag = f"slonimsky_v1:{phrase_intent}:{pattern['id']}"
    il = IntervalLanguage(
        primary_intervals=intervals,
        tension_profile=profile_tag,
    )
    hf = _harmonic_field_for_semantic(phrase_intent)

    section_roles = {
        "primary": SectionPlan(role="primary", bar_count=8, phrase_lengths=[4, 4]),
        "contrast": SectionPlan(role="contrast", bar_count=6, phrase_lengths=[3, 3]),
        "return": SectionPlan(role="return", bar_count=6, phrase_lengths=[3, 3]),
    }
    registral_plan = {
        "primary": root_midi,
        "contrast": _clamp_midi(root_midi + 7),
        "return": root_midi,
    }

    key_hint = "C" if phrase_intent in ("release", "float") else "G"

    return ComposerIR(
        title=title,
        seed=seed,
        tempo_hint=72,
        form_plan=f"slonimsky_v1_{pattern['id']}",
        section_order=["primary", "contrast", "return"],
        section_roles=section_roles,
        motivic_cells=[cell],
        interval_language=il,
        harmonic_field=hf,
        registral_plan=registral_plan,
        export_hints=ExportHints(tempo=72, key_hint=key_hint),
    )


def compile_from_ir(ir: ComposerIR) -> CompiledComposition:
    """Compile IR: melody from interval walk; harmony from phrase-intent chord rows (not static Cmaj7)."""
    semantic, pattern_id = _parse_slonimsky_meta(ir)
    cell = ir.motivic_cells[0] if ir.motivic_cells else MotivicCell(intervals=[2, 2, 2])
    intervals = list(cell.intervals)
    root = int(cell.registral_center)

    seq = _pitch_sequence_from_root(root, intervals)
    if len(seq) < 2:
        seq = _pitch_sequence_from_root(root, [2, 2])

    events: List[Dict[str, Any]] = []
    bar_cursor = 0

    for role in ir.section_order:
        sp = ir.section_roles.get(role)
        bars = sp.bar_count if sp else 6
        reg_home = ir.registral_plan.get(role, root)
        # Optional octave shift per section (light registral contrast)
        seq_local = _pitch_sequence_from_root(_clamp_midi(reg_home), intervals)
        note_idx = 0
        for b in range(bars):
            for beat in range(4):
                pitch = seq_local[note_idx % len(seq_local)]
                events.append(
                    {
                        "measure": bar_cursor + b,
                        "beat_position": float(beat),
                        "duration": 1.0,
                        "pitch": int(pitch),
                    }
                )
                note_idx += 1
        bar_cursor += bars

    total_bars = bar_cursor
    bar_chords = _bar_chord_symbols(total_bars, semantic)

    sections: List[CompiledSection] = []
    bar_start = 0
    for role in ir.section_order:
        sp = ir.section_roles.get(role)
        bars = sp.bar_count if sp else 6
        sec_events = [e for e in events if bar_start <= e["measure"] < bar_start + bars]
        harm = [
            {"symbol": bar_chords[bar_start + i], "measure": bar_start + i, "duration": 4}
            for i in range(bars)
        ]
        sections.append(
            CompiledSection(
                section_id=role,
                role=role,
                bar_start=bar_start,
                bar_end=bar_start + bars,
                melody_events=sec_events,
                harmony=harm,
                phrase_lengths=[4, 4],
                register_hint=60,
            )
        )
        bar_start += bars

    chords_flat = [{"symbol": bar_chords[i], "measure": i, "duration": 4} for i in range(total_bars)]

    return CompiledComposition(
        title=ir.title,
        sections=sections,
        melody=CompiledMelodyBlueprint(events=events),
        harmony=CompiledHarmonyPlan(chords=chords_flat),
        metadata={
            "seed": ir.seed,
            "key_hint": ir.export_hints.key_hint if ir.export_hints else "C",
            "tempo": 72,
            "slonimsky_v1_pattern_id": pattern_id,
            "slonimsky_v1_semantic": semantic,
        },
    )


def validate_ir(ir: ComposerIR) -> Any:
    """Validate IR. Returns object with valid, errors, warnings."""
    @dataclass
    class Result:
        valid: bool
        errors: List[str]
        warnings: List[str]

    errs: List[str] = []
    if not ir.title:
        errs.append("title required")
    if not ir.motivic_cells:
        errs.append("at least one motivic cell required")
    return Result(valid=len(errs) == 0, errors=errs, warnings=[])


# Re-export for consumers that import musicxml from this module
__all__ = [
    "generate_ir",
    "compile_from_ir",
    "validate_ir",
    "export_composition_to_musicxml",
    "SLONIMSKY_PATTERNS_V1",
    "select_slonimsky_pattern",
]
