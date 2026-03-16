"""Tests for melody_to_vocal_adapter."""
import pytest
from dataclasses import dataclass
from songwriting_bridge.melody_to_vocal_adapter import adapt_melody_to_vocal_range, create_vocal_melody


@dataclass
class FakeSection:
    melody_events: list


@dataclass
class FakeCompiled:
    sections: list


def test_adapt_melody_to_vocal_range():
    sec = FakeSection([{"pitch": 72, "measure": 0, "beat_position": 0}])
    comp = FakeCompiled([sec])
    events = adapt_melody_to_vocal_range(comp, "male_tenor")
    assert len(events) >= 1
    assert events[0]["pitch"] <= 81


def test_create_vocal_melody():
    sec = FakeSection([{"pitch": 60, "measure": 0, "beat_position": 0}])
    comp = FakeCompiled([sec])
    vm = create_vocal_melody(comp, "male_tenor")
    assert vm.voice_type == "male_tenor"
    assert len(vm.events) >= 1
