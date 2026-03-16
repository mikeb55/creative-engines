"""
Hybrid Population Runtime — Run hybrid composition search and export best results.
"""

from typing import Any, List

try:
    from hybrid_engine.hybrid_generator import generate_hybrid_candidates
    from hybrid_engine.hybrid_ranker import rank_hybrid_candidates, select_top_hybrids
    from hybrid_engine.hybrid_candidate_types import HybridCandidate
    from hybrid_engine.hybrid_musicxml_exporter import export_hybrid_to_musicxml
except ImportError:
    import sys
    import os
    _base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if _base not in sys.path:
        sys.path.insert(0, _base)
    from hybrid_engine.hybrid_generator import generate_hybrid_candidates
    from hybrid_engine.hybrid_ranker import rank_hybrid_candidates, select_top_hybrids
    from hybrid_engine.hybrid_candidate_types import HybridCandidate
    from hybrid_engine.hybrid_musicxml_exporter import export_hybrid_to_musicxml


def run_hybrid_population_search(
    input_text: str = "Untitled",
    count: int = 12,
    generations: int = 2,
    top_n: int = 5,
    seed: int = 0,
) -> List[HybridCandidate]:
    """
    Run hybrid population search.
    Pipeline: generate → compile → evaluate → rank → (next gen) → export best.
    Returns top hybrid candidates sorted by adjusted score.
    """
    all_candidates = []
    for gen in range(generations):
        candidates = generate_hybrid_candidates(
            input_text=input_text,
            count=count,
            seed=seed + gen * 1000,
        )
        ranked = rank_hybrid_candidates(candidates)
        all_candidates.extend(ranked)
    all_candidates.sort(key=lambda x: x.adjusted_score, reverse=True)
    return all_candidates[:top_n]


def export_top_hybrids(
    candidates: List[HybridCandidate],
    output_dir: str = ".",
    prefix: str = "hybrid",
) -> List[str]:
    """Export top hybrid candidates to MusicXML files. Returns list of file paths."""
    import os
    paths = []
    for i, c in enumerate(candidates):
        xml = export_hybrid_to_musicxml(c.compiled_result)
        fname = f"{prefix}_{i+1}_{c.melody_engine}_{c.harmony_engine}.xml"
        path = os.path.join(output_dir, fname)
        with open(path, "w", encoding="utf-8") as f:
            f.write(xml)
        paths.append(path)
    return paths
