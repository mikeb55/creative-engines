"""
Verification script: Style-aware hybrid population search.
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "engines"))

from hybrid_engine.hybrid_population_runtime import run_hybrid_population_search, export_top_hybrids


def main():
    print("=" * 60)
    print("HYBRID POPULATION SEARCH — Top 5 hybrids")
    print("=" * 60)
    top = run_hybrid_population_search(
        input_text="Hybrid Verify",
        count=12,
        generations=2,
        top_n=5,
        seed=0,
    )
    for i, c in enumerate(top, 1):
        print(f"  #{i}: {c.melody_engine} + {c.harmony_engine}  score={c.adjusted_score:.3f}")
    out_dir = os.path.join(os.path.dirname(__file__), "hybrid_exports")
    os.makedirs(out_dir, exist_ok=True)
    paths = export_top_hybrids(top, output_dir=out_dir, prefix="hybrid")
    print()
    print("Exported to:", out_dir)
    for p in paths:
        print("  ", os.path.basename(p))
    print("=" * 60)


if __name__ == "__main__":
    main()
