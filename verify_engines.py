"""
Verification script: composition evaluator and population composer with existing engines.
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "engines"))

from shared_composer.engine_registry import list_engines, get_engine, ensure_engines_loaded
from composition_evaluator.composition_evaluator import evaluate_composition
from population_composer.population_runtime import run_population_search


def main():
    print("=" * 60)
    print("STEP 2 — ENGINE REGISTRY CHECK")
    print("=" * 60)
    ensure_engines_loaded()
    engines = list_engines()
    print("Registered engines:", engines)
    expected = {"wayne_shorter", "barry_harris", "andrew_hill", "monk"}
    for e in expected:
        status = "OK" if e in engines else "MISSING"
        print(f"  {e}: {status}")
    print()

    print("=" * 60)
    print("STEP 3 — GENERATION TEST (one composition per engine)")
    print("=" * 60)
    scores_by_engine = {}
    for name in engines:
        try:
            eng = get_engine(name)
            ir = eng.generate_ir("Verify", mode="title", seed=0)
            compiled = eng.compile_from_ir(ir)
            xml = eng.export_musicxml(compiled)
            score_obj = evaluate_composition(compiled)
            scores_by_engine[name] = score_obj.total_score
            print(f"  {name}: score = {score_obj.total_score:.3f}")
        except Exception as ex:
            print(f"  {name}: ERROR - {ex}")
            scores_by_engine[name] = None
    print()

    print("=" * 60)
    print("STEP 4 — POPULATION TEST (wayne_shorter, size=10, gen=1)")
    print("=" * 60)
    best = run_population_search(
        engine_name="wayne_shorter",
        population_size=10,
        generations=1,
        seed=0,
    )
    top5 = best[:5]
    top5_scores = [c.score for c in top5]
    for i, c in enumerate(top5, 1):
        print(f"  #{i}: score = {c.score:.3f}")
    unique = len(set(round(s, 4) for s in top5_scores))
    print(f"  Unique scores in top 5: {unique} (not identical: {unique > 1})")
    print()

    print("=" * 60)
    print("STEP 5 — EXPORT BEST RESULT")
    print("=" * 60)
    if best:
        best_candidate = best[0]
        eng = get_engine(best_candidate.engine_source)
        xml = eng.export_musicxml(best_candidate.composition)
        out_path = os.path.join(os.path.dirname(__file__), "best_composition_export.xml")
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(xml)
        print(f"  Exported to: {out_path}")
        print(f"  Score: {best_candidate.score:.3f}")
    else:
        print("  No candidates to export.")
    print("=" * 60)


if __name__ == "__main__":
    main()
