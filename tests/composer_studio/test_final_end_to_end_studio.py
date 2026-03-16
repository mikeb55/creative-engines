"""Final end-to-end studio workflow test."""
import pytest
import os
import tempfile
from composer_studio.studio_runtime import run_composer_studio


def test_final_end_to_end_studio():
    """Single engine -> studio -> export."""
    with tempfile.TemporaryDirectory() as d:
        result = run_composer_studio("E2E Single", "frisell_atmosphere", seed=0, base_dir=d)
        assert not result.get("error")
        assert len(result.get("finalists", [])) >= 1
        paths = result.get("exported_paths", {}).get("compositions", [])
        assert len(paths) >= 1
        assert os.path.isfile(paths[0])


def test_hybrid_end_to_end():
    """Hybrid engine -> studio -> export."""
    with tempfile.TemporaryDirectory() as d:
        result = run_composer_studio("E2E Hybrid", "hybrid_counterpoint", seed=0, base_dir=d)
    assert not result.get("error")
    assert len(result.get("finalists", [])) >= 1


def test_orchestration_bridge_end_to_end():
    """Composition -> orchestration bridge -> export."""
    with tempfile.TemporaryDirectory() as d:
        result = run_composer_studio("E2E Orch", "chamber_jazz", seed=0, base_dir=d)
    assert not result.get("error")
    assert "ensemble" in result.get("exported_paths", {})


def test_lead_sheet_end_to_end():
    """Composition -> songwriting bridge -> lead sheet export."""
    with tempfile.TemporaryDirectory() as d:
        result = run_composer_studio("E2E Lead", "lead_sheet_song", seed=0, base_dir=d)
    assert not result.get("error")
    assert "lead_sheets" in result.get("exported_paths", {})
