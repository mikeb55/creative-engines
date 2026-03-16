#!/usr/bin/env python3
"""
Songwriting Engine Launcher — Entry point for generate_song().

Usage:
  python engine_launcher.py
  python engine_launcher.py --profiles McCartney,ABBA --seed 42 --export
  python engine_launcher.py --dev  # Run with basic tests
"""

import argparse
import sys
from pathlib import Path

# Add runtime dir for imports
_runtime_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(_runtime_dir))

try:
    from songwriting_engine_runtime import generate_song, export_to_musicxml, load_rule_package
except ImportError:
    from .songwriting_engine_runtime import generate_song, export_to_musicxml, load_rule_package


def main():
    parser = argparse.ArgumentParser(description="Songwriting Engine — Generate songs")
    parser.add_argument("--profiles", type=str, default="", help="Comma-separated profiles (max 2)")
    parser.add_argument("--vocal", type=str, default="male_tenor", choices=["male_tenor", "female_vocal"])
    parser.add_argument("--seed", type=str, default=None)
    parser.add_argument("--structure", type=str, default="default")
    parser.add_argument("--theme", type=str, default="love")
    parser.add_argument("--title", type=str, default="Untitled Song")
    parser.add_argument("--gce", type=float, default=9.0, help="GCE target score")
    parser.add_argument("--max-iter", type=int, default=10)
    parser.add_argument("--export", action="store_true", help="Export to MusicXML")
    parser.add_argument("--output-dir", type=str, default="output")
    parser.add_argument("--dev", action="store_true", help="Development mode: run basic tests")
    args = parser.parse_args()

    if args.dev:
        try:
            from . import runtime_tests
        except ImportError:
            import runtime_tests
        runtime_tests.run_basic_tests()
        return 0

    profiles = [p.strip() for p in args.profiles.split(",") if p.strip()]

    print("Songwriting Engine — Generating...")
    candidate = generate_song(
        style_profiles=profiles,
        vocal_target=args.vocal,
        song_seed=args.seed,
        structure_type=args.structure,
        lyric_theme=args.theme,
        title=args.title,
        gce_target=args.gce,
        max_iterations=args.max_iter,
    )

    scores = candidate.get("evaluation_scores", {})
    overall = scores.get("overall", 0)
    iterations = candidate.get("_iterations", 0)
    score_log = candidate.get("_score_log", [])

    print(f"  Title: {candidate.get('title', '')}")
    print(f"  GCE overall: {overall}")
    print(f"  Iterations: {iterations}")
    print(f"  Score progression: {score_log}")

    if args.export:
        out_dir = Path(args.output_dir)
        out_dir.mkdir(parents=True, exist_ok=True)
        safe_title = "".join(c if c.isalnum() or c in " -_" else "_" for c in args.title)
        out_path = out_dir / f"{safe_title}.musicxml"
        export_to_musicxml(candidate, out_path)
        print(f"  Exported: {out_path}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
