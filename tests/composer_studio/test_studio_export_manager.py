"""Tests for studio_export_manager."""
import pytest
import os
import tempfile
from composer_studio.studio_export_manager import export_composer_outputs, export_run_summary
from hybrid_engine.hybrid_ranker import HybridCandidate


def test_export_composer_outputs():
    from shared_composer.engine_registry import get_engine
    eng = get_engine("wheeler_lyric")
    ir = eng.generate_ir("Export Test", mode="title", seed=0)
    compiled = eng.compile_from_ir(ir)
    cand = {"compiled": compiled, "melody_engine": "wheeler_lyric"}
    hc = HybridCandidate(hybrid_ir=None, compiled_result=cand, base_score=7, style_fit_score=7, adjusted_score=7,
                         melody_engine="wheeler_lyric", harmony_engine="wheeler_lyric", counter_engine=None, rhythm_engine=None)
    with tempfile.TemporaryDirectory() as d:
        paths = export_composer_outputs([hc], d, type("P", (), {"bridge_orchestration": False})())
        assert len(paths) >= 1
        assert os.path.isfile(paths[0])


def test_export_run_summary():
    with tempfile.TemporaryDirectory() as d:
        out = export_run_summary(d, {"preset": "test", "finalists": []}, {"compositions": []})
        assert os.path.isfile(out)
