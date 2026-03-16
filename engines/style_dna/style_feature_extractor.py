"""
Style Feature Extractor — Extract distinguishing fingerprints from compiled compositions.
"""

from typing import Any, Dict, List


def _get_all_events(compiled: Any) -> List[Dict]:
    events = []
    for sec in getattr(compiled, "sections", []):
        events.extend(getattr(sec, "melody_events", []))
    if not events:
        melody = getattr(compiled, "melody", None)
        if melody:
            events = getattr(melody, "events", [])
    return events


def _get_harmony(compiled: Any) -> List[Dict]:
    harmony = []
    for sec in getattr(compiled, "sections", []):
        harmony.extend(getattr(sec, "harmony", []))
    if not harmony:
        h = getattr(compiled, "harmony", None)
        if h:
            harmony = getattr(h, "chords", [])
    return harmony


def _events_to_intervals(events: List[Dict]) -> List[int]:
    if len(events) < 2:
        return []
    out = []
    prev = events[0].get("pitch", 60)
    for e in events[1:]:
        p = e.get("pitch", prev)
        out.append(p - prev)
        prev = p
    return out


def extract_interval_fingerprint(compiled_composition: Any) -> Dict[str, float]:
    """
    Interval fingerprint: step vs leap ratio, mean abs interval, characteristic intervals.
    Barry Harris: stepwise. Andrew Hill: wide. Monk: leaps. Wayne Shorter: color intervals.
    """
    events = _get_all_events(compiled_composition)
    intervals = _events_to_intervals(events)
    if not intervals:
        return {"step_ratio": 0.5, "leap_ratio": 0.2, "mean_abs": 3.0, "char_ratio": 0.3, "zero_ratio": 0.0, "wide_ratio": 0.0}
    abs_i = [abs(x) for x in intervals]
    step = sum(1 for x in abs_i if x <= 2) / len(abs_i)
    leap = sum(1 for x in abs_i if x >= 6) / len(abs_i)
    zero = sum(1 for x in abs_i if x == 0) / len(abs_i)
    wide = sum(1 for x in abs_i if x >= 10) / len(abs_i)
    mean_abs = sum(abs_i) / len(abs_i)
    char = sum(1 for x in abs_i if x in (1, 2, 5, 6, 7, 11)) / len(abs_i)
    hist = {}
    for i in abs_i:
        hist[f"i{i}"] = hist.get(f"i{i}", 0) + 1
    for k in hist:
        hist[k] /= len(abs_i)
    return {
        "step_ratio": step,
        "leap_ratio": leap,
        "mean_abs": mean_abs,
        "char_ratio": char,
        "zero_ratio": zero,
        "wide_ratio": wide,
        **hist,
    }


def extract_harmonic_fingerprint(compiled_composition: Any) -> Dict[str, float]:
    """
    Harmonic fingerprint: chord types, root movement, complexity.
    Barry Harris: 6th-diminished. Andrew Hill: clusters. Monk: sparse. Wayne Shorter: ambiguous.
    """
    harmony = _get_harmony(compiled_composition)
    if not harmony:
        return {"unique_roots": 0.3, "complexity": 0.5, "dim_ratio": 0.0, "m7_ratio": 0.3, "dom7_ratio": 0.0}
    symbols = [h.get("symbol", str(h)) for h in harmony if isinstance(h, dict)]
    if not symbols:
        return {"unique_roots": 0.3, "complexity": 0.5, "dim_ratio": 0.0, "m7_ratio": 0.3, "dom7_ratio": 0.0}
    roots = []
    for s in symbols:
        r = str(s).strip()[:2] if len(str(s)) >= 2 else str(s)
        roots.append(r)
    unique = len(set(roots)) / max(len(symbols), 1)
    dim = sum(1 for s in symbols if "dim" in str(s).lower()) / len(symbols)
    m7 = sum(1 for s in symbols if "m7" in str(s).lower() or "-7" in str(s)) / len(symbols)
    maj7 = sum(1 for s in symbols if "maj7" in str(s).lower() or "ma7" in str(s).lower()) / len(symbols)
    dom7 = sum(1 for s in symbols if ("7" in str(s) and "maj7" not in str(s).lower() and "m7" not in str(s).lower() and "dim" not in str(s).lower())) / len(symbols)
    sus = sum(1 for s in symbols if "sus" in str(s).lower()) / len(symbols)
    sixth = sum(1 for s in symbols if ("6" in str(s) and "dim" not in str(s).lower())) / len(symbols)
    cluster = sum(1 for s in symbols if "cluster" in str(s).lower()) / len(symbols)
    alt = sum(1 for s in symbols if "alt" in str(s).lower() or "b9" in str(s).lower()) / len(symbols)
    return {
        "unique_roots": unique,
        "dim_ratio": dim,
        "m7_ratio": m7,
        "maj7_ratio": maj7,
        "dom7_ratio": dom7,
        "sus_ratio": sus,
        "sixth_ratio": min(1.0, sixth),
        "cluster_ratio": cluster,
        "alt_ratio": alt,
        "complexity": min(1.0, (dim + m7 + maj7 + sus) * 0.5 + 0.3),
    }


def extract_motif_fingerprint(compiled_composition: Any) -> Dict[str, float]:
    """
    Motif fingerprint: cell repetition, variation, spacing.
    Monk: repeated cells. Barry Harris: enclosure. Wayne Shorter: variation.
    """
    events = _get_all_events(compiled_composition)
    intervals = _events_to_intervals(events)
    motif_refs = sum(len(getattr(sec, "motif_refs", [])) for sec in getattr(compiled_composition, "sections", []))
    if len(intervals) < 3:
        return {"reuse": 0.3, "variation": 0.5, "ref_density": 0.2}
    cells = [tuple(intervals[i:i+3]) for i in range(len(intervals)-2)]
    unique = len(set(cells))
    reuse = 1.0 - (unique / max(len(cells), 1))
    variation = unique / max(len(cells), 1)
    ref_density = min(1.0, motif_refs / 6.0)
    return {
        "reuse": reuse,
        "variation": variation,
        "ref_density": ref_density,
        "cell_count": min(1.0, len(cells) / 20.0),
    }


def extract_form_fingerprint(compiled_composition: Any) -> Dict[str, float]:
    """
    Form fingerprint: phrase lengths, section roles, asymmetry.
    Wayne Shorter: asymmetrical. Andrew Hill: irregular. Monk: abrupt.
    """
    sections = getattr(compiled_composition, "sections", [])
    if not sections:
        return {"phrase_spread": 0.3, "odd_ratio": 0.5, "role_count": 0.2}
    phrase_lengths = []
    for sec in sections:
        pl = getattr(sec, "phrase_lengths", [])
        if pl:
            phrase_lengths.extend(pl)
        else:
            phrase_lengths.append(getattr(sec, "bar_end", 8) - getattr(sec, "bar_start", 0))
    if not phrase_lengths:
        phrase_lengths = [4]
    roles = [getattr(sec, "role", "") for sec in sections]
    spread = (max(phrase_lengths) - min(phrase_lengths)) / max(max(phrase_lengths), 1) if phrase_lengths else 0
    odd = sum(1 for p in phrase_lengths if p % 2 == 1) / len(phrase_lengths)
    return {
        "phrase_spread": spread,
        "odd_ratio": odd,
        "role_count": len(set(roles)) / max(len(sections), 1),
        "section_count": min(1.0, len(sections) / 5.0),
    }


def extract_rhythm_fingerprint(compiled_composition: Any) -> Dict[str, float]:
    """
    Rhythm fingerprint: duration variety, beat position, density.
    Monk: abrupt punctuation. Wayne Shorter: flowing. Barry Harris: bop rhythm.
    """
    events = _get_all_events(compiled_composition)
    if not events:
        return {"dur_variety": 0.3, "offbeat_ratio": 0.2, "density": 0.5}
    durs = [e.get("duration", 1.0) for e in events]
    beats = [e.get("beat_position", 0) for e in events]
    dur_var = len(set(round(d, 2) for d in durs)) / max(len(durs), 1)
    offbeat = sum(1 for b in beats if b % 1.0 != 0) / max(len(beats), 1)
    density = len(events) / max(sum(durs), 1) * 2.0
    return {
        "dur_variety": min(1.0, dur_var * 2),
        "offbeat_ratio": offbeat,
        "density": min(1.0, density),
        "short_note_ratio": sum(1 for d in durs if d < 1.0) / max(len(durs), 1),
    }


def extract_asymmetry_fingerprint(compiled_composition: Any) -> Dict[str, float]:
    """
    Asymmetry fingerprint: phrase irregularity, structural contrast.
    """
    sections = getattr(compiled_composition, "sections", [])
    phrase_lengths = []
    for sec in sections:
        pl = getattr(sec, "phrase_lengths", [])
        if pl:
            phrase_lengths.extend(pl)
        else:
            phrase_lengths.append(getattr(sec, "bar_end", 8) - getattr(sec, "bar_start", 0))
    if not phrase_lengths:
        phrase_lengths = [4]
    spread = (max(phrase_lengths) - min(phrase_lengths)) / max(max(phrase_lengths), 1)
    odd = sum(1 for p in phrase_lengths if p % 2 == 1) / len(phrase_lengths)
    sym_penalty = 1.0 if len(set(phrase_lengths)) == 1 and len(phrase_lengths) >= 2 else 0.0
    return {
        "irreg": spread,
        "odd_ratio": odd,
        "sym_penalty": sym_penalty,
        "phrase_count": min(1.0, len(phrase_lengths) / 8.0),
    }
