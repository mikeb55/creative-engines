"""Tests for ensemble_musicxml_exporter."""
import pytest
from orchestration_bridge.ensemble_musicxml_exporter import export_ensemble_to_musicxml


def test_export_empty():
    xml = export_ensemble_to_musicxml({"parts": []})
    assert "score-partwise" in xml


def test_export_with_parts():
    arr = {
        "parts": [
            {"part_index": 0, "instrument_name": "Violin", "events": [{"pitch": 60, "measure": 0, "beat_position": 0, "duration": 1}]},
        ],
        "compiled": type("C", (), {"title": "Test", "metadata": {"tempo": 90}})(),
    }
    xml = export_ensemble_to_musicxml(arr)
    assert "score-partwise" in xml
    assert "Violin" in xml
    assert "<note>" in xml
