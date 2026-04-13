"""Charlie Parker bebop engine CLI: JSON on stdin, or --title [--chords ...] for argparse."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from parker_musicxml_exporter import REHEARSAL_MAP, export_to_musicxml
from parker_section_compiler import compile_parker_composition

_MAX_CHORDS = 64

_CHORD_ROOT_RE = re.compile(r"^[A-Ga-g]([#b♯♭]?)")


def _validate_chord_token(tok: str) -> None:
    left = tok.split("/")[0].strip()
    if not left or not _CHORD_ROOT_RE.match(left):
        raise ValueError(f"Invalid chord token (need root A–G with optional #/b): {tok!r}")


def _parse_chord_csv(s: str) -> List[str]:
    """Split CSV; non-empty tokens only. Caller enforces non-empty overall when required."""
    return [
        c.strip()
        for c in re.split(r"[,;|]+", (s or "").strip())
        if c.strip()
    ][:_MAX_CHORDS]


def _parse_and_validate_chords(csv: str) -> List[str]:
    chords = _parse_chord_csv(csv)
    for c in chords:
        _validate_chord_token(c)
    return chords


def _assert_known_song_form(label: str, raw: Any) -> str:
    if raw is None or (isinstance(raw, str) and not raw.strip()):
        raise ValueError("song_form is required (use a key from REHEARSAL_MAP, e.g. aaba).")
    if not isinstance(raw, str):
        raise ValueError("song_form must be a string.")
    key = raw.strip().lower()
    if key not in REHEARSAL_MAP:
        known = ", ".join(sorted(REHEARSAL_MAP.keys()))
        raise ValueError(f"Unknown song form {raw!r}. Use one of: {known}")
    return key


_BAR_COUNT_TO_FORM: Dict[int, str] = {
    12: "blues12",
    16: "ab",
    24: "aba",
    32: "aaba",
}


def _select_rehearsal_map(
    bar_count: int, explicit_form: Optional[str]
) -> Tuple[Dict[int, str], Optional[str]]:
    """
    Choose rehearsal letters for the actual number of measures.
    Returns (map_bar_number_to_label, warning_or_none).
    """
    if explicit_form is not None:
        ef = explicit_form.strip().lower()
        if ef not in REHEARSAL_MAP:
            known = ", ".join(sorted(REHEARSAL_MAP.keys()))
            raise ValueError(f"Unknown song form {explicit_form!r}. Use one of: {known}")
        m = REHEARSAL_MAP[ef]
        return {k: v for k, v in m.items() if k <= bar_count}, None

    inferred = _BAR_COUNT_TO_FORM.get(bar_count)
    if inferred is not None:
        m = REHEARSAL_MAP[inferred]
        return {k: v for k, v in m.items() if k <= bar_count}, None

    return {}, (
        f"Warning: no default rehearsal map for bar count {bar_count}; "
        "rehearsal marks omitted (set song_form explicitly if needed)."
    )


def _stdin_chords(data: Dict[str, Any]) -> Optional[str]:
    raw = data.get("chords")
    if raw is None:
        raw = data.get("custom_chords")
    if raw is None:
        raw = data.get("customChords")
    if raw is None:
        return None
    if isinstance(raw, str):
        t = raw.strip()
        return t if t else None
    if isinstance(raw, (list, tuple)):
        parts = [str(x).strip() for x in raw if x is not None and str(x).strip()]
        return ",".join(parts) if parts else None
    return None


def _stdin_song_form_raw(data: Dict[str, Any]) -> Any:
    return data.get("song_form") if "song_form" in data else data.get("songForm")


def _export_compiled(
    comp: Dict[str, Any],
    compile_form: str,
    rehearsal_map: Dict[int, str],
) -> str:
    return export_to_musicxml(
        comp,
        song_form=compile_form,
        rehearsal_map=rehearsal_map,
    )


def _write_output(xml: str) -> str:
    base = os.path.dirname(os.path.abspath(__file__))
    out_dir = os.path.join(base, "outputs")
    os.makedirs(out_dir, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    name = f"charlie_parker_{stamp}.musicxml"
    path = os.path.join(out_dir, name)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(xml)
    return path


def main() -> None:
    if len(sys.argv) > 1:
        parser = argparse.ArgumentParser(description="Charlie Parker bebop engine CLI")
        parser.add_argument("--title", type=str, required=True, help="Composition title")
        parser.add_argument(
            "--chords",
            type=str,
            default="",
            help="Chords: comma, semicolon, or pipe separated (max 64). Required (non-empty).",
        )
        parser.add_argument("--seed", type=int, default=42)
        parser.add_argument(
            "--song-form",
            type=str,
            required=True,
            help="Song form key (aaba, abac, aba, ab, blues12, blues24, aab, abcb).",
        )
        args = parser.parse_args()
        try:
            csv = (args.chords if args.chords is not None else "").strip()
            if not csv:
                print(
                    "error: --chords is missing or empty; provide at least one chord symbol.",
                    file=sys.stderr,
                )
                sys.exit(1)
            chord_list = _parse_and_validate_chords(csv)
            if not chord_list:
                print("error: no chord symbols parsed from --chords.", file=sys.stderr)
                sys.exit(1)

            compile_form = _assert_known_song_form("--song-form", args.song_form)

            comp = compile_parker_composition(
                args.title, chord_list, seed=args.seed, song_form=compile_form
            )
            bar_count = len(comp.get("bars") or [])
            rh_map, rh_warn = _select_rehearsal_map(bar_count, compile_form)
            if rh_warn:
                print(rh_warn, file=sys.stderr)

            xml = _export_compiled(comp, compile_form, rh_map)
            path = _write_output(xml)
            print(path, file=sys.stderr)
        except ValueError as e:
            print(f"error: {e}", file=sys.stderr)
            sys.exit(1)
        except Exception as e:
            print(str(e), file=sys.stderr)
            sys.exit(1)
        return

    try:
        data = json.load(sys.stdin)
        title = data.get("title")
        if not title or not isinstance(title, str):
            print("title required (non-empty string)", file=sys.stderr)
            sys.exit(1)
        seed = int(data.get("seed", 42))

        csv = _stdin_chords(data)
        if csv is None or not str(csv).strip():
            print("error: stdin JSON must include non-empty chords (chords, custom_chords, or customChords).", file=sys.stderr)
            sys.exit(1)
        chord_list = _parse_and_validate_chords(str(csv))
        if not chord_list:
            print("error: no chord symbols parsed from stdin chord field.", file=sys.stderr)
            sys.exit(1)

        sf_raw = _stdin_song_form_raw(data)
        if sf_raw is not None and str(sf_raw).strip():
            compile_form = _assert_known_song_form("song_form", sf_raw)
            explicit_for_rh: Optional[str] = compile_form
        else:
            compile_form = "aaba"
            explicit_for_rh = None

        comp = compile_parker_composition(
            title, chord_list, seed=seed, song_form=compile_form
        )
        bar_count = len(comp.get("bars") or [])
        rh_map, rh_warn = _select_rehearsal_map(bar_count, explicit_for_rh)
        if rh_warn:
            print(rh_warn, file=sys.stderr)

        xml = _export_compiled(comp, compile_form, rh_map)
        path = _write_output(xml)
        print(path, file=sys.stderr)
    except ValueError as e:
        print(f"error: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(str(e), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
