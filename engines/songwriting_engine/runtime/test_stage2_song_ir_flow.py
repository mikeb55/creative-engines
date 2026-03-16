"""Stage 2 end-to-end flow tests."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from song_ir_generator import generate_song_ir_candidates
from qd_archive import QDArchive
from finalist_selector import score_ir_candidate, compile_finalist_candidates


def _run_stage2_flow(input_text: str, mode: str, count: int, finalist_limit: int, seed: int):
    """Mirror run_stage2_demo logic for testing."""
    cands = generate_song_ir_candidates(input_text, mode=mode, count=count, seed=seed)
    arch = QDArchive()
    for ir in cands:
        q = score_ir_candidate(ir)
        arch.insert(ir, q)
    elites = arch.sample_elites(limit=finalist_limit)
    elite_irs = [ir for ir, _ in elites]
    return compile_finalist_candidates(elite_irs)


def test_title_flow():
    """Title -> generate -> archive -> finalists -> compile works."""
    results = _run_stage2_flow("River Road", mode="title", count=12, finalist_limit=5, seed=300)
    assert len(results) >= 1
    assert all("compiled" in r for r in results)
    print("  [PASS] title flow")


def test_premise_flow():
    """Premise flow works."""
    results = _run_stage2_flow("journey and return", mode="premise", count=8, finalist_limit=3, seed=301)
    assert len(results) >= 1
    print("  [PASS] premise flow")


def test_hook_flow():
    """Hook flow works."""
    results = _run_stage2_flow("Edge of Night", mode="hook", count=8, finalist_limit=3, seed=302)
    assert len(results) >= 1
    print("  [PASS] hook flow")


def test_outputs_deterministic():
    """Outputs are deterministic for same input."""
    a = _run_stage2_flow("Deterministic", mode="title", count=6, finalist_limit=2, seed=400)
    b = _run_stage2_flow("Deterministic", mode="title", count=6, finalist_limit=2, seed=400)
    assert len(a) == len(b)
    for i in range(len(a)):
        assert a[i]["compiled"].title == b[i]["compiled"].title
        assert a[i]["rank"] == b[i]["rank"]
    print("  [PASS] outputs deterministic")


if __name__ == "__main__":
    test_title_flow()
    test_premise_flow()
    test_hook_flow()
    test_outputs_deterministic()
    print("All Stage 2 flow tests passed.")
