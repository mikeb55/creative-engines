"""Phrase-level melody generation for the Charlie Parker engine."""

from __future__ import annotations

import hashlib
import json
import random
import re as _re
from typing import Any, Dict, List, Optional, Tuple

from parker_rhythm_engine import (
    RHYTHM_TEMPLATES,
    beats_to_divisions,
    get_strong_positions,
    get_weak_positions,
    select_rhythm_template,
)
from parker_vocabulary import PARKER_VOCABULARY, get_pattern

DIVISIONS = 4

# Alto register (Bird): clamp all phrase MIDI to this span.
_MIDI_LO = 58
_MIDI_HI = 82

NOTE_TO_PC = {"c": 0, "d": 2, "e": 4, "f": 5, "g": 7, "a": 9, "b": 11}

# Per (section, 4-bar phrase): last main pattern id and contour sign for alternation.
_last_pattern_id: Dict[Tuple[int, int], str] = {}
_last_contour_sign: Dict[Tuple[int, int], int] = {}

# GCE (Claude): cache keyed by chord_sequence_hash + generation_seed (deterministic replay).
_GCE_CACHE: Dict[str, List[Dict[str, Any]]] = {}


def _phrase_group_key(section_index: int, bar_index: int) -> Tuple[int, int]:
    return (section_index, bar_index // 4)


def _contour_sign_from_intervals(ivs: List[int]) -> int:
    s = sum(ivs)
    if s > 0:
        return 1
    if s < 0:
        return -1
    return 0


def _pick_main_pattern_entry(
    main_key: str,
    generation_seed: int,
    rng: random.Random,
    phrase_key: Tuple[int, int],
) -> Tuple[str, List[int]]:
    pool = PARKER_VOCABULARY.get(main_key, PARKER_VOCABULARY["dominant"])
    last_id = _last_pattern_id.get(phrase_key)
    prev_c = _last_contour_sign.get(phrase_key)

    sel = generation_seed
    entry = pool[sel % len(pool)]
    if last_id is not None and entry["id"] == last_id:
        sel += 1
        entry = pool[sel % len(pool)]

    ivs = list(entry["intervals_from_root"])
    sign = _contour_sign_from_intervals(ivs)
    if (
        prev_c is not None
        and prev_c != 0
        and sign != 0
        and sign == prev_c
        and rng.random() < 0.6
    ):
        sel += 1
        entry = pool[sel % len(pool)]
        ivs = list(entry["intervals_from_root"])
        sign = _contour_sign_from_intervals(ivs)

    _last_pattern_id[phrase_key] = entry["id"]
    if sign != 0:
        _last_contour_sign[phrase_key] = sign
    return entry["id"], ivs


def _prepend_quarter_rest_trim(notes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Opening quarter rest (4 divisions); drop first 4 divisions of material."""
    rest_q = _note_shape(4, is_rest=True)
    consumed = 0
    out: List[Dict[str, Any]] = []
    for n in notes:
        if consumed >= 4:
            out.append(n)
            continue
        d = int(n["duration"])
        if consumed + d <= 4:
            consumed += d
            continue
        cut = 4 - consumed
        rem = d - cut
        consumed = 4
        if n.get("is_rest"):
            out.append(_note_shape(rem, is_rest=True))
        else:
            out.append(
                _note_shape(
                    rem,
                    is_rest=False,
                    step=n["pitch"],
                    alter=float(n.get("alter", 0.0)),
                    octv=int(n["octave"]),
                    triplet=bool(n.get("triplet")) and rem <= 1,
                )
            )
    return [rest_q] + out


def _maybe_half_note_bar_end(notes: List[Dict[str, Any]], bar_index: int) -> List[Dict[str, Any]]:
    """Every 4th bar (indices 3,7,…): first 8 divisions + closing half note on last pitch."""
    if bar_index % 4 != 3 or not notes:
        return notes
    pitched = [n for n in notes if not n.get("is_rest")]
    if not pitched:
        return notes
    last_p = pitched[-1]
    prefix: List[Dict[str, Any]] = []
    t = 0
    for n in notes:
        if t >= 8:
            break
        d = int(n["duration"])
        if t + d <= 8:
            prefix.append(n)
            t += d
        else:
            need = 8 - t
            if n.get("is_rest"):
                prefix.append(_note_shape(need, is_rest=True))
            else:
                prefix.append(
                    _note_shape(
                        need,
                        is_rest=False,
                        step=n["pitch"],
                        alter=float(n.get("alter", 0.0)),
                        octv=int(n["octave"]),
                        triplet=bool(n.get("triplet")) and need <= 1,
                    )
                )
            t = 8
            break
    half = _note_shape(
        8,
        is_rest=False,
        step=last_p["pitch"],
        alter=float(last_p.get("alter", 0.0)),
        octv=int(last_p["octave"]),
        triplet=False,
    )
    return prefix + [half]


def _norm_chord(sym: str) -> str:
    return (sym or "").split("/")[0].strip()


def _has_maj7(sym: str) -> bool:
    low = sym.lower()
    return "maj7" in low or "Δ" in sym or ("maj" in low and "7" in low)


def _has_min7(sym: str) -> bool:
    low = sym.lower()
    return "m7" in low or "-7" in low


def _is_half_dim(sym: str) -> bool:
    low = sym.lower()
    return "ø" in sym or "m7b5" in low


def _is_dom7(sym: str) -> bool:
    low = sym.lower()
    if not sym or "sus" in low:
        return "sus" in low
    if _has_maj7(sym):
        return False
    if _has_min7(sym) and "b5" not in low:
        return False
    if "m7" in low or low.endswith("m7"):
        return False
    return "7" in sym


def _is_min_tonic(sym: str) -> bool:
    low = sym.lower()
    if not sym.strip():
        return False
    if "7" in low or "maj" in low:
        return False
    return low.endswith("m") or low.endswith("min")


def detect_harmonic_context(
    chord: str,
    next_chord: str = "",
    next_next_chord: str = "",
) -> str:
    """
    Classify harmony for vocabulary / rhythm bias.
    ii m7 -> V7 => ii_V; standalone 7 => V/dominant; maj7 => tonic_major;
    minor tonic => tonic_minor; sus => dominant; turnaround fragment => turnaround.
    """
    c = _norm_chord(chord)
    n = _norm_chord(next_chord)
    nn = _norm_chord(next_next_chord)
    low = c.lower()

    if "sus" in low:
        return "dominant"
    if _is_half_dim(c):
        return "ii"
    if _has_maj7(c):
        if _has_min7(n) and _is_dom7(nn):
            return "turnaround"
        return "tonic_major"
    if _has_min7(c) and _is_dom7(n):
        return "ii_V"
    if _has_min7(c):
        return "ii"
    if _is_dom7(c):
        return "V"
    if _is_min_tonic(c):
        return "tonic_minor"
    return "dominant"


def _parse_root(sym: str) -> Tuple[str, int]:
    left = sym.split("/")[0].strip()
    m = _re.match(r"^([A-Ga-g])([#b♯♭]?)", left)
    if not m:
        return "C", 0
    step = m.group(1).upper()
    acc = m.group(2) or ""
    if acc in ("#", "♯"):
        return step, 1
    if acc in ("b", "♭"):
        return step, -1
    return step, 0


def _root_pc(sym: str) -> int:
    step, alt = _parse_root(sym)
    pc = NOTE_TO_PC[step.lower()]
    return (pc + alt) % 12


def _midi_for_interval(sym: str, interval_from_root: int, bar_seed: int) -> int:
    pc = _root_pc(sym)
    base = 60 + ((pc - (60 % 12) + 12) % 12)
    midi = base + interval_from_root
    while midi < _MIDI_LO:
        midi += 12
    while midi > _MIDI_HI:
        midi -= 12
    tweak = (bar_seed // 11) % 2
    if tweak and midi + 12 <= _MIDI_HI:
        midi += 12
    return max(_MIDI_LO, min(_MIDI_HI, midi))


def _midi_from_note_dict(n: Dict[str, Any]) -> int:
    """Inverse of _spell_pitch for register carry (small search)."""
    step = str(n["pitch"])
    want_alter = float(n.get("alter", 0.0))
    want_oct = int(n["octave"])
    for m in range(_MIDI_LO, _MIDI_HI + 1):
        s, al, o = _spell_pitch(m)
        if s == step and abs(al - want_alter) < 0.01 and o == want_oct:
            return m
    return (_MIDI_LO + _MIDI_HI) // 2


def _spell_pitch(midi: int) -> Tuple[str, float, int]:
    pc = midi % 12
    octave = (midi // 12) - 1
    table = [
        ("C", 0.0),
        ("C", 1.0),
        ("D", 0.0),
        ("D", 1.0),
        ("E", 0.0),
        ("F", 0.0),
        ("F", 1.0),
        ("G", 0.0),
        ("G", 1.0),
        ("A", 0.0),
        ("A", 1.0),
        ("B", 0.0),
    ]
    step, alter = table[pc]
    return step, alter, octave


def _note_shape(
    dur: int,
    *,
    is_rest: bool,
    step: str = "B",
    alter: float = 0.0,
    octv: int = 3,
    triplet: bool = False,
) -> Dict[str, Any]:
    if is_rest:
        if dur >= 16:
            typ = "whole"
        elif dur >= 8:
            typ = "half"
        elif dur >= 4:
            typ = "quarter"
        else:
            typ = "eighth"
        return {
            "pitch": step,
            "octave": octv,
            "alter": alter,
            "duration": dur,
            "type": typ,
            "is_rest": True,
            "is_chord": False,
            "dot": False,
            "triplet": triplet,
        }
    dot = False
    if dur >= 16:
        typ = "whole"
    elif dur >= 12:
        typ = "half"
        dot = True
    elif dur >= 8:
        typ = "half"
    elif dur >= 6:
        typ = "quarter"
        dot = True
    elif dur >= 4:
        typ = "quarter"
    elif dur >= 3:
        typ = "eighth"
        dot = True
    elif dur >= 2:
        typ = "eighth"
    else:
        typ = "eighth"
        triplet = triplet or dur == 1
    return {
        "pitch": step,
        "octave": octv,
        "alter": alter,
        "duration": dur,
        "type": typ,
        "is_rest": False,
        "is_chord": False,
        "dot": dot,
        "triplet": triplet,
    }


def _snap_register(prev: int, raw: int) -> int:
    m = raw
    for _ in range(4):
        if m - prev > 7:
            m -= 12
        elif prev - m > 7:
            m += 12
        else:
            break
    return max(_MIDI_LO, min(_MIDI_HI, m))


def _is_triplet_beat(beats: float) -> bool:
    return abs(beats - 0.333) < 0.02 or abs(beats - 1.0 / 3.0) < 0.02


def _template_eighth_ratio(template: Dict[str, Any]) -> float:
    ds = [float(d) for d in template["durations"] if d is not None]
    if not ds:
        return 0.0
    hits = sum(1 for d in ds if abs(d - 0.5) < 0.02 or _is_triplet_beat(d))
    return hits / len(ds)


def _pick_triplet_template(phrase_role: str, bar_index: int, generation_seed: int) -> Dict[str, Any]:
    trip_pool = [
        t
        for t in RHYTHM_TEMPLATES
        if t.get("triplet_count", 0) > 0 and t.get("id") != "rh_010"
    ]
    sub = [t for t in trip_pool if t["phrase_role"] == phrase_role]
    if not sub:
        sub = [t for t in trip_pool if t["phrase_role"] in ("continuation", "launch", "ending")]
    if not sub:
        sub = trip_pool
    return sub[(bar_index * 5 + generation_seed) % len(sub)]


def _pick_eighth_heavy_template(
    phrase_role: str,
    bar_index: int,
    generation_seed: int,
) -> Dict[str, Any]:
    pool = [t for t in RHYTHM_TEMPLATES if t["phrase_role"] == phrase_role]
    if not pool:
        pool = list(RHYTHM_TEMPLATES)
    scored = sorted(
        pool,
        key=lambda t: (_template_eighth_ratio(t), t.get("crossbar_bias", 0)),
        reverse=True,
    )
    top = [t for t in scored if _template_eighth_ratio(t) >= 0.55]
    if not top:
        top = scored[:5]
    return top[(bar_index * 3 + generation_seed) % len(top)]


def _chord_sequence_hash(chord_symbols: List[str]) -> str:
    seq = " | ".join(str(c).strip() for c in (chord_symbols or []) if c and str(c).strip())
    if not seq:
        seq = "?"
    return hashlib.sha256(seq.encode("utf-8")).hexdigest()


def _gce_cache_key(chord_symbols: List[str], generation_seed: int) -> str:
    return f"{_chord_sequence_hash(chord_symbols)}:{generation_seed}"


def _extract_json_array(text: str) -> Optional[str]:
    if not text:
        return None
    s = text.strip()
    fence = _re.search(r"```(?:json)?\s*(\[[\s\S]*?\])\s*```", s, _re.IGNORECASE)
    if fence:
        return fence.group(1).strip()
    lo = s.find("[")
    hi = s.rfind("]")
    if lo < 0 or hi <= lo:
        return None
    return s[lo : hi + 1]


def _coerce_float_alter(v: Any) -> float:
    if v is None:
        return 0.0
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0


def _normalize_claude_note(obj: Any) -> Optional[Dict[str, Any]]:
    if not isinstance(obj, dict):
        return None
    is_rest = bool(obj.get("is_rest"))
    try:
        dur = int(obj.get("duration", 0))
    except (TypeError, ValueError):
        return None
    if dur < 1:
        return None
    triplet = bool(obj.get("triplet", False))
    if is_rest:
        return _note_shape(dur, is_rest=True, triplet=triplet)
    pitch_raw = obj.get("pitch", "C")
    step = str(pitch_raw).strip()
    if not step:
        step = "C"
    step = step[0].upper()
    if step.lower() not in NOTE_TO_PC:
        return None
    try:
        octv = int(obj.get("octave", 4))
    except (TypeError, ValueError):
        octv = 4
    alter = _coerce_float_alter(obj.get("alter", 0))
    raw_midi = None
    for m in range(12 * 5, 12 * 11):
        s, al, o = _spell_pitch(m)
        if s == step and abs(al - alter) < 0.01 and o == octv:
            raw_midi = m
            break
    if raw_midi is None:
        pc = (NOTE_TO_PC[step.lower()] + int(round(alter))) % 12
        raw_midi = 12 * (octv + 1) + pc
    raw_midi = max(_MIDI_LO, min(_MIDI_HI, int(raw_midi)))
    step, alter, octv = _spell_pitch(raw_midi)
    return _note_shape(dur, is_rest=False, step=step, alter=alter, octv=octv, triplet=triplet)


def _fit_sixteen_divisions(notes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    out = [dict(n) for n in notes if isinstance(n, dict)]
    total = sum(int(n.get("duration", 0)) for n in out)
    while total > 16 and out:
        excess = total - 16
        last = out[-1]
        ld = int(last.get("duration", 0))
        if ld > excess:
            new_d = ld - excess
            is_r = bool(last.get("is_rest"))
            if is_r:
                out[-1] = _note_shape(new_d, is_rest=True, triplet=bool(last.get("triplet")))
            else:
                out[-1] = _note_shape(
                    new_d,
                    is_rest=False,
                    step=str(last["pitch"]),
                    alter=float(last.get("alter", 0.0)),
                    octv=int(last["octave"]),
                    triplet=bool(last.get("triplet")) and new_d <= 1,
                )
            total = 16
            break
        out.pop()
        total -= ld
    if total < 16:
        out.append(_note_shape(16 - total, is_rest=True))
    return out


def _build_claude_prompt(
    chord_symbols: List[str],
    phrase_role: str,
    start_pitch: int,
    generation_seed: int,
    section_index: int,
    bar_index: int,
) -> str:
    seq = " | ".join(str(c).strip() for c in (chord_symbols or []) if c and str(c).strip())
    if not seq:
        seq = "Cmaj7"
    bar_in_section = bar_index % 8
    return f"""You are generating one 4/4 bar of Charlie Parker (Bird) alto saxophone melody as MusicXML-oriented note data.

Chord sequence (harmonic context for this bar; play through these changes in order across the bar as appropriate): {seq}

Phrase role: {phrase_role} (e.g. opening/launch, continuation, ending, turnaround — interpret musically).

Section index (0-based 8-bar sections): {section_index}. Bar index within tune: {bar_index}. Bar within 8-bar section: {bar_in_section}.

Register hint: prefer staying near MIDI pitch {start_pitch} (alto range), but keep all notes in MIDI range 58–82 inclusive.

Style requirements (Bird / bebop):
- At least 90% of attacked (non-rest) notes should be eighth-note length at this metric level (duration 2 in the schema below; quarter = 4, half = 8).
- Use chromatic approach notes, enclosures around chord tones, and bebop-scale style passing tones.
- Include triplet punctuation on some eighth-groupings when it fits (set triplet true on those notes; not every note).
- Aim for triplet punctuation roughly every 2–4 bars — this bar index is {bar_index}; use triplets here if (bar_index % 3) == 0, otherwise sparse triplets only if musical.
- Include short rests for breathing (is_rest true).

Output: ONLY a JSON array (no prose, no markdown fences). Each element must be exactly:
{{"pitch":"D","octave":4,"alter":0,"duration":2,"type":"eighth","is_rest":false,"triplet":false,"dot":false,"is_chord":false}}

Rules:
- pitch: letter A–G only (use alter for accidentals).
- duration: integer in divisions where quarter note = 4 (so eighth = 2). The sum of all durations in the array must equal exactly 16 (one 4/4 bar).
- type: one of whole, half, quarter, eighth (match duration).
- is_rest: boolean; rests still need pitch/octave/alter placeholders (use middle C defaults) or use pitch C octave 4 alter 0 for rests.

Deterministic id: generation_seed={generation_seed} — honor phrasing consistency with this seed.
"""


def _claude_response_text(response: Any) -> str:
    blocks = getattr(response, "content", None) or []
    parts: List[str] = []
    for b in blocks:
        t = getattr(b, "text", None)
        if t:
            parts.append(str(t))
    return "".join(parts)


def _generate_parker_phrase_via_claude(
    chord_symbols: List[str],
    phrase_role: str,
    start_pitch: int,
    generation_seed: int,
    section_index: int,
    bar_index: int,
) -> Optional[List[Dict[str, Any]]]:
    try:
        import anthropic
    except ImportError:
        return None
    prompt = _build_claude_prompt(
        chord_symbols,
        phrase_role,
        start_pitch,
        generation_seed,
        section_index,
        bar_index,
    )
    try:
        client = anthropic.Anthropic()
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}],
        )
        raw_text = _claude_response_text(response)
        js = _extract_json_array(raw_text)
        if not js:
            return None
        data = json.loads(js)
        if not isinstance(data, list):
            return None
        notes: List[Dict[str, Any]] = []
        for item in data:
            n = _normalize_claude_note(item)
            if n:
                notes.append(n)
        if not notes:
            return None
        notes = _fit_sixteen_divisions(notes)
        if sum(int(x["duration"]) for x in notes) != 16:
            return None
        pitched = [x for x in notes if not x.get("is_rest")]
        if not pitched:
            return None
        return notes
    except Exception:
        return None


def _generate_parker_phrase_deterministic(
    chord_symbols: List[str],
    phrase_role: str,
    start_pitch: int,
    generation_seed: int,
    section_index: int = 0,
    bar_index: int = 0,
) -> Tuple[List[Dict[str, Any]], int]:
    rng = random.Random(generation_seed)
    chord = chord_symbols[0] if chord_symbols else "Cmaj7"
    nxt = chord_symbols[1] if len(chord_symbols) > 1 else ""
    nn = chord_symbols[2] if len(chord_symbols) > 2 else ""

    hctx = detect_harmonic_context(chord, nxt, nn)
    role_rhythm = phrase_role
    up = detect_harmonic_context(nxt, nn, "")
    if rng.random() < 0.25 and (
        up in ("tonic_major", "tonic_minor", "I", "V", "dominant")
        or hctx == "turnaround"
    ):
        role_rhythm = "anticipation"

    want_triplet = ((bar_index + generation_seed + section_index) % 4) in (0, 2)

    if section_index == 2 and (bar_index % 8) == 0:
        main_key = "bridge_launch"
    elif phrase_role == "ending" or role_rhythm == "ending":
        main_key = "phrase_endings"
    else:
        main_key = hctx if hctx in PARKER_VOCABULARY else "dominant"

    phrase_key = _phrase_group_key(section_index, bar_index)
    rest_period = 4 + (abs(generation_seed) % 5)
    should_rest_open = (
        bar_index > 0
        and (bar_index % rest_period == 0)
        and rng.random() < 0.3
    )

    _, main_pat = _pick_main_pattern_entry(main_key, generation_seed, rng, phrase_key)

    notes: List[Dict[str, Any]] = []
    prev_midi = start_pitch

    for rebuild in range(4):
        if rebuild == 0 and want_triplet:
            template = _pick_triplet_template(phrase_role, bar_index, generation_seed)
        elif rebuild == 0:
            template = select_rhythm_template(
                bar_index, role_rhythm, generation_seed, hctx
            )
            if _template_eighth_ratio(template) < 0.5:
                template = _pick_eighth_heavy_template(
                    role_rhythm, bar_index, generation_seed
                )
        else:
            template = _pick_eighth_heavy_template(
                role_rhythm,
                bar_index + rebuild,
                generation_seed + rebuild * 29,
            )

        offset = 1 if template.get("starts_on") == "and" else 0
        strong_set = {
            i
            for i, d in enumerate(template["durations"])
            if d is not None and float(d) >= 0.5 and (i + offset) % 2 == 0
        }
        weak_set = {
            i
            for i, d in enumerate(template["durations"])
            if d is not None and float(d) <= 0.5 and (i + offset) % 2 == 1
        }
        if template.get("triplet_count", 0) > 0:
            strong_set |= set(get_strong_positions(template))
            weak_set = {i for i in weak_set if i not in strong_set}
        if not strong_set:
            strong_set = set(get_strong_positions(template))
        if not weak_set:
            weak_set = set(get_weak_positions(template)) - strong_set

        notes = []
        prev_midi = start_pitch
        strong_attack = 0

        for i, d in enumerate(template["durations"]):
            if d is None:
                rest_beats = 0.5
                dur = beats_to_divisions(rest_beats, DIVISIONS)
                notes.append(_note_shape(dur, is_rest=True))
                continue

            beats = float(d)
            is_trip = _is_triplet_beat(beats) or (
                template.get("triplet_count", 0) > 0 and 0.3 < beats < 0.5
            )
            dur = 1 if is_trip else beats_to_divisions(beats, DIVISIONS)

            if i in strong_set:
                iv = main_pat[strong_attack % len(main_pat)]
                strong_attack += 1
                raw_midi = _midi_for_interval(chord, iv, generation_seed + i * 13)
                src = "chord_tone"
            else:
                if rng.random() < 0.5:
                    mic = get_pattern("enclosures", generation_seed + i * 17)
                else:
                    mic = get_pattern("approach_cells", generation_seed + i * 19)
                iv = mic[(generation_seed + i * 3) % len(mic)]
                raw_midi = _midi_for_interval(chord, iv, generation_seed + i * 13)
                src = "approach"

            midi = _snap_register(prev_midi, raw_midi)
            prev_midi = midi
            step, alter, octv = _spell_pitch(midi)
            n = _note_shape(
                dur, is_rest=False, step=step, alter=alter, octv=octv, triplet=is_trip
            )
            if src == "approach":
                n["approach"] = True
            notes.append(n)

        attacks = [n for n in notes if not n.get("is_rest")]
        eighth_like = [
            n
            for n in attacks
            if int(n["duration"]) == 2
            or (bool(n.get("triplet")) and int(n["duration"]) <= 1)
        ]
        if not attacks or (len(eighth_like) / len(attacks)) >= 0.55:
            break

    if should_rest_open:
        notes = _prepend_quarter_rest_trim(notes)
    notes = _maybe_half_note_bar_end(notes, bar_index)
    attacks = [n for n in notes if not n.get("is_rest")]
    if attacks:
        prev_midi = _midi_from_note_dict(attacks[-1])
    else:
        prev_midi = start_pitch

    return notes, prev_midi


def generate_parker_phrase(
    chord_symbols: List[str],
    phrase_role: str,
    start_pitch: int,
    generation_seed: int,
    section_index: int = 0,
    bar_index: int = 0,
) -> Tuple[List[Dict[str, Any]], int]:
    """
    Build one bar of notes plus carried register using Claude (GCE) when available,
    else deterministic vocabulary/rhythm. Note dicts match parker_section_compiler.

    Primary melody output is the note list; return value includes carried MIDI register
    for the next bar (parker_section_compiler contract).
    """
    key = _gce_cache_key(chord_symbols, generation_seed)
    gce_notes: Optional[List[Dict[str, Any]]] = _GCE_CACHE.get(key)

    if gce_notes is None:
        gce_notes = _generate_parker_phrase_via_claude(
            chord_symbols,
            phrase_role,
            start_pitch,
            generation_seed,
            section_index,
            bar_index,
        )
        if gce_notes is not None:
            _GCE_CACHE[key] = [dict(n) for n in gce_notes]

    if gce_notes is not None:
        notes = [dict(n) for n in gce_notes]
        notes = _maybe_half_note_bar_end(notes, bar_index)
        attacks = [n for n in notes if not n.get("is_rest")]
        if attacks:
            next_pitch = _midi_from_note_dict(attacks[-1])
        else:
            next_pitch = start_pitch
        return notes, next_pitch

    return _generate_parker_phrase_deterministic(
        chord_symbols,
        phrase_role,
        start_pitch,
        generation_seed,
        section_index,
        bar_index,
    )
