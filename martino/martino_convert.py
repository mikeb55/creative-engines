"""Martino harmonic reduction (mirrors src/engine/martinoConvert.js). Stdlib only."""
from __future__ import annotations

import re
from typing import Any

PC_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]
ROOT_RE = re.compile(r"^([A-G](?:#|b)?)", re.I)
EXT_TOKEN_RE = re.compile(r"^(#11|b9|#9|b13|#5|b5|add9|add11|add13|9|11|13|6|alt|7alt)", re.I)


def note_to_pc(name: str) -> int:
    n = str(name).strip()
    letter = n[0].upper()
    acc = n[1:]
    try:
        base = PC_NAMES.index(letter)
    except ValueError:
        base = 0
    if acc in ("b", "♭"):
        return (base + 11) % 12
    if acc in ("#", "♯"):
        return (base + 1) % 12
    if acc == "bb":
        return (base + 10) % 12
    if acc == "##":
        return (base + 2) % 12
    return base % 12


def pc_to_minor_root_name(pc: int) -> str:
    return f"{PC_NAMES[pc % 12]}m"


def transpose_pc(pc: int, semitones: int) -> int:
    return (pc + semitones) % 12


def _normalize_root(root: str) -> str:
    letter = root[0].upper()
    acc = root[1:]
    if acc in ("b", "♭"):
        return f"{letter}b"
    if acc in ("#", "♯"):
        return f"{letter}#"
    return letter


def _parse_harmony_suffix(suffix: str) -> tuple[str, list[str], str]:
    s = suffix
    quality = "major"
    extensions: list[str] = []

    dim7 = re.match(r"^(?:dim7|°7|o7)", s, re.I)
    if dim7:
        quality = "dim7"
        s = s[dim7.end() :]
    else:
        dim = re.match(r"^(?:dim|°|o)(?!7)", s, re.I)
        if dim:
            quality = "dim"
            s = s[dim.end() :]

    if quality == "major":
        half_dim = re.match(r"^(?:m7b5|min7b5|ø7?|half-?dim)", s, re.I)
        if half_dim:
            quality = "m7b5"
            s = s[half_dim.end() :]

    if quality == "major":
        aug = re.match(r"^(?:aug|\+)", s, re.I)
        if aug:
            quality = "aug"
            s = s[aug.end() :]

    if quality == "major":
        min_maj = re.match(r"^(?:min(?:or)?(?:maj|Maj|M)|m(?:M|Maj))(?:7|Δ)?", s, re.I)
        if min_maj:
            quality = "minMaj7"
            s = s[min_maj.end() :]
        elif re.match(r"^sus2", s, re.I):
            quality = "sus2"
            s = s[4:]
        elif re.match(r"^sus4", s, re.I):
            quality = "sus4"
            s = s[4:]
        else:
            min9 = re.match(r"^(?:min(?:or)?9|m9|-9)", s, re.I)
            if min9:
                quality = "min9"
                s = s[min9.end() :]
            else:
                minor = re.match(r"^(?:min(?:or)?|m(?!aj|M)|-)(?:7|11|13|6)?", s, re.I)
                if minor:
                    quality = "minor"
                    s = s[minor.end() :]
                else:
                    maj7 = re.match(r"^(?:maj|M|Δ)7", s, re.I)
                    if maj7:
                        quality = "maj7"
                        s = s[maj7.end() :]
                    else:
                        maj6 = re.match(r"^(?:maj|M|Δ)?6", s, re.I)
                        if maj6:
                            quality = "maj6"
                            s = s[maj6.end() :]
                        else:
                            major = re.match(r"^(?:maj|M|Δ)(?:9|11|13)?", s, re.I)
                            if major:
                                quality = "major"
                                s = s[major.end() :]
                            else:
                                dom_alt = re.match(r"^7alt", s, re.I)
                                if dom_alt:
                                    quality = "dom7alt"
                                    s = s[dom_alt.end() :]
                                else:
                                    dom = re.match(r"^(?:7|9|11|13|dom7?)", s, re.I)
                                    if dom:
                                        quality = "dom7"
                                        s = s[dom.end() :]

    while s:
        ext_match = EXT_TOKEN_RE.match(s)
        if not ext_match:
            break
        token = ext_match.group(1)
        if token in ("alt", "7alt") and quality == "dom7":
            quality = "dom7alt"
        elif token in ("#9", "b9", "#5", "b5") and quality == "dom7":
            quality = "dom7alt"
        extensions.append(token)
        s = s[ext_match.end() :]

    return quality, extensions, s


def parse_chord(symbol: str | None) -> dict[str, Any] | None:
    if symbol is None:
        return None
    raw = str(symbol).strip()
    if not raw:
        return None
    slash_idx = raw.find("/")
    harmony_part = raw[:slash_idx].strip() if slash_idx >= 0 else raw
    bass_part = raw[slash_idx + 1 :].strip() if slash_idx >= 0 else ""
    root_match = ROOT_RE.match(harmony_part)
    if not root_match:
        return None
    root = _normalize_root(root_match.group(1))
    suffix = harmony_part[root_match.end() :]
    quality, extensions, remainder = _parse_harmony_suffix(suffix)
    if remainder:
        return None
    out: dict[str, Any] = {"root": root, "quality": quality}
    if bass_part:
        bass_match = ROOT_RE.match(bass_part)
        if bass_match:
            out["bass"] = _normalize_root(bass_match.group(1))
    if extensions:
        out["extensions"] = extensions
    return out


def _classify_family(parsed: dict[str, Any] | None, symbol: str) -> tuple[str, str]:
    if not parsed:
        return "unknown", "unknown"
    q = parsed["quality"]
    ext = parsed.get("extensions") or []
    if q == "dim7":
        return "dim7", "diminished"
    if q == "dim":
        return "dim", "diminished"
    if q == "m7b5":
        return "m7b5", "half-dim"
    if q in ("minor", "min9", "minMaj7"):
        return "minor", "minor"
    if q == "dom7alt":
        return "dom7alt", "dominant"
    if q == "dom7":
        return "dom7", "dominant"
    if q == "aug" or (q == "maj7" and "#5" in ext):
        return "aug", "augmented"
    if q == "maj6":
        return "maj6", "major"
    if q == "maj7" and "#11" in ext:
        return "maj7sharp11", "major"
    if q == "maj7":
        return "maj7", "major"
    if q in ("major", "sus2", "sus4"):
        return "major", "major"
    return q, "unknown"


def martino_convert(
    chord_symbol: str,
    tension_level: str = "low",
    prev_chord_symbol: str | None = None,
) -> dict[str, Any]:
    parsed = parse_chord(chord_symbol)
    prev_parsed = parse_chord(prev_chord_symbol) if prev_chord_symbol else None
    family, layer = _classify_family(parsed, chord_symbol)
    root_pc = note_to_pc(parsed["root"]) if parsed else 0
    minor_pc = root_pc
    book_rule = "unknown"
    parent_diminished = None
    family_dominants: list[str] = []

    if family in ("minor", "min9", "minMaj7"):
        minor_pc = root_pc
        book_rule = "minor-direct"
    elif family in ("major", "maj6", "maj7sharp11"):
        minor_pc = transpose_pc(root_pc, -3)
        book_rule = "relative-minor"
    elif family == "maj7":
        if prev_parsed and prev_parsed.get("quality") in ("dom7", "dom7alt"):
            minor_pc = transpose_pc(root_pc, 4)
            book_rule = "minor-of-third-after-dominant"
        elif prev_chord_symbol:
            minor_pc = transpose_pc(root_pc, -3)
            book_rule = "relative-minor-maj7-line"
        else:
            minor_pc = transpose_pc(root_pc, 4)
            book_rule = "minor-of-third"
    elif family == "aug":
        minor_pc = transpose_pc(root_pc, 9)
        book_rule = "augmented-major-sixth"
    elif family == "m7b5":
        minor_pc = transpose_pc(root_pc, 3)
        book_rule = "half-dim-minor-third-up"
    elif family == "dom7":
        if tension_level == "low":
            minor_pc = transpose_pc(root_pc, 7)
            book_rule = "dominant-p5-above"
        else:
            minor_pc = transpose_pc(root_pc, 1)
            book_rule = "dominant-b2-above"
        family_dominants.append(pc_to_minor_root_name(root_pc).replace("m", ""))
    elif family == "dom7alt":
        minor_pc = transpose_pc(root_pc, 1)
        book_rule = "dominant-alt-b2-above"
        family_dominants.append(pc_to_minor_root_name(root_pc).replace("m", ""))
    elif family == "dim7":
        minor_pc = transpose_pc(root_pc, 3)
        book_rule = "dim7-half-dim-pathway"
        parent_diminished = pc_to_minor_root_name(root_pc).replace("m", "")
    elif family == "dim":
        minor_pc = transpose_pc(root_pc, 3)
        book_rule = "dim-half-dim-pathway"
        parent_diminished = pc_to_minor_root_name(root_pc).replace("m", "")
    else:
        minor_pc = transpose_pc(root_pc, -3)
        book_rule = "fallback-relative-minor"

    return {
        "minorRoot": pc_to_minor_root_name(minor_pc),
        "minorRootPc": minor_pc,
        "tensionLevel": tension_level,
        "layer": layer,
        "parentDiminished": parent_diminished,
        "familyDominants": family_dominants,
        "sourceChord": chord_symbol,
        "bookRule": book_rule,
    }
