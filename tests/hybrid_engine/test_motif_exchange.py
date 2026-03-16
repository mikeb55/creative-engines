"""Tests for motif exchange."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines"))

from shared_composer.engine_registry import get_engine, ensure_engines_loaded
from shared_composer.motif_exchange import extract_motifs, transform_motif_for_engine, inject_motif


def test_extract_motifs():
    ensure_engines_loaded()
    eng = get_engine("wayne_shorter")
    ir = eng.generate_ir("Test", mode="title", seed=0)
    compiled = eng.compile_from_ir(ir)
    motifs = extract_motifs(compiled)
    assert isinstance(motifs, list)


def test_transform_motif_for_engine():
    motif = {"intervals": [2, 5, 7], "contour": "arch", "registral_center": 60}
    t = transform_motif_for_engine(motif, "barry_harris")
    assert "intervals" in t
    assert t["registral_center"] == 60


def test_inject_motif():
    ensure_engines_loaded()
    eng = get_engine("wayne_shorter")
    ir = eng.generate_ir("Test", mode="title", seed=0)
    motif = {"intervals": [6, 1, 11], "contour": "angular", "registral_center": 62}
    ir2 = inject_motif(ir, motif)
    assert ir2.motivic_cells[0].intervals == [6, 1, 11]
