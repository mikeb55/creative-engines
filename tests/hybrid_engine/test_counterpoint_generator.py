"""Tests for counterpoint generator."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines"))

from hybrid_engine.counterpoint_generator import generate_counterline, generate_inner_voice, build_polyphonic_texture
from hybrid_engine.hybrid_voice_types import CounterpointLayout, VoiceRole


def test_generate_counterline():
    primary = [{"pitch": 60, "duration": 1.0, "measure": 0, "beat_position": 0, "section_id": "primary"}]
    counter = generate_counterline(primary, "bartok_night", seed=0)
    assert isinstance(counter, list)


def test_generate_inner_voice():
    harm = [{"symbol": "Cm7", "measure": 0, "duration": 4}]
    inner = generate_inner_voice(harm, "frisell_atmosphere", seed=0)
    assert isinstance(inner, list)


def test_build_polyphonic_texture():
    class FakeSection:
        melody_events = [{"pitch": 60, "duration": 1.0, "measure": 0, "beat_position": 0, "section_id": "p"}]
        harmony = [{"symbol": "Cm7", "measure": 0}]
    layout = CounterpointLayout(
        voice_roles=[
            VoiceRole(role="lead", engine="wayne_shorter"),
            VoiceRole(role="counterline", engine="bartok_night"),
        ],
        voice_count=2,
    )
    texture = build_polyphonic_texture([FakeSection()], layout)
    assert "lead" in texture
    assert "counterline" in texture
