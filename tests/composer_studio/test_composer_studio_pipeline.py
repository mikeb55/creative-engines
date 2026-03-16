"""
Composer Studio Pipeline Integration Test.

Full pipeline: input idea -> preset -> generation -> ranking
-> orchestration bridge -> songwriting bridge -> export.
"""

import os
import tempfile
import pytest

from composer_studio.studio_runtime import run_composer_studio


def test_composer_studio_full_pipeline():
    """
    Verify full pipeline runs without exceptions:
    input -> preset -> generation -> ranking -> orchestration -> lead sheet -> export.
    """
    with tempfile.TemporaryDirectory() as d:
        result = run_composer_studio(
            "Pipeline Test Theme",
            "chamber_jazz",
            seed=1,
            output_mode="all",
            base_dir=d,
        )
        assert not result.get("error"), f"Pipeline error: {result.get('error')}"
        assert len(result.get("finalists", [])) >= 1, "At least one composition candidate required"
        assert result.get("run_path"), "Run folder must be created"
        assert os.path.isdir(result["run_path"]), "Run path must exist"

        exported = result.get("exported_paths", {})
        comp_paths = exported.get("compositions", [])
        assert len(comp_paths) >= 1, "At least one composition MusicXML required"
        for p in comp_paths:
            assert os.path.isfile(p), f"Composition file must exist: {p}"
            assert p.endswith(".musicxml") or "musicxml" in p.lower(), "Composition must be MusicXML"

        if "ensemble" in exported:
            ens_paths = exported.get("ensemble", [])
            if isinstance(ens_paths, list):
                for p in ens_paths:
                    assert os.path.isfile(p), f"Ensemble file must exist: {p}"
            elif isinstance(ens_paths, str):
                assert os.path.isfile(ens_paths), f"Ensemble file must exist: {ens_paths}"

        if "lead_sheets" in exported:
            ls_paths = exported.get("lead_sheets", [])
            for p in (ls_paths if isinstance(ls_paths, list) else [ls_paths]):
                if p:
                    assert os.path.isfile(p), f"Lead sheet file must exist: {p}"


def test_composer_studio_pipeline_slonimsky_preset():
    """Verify slonimsky_harmonic preset runs without KeyError."""
    with tempfile.TemporaryDirectory() as d:
        result = run_composer_studio(
            "Slonimsky Study",
            "slonimsky_harmonic",
            seed=0,
            base_dir=d,
        )
        assert not result.get("error"), f"Slonimsky preset error: {result.get('error')}"
        assert len(result.get("finalists", [])) >= 1
        paths = result.get("exported_paths", {}).get("compositions", [])
        assert len(paths) >= 1
        assert os.path.isfile(paths[0])


def test_composer_studio_pipeline_produces_musicxml():
    """Verify MusicXML files are valid (contain score-partwise)."""
    with tempfile.TemporaryDirectory() as d:
        result = run_composer_studio("XML Check", "wheeler_lyric", seed=0, base_dir=d)
        assert not result.get("error")
        paths = result.get("exported_paths", {}).get("compositions", [])
        assert len(paths) >= 1
        with open(paths[0], "r", encoding="utf-8") as f:
            content = f.read()
        assert "score-partwise" in content or "score-partwise" in content.lower()
        assert "work-title" in content or "work-title" in content.lower()
