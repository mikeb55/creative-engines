"""Tests for lyric_alignment_adapter."""
import pytest
from dataclasses import dataclass
from songwriting_bridge.lyric_alignment_adapter import create_lyric_placeholders, align_lyrics_to_melody
from songwriting_bridge.lead_sheet_types import VocalMelody


@dataclass
class FakeSection:
    role: str
    bar_start: int
    bar_end: int
    melody_events: list


@dataclass
class FakeCompiled:
    sections: list


def test_create_lyric_placeholders():
    sec = FakeSection("primary", 0, 8, [{"measure": 0}])
    comp = FakeCompiled([sec])
    ph = create_lyric_placeholders(comp, "phrase_based")
    assert len(ph) >= 1


def test_align_lyrics_to_melody():
    vm = VocalMelody([{"measure": 0}], "male_tenor", (55, 72), (55, 72))
    ph = [{"measure": 0, "beat": 0, "syllable": "_", "phrase_id": "v1", "section_label": "verse"}]
    la = align_lyrics_to_melody(vm, ph)
    assert la.mode == "phrase_based"

