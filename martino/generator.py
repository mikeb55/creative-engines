#!/usr/bin/env python3
"""
Martino Linear Expressions Engine.
Generate MusicXML linear overlays from tune_config (chords, form, activities, LFV).
API: generate_musicxml, build_activity_map, enforce_lfv, increment_version.
"""
from __future__ import annotations

import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

try:
    from master_loader import TemplateUnavailableError, build_canonical_melody
except ImportError:
    build_canonical_melody = None  # type: ignore
    TemplateUnavailableError = RuntimeError  # type: ignore

from martino_convert import martino_convert, pc_to_minor_root_name

_ENGINE_DIR = Path(__file__).resolve().parent
_SPEC_PATH = _ENGINE_DIR / "engine_spec.json"
_PROVENANCE_DIR = _ENGINE_DIR.parent / "temp" / "martino" / "provenance"


def provenance_json_path(musicxml_path: Path) -> Path:
    """Sidecar provenance path (repo temp — not the user MusicXML library folder)."""
    return _PROVENANCE_DIR / f"{musicxml_path.stem}.provenance.json"

# Default LFV pitch bounds (guitar frets 5-9, standard tuning)
STEP_TO_MIDI_BASE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def _load_spec() -> dict:
    with open(_SPEC_PATH, encoding="utf-8") as f:
        return json.load(f)


def _pitch_to_midi(step: str, octave: int, alter: int | None) -> int:
    s = step[0] if len(step) > 1 else step
    a = alter
    if a is None and isinstance(step, str):
        a = -1 if "b" in step else (1 if "#" in step else 0)
    a = a or 0
    base = STEP_TO_MIDI_BASE.get(s, 0)
    return (int(octave) + 1) * 12 + base + a


def _midi_to_lfv_bounds(lfv_config: dict) -> tuple[int, int]:
    """Return (min_midi, max_midi) for LFV fret range (guitar)."""
    spec = _load_spec()
    default_bounds = spec.get("lfv_default", {}).get("pitch_bounds", {})
    min_midi = default_bounds.get("min_midi", 38)
    max_midi = default_bounds.get("max_midi", 68)
    # Could override from lfv_config if we stored midi bounds per fret range
    return min_midi, max_midi


def increment_version(prefix: str, path_or_dir: Path | str) -> str:
    """
    If a file matching the version prefix already exists in the given path/dir, return next version.
    prefix: e.g. "V4.1"
    path_or_dir: output file path or directory to check for existing files with same stem pattern.
    Returns e.g. "V4.2" if V4.1_... exists, else "V4.1".
    """
    path_or_dir = Path(path_or_dir)
    if path_or_dir.is_file():
        directory = path_or_dir.parent
        stem = path_or_dir.stem
    else:
        directory = path_or_dir
        stem = ""
    m = re.match(r"^V(\d+)\.(\d+)(_.*)?$", prefix)
    if not m:
        return prefix
    x, y = int(m.group(1)), int(m.group(2))
    pattern = f"V{x}.{y}_*"
    existing = list(directory.glob(pattern + ".musicxml")) if directory.exists() else []
    if existing:
        return f"V{x}.{y + 1}"
    return prefix


def enforce_lfv(
    note_sequence: list[dict],
    lfv_config: dict,
) -> tuple[list[dict], list[tuple[int, bool]]]:
    """
    Enforce LFV pitch bounds on a note sequence.
    note_sequence: list of {"step", "octave", "alter", "duration"} (alter optional).
    lfv_config: {"min_fret": 5, "max_fret": 9} or may include min_midi/max_midi.
    Returns (adjusted_note_sequence, out_of_range_flags) where out_of_range_flags is list of (index, True) for notes that were out of range (after optional clamping).
    Engine does not transpose by default; it only flags. Caller can clamp octave to bring into range.
    """
    min_midi, max_midi = _midi_to_lfv_bounds(lfv_config)
    adjusted = []
    out_of_range_flags: list[tuple[int, bool]] = []
    for i, n in enumerate(note_sequence):
        step = n.get("step", "C")
        octave = int(n.get("octave", 4))
        alter = n.get("alter")
        if alter is not None:
            alter = int(alter)
        midi = _pitch_to_midi(step, octave, alter)
        in_range = min_midi <= midi <= max_midi
        if not in_range:
            out_of_range_flags.append((i, True))
        adjusted.append({**n, "midi": midi, "in_lfv": in_range})
    return adjusted, out_of_range_flags


def build_activity_map(tune_config: dict) -> str:
    """
    Build ACTIVITY MAP text from tune_config (same format as Prompt 1).
    Uses: tune_name, choruses, measures_per_chorus, rehearsal_marks, asterisk_measures,
          primary_activity, secondary_activities, activity_map_measure_ranges (optional),
          lfv (optional for LFV= line).
    """
    spec = _load_spec()
    lfv = tune_config.get("lfv", spec.get("lfv_default", {}))
    min_f = lfv.get("min_fret", 5)
    max_f = lfv.get("max_fret", 9)
    lines = [
        f"ACTIVITY MAP — {tune_config.get('tune_name', 'Tune')}",
        f"TUNE={tune_config.get('tune_name', 'Tune')}",
    ]
    choruses = int(tune_config.get("choruses", 1))
    mpc = int(tune_config.get("measures_per_chorus", 16))
    for c in range(choruses):
        start = c * mpc + 1
        end = (c + 1) * mpc
        ranges = tune_config.get("activity_map_measure_ranges") or []
        range_str = " | ".join(
            f"{r.get('range', '')} -> {r.get('activity', '')}" for r in (ranges if isinstance(ranges, list) else [ranges])
        )
        lines.append(f"CHORUS={c + 1}  MEASURE_RANGE {start}-{end} -> {range_str or 'PRIMARY'}")
    lines.append(f"ASTERISK_MEASURES={tune_config.get('asterisk_measures', [])}")
    lines.append(f"PRIMARY_ACTIVITY={tune_config.get('primary_activity', 'LINEAR_CORE')}")
    lines.append(f"SECONDARY_ACTIVITIES={tune_config.get('secondary_activities', [])}")
    lines.append(f"LFV=FRETS_{min_f}_TO_{max_f}")
    return "\n".join(lines)


def _build_lfv_map(tune_config: dict) -> str:
    spec = _load_spec()
    lfv = tune_config.get("lfv", spec.get("lfv_default", {}))
    min_f = lfv.get("min_fret", 5)
    max_f = lfv.get("max_fret", 9)
    name = tune_config.get("tune_name", "Tune")
    lines = [
        f"LFV MAP — {name}",
        f"A1 LINEAR_CORE -> LFV {min_f}-{max_f} STRINGS(4-3-2)",
        f"A2 DIAGONAL_BRIDGE -> LFV {min_f}-{max_f} STRINGS(5-4-3-2)",
        f"A3 PIVOT_CELL -> LFV {min_f}-{max_f} STRINGS(3-2)",
        f"A4 ANCHOR_ARP -> LFV {min_f}-{max_f} STRINGS(5-4-3)",
        "A5 FREE_MIX -> STRINGS(4-3-2)+MIX",
    ]
    return "\n".join(lines)


# --- MusicXML helpers ---
def _el(tag: str, text: str | None = None, **attrib: Any) -> ET.Element:
    e = ET.Element(tag, attrib=attrib)
    if text is not None:
        e.text = str(text)
    return e


def _sub(parent: ET.Element, tag: str, text: str | None = None, **attrib: Any) -> ET.Element:
    e = _el(tag, text=text, **attrib)
    parent.append(e)
    return e


VALID_MUSICXML_KINDS = frozenset(
    {
        "major",
        "minor",
        "dominant",
        "major-seventh",
        "minor-seventh",
        "half-diminished",
        "diminished",
        "diminished-seventh",
        "augmented",
        "major-sixth",
        "minor-sixth",
        "suspended-fourth",
        "suspended-second",
        "major-minor",
        "augmented-seventh",
        "none",
        "other",
    }
)

_KIND_ALIASES: dict[str, str] = {
    "major": "major",
    "maj": "major",
    "m": "minor",
    "minor": "minor",
    "min": "minor",
    "dominant": "dominant",
    "7": "dominant",
    "maj7": "major-seventh",
    "major7": "major-seventh",
    "major-seventh": "major-seventh",
    "min7": "minor-seventh",
    "m7": "minor-seventh",
    "minor-seventh": "minor-seventh",
    "m7b5": "half-diminished",
    "half-diminished": "half-diminished",
    "half-dim": "half-diminished",
    "dim": "diminished",
    "diminished": "diminished",
    "dim7": "diminished-seventh",
    "diminished-seventh": "diminished-seventh",
    "aug": "augmented",
    "augmented": "augmented",
    "maj6": "major-sixth",
    "major-sixth": "major-sixth",
    "min6": "minor-sixth",
    "minor-sixth": "minor-sixth",
    "sus4": "suspended-fourth",
    "suspended-fourth": "suspended-fourth",
    "sus2": "suspended-second",
    "suspended-second": "suspended-second",
}


def _normalize_kind(kind: str) -> str:
    """Map chord-quality token to MusicXML 3.1 kind enumeration value."""
    k = kind.strip().lower().replace("_", "-")
    if k in VALID_MUSICXML_KINDS:
        return k
    compact = k.replace(" ", "")
    if compact in _KIND_ALIASES:
        return _KIND_ALIASES[compact]
    if k in _KIND_ALIASES:
        return _KIND_ALIASES[k]
    for alias, normalized in sorted(_KIND_ALIASES.items(), key=lambda item: -len(item[0])):
        if alias in compact or alias in k:
            return normalized
    return "other"


def _infer_kind_from_chord(chord_text: str) -> tuple[str, str]:
    """Return (normalized MusicXML kind, display text for kind@text)."""
    c = chord_text
    if re.search(r"m7b5|ø|half-dim", c, re.I):
        return _normalize_kind("half-diminished"), "m7b5"
    if re.search(r"dim7|o7", c, re.I):
        return _normalize_kind("diminished-seventh"), "dim7"
    if re.search(r"\bdim\b|°", c, re.I):
        return _normalize_kind("diminished"), "dim"
    if re.search(r"aug|\+", c):
        return _normalize_kind("augmented"), "aug"
    if "maj7" in c or "Δ" in c or re.search(r"maj\s*7", c, re.I):
        return _normalize_kind("major-seventh"), "maj7"
    if re.search(r"min7|m7|-7", c, re.I):
        return _normalize_kind("minor-seventh"), "m7"
    if re.search(r"maj6", c, re.I):
        return _normalize_kind("major-sixth"), "maj6"
    if re.search(r"min6|m6", c, re.I):
        return _normalize_kind("minor-sixth"), "m6"
    if re.search(r"sus4", c, re.I):
        return _normalize_kind("suspended-fourth"), "sus4"
    if re.search(r"sus2", c, re.I):
        return _normalize_kind("suspended-second"), "sus2"
    if "7" in c and not re.search(r"maj", c, re.I):
        return _normalize_kind("dominant"), "7"
    if re.search(r"m(?!aj)", c):
        return _normalize_kind("minor"), "m"
    return _normalize_kind("major"), ""


ACTIVITY_ROLES: dict[str, str] = {
    "A1_LINEAR_CORE": "opening",
    "A2_DIAGONAL_BRIDGE": "bridge",
    "A3_PIVOT_CELL": "pivot",
    "A4_ANCHOR_ARP": "anchor",
    "A5_FREE_MIX": "climactic",
}

ACTIVITY_KEY_TO_ID: dict[str, str] = {
    "A1": "A1_LINEAR_CORE",
    "A2": "A2_DIAGONAL_BRIDGE",
    "A3": "A3_PIVOT_CELL",
    "A4": "A4_ANCHOR_ARP",
    "A5": "A5_FREE_MIX",
}

ACTIVITY_ID_TO_KEY: dict[str, str] = {v: k for k, v in ACTIVITY_KEY_TO_ID.items()}

ROLE_ACTIVITY_PRIORITY: dict[str, list[str]] = {
    "opening": ["A1"],
    "bridge": ["A2", "A3"],
    "pivot": ["A3", "A2"],
    "anchor": ["A4"],
    "climactic": ["A5", "A3", "A2"],
}

PHRASE_LENGTH = 4
DOMINANT_ACTIVITIES = frozenset({"A2", "A3"})
ANCHOR_ACTIVITY = "A4"
DCR_VARIANTS = ("A", "B", "C")
MIN_DIRECTION_ARC_BARS = 4
MAX_DIRECTION_ARC_BARS = 8


def _activity_id_from_key(key: str) -> str:
    return ACTIVITY_KEY_TO_ID.get(key, key)


def _activity_key_from_id(activity_id: str) -> str:
    if activity_id in ACTIVITY_ID_TO_KEY:
        return ACTIVITY_ID_TO_KEY[activity_id]
    for full, short in ACTIVITY_KEY_TO_ID.items():
        if activity_id == full or activity_id.startswith(full):
            return short
    return "A1"


def _chord_is_dominant(chord: str) -> bool:
    kind, _ = _infer_kind_from_chord(chord)
    return kind == "dominant"


def _chord_is_maj7_resolution(chord: str) -> bool:
    kind, _ = _infer_kind_from_chord(chord)
    return kind == "major-seventh"


def _pc_shortest_distance(a: int, b: int) -> int:
    d = abs((int(b) - int(a)) % 12)
    return min(d, 12 - d)


def _build_reduction_map(chords: list[str], tune_config: dict) -> list[dict[str, Any]]:
    """Per-bar harmonic reduction with sustained minor centre across related chords."""
    tension_map = tune_config.get("tension_map") or {}
    split = tune_config.get("split_chord_measures") or {}
    mpc = int(tune_config.get("measures_per_chorus", 16))
    choruses = int(tune_config.get("choruses", 1))
    total = mpc * choruses
    rows: list[dict[str, Any]] = []
    current_centre_pc: int | None = None
    prev_chord: str | None = None

    for global_bar in range(total):
        bar_in_chorus = global_bar % mpc
        bar_key = str(bar_in_chorus)
        if bar_key in split:
            split_entry = split[bar_key]
            chord = str(split_entry[0] if isinstance(split_entry, list) else split_entry)
        elif bar_in_chorus < len(chords):
            entry = chords[bar_in_chorus]
            chord = str(entry[0] if isinstance(entry, list) else entry)
        elif chords:
            entry = chords[-1]
            chord = str(entry[0] if isinstance(entry, list) else entry)
        else:
            chord = "Gmaj7"

        level = tension_map.get(global_bar) or tension_map.get(str(global_bar)) or "low"
        conversion = martino_convert(chord, str(level), prev_chord)
        new_pc = int(conversion["minorRootPc"])
        if current_centre_pc is None:
            sustained_pc = new_pc
        elif _pc_shortest_distance(current_centre_pc, new_pc) > 2:
            sustained_pc = new_pc
        else:
            sustained_pc = current_centre_pc
        current_centre_pc = sustained_pc
        prev_chord = chord

        from master_loader import semitones_gm_to_target

        rows.append(
            {
                "bar": global_bar + 1,
                "bar_index": global_bar,
                "bar_in_phrase": global_bar % PHRASE_LENGTH,
                "chord": chord,
                "reduction": pc_to_minor_root_name(sustained_pc),
                "reduction_pc": sustained_pc,
                "transpose": semitones_gm_to_target(sustained_pc),
                "is_dominant": _chord_is_dominant(chord),
                "is_maj7": _chord_is_maj7_resolution(chord),
                "book_rule": conversion.get("bookRule"),
            }
        )
    return rows


def _lfv_ok_for_activity_bar(
    activity_key: str,
    bar_in_phrase: int,
    reduction_pc: int,
    tune_config: dict,
) -> bool:
    from master_loader import load_master_bars, note_to_midi, semitones_gm_to_target, transpose_bar

    master_bars = load_master_bars(activity_key)
    if not master_bars:
        return False
    semitones = semitones_gm_to_target(reduction_pc)
    template = master_bars[bar_in_phrase % len(master_bars)]
    transposed = transpose_bar(template, semitones)
    lfv = tune_config.get("lfv") or {}
    min_midi = int(lfv.get("min_midi", 38))
    max_midi = int(lfv.get("max_midi", 68))
    for note in transposed:
        step, octv, alt = note[0], int(note[1]), note[2]
        midi = note_to_midi(str(step), octv, int(alt) if alt is not None else None)
        if midi < min_midi or midi > max_midi:
            return False
    return True


def _interval_fingerprint_for_slot(
    activity_key: str,
    bar_in_phrase: int,
    reduction_pc: int,
    tune_config: dict,
) -> list[int]:
    from master_loader import load_master_bars, note_to_midi, semitones_gm_to_target, transpose_bar

    master_bars = load_master_bars(activity_key)
    if not master_bars:
        return []
    semitones = semitones_gm_to_target(reduction_pc)
    template = master_bars[bar_in_phrase % len(master_bars)]
    transposed = transpose_bar(template, semitones)
    midis = [
        note_to_midi(str(n[0]), int(n[1]), int(n[2]) if n[2] is not None else None) for n in transposed
    ]
    return [midis[i + 1] - midis[i] for i in range(len(midis) - 1)]


def _rhythmic_signature_for_slot(
    activity_key: str,
    bar_in_phrase: int,
) -> str:
    from master_loader import load_master_bars

    master_bars = load_master_bars(activity_key)
    if not master_bars:
        return ""
    template = master_bars[bar_in_phrase % len(master_bars)]
    return ",".join(str(int(n[3])) for n in template)


def _contour_direction_from_fingerprint(fp: list[int]) -> str:
    if not fp:
        return "pivot"
    total = sum(fp)
    if total > 1:
        return "ascending"
    if total < -1:
        return "descending"
    return "pivot"


def _track_directional_arc(
    fingerprint: list[int],
    prior_vector: str | None,
    prior_arc_count: int,
) -> tuple[str, int]:
    local = _contour_direction_from_fingerprint(fingerprint)
    if prior_vector is None:
        return local, 1
    if local == "pivot":
        return "pivot", max(1, prior_arc_count)
    if prior_vector == local and prior_arc_count < MAX_DIRECTION_ARC_BARS:
        return local, prior_arc_count + 1
    if prior_vector == local:
        return local, prior_arc_count
    if prior_arc_count < MIN_DIRECTION_ARC_BARS and prior_vector != "pivot":
        return prior_vector, prior_arc_count + 1
    return local, 1


def _anti_loop_violation(
    candidate_key: str,
    bar_in_phrase: int,
    reduction_pc: int,
    tune_config: dict,
    prior_fps: list[list[int]],
    prior_rhythms: list[str],
    prior_directions: list[str],
) -> bool:
    fp = _interval_fingerprint_for_slot(candidate_key, bar_in_phrase, reduction_pc, tune_config)
    rhythm = _rhythmic_signature_for_slot(candidate_key, bar_in_phrase)
    direction = _contour_direction_from_fingerprint(fp)
    if len(prior_fps) >= 2 and fp == prior_fps[-1] == prior_fps[-2]:
        return True
    if len(prior_rhythms) >= 2 and rhythm == prior_rhythms[-1] == prior_rhythms[-2]:
        return True
    if len(prior_directions) >= 2 and direction == prior_directions[-1] == prior_directions[-2]:
        return True
    if len(prior_fps) >= 2 and fp and prior_fps[-1]:
        if len(fp) >= 2 and len(prior_fps[-1]) >= 2:
            enc = fp[-2:] == [-fp[-1], fp[-1]] and prior_fps[-1][-2:] == [-prior_fps[-1][-1], prior_fps[-1][-1]]
            if enc:
                return True
    return False


def _pick_activity_for_slot(
    role_keys: list[str],
    phrase_pos: int,
    row: dict[str, Any],
    tune_config: dict,
    prior_plan: list[str | None],
    anti_loop_ctx: dict[str, list[Any]] | None = None,
) -> str:
    """First activity in role priority that has a master and passes LFV for this bar."""
    bar_in_phrase = int(row.get("bar_in_phrase", phrase_pos))
    reduction_pc = int(row["reduction_pc"])
    ctx = anti_loop_ctx or {}
    prior_fps = ctx.get("fingerprints") or []
    prior_rhythms = ctx.get("rhythms") or []
    prior_directions = ctx.get("directions") or []

    for key in role_keys:
        if not _lfv_ok_for_activity_bar(key, bar_in_phrase, reduction_pc, tune_config):
            continue
        if _anti_loop_violation(
            key, bar_in_phrase, reduction_pc, tune_config, prior_fps, prior_rhythms, prior_directions
        ):
            continue
        if prior_plan:
            run = 1
            for prev in reversed(prior_plan):
                if prev == key:
                    run += 1
                else:
                    break
            if run >= 2:
                continue
        return key
    for key in role_keys:
        if _lfv_ok_for_activity_bar(key, bar_in_phrase, reduction_pc, tune_config):
            return key
    return role_keys[0]


def _phrase_direction_ascending(phrase_rows: list[dict[str, Any]]) -> bool:
    pcs = [int(r["reduction_pc"]) for r in phrase_rows]
    if len(pcs) < 2:
        return False
    ups = sum(1 for i in range(1, len(pcs)) if ((pcs[i] - pcs[i - 1]) % 12) in (1, 2))
    return ups >= len(pcs) - 1


def _roles_for_phrase_position(
    pos: int,
    row: dict[str, Any],
    phrase_rows: list[dict[str, Any]],
    ascending: bool,
) -> list[str]:
    if row.get("is_dominant"):
        return list(ROLE_ACTIVITY_PRIORITY["bridge"])
    if pos == 0:
        return list(ROLE_ACTIVITY_PRIORITY["opening"])
    if pos == PHRASE_LENGTH - 1:
        return list(ROLE_ACTIVITY_PRIORITY["anchor"])
    if pos == 1:
        return list(ROLE_ACTIVITY_PRIORITY["bridge"])
    if row.get("is_maj7"):
        return list(ROLE_ACTIVITY_PRIORITY["anchor"]) + list(ROLE_ACTIVITY_PRIORITY["pivot"])
    if ascending and pos in (2, 3):
        return list(ROLE_ACTIVITY_PRIORITY["climactic"])
    return list(ROLE_ACTIVITY_PRIORITY["pivot"])


def _enforce_consecutive_cap(plan_keys: list[str]) -> list[str]:
    if len(plan_keys) < 2:
        return plan_keys
    out = list(plan_keys)
    for i in range(2, len(out)):
        if out[i] == out[i - 1] == out[i - 2]:
            alt = next(
                (k for k in ("A5", "A3", "A2", "A1", "A4") if k != out[i - 1] and k != out[i]),
                out[i],
            )
            out[i] = alt
    return out


def _enforce_phrase_variety(
    plan_keys: list[str],
    tune_config: dict,
    phrase_rows: list[dict[str, Any]],
) -> list[str]:
    if tune_config.get("mode") == "teaching_single_form":
        return plan_keys
    if len(set(plan_keys)) >= 2:
        return plan_keys
    out = list(plan_keys)
    swap_pos = 1 if len(out) > 1 else 0
    for alt in ("A2", "A3", "A4", "A5"):
        if alt == out[swap_pos]:
            continue
        candidate = list(out)
        candidate[swap_pos] = alt
        if _lfv_ok_for_activity_bar(
            alt,
            int(phrase_rows[swap_pos].get("bar_in_phrase", swap_pos)),
            int(phrase_rows[swap_pos]["reduction_pc"]),
            tune_config,
        ):
            return _enforce_consecutive_cap(candidate)
    return plan_keys


def _variant_role_keys(
    roles: list[str],
    pos: int,
    variant: str,
) -> list[str]:
    if variant == "B" and pos in (1, 2):
        boosted = ["A2", "A3"] + [k for k in roles if k not in ("A2", "A3")]
        return boosted
    if variant == "C" and pos == 2:
        return ["A5", "A3", "A2"] + [k for k in roles if k not in ("A5", "A3", "A2")]
    return list(roles)


def _plan_phrase_activities(
    phrase_rows: list[dict[str, Any]],
    tune_config: dict,
    carry_key: str | None = None,
    variant: str = "A",
) -> list[dict[str, Any]]:
    """
    Plan one 4-bar phrase span. Mandatory role rules; LFV re-plan via role priority.
    """
    if len(phrase_rows) != PHRASE_LENGTH:
        raise ValueError(f"phrase planner requires {PHRASE_LENGTH} bars, got {len(phrase_rows)}")

    ascending = _phrase_direction_ascending(phrase_rows)
    plan_keys: list[str | None] = [None] * PHRASE_LENGTH
    prior: list[str | None] = [carry_key]

    anti_loop_ctx: dict[str, list[Any]] = {"fingerprints": [], "rhythms": [], "directions": []}
    anti_loop_triggered = False

    for pos, row in enumerate(phrase_rows):
        roles = _roles_for_phrase_position(pos, row, phrase_rows, ascending)
        roles = _variant_role_keys(roles, pos, variant)
        if pos == PHRASE_LENGTH - 1:
            roles = list(ROLE_ACTIVITY_PRIORITY["anchor"])
        elif row.get("is_dominant"):
            roles = list(ROLE_ACTIVITY_PRIORITY["bridge"])
        prior_keys = [k for k in (prior + plan_keys[:pos]) if k]
        key = _pick_activity_for_slot(
            roles, pos, row, tune_config, prior_keys, anti_loop_ctx=anti_loop_ctx
        )
        if _anti_loop_violation(
            key,
            int(row.get("bar_in_phrase", pos)),
            int(row["reduction_pc"]),
            tune_config,
            anti_loop_ctx["fingerprints"],
            anti_loop_ctx["rhythms"],
            anti_loop_ctx["directions"],
        ):
            for alt in roles:
                if alt != key and not _anti_loop_violation(
                    alt,
                    int(row.get("bar_in_phrase", pos)),
                    int(row["reduction_pc"]),
                    tune_config,
                    anti_loop_ctx["fingerprints"],
                    anti_loop_ctx["rhythms"],
                    anti_loop_ctx["directions"],
                ):
                    key = alt
                    anti_loop_triggered = True
                    break
        plan_keys[pos] = key
        fp = _interval_fingerprint_for_slot(
            key, int(row.get("bar_in_phrase", pos)), int(row["reduction_pc"]), tune_config
        )
        anti_loop_ctx["fingerprints"].append(fp)
        anti_loop_ctx["rhythms"].append(_rhythmic_signature_for_slot(key, int(row.get("bar_in_phrase", pos))))
        anti_loop_ctx["directions"].append(_contour_direction_from_fingerprint(fp))
        prior = prior + [plan_keys[pos]]

    for pos, row in enumerate(phrase_rows):
        if row.get("is_dominant"):
            plan_keys[pos] = _pick_activity_for_slot(
                list(ROLE_ACTIVITY_PRIORITY["bridge"]),
                pos,
                row,
                tune_config,
                plan_keys[:pos],
            )
    plan_keys[PHRASE_LENGTH - 1] = _pick_activity_for_slot(
        list(ROLE_ACTIVITY_PRIORITY["anchor"]),
        PHRASE_LENGTH - 1,
        phrase_rows[-1],
        tune_config,
        plan_keys[:-1],
    )

    resolved = _enforce_consecutive_cap([k or "A1" for k in plan_keys])
    resolved = _enforce_phrase_variety(resolved, tune_config, phrase_rows)

    plan: list[dict[str, Any]] = []
    for pos, row in enumerate(phrase_rows):
        key = resolved[pos]
        activity_id = _activity_id_from_key(key)
        lfv_ok = _lfv_ok_for_activity_bar(
            key, int(row.get("bar_in_phrase", pos)), int(row["reduction_pc"]), tune_config
        )
        fp = _interval_fingerprint_for_slot(
            key, int(row.get("bar_in_phrase", pos)), int(row["reduction_pc"]), tune_config
        )
        plan.append(
            {
                "bar": int(row["bar"]),
                "chord": row["chord"],
                "reduction": row["reduction"],
                "reduction_pc": int(row["reduction_pc"]),
                "activity": activity_id,
                "role": ACTIVITY_ROLES.get(activity_id, "opening"),
                "transpose": int(row["transpose"]),
                "lfv_ok": lfv_ok,
                "book_rule": row.get("book_rule"),
                "interval_fingerprint": fp,
                "rhythmic_signature": _rhythmic_signature_for_slot(key, int(row.get("bar_in_phrase", pos))),
            }
        )
    tune_config.setdefault("_anti_loop_flags", []).append(anti_loop_triggered)
    return plan


def _apply_dcr_refinement(
    plan: list[dict[str, Any]],
    weakest: str,
    phrase_rows: list[dict[str, Any]],
    tune_config: dict,
) -> list[dict[str, Any]]:
    from gce.martinoScorers import DCR_SCORE_KEYS

    if not plan or weakest not in DCR_SCORE_KEYS:
        return plan
    out = [dict(row) for row in plan]
    pos = 1 if len(out) > 1 else 0
    row = phrase_rows[pos]
    bar_in_phrase = int(row.get("bar_in_phrase", pos))
    reduction_pc = int(row["reduction_pc"])

    if weakest == "reduction":
        for entry in out:
            entry["reduction"] = out[0]["reduction"]
            entry["reduction_pc"] = out[0].get("reduction_pc", reduction_pc)
            entry["transpose"] = out[0]["transpose"]
        return out

    if weakest == "variety":
        alts = ["A2", "A3", "A5", "A1"]
        current = _activity_key_from_id(str(out[pos]["activity"]))
        for alt in alts:
            if alt != current and _lfv_ok_for_activity_bar(alt, bar_in_phrase, reduction_pc, tune_config):
                out[pos]["activity"] = _activity_id_from_key(alt)
                out[pos]["role"] = ACTIVITY_ROLES.get(out[pos]["activity"], "bridge")
                fp = _interval_fingerprint_for_slot(alt, bar_in_phrase, reduction_pc, tune_config)
                out[pos]["interval_fingerprint"] = fp
                break
        return out

    if weakest == "direction":
        entry = out[0]
        key = "A2" if _lfv_ok_for_activity_bar("A2", 0, int(entry.get("reduction_pc", reduction_pc)), tune_config) else "A1"
        entry["activity"] = _activity_id_from_key(key)
        entry["role"] = ACTIVITY_ROLES.get(entry["activity"], "opening")
        fp = _interval_fingerprint_for_slot(key, 0, int(entry.get("reduction_pc", reduction_pc)), tune_config)
        entry["interval_fingerprint"] = fp
        return out

    return out


def _dcr_evaluate_phrase_plans(
    phrase_rows: list[dict[str, Any]],
    tune_config: dict,
    carry_key: str | None = None,
    anti_bebop_penalty: float = 0.0,
) -> tuple[list[dict[str, Any]], dict[str, Any], dict[str, float]]:
    from gce.martinoScorers import (
        overall_plan_score,
        score_martino_gce,
        weakest_dcr_dimension,
    )

    scored: dict[str, tuple[list[dict[str, Any]], Any]] = {}
    for label in DCR_VARIANTS:
        plan = _plan_phrase_activities(phrase_rows, tune_config, carry_key=carry_key, variant=label)
        fps = [list(r.get("interval_fingerprint") or []) for r in plan]
        rhythms = [str(r.get("rhythmic_signature", "")) for r in plan]
        directions = [_contour_direction_from_fingerprint(fp) for fp in fps]
        gce = score_martino_gce(
            plan,
            interval_fingerprints=fps,
            direction_vectors=directions,
            rhythmic_signatures=rhythms,
            chords=[str(r.get("chord", "")) for r in plan],
            anti_bebop_penalty=anti_bebop_penalty,
        )
        scored[label] = (plan, gce)

    winner = max(DCR_VARIANTS, key=lambda lbl: overall_plan_score(scored[lbl][1]))
    plan, gce_result = scored[winner]
    weakest = weakest_dcr_dimension(gce_result.dimensions)
    before_refine = json.dumps(plan, sort_keys=True)
    refined = _apply_dcr_refinement(plan, weakest, phrase_rows, tune_config)
    refinement_applied = json.dumps(refined, sort_keys=True) != before_refine
    if refinement_applied:
        plan = refined
        fps = [list(r.get("interval_fingerprint") or []) for r in plan]
        directions = [_contour_direction_from_fingerprint(fp) for fp in fps]
        gce_result = score_martino_gce(
            plan,
            interval_fingerprints=fps,
            direction_vectors=directions,
            rhythmic_signatures=[str(r.get("rhythmic_signature", "")) for r in plan],
            chords=[str(r.get("chord", "")) for r in plan],
            anti_bebop_penalty=anti_bebop_penalty,
        )

    if gce_result.hard_gate_triggered and anti_bebop_penalty == 0.0:
        alt_plan, alt_meta, alt_dims = _dcr_evaluate_phrase_plans(
            phrase_rows, tune_config, carry_key=carry_key, anti_bebop_penalty=0.2
        )
        from gce.martinoScorers import MARTINO_GCE_DIMENSIONS, MARTINO_GCE_WEIGHTS

        alt_overall = sum(alt_dims.get(k, 0.0) * MARTINO_GCE_WEIGHTS[k] for k in MARTINO_GCE_DIMENSIONS)
        if alt_overall >= overall_plan_score(gce_result):
            alt_meta["dcr_hard_gate_rerun"] = True
            return alt_plan, alt_meta, alt_dims

    dcr_meta = {
        "dcr_variants_scored": len(DCR_VARIANTS),
        "dcr_winner": winner,
        "dcr_weakest_dimension": weakest,
        "dcr_refinement_applied": refinement_applied,
        "dcr_hard_gate": gce_result.hard_gate_triggered,
        "dcr_hard_gate_reasons": list(gce_result.hard_gate_reasons),
    }
    return plan, dcr_meta, gce_result.dimensions


def _attach_direction_telemetry(
    plan: list[dict[str, Any]],
    prior_vector: str | None,
    prior_arc: int,
) -> tuple[str | None, int]:
    vec = prior_vector
    arc = prior_arc
    for row in plan:
        fp = list(row.get("interval_fingerprint") or [])
        vec, arc = _track_directional_arc(fp, vec, arc)
        row["direction_vector"] = vec
        row["arc_bar_count"] = arc
    return vec, arc


def plan_all_phrase_activities(
    reduction_map: list[dict[str, Any]],
    tune_config: dict,
) -> list[dict[str, Any]]:
    """Plan every 4-bar phrase in the tune; DCR picks strongest variant per span."""
    from gce.martinoScorers import score_martino_gce

    full_plan: list[dict[str, Any]] = []
    dcr_runs: list[dict[str, Any]] = []
    carry: str | None = None
    dir_vector: str | None = None
    dir_arc = 0
    tune_config.setdefault("_anti_loop_flags", [])

    for start in range(0, len(reduction_map), PHRASE_LENGTH):
        chunk = reduction_map[start : start + PHRASE_LENGTH]
        if len(chunk) < PHRASE_LENGTH:
            break
        phrase_plan, dcr_meta, _dims = _dcr_evaluate_phrase_plans(chunk, tune_config, carry_key=carry)
        dir_vector, dir_arc = _attach_direction_telemetry(phrase_plan, dir_vector, dir_arc)
        dcr_runs.append(dcr_meta)
        full_plan.extend(phrase_plan)
        carry = _activity_key_from_id(phrase_plan[-1]["activity"])

    fps = [list(r.get("interval_fingerprint") or []) for r in full_plan]
    directions = [str(r.get("direction_vector", "pivot")) for r in full_plan]
    rhythms = [str(r.get("rhythmic_signature", "")) for r in full_plan]
    final_gce = score_martino_gce(
        full_plan,
        interval_fingerprints=fps,
        direction_vectors=directions,
        rhythmic_signatures=rhythms,
        chords=[str(r.get("chord", "")) for r in full_plan],
    )
    if final_gce.dimensions.get("anti_bebop_drift", 1.0) < 0.3:
        rerun_plan: list[dict[str, Any]] = []
        dcr_runs = []
        carry = None
        dir_vector = None
        dir_arc = 0
        for start in range(0, len(reduction_map), PHRASE_LENGTH):
            chunk = reduction_map[start : start + PHRASE_LENGTH]
            if len(chunk) < PHRASE_LENGTH:
                break
            phrase_plan, dcr_meta, _dims = _dcr_evaluate_phrase_plans(
                chunk, tune_config, carry_key=carry, anti_bebop_penalty=0.25
            )
            dcr_meta["dcr_anti_bebop_rerun"] = True
            dir_vector, dir_arc = _attach_direction_telemetry(phrase_plan, dir_vector, dir_arc)
            dcr_runs.append(dcr_meta)
            rerun_plan.extend(phrase_plan)
            carry = _activity_key_from_id(phrase_plan[-1]["activity"])
        full_plan = rerun_plan
        fps = [list(r.get("interval_fingerprint") or []) for r in full_plan]
        directions = [str(r.get("direction_vector", "pivot")) for r in full_plan]
        rhythms = [str(r.get("rhythmic_signature", "")) for r in full_plan]
        final_gce = score_martino_gce(
            full_plan,
            interval_fingerprints=fps,
            direction_vectors=directions,
            rhythmic_signatures=rhythms,
            chords=[str(r.get("chord", "")) for r in full_plan],
        )

    tune_config["_dcr"] = dcr_runs[-1] if dcr_runs else {}
    tune_config["_martino_gce"] = final_gce.to_provenance_dict()
    tune_config["_martino_gce_overall"] = final_gce.overall
    return full_plan


def _local_tag(elem: ET.Element) -> str:
    tag = elem.tag
    return tag.rsplit("}", 1)[-1] if "}" in tag else tag


def _display_tune_name(tune_config: dict) -> str:
    """Score title: prefer tune, then preset, then tune_name / name / title."""
    for key in ("tune", "preset", "tune_name", "name", "title"):
        raw = tune_config.get(key)
        if raw is not None and str(raw).strip():
            return str(raw).strip()
    return "Tune"


def _parse_root_alter(root_str: str) -> tuple[str, int | None]:
    step = root_str[0].upper()
    alter = None
    if len(root_str) > 1:
        acc = root_str[1:]
        if acc in ("b", "♭"):
            alter = -1
        elif acc in ("#", "♯"):
            alter = 1
    return step, alter


def _chord_symbols_for_bar(tune_config: dict, bar: int, chorus: int) -> list[str]:
    """Chord symbol(s) for one bar in the score (split-bar => multiple harmonies at beat 1)."""
    chords = tune_config.get("chords") or []
    mpc = int(tune_config.get("measures_per_chorus", 16))
    split = tune_config.get("split_chord_measures") or {}
    bar_key = str(bar)
    if bar_key in split:
        entry = split[bar_key]
        if isinstance(entry, list):
            return [str(c) for c in entry]
        return [str(entry)]

    idx = chorus * mpc + bar
    if idx < len(chords):
        entry = chords[idx]
    elif bar < len(chords):
        entry = chords[bar]
    elif chords:
        entry = chords[-1]
    else:
        entry = "Fmaj7"

    if isinstance(entry, list):
        return [str(c) for c in entry]
    return [str(entry)]


def _harmony_insert_index(meas: ET.Element) -> int:
    """Index to insert beat-1 <harmony> — after attributes/print, before notes/directions."""
    insert_at = 0
    for i, child in enumerate(meas):
        local = _local_tag(child)
        if local in ("attributes", "print"):
            insert_at = i + 1
        elif local in ("note", "direction", "harmony", "sound", "barline"):
            return insert_at
    return insert_at


def _build_harmony_elem(chord_text: str) -> ET.Element:
    h = _el("harmony")
    slash_idx = chord_text.find("/")
    harmony_part = chord_text[:slash_idx].strip() if slash_idx >= 0 else chord_text
    bass_part = chord_text[slash_idx + 1 :].strip() if slash_idx >= 0 else ""

    s = re.sub(r"[(#)/]", " ", harmony_part).strip()
    parts = s.split()
    root_str = parts[0] if parts else "C"
    step, alter = _parse_root_alter(root_str)
    kind_value, kind_display = _infer_kind_from_chord(harmony_part)
    kind_value = _normalize_kind(kind_value)
    root_el = _sub(h, "root")
    _sub(root_el, "root-step", step)
    if alter is not None:
        _sub(root_el, "root-alter", str(alter))
    k = _sub(h, "kind")
    k.text = kind_value
    if kind_display:
        k.set("text", kind_display)

    if bass_part:
        bass_match = re.match(r"^([A-G](?:#|b|♭|#)?)", bass_part, re.I)
        if bass_match:
            bass_step, bass_alter = _parse_root_alter(bass_match.group(1))
            bass_el = _sub(h, "bass")
            _sub(bass_el, "bass-step", bass_step)
            if bass_alter is not None:
                _sub(bass_el, "bass-alter", str(bass_alter))
    return h


def _write_harmonies_at_beat_one(meas: ET.Element, chord_texts: list[str]) -> None:
    """Insert one or more <harmony> elements at beat 1 (never append after notes)."""
    if not chord_texts:
        chord_texts = ["Fmaj7"]
    insert_at = _harmony_insert_index(meas)
    for ch in reversed(chord_texts):
        meas.insert(insert_at, _build_harmony_elem(ch))


def _strip_rehearsal_marks(root: ET.Element) -> None:
    """Score output: no <rehearsal> (section letters live in tune_config / provenance only)."""
    for parent in root.iter():
        for child in list(parent):
            local = child.tag.split("}")[-1] if "}" in child.tag else child.tag
            if local == "rehearsal":
                parent.remove(child)
            elif local == "direction-type":
                rehearsals = [c for c in child if (c.tag.split("}")[-1] if "}" in c.tag else c.tag) == "rehearsal"]
                for r in rehearsals:
                    child.remove(r)
                if not list(child) and parent.tag.split("}")[-1].endswith("direction"):
                    parent.remove(child)


def _strip_harmony_nonstandard(root: ET.Element) -> None:
    """Sibelius-safe harmony: no attrs; only root/kind/bass/degree children."""
    allowed_children = frozenset({"root", "kind", "bass", "degree"})
    for h in root.iter():
        if h.tag != "harmony" and not h.tag.endswith("}harmony"):
            continue
        h.attrib.clear()
        for child in list(h):
            local = child.tag.split("}")[-1] if "}" in child.tag else child.tag
            if local not in allowed_children:
                h.remove(child)


def _harmony_elem(measure_el: ET.Element, chord_text: str) -> None:
    """Backward-compatible wrapper: one harmony at beat 1."""
    _write_harmonies_at_beat_one(measure_el, [chord_text])


def _chord_words_elem(measure_el: ET.Element, chord_text: str) -> None:
    d = _el("direction", placement="above")
    w = _sub(_sub(d, "direction-type"), "words")
    w.text = chord_text
    measure_el.append(d)


def _direction_words_elem(measure_el: ET.Element, words_text: str) -> None:
    d = _el("direction", placement="above")
    w = _sub(_sub(d, "direction-type"), "words")
    w.text = words_text
    measure_el.append(d)


def _asterisk_elem(measure_el: ET.Element, measure_number: int) -> None:
    _direction_words_elem(measure_el, f"m.{measure_number} *")


def _add_note(meas: ET.Element, step: str, octave: int, alter: int | None, duration: int) -> None:
    n = _el("note")
    p = _sub(n, "pitch")
    s = step[0] if len(step) > 1 else step
    _sub(p, "step", s)
    if alter is not None:
        _sub(p, "alter", str(alter))
    elif isinstance(step, str) and "b" in step:
        _sub(p, "alter", "-1")
    elif isinstance(step, str) and "#" in step:
        _sub(p, "alter", "1")
    _sub(p, "octave", str(octave))
    _sub(n, "duration", str(duration))
    _sub(n, "voice", "1")
    _sub(n, "type", "quarter" if duration == 2 else "eighth")
    meas.append(n)


def _normalize_melody_bars(tune_config: dict) -> None:
    """Ensure melody_bars is a list of bars (each bar list of (step, oct, alter, duration)) for mpc bars."""
    mpc = int(tune_config.get("measures_per_chorus", 16))
    mb = tune_config.get("melody_bars")
    if not mb:
        return
    if isinstance(mb, dict):
        tune_config["_melody_bars_list"] = [mb.get(str(i)) or mb.get(i) or [] for i in range(mpc)]
    else:
        tune_config["_melody_bars_list"] = list(mb) if len(mb) >= mpc else mb + [[]] * (mpc - len(mb))


# Re-build generate_musicxml to use _melody_bars_list when present (list of mpc bars)
def _add_melody_to_measure(meas: ET.Element, tune_config: dict, bar: int, chorus: int) -> None:
    mpc = int(tune_config.get("measures_per_chorus", 16))
    melody_bars = tune_config.get("melody_bars")
    melody_bars_list = tune_config.get("_melody_bars_list")
    if melody_bars_list and bar < len(melody_bars_list):
        bar_notes = melody_bars_list[bar]
        for no in bar_notes:
            if isinstance(no, (list, tuple)):
                st, oct = no[0], no[1]
                alt = no[2] if len(no) > 2 else None
                dur = no[3] if len(no) > 3 else 1
            else:
                st, oct = no.get("step"), no.get("octave")
                alt, dur = no.get("alter"), no.get("duration", 1)
            _add_note(meas, str(st), int(oct), int(alt) if alt is not None else None, int(dur))
        return
    if melody_bars and isinstance(melody_bars, dict):
        bar_notes = melody_bars.get(str(bar)) or melody_bars.get(bar)
        if bar_notes:
            for no in bar_notes:
                if isinstance(no, (list, tuple)):
                    st, oct = no[0], no[1]
                    alt = no[2] if len(no) > 2 else None
                    dur = no[3] if len(no) > 3 else 1
                else:
                    st, oct = no.get("step"), no.get("octave")
                    alt, dur = no.get("alter"), no.get("duration", 1)
                _add_note(meas, str(st), int(oct), int(alt) if alt is not None else None, int(dur))
            return
    raise TemplateUnavailableError(
        f"No canonical template available for bar {bar + 1} — generation aborted. Do not invent material."
    )


# Replace the inline melody block in generate_musicxml with a call to _add_melody_to_measure
def generate_musicxml(tune_config: dict) -> Path:
    spec = _load_spec()
    out_dir = tune_config.get("output_dir")
    if out_dir is None:
        out_dir = _ENGINE_DIR
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    tune_name = _display_tune_name(tune_config)
    choruses = int(tune_config.get("choruses", 1))
    mpc = int(tune_config.get("measures_per_chorus", 16))
    ts = tune_config.get("time_signature", {})
    beats = int(ts.get("beats", 4))
    beat_type = int(ts.get("beat_type", 4))
    divisions = int(tune_config.get("divisions", 2))
    key = tune_config.get("key", {"fifths": -1, "mode": "major"})
    asterisk_measures = set(tune_config.get("asterisk_measures", []))

    _normalize_melody_bars(tune_config)

    provenance_log: list[dict[str, Any]] = []
    if tune_config.get("melody_bars") or tune_config.get("_melody_bars_list"):
        pass
    elif tune_config.get("melody") == "auto":
        if build_canonical_melody is None:
            raise TemplateUnavailableError(
                "No canonical template available — master_loader missing. Do not invent material."
            )
        built, provenance_log = build_canonical_melody(tune_config)
        tune_config["_melody_bars_list"] = built
        tune_config["_provenance_log"] = provenance_log
    else:
        raise TemplateUnavailableError(
            "No canonical template available — melody must be auto with masters. Do not invent material."
        )

    version_prefix = tune_config.get("version_prefix") or spec.get("output", {}).get("default_version", "V4.1")
    suffix = spec.get("output", {}).get("suffix", "MartinoLinearExpressions")
    safe_name = re.sub(r"[^\w\-]", "", tune_name.replace(" ", "_"))
    chorus_label = f"{choruses}Choruses" if choruses > 1 else "1Chorus"
    base_name = f"{version_prefix}_{safe_name}_{chorus_label}_{suffix}.musicxml"
    out_path = out_dir / base_name
    version_prefix = increment_version(version_prefix, out_path)
    base_name = f"{version_prefix}_{safe_name}_{chorus_label}_{suffix}.musicxml"
    out_path = out_dir / base_name

    root = ET.Element("score-partwise", version="3.1")
    _sub(root, "work").append(_el("work-title", f"{tune_name} – Martino Linear Expressions ({version_prefix})"))
    plist = _sub(root, "part-list")
    _sub(_sub(plist, "score-part", id="P1"), "part-name", "Guitar")
    part = _sub(root, "part", id="P1")

    measure_num = 0
    for chorus in range(choruses):
        for bar in range(mpc):
            measure_num += 1
            meas = _sub(part, "measure", number=str(measure_num))
            if measure_num == 1:
                att = _sub(meas, "attributes")
                _sub(att, "divisions", str(divisions))
                k = _sub(att, "key")
                _sub(k, "fifths", str(key.get("fifths", -1)))
                _sub(k, "mode", key.get("mode", "major"))
                t = _sub(att, "time")
                _sub(t, "beats", str(beats))
                _sub(t, "beat-type", str(beat_type))
                c = _sub(att, "clef")
                _sub(c, "sign", "G")
                _sub(c, "line", "2")

            _write_harmonies_at_beat_one(meas, _chord_symbols_for_bar(tune_config, bar, chorus))

            if measure_num in asterisk_measures:
                _asterisk_elem(meas, measure_num)

            _add_melody_to_measure(meas, tune_config, bar, chorus)

    _strip_harmony_nonstandard(root)
    _strip_rehearsal_marks(root)
    tree = ET.ElementTree(root)
    ET.indent(tree, space="  ")
    tree.write(out_path, encoding="UTF-8", xml_declaration=True, default_namespace="", method="xml")

    prov = tune_config.get("_provenance_log") or provenance_log
    if prov:
        _PROVENANCE_DIR.mkdir(parents=True, exist_ok=True)
        prov_path = provenance_json_path(out_path)
        phrase_plan = tune_config.get("_phrase_plan") or []
        bar_telemetry = [
            {
                "bar": int(row.get("bar", 0)),
                "direction_vector": row.get("direction_vector"),
                "arc_bar_count": row.get("arc_bar_count"),
                "interval_fingerprint": row.get("interval_fingerprint"),
                "anti_loop_triggered": bool(tune_config.get("_anti_loop_flags")),
            }
            for row in phrase_plan
        ]
        dcr_block = tune_config.get("_dcr") or {}
        martino_gce = tune_config.get("_martino_gce") or {}
        prov_path.write_text(
            json.dumps(
                {
                    "outputPath": str(out_path),
                    "provenancePath": str(prov_path),
                    "activityMapText": build_activity_map(tune_config),
                    "lfvMapText": _build_lfv_map(tune_config),
                    "phrasePlan": phrase_plan,
                    "dcr_variants_scored": dcr_block.get("dcr_variants_scored"),
                    "dcr_winner": dcr_block.get("dcr_winner"),
                    "dcr_weakest_dimension": dcr_block.get("dcr_weakest_dimension"),
                    "dcr_refinement_applied": dcr_block.get("dcr_refinement_applied"),
                    "dcr": dcr_block,
                    "martinoGce": martino_gce,
                    "martinoGceOverall": tune_config.get("_martino_gce_overall"),
                    "barTelemetry": bar_telemetry,
                    "notes": prov,
                },
                indent=2,
            ),
            encoding="utf-8",
        )
    return out_path


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser(description="Martino Linear Expressions Engine")
    p.add_argument("--preset", choices=["beatrice", "orbit"], required=True)
    p.add_argument("--output-dir", type=Path, default=_ENGINE_DIR)
    p.add_argument("--version", default=None, help="Version prefix e.g. V4.1")
    args = p.parse_args()
    preset_path = _ENGINE_DIR / "presets" / f"{args.preset}.json"
    with open(preset_path, encoding="utf-8") as f:
        config = json.load(f)
    config["output_dir"] = args.output_dir
    if args.version:
        config["version_prefix"] = args.version
    path = generate_musicxml(config)
    print(path)
