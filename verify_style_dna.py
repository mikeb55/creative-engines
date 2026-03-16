"""
Verification script: Style DNA and style-adjusted evaluator scores.
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "engines"))

from shared_composer.engine_registry import get_engine, ensure_engines_loaded
from composition_evaluator.composition_evaluator import evaluate_composition


def main():
    print("=" * 60)
    print("STYLE DNA VERIFICATION — Style-adjusted scores per engine")
    print("=" * 60)
    ensure_engines_loaded()
    engines = ["wayne_shorter", "barry_harris", "andrew_hill", "monk"]
    print(f"{'Engine':<18} {'Base':>8} {'Style Fit':>10} {'Adjusted':>10}")
    print("-" * 50)
    seeds = {"wayne_shorter": 0, "barry_harris": 1, "andrew_hill": 2, "monk": 3}
    for name in engines:
        try:
            eng = get_engine(name)
            ir = eng.generate_ir("StyleDNA", mode="title", seed=seeds.get(name, 0))
            compiled = eng.compile_from_ir(ir)
            score = evaluate_composition(compiled, engine_name=name)
            base = score.base_score
            fit = score.style_fit_score
            adj = score.total_score
            print(f"{name:<18} {base:>8.3f} {fit:>10.3f} {adj:>10.3f}")
        except Exception as ex:
            print(f"{name:<18} ERROR: {ex}")
    print("=" * 60)
    print("Scores should no longer collapse to identical values.")
    print("=" * 60)


if __name__ == "__main__":
    main()
