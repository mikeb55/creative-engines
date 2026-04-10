"""Read one JSON object from stdin; write MusicXML to stdout. Schema: title (str, required), seed (int, default 42), mode (str, default \"title\"), profile (str, default \"balanced\")."""
import json
import sys


def main() -> None:
    try:
        data = json.load(sys.stdin)
        title = data.get("title")
        if not title or not isinstance(title, str):
            print("title required (non-empty string)", file=sys.stderr)
            sys.exit(1)
        seed = int(data.get("seed", 42))
        mode = data.get("mode", "title")
        profile = data.get("profile", "balanced")
        from engine_adapter import WayneShorterEngine

        engine = WayneShorterEngine()
        ir = engine.generate_ir(title, mode=mode, seed=seed, profile=profile)
        composition = engine.compile_from_ir(ir)
        sys.stdout.write(engine.export_musicxml(composition))
    except Exception as e:
        print(str(e), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
