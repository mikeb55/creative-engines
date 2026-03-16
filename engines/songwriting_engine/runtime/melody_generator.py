"""
Melody Generator — Motif-led, harmony-aware, section-specific.
Uses songwriting_intelligence for contour, motif shape, peak location.
"""

import random
from typing import Any, Dict, List, Optional, Tuple

try:
    from .songwriting_intelligence import (
        choose_phrase_contour,
        choose_motif_shape,
        choose_melodic_peak_location,
        choose_progression_by_section,
    )
except ImportError:
    from songwriting_intelligence import (
        choose_phrase_contour,
        choose_motif_shape,
        choose_melodic_peak_location,
        choose_progression_by_section,
    )

MALE_TENOR = (48, 69)
FEMALE_VOCAL = (57, 77)
MAX_MOTIFS = 3
SCALE = [0, 2, 4, 5, 7, 9, 11]

CHORD_TONES: Dict[str, List[int]] = {
    "C": [0, 4, 7], "Cm": [0, 3, 7], "C7": [0, 4, 7, 10],
    "Dm": [2, 5, 9], "Dm7": [2, 5, 9, 12], "D7": [2, 6, 9, 12],
    "Em": [4, 7, 11], "E7": [4, 8, 11, 14], "F": [5, 9, 12],
    "G": [7, 11, 14], "G7": [7, 11, 14, 17], "Am": [9, 12, 16],
    "Bm": [11, 14, 18], "B7": [11, 15, 18, 21],
}
COLOR_TONES = [2, 4, 6, 9, 11]


def _vocal_range(vocal_target: str) -> tuple:
    return MALE_TENOR if vocal_target == "male_tenor" else FEMALE_VOCAL


def _clamp_pitch(pitch: int, vocal_target: str) -> int:
    lo, hi = _vocal_range(vocal_target)
    return max(lo, min(hi, pitch))


def _chord_tones_for_symbol(symbol: str, root_midi: int = 60) -> List[int]:
    s = symbol.strip().upper()
    root_map = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
    root_pc = root_map.get(s[0] if s else "C", 0)
    key = s[0] + ("m" if "m" in s else "") + ("7" if "7" in s else "")
    degrees = CHORD_TONES.get(key, CHORD_TONES.get(s[0], [0, 4, 7]))
    octave = root_midi // 12
    return [((d + root_pc) % 12) + octave * 12 for d in degrees]


def _color_tones_for_key(root_midi: int = 60) -> List[int]:
    octave = root_midi // 12
    return [((d % 12) + octave * 12) for d in COLOR_TONES]


def _contour_rise(length: int, lo: int, hi: int, seed: int) -> List[int]:
    random.seed(seed)
    step = max(1, (hi - lo) // max(1, length - 1))
    return [_clamp_pitch(lo + i * step, "male_tenor") for i in range(length)]


def _contour_fall(length: int, lo: int, hi: int, seed: int) -> List[int]:
    random.seed(seed)
    start = min(hi, lo + (length - 1) * 2)
    return [_clamp_pitch(start - i * 2, "male_tenor") for i in range(length)]


def _contour_arch(length: int, lo: int, hi: int, seed: int) -> List[int]:
    random.seed(seed)
    mid = length // 2
    rise = list(range(lo, min(hi, lo + mid * 2) + 1, 2))[: mid + 1]
    fall = [rise[-1] - (i + 1) * 2 for i in range(length - len(rise))]
    return [_clamp_pitch(p, "male_tenor") for p in (rise + fall)[:length]]


def _contour_rise_hold_fall(length: int, lo: int, hi: int, seed: int) -> List[int]:
    random.seed(seed)
    peak_idx = min(length // 3, 2)
    peak = _clamp_pitch(lo + peak_idx * 2, "male_tenor")
    out = [_clamp_pitch(lo + i * 2, "male_tenor") for i in range(peak_idx)]
    out += [peak] * max(1, length // 4)
    while len(out) < length:
        out.append(_clamp_pitch(peak - (len(out) - peak_idx - 1) * 2, "male_tenor"))
    return out[:length]


def _contour_repeat_then_leap(length: int, lo: int, hi: int, seed: int) -> List[int]:
    random.seed(seed)
    repeat_len = min(3, length // 2)
    base = [lo, lo + 2, lo + 4][:repeat_len]
    leap = _clamp_pitch(lo + 7, "male_tenor")
    rest = [_clamp_pitch(leap - 2 * (i + 1), "male_tenor") for i in range(length - repeat_len - 1)]
    return (base + [leap] + rest)[:length]


def _contour_fall_then_leap(length: int, lo: int, hi: int, seed: int) -> List[int]:
    random.seed(seed)
    fall_len = length // 2
    fall = [_clamp_pitch(hi - i * 2, "male_tenor") for i in range(fall_len)]
    leap = _clamp_pitch(lo + 7, "male_tenor")
    rest = [_clamp_pitch(leap - 2 * (i + 1), "male_tenor") for i in range(length - fall_len - 1)]
    return (fall + [leap] + rest)[:length]


CONTOUR_FNS = {
    "rise": _contour_rise,
    "fall": _contour_fall,
    "arch": _contour_arch,
    "rise_hold_fall": _contour_rise_hold_fall,
    "repeat_then_leap": _contour_repeat_then_leap,
    "fall_then_leap": _contour_fall_then_leap,
    "narrow_gradual": _contour_rise,
    "repeated_peak": _contour_rise_hold_fall,
    "contrast_arch": _contour_arch,
}


def _transform_motif(
    motif: List[int],
    transform: str,
    vocal_target: str,
    seed: int,
) -> List[int]:
    """Apply: rhythmic_variation, changed_ending, compression, expansion, sequencing."""
    random.seed(seed)
    if transform == "interval_expansion":
        return [
            _clamp_pitch(motif[0] + (motif[i] - motif[0]) * 2 if i > 0 else motif[0], vocal_target)
            for i in range(len(motif))
        ]
    if transform == "compression":
        return [motif[i * 2] for i in range((len(motif) + 1) // 2)]
    if transform == "repetition_changed_ending":
        head = motif[:-1] if len(motif) > 1 else motif
        new_end = _clamp_pitch(motif[-1] + random.choice([-2, 2]), vocal_target)
        return head + [new_end]
    if transform == "sequencing":
        step = random.choice([2, -2])
        return [_clamp_pitch(p + step, vocal_target) for p in motif]
    if transform == "rhythmic_variation":
        return motif[:]
    return motif[:]


def generate_motifs(
    count: int,
    root_midi: int,
    vocal_target: str,
    seed: Optional[int] = None,
) -> List[List[int]]:
    """Generate seed motif using choose_motif_shape. Primary motif is index 0."""
    if seed is not None:
        random.seed(seed)
    lo, hi = _vocal_range(vocal_target)
    motifs = []
    shape = choose_motif_shape("verse", seed)
    contour_map = {"narrow": "rise", "repeated_peak": "rise_hold_fall"}
    primary_contour = contour_map.get(shape, shape)
    fn = CONTOUR_FNS.get(primary_contour, _contour_arch)
    primary = fn(5, lo, hi, (seed or 0) + 1)
    motifs.append(primary)

    for i in range(1, min(count, MAX_MOTIFS)):
        transform = ["sequencing", "compression", "repetition_changed_ending"][i % 3]
        derived = _transform_motif(primary, transform, vocal_target, (seed or 0) + i * 1000)
        motifs.append(derived)

    return motifs


def _harmony_at_beat(harmonic_outline: List[Dict], measure: int, beat: float) -> Optional[str]:
    for h in harmonic_outline:
        if h.get("measure", 0) == measure:
            return h.get("symbol", "C")
    if harmonic_outline:
        idx = measure % len(harmonic_outline)
        return harmonic_outline[idx].get("symbol", "C")
    return "C"


def _select_harmony_aware_pitch(
    motif_pitch: int,
    chord_midis: List[int],
    color_midis: List[int],
    role: str,
    beat_in_phrase: float,
    vocal_target: str,
    seed: int,
) -> int:
    """Intentional chord/color tones; delayed resolution; suspension-like tension."""
    random.seed(seed)
    chord_set = set(p % 12 for p in chord_midis)
    color_set = set(p % 12 for p in color_midis)
    p = motif_pitch
    pc = p % 12
    octave = p // 12

    if role == "chorus":
        blend = 0.65
        use_color = beat_in_phrase < 2.0
    elif role == "verse":
        blend = 0.45
        use_color = beat_in_phrase > 3.0
    else:
        blend = 0.5
        use_color = True

    if pc in chord_set:
        nearest = min(chord_midis, key=lambda x: abs((x % 12) - pc))
        target = (nearest % 12) + octave * 12
    elif use_color and pc in color_set:
        nearest = min(color_midis, key=lambda x: abs((x % 12) - pc))
        target = (nearest % 12) + octave * 12
    else:
        nearest = min(chord_midis, key=lambda x: abs((x % 12) - pc))
        target = (nearest % 12) + octave * 12

    result = int(p * (1 - blend) + target * blend)
    return _clamp_pitch(result, vocal_target)


def generate_melody_for_section(
    section: Dict[str, Any],
    motifs: List[List[int]],
    vocal_target: str,
    bars: int,
    harmonic_outline: List[Dict],
    seed: Optional[int] = None,
    song_identity: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    """Motif-led melody: primary motif in chorus, transformations in verse. Harmony-aware."""
    if seed is not None:
        random.seed(seed)

    role = section.get("section_role", "verse")
    bar_start = section.get("bar_start", 0)
    lo, hi = _vocal_range(vocal_target)
    chorus_transpose = 4 if role == "chorus" else 0
    beats_per_bar = 4
    total_beats = bars * beats_per_bar

    phrase_contour = choose_phrase_contour(role, seed)
    choose_melodic_peak_location(role, seed)

    primary_motif = motifs[0] if motifs else [60, 62, 64]
    all_motifs = motifs if motifs else [[60, 62, 64]]

    if role == "chorus":
        motif_choice = [0]
        transform_bias = ["none", "repetition_changed_ending"]
    elif role == "bridge":
        motif_choice = [0, 1]
        transform_bias = ["sequencing", "compression"] if "fall" in phrase_contour else ["compression", "sequencing"]
    else:
        motif_choice = [0, 1, 2] if len(all_motifs) >= 3 else [0, 1]
        transform_bias = ["repetition_changed_ending", "compression", "sequencing", "none"]

    events = []
    event_id = 0
    motif_idx = 0
    beat = 0.0
    phrase_beat = 0.0
    phrase_len = 8.0

    while beat < total_beats:
        mi = motif_choice[motif_idx % len(motif_choice)]
        motif = list(all_motifs[mi]) if mi < len(all_motifs) else list(primary_motif)
        motif_idx += 1

        transform = random.choice(transform_bias)
        if transform != "none":
            motif = _transform_motif(motif, transform, vocal_target, (seed or 0) + int(beat))

        for i, p in enumerate(motif):
            if beat >= total_beats:
                break
            local_measure = int(beat // beats_per_bar)
            measure = bar_start + local_measure
            beat_pos = beat % beats_per_bar
            p = _clamp_pitch(p + chorus_transpose, vocal_target)

            chord = _harmony_at_beat(harmonic_outline, measure, beat_pos)
            chord_midis = _chord_tones_for_symbol(chord, 60)
            color_midis = _color_tones_for_key(60)
            beat_in_phrase = phrase_beat % 4

            pitch = _select_harmony_aware_pitch(
                p, chord_midis, color_midis, role, beat_in_phrase, vocal_target, (seed or 0) + int(beat * 10)
            )

            duration = 1.0
            events.append({
                "id": f"mel_{event_id}",
                "pitch": pitch,
                "beat_position": beat_pos,
                "duration": duration,
                "measure": measure,
                "section_id": section.get("id", ""),
            })
            event_id += 1
            beat += duration

        beat += 0.5
        phrase_beat += len(motif) * 1.0 + 0.5
        if phrase_beat >= phrase_len:
            beat += 1.0
            phrase_beat = 0.0

    return events


def generate_harmonic_outline(
    section: Dict,
    key_center: str,
    bars: int,
    seed: Optional[int] = None,
) -> List[Dict]:
    bar_start = section.get("bar_start", 0)
    role = section.get("section_role", "verse")
    prog = choose_progression_by_section(role, key_center, seed)

    outline = []
    for m in range(bars):
        outline.append({
            "symbol": prog[m % len(prog)],
            "measure": bar_start + m,
            "beat_position": 0,
            "duration": 4,
        })
    return outline
