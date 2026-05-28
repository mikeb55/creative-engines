"""Canonical Gm activity masters — transpose-only generation with provenance."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from martino_convert import martino_convert, note_to_pc

ENGINE_DIR = Path(__file__).resolve().parent
MASTERS_DIR = ENGINE_DIR / "masters" / "activities"

GM_REFERENCE_PC = 7  # G minor lane root
STEP_SEMI = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]

ACTIVITY_ALIASES = {
    "A1_LINEAR_CORE": "A1",
    "A2_DIAGONAL_BRIDGE": "A2",
    "A3_PIVOT_CELL": "A3",
    "A4_ANCHOR_ARP": "A4",
    "A5_FREE_MIX": "A5",
    "LINEAR_CORE": "A1",
    "DIAGONAL_BRIDGE": "A2",
    "PIVOT_CELL": "A3",
    "ANCHOR_ARP": "A4",
    "FREE_MIX": "A5",
}

FORBIDDEN_METADATA_SUBSTRINGS = (
    "ACTIVITY",
    "LFV",
    "TUNE=",
    "STRINGS",
    "FRETS",
    "BRIDGE",
    "CHORUS=",
    "PRIMARY_ACTIVITY",
)


class TemplateUnavailableError(RuntimeError):
    """Raised when canonical masters cannot supply material for a bar."""


def _pc(step: str, alter: int | None) -> int:
    base = STEP_SEMI.get(step[0], 0)
    if alter is not None:
        base += int(alter)
    elif len(step) > 1 and step[1] == "b":
        base -= 1
    elif len(step) > 1 and step[1] == "#":
        base += 1
    return base % 12


def note_to_midi(step: str, octave: int, alter: int | None) -> int:
    return (int(octave) + 1) * 12 + _pc(str(step), alter)


def midi_to_note(midi: int) -> tuple[str, int, int | None]:
    pc = midi % 12
    octave = midi // 12 - 1
    name = NAMES[pc]
    alter = -1 if "b" in name and len(name) > 1 else (1 if "#" in name else None)
    step = name[0]
    return step, octave, alter


def semitones_gm_to_target(target_minor_pc: int) -> int:
    delta = (target_minor_pc - GM_REFERENCE_PC) % 12
    if delta > 6:
        delta -= 12
    return delta


def transpose_bar(bar: list, semitones: int) -> list:
    if semitones == 0:
        return [list(item) for item in bar]
    out: list[list] = []
    for item in bar:
        step, octv, alt, dur = item[0], int(item[1]), item[2], int(item[3])
        midi = note_to_midi(str(step), octv, int(alt) if alt is not None else None) + semitones
        new_step, new_oct, new_alt = midi_to_note(midi)
        out.append([new_step, new_oct, new_alt, dur])
    return out


def _activity_key_from_plan(activity_id: str) -> str:
    from generator import _activity_key_from_id

    return _activity_key_from_id(activity_id)


def _activity_id_for_key(key: str) -> str:
    from generator import _activity_id_from_key

    return _activity_id_from_key(key)


def resolve_activity_key(primary_activity: str) -> str:
    raw = str(primary_activity or "A1_LINEAR_CORE")
    for token in raw.replace("(", " ").replace(")", " ").split():
        if token in ACTIVITY_ALIASES:
            return ACTIVITY_ALIASES[token]
    for key, val in ACTIVITY_ALIASES.items():
        if key in raw:
            return val
    return "A1"


def load_master_bars(activity_key: str) -> list[list]:
    path = MASTERS_DIR / f"{activity_key}.json"
    if not path.exists():
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    bars = data.get("bars_gm") or []
    if not bars:
        return []
    return bars


def _activity_candidates(tune_config: dict) -> list[str]:
    primary = resolve_activity_key(tune_config.get("primary_activity", "A1_LINEAR_CORE"))
    keys = [primary]
    secondaries = tune_config.get("secondary_activities") or []
    if isinstance(secondaries, list):
        for item in secondaries:
            keys.append(resolve_activity_key(str(item)))
    seen: set[str] = set()
    ordered: list[str] = []
    for key in keys:
        if key not in seen:
            seen.add(key)
            ordered.append(key)
    return ordered


def _select_activity_for_bar(
    bar_index: int,
    last_midi: int | None,
    tune_config: dict,
) -> str:
    ranges = tune_config.get("activity_map_measure_ranges") or []
    if isinstance(ranges, list):
        for entry in ranges:
            if not isinstance(entry, dict):
                continue
            rng = str(entry.get("range", ""))
            if "-" in rng:
                start_s, end_s = rng.split("-", 1)
                try:
                    start_i, end_i = int(start_s.strip()), int(end_s.strip())
                    bar_num = bar_index + 1
                    if start_i <= bar_num <= end_i:
                        return resolve_activity_key(str(entry.get("activity", "")))
                except ValueError:
                    pass

    candidates = _activity_candidates(tune_config)
    if bar_index == 0 or last_midi is None:
        return candidates[0]

    best_key = candidates[0]
    best_gap = 999
    for key in candidates:
        bars = load_master_bars(key)
        if not bars or not bars[0]:
            continue
        first = bars[0][0]
        first_midi = note_to_midi(
            str(first[0]),
            int(first[1]),
            int(first[2]) if first[2] is not None else None,
        )
        gap = abs(first_midi - last_midi)
        if gap < best_gap:
            best_gap = gap
            best_key = key
    return best_key


def _chord_for_bar(chords: list, bar_index: int, split_chord_measures: dict) -> str:
    bar_key = str(bar_index)
    if bar_key in split_chord_measures:
        split = split_chord_measures[bar_key]
        if isinstance(split, list) and split:
            return str(split[0])
    if bar_index < len(chords):
        entry = chords[bar_index]
        if isinstance(entry, list) and entry:
            return str(entry[0])
        return str(entry)
    return "Gmaj7"


def _lfv_bounds(tune_config: dict) -> tuple[int, int]:
    lfv = tune_config.get("lfv") or {}
    min_f = int(lfv.get("min_fret", 5))
    max_f = int(lfv.get("max_fret", 9))
    # Guitar frets 5–9 on strings 4–3–2 ≈ MIDI 38–68 (engine_spec default).
    min_midi = int(lfv.get("min_midi", 38))
    max_midi = int(lfv.get("max_midi", 68))
    return min_midi, max_midi


def build_canonical_melody(tune_config: dict) -> tuple[list[list], list[dict[str, Any]]]:
    """
    Build melody bars from frozen A1–A5 masters only.
    Returns (bars, provenance_log).
  """
    if tune_config.get("_force_template_failure"):
        raise TemplateUnavailableError(
            "No canonical template available for forced-failure — generation aborted. Do not invent material."
        )

    chords = tune_config.get("chords") or []
    if not chords:
        raise TemplateUnavailableError(
            "No canonical template available for [no chords] — generation aborted. Do not invent material."
        )

    mpc = int(tune_config.get("measures_per_chorus", 16))
    choruses = int(tune_config.get("choruses", 1))
    total = mpc * choruses
    split = tune_config.get("split_chord_measures") or {}
    tension_map = tune_config.get("tension_map") or {}
    min_midi, max_midi = _lfv_bounds(tune_config)

    from generator import _build_reduction_map, plan_all_phrase_activities

    reduction_map = _build_reduction_map(chords, tune_config)
    phrase_plan = plan_all_phrase_activities(reduction_map, tune_config)
    tune_config["_phrase_plan"] = phrase_plan
    plan_by_bar = {int(entry["bar"]): entry for entry in phrase_plan}

    melody: list[list] = []
    provenance: list[dict[str, Any]] = []
    last_midi: int | None = None
    lfv_violation_measures: set[int] = set()

    for global_bar in range(total):
        bar_in_chorus = global_bar % mpc
        measure_num = global_bar + 1
        plan_entry = plan_by_bar.get(measure_num)
        if plan_entry:
            activity_key = _activity_key_from_plan(plan_entry["activity"])
            chord = str(plan_entry["chord"])
            semitones = int(plan_entry["transpose"])
            reduction_name = str(plan_entry["reduction"])
            role = str(plan_entry.get("role", ""))
        else:
            activity_key = _select_activity_for_bar(bar_in_chorus, last_midi, tune_config)
            chord = _chord_for_bar(chords, bar_in_chorus, split)
            level = tension_map.get(global_bar) or tension_map.get(str(global_bar)) or "low"
            conversion = martino_convert(chord, str(level), None)
            semitones = semitones_gm_to_target(int(conversion["minorRootPc"]))
            reduction_name = conversion["minorRoot"]
            role = ""

        master_bars = load_master_bars(activity_key)
        if not master_bars:
            raise TemplateUnavailableError(
                f"No canonical template available for [{chord}] — generation aborted. Do not invent material."
            )

        template_bar = master_bars[bar_in_chorus % len(master_bars)]
        source_bar_index = bar_in_chorus % len(master_bars)
        transposed = transpose_bar(template_bar, semitones)

        bar_lfv_violation = False
        for note_index, note in enumerate(transposed):
            step, octv, alt, dur = note[0], int(note[1]), note[2], int(note[3])
            midi = note_to_midi(str(step), octv, int(alt) if alt is not None else None)
            in_lfv = min_midi <= midi <= max_midi
            if not in_lfv:
                bar_lfv_violation = True
            provenance.append(
                {
                    "measure": measure_num,
                    "note_index": note_index,
                    "source_activity": activity_key,
                    "activity": plan_entry.get("activity") if plan_entry else _activity_id_for_key(activity_key),
                    "role": role,
                    "source_bar": source_bar_index,
                    "transpose": semitones,
                    "lfv_violation": not in_lfv,
                    "lfv_ok": plan_entry.get("lfv_ok", in_lfv) if plan_entry else in_lfv,
                    "fallback": False,
                    "source_chord": chord,
                    "reduction": reduction_name,
                    "minor_root": reduction_name,
                    "book_rule": plan_entry.get("book_rule") if plan_entry else None,
                }
            )
            last_midi = midi

        if bar_lfv_violation:
            lfv_violation_measures.add(measure_num)

        melody.append(transposed)

    existing = set(tune_config.get("asterisk_measures") or [])
    tune_config["asterisk_measures"] = sorted(existing | lfv_violation_measures)
    return melody, provenance


def build_melody_bars(tune_config: dict) -> list[list]:
    """Backward-compatible entry: canonical masters only."""
    bars, _ = build_canonical_melody(tune_config)
    return bars
