"""Wayne Shorter CLI: JSON on stdin, or --title [--chords ...] for argparse. Writes MusicXML to stdout."""
import argparse
import json
import re
import sys
from typing import Any, Dict, Optional


def _stdin_custom_chords(data: Dict[str, Any]) -> Optional[str]:
    """Match desktop/JSON payloads: snake_case or camelCase; str or list of strings (comma-joined)."""
    raw = data.get("custom_chords")
    if raw is None:
        raw = data.get("customChords")
    if raw is None:
        return None
    if isinstance(raw, str):
        s = raw.strip()
        return s if s else None
    if isinstance(raw, (list, tuple)):
        parts = [str(x).strip() for x in raw if x is not None and str(x).strip()]
        return ",".join(parts) if parts else None
    return None


_KIND_CLOSE_HARM = re.compile(
    r'(<kind text="([^"]+)">[^<]+</kind>)\n(\s*</harmony>)',
)


def _inject_bass_after_slash_kinds(xml: str) -> str:
    """Add <bass> after <kind> when slash chord text is present (exporter emits root/kind only)."""

    def repl(m: re.Match) -> str:
        kind_line, text_attr, close = m.group(1), m.group(2), m.group(3)
        if "/" not in text_attr:
            return m.group(0)
        bass = text_attr.rsplit("/", 1)[-1].strip()
        rm = re.match(r"^([A-G])(b|#)?", bass)
        if not rm:
            return m.group(0)
        step = rm.group(1)
        alter = ""
        if rm.group(2) == "b":
            alter = "\n        <bass-alter>-1</bass-alter>"
        elif rm.group(2) == "#":
            alter = "\n        <bass-alter>1</bass-alter>"
        bass_block = (
            "        <bass>\n"
            f"          <bass-step>{step}</bass-step>{alter}\n"
            "        </bass>"
        )
        return f"{kind_line}\n{bass_block}\n{close}"

    return _KIND_CLOSE_HARM.sub(repl, xml)


def main() -> None:
    if len(sys.argv) > 1:
        parser = argparse.ArgumentParser(description="Wayne Shorter engine CLI")
        parser.add_argument("--title", type=str, required=True, help="Composition title")
        parser.add_argument(
            "--chords",
            type=str,
            default=None,
            help='Custom chords: separate with comma, semicolon, or | only (max 32). '
            'Slash/minus preserved, e.g. "Dm7/F,C-7,Ebmaj7"',
        )
        parser.add_argument("--seed", type=int, default=42)
        parser.add_argument("--mode", type=str, default="title")
        parser.add_argument("--profile", type=str, default="balanced")
        args = parser.parse_args()
        try:
            from engine_adapter import WayneShorterEngine
            from shorter_section_compiler import compile_composition_from_ir

            engine = WayneShorterEngine()
            ir = engine.generate_ir(
                args.title, mode=args.mode, seed=args.seed, profile=args.profile
            )
            composition = compile_composition_from_ir(ir, custom_chords=args.chords)
            sys.stdout.write(
                _inject_bass_after_slash_kinds(engine.export_musicxml(composition))
            )
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
        mode = data.get("mode", "title")
        profile = data.get("profile", "balanced")
        custom = _stdin_custom_chords(data)
        from engine_adapter import WayneShorterEngine
        from shorter_section_compiler import compile_composition_from_ir

        engine = WayneShorterEngine()
        ir = engine.generate_ir(title, mode=mode, seed=seed, profile=profile)
        composition = compile_composition_from_ir(ir, custom_chords=custom)
        sys.stdout.write(
            _inject_bass_after_slash_kinds(engine.export_musicxml(composition))
        )
    except Exception as e:
        print(str(e), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
