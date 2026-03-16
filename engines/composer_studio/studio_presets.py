"""
Studio Presets — Preset configurations for Composer Studio.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class StudioPreset:
    """Preset: engine, ensemble, export mode, population size, finalist count."""
    name: str
    engine_mode: str  # single, hybrid
    melody_engine: Optional[str] = None
    harmony_engine: Optional[str] = None
    counter_engine: Optional[str] = None
    rhythm_engine: Optional[str] = None
    ensemble_type: Optional[str] = None
    export_mode: str = "composition"
    population_size: int = 12
    finalist_count: int = 5
    bridge_orchestration: bool = False
    bridge_lead_sheet: bool = False
    voice_type: str = "male_tenor"


PRESETS: Dict[str, StudioPreset] = {
    "shorter_head": StudioPreset(
        name="shorter_head",
        engine_mode="single",
        melody_engine="wayne_shorter",
        export_mode="composition",
        population_size=8,
        finalist_count=3,
    ),
    "barry_bebop": StudioPreset(
        name="barry_bebop",
        engine_mode="single",
        melody_engine="barry_harris",
        export_mode="composition",
        population_size=8,
        finalist_count=3,
    ),
    "hill_modern": StudioPreset(
        name="hill_modern",
        engine_mode="single",
        melody_engine="andrew_hill",
        export_mode="composition",
        population_size=8,
        finalist_count=3,
    ),
    "monk_rhythm": StudioPreset(
        name="monk_rhythm",
        engine_mode="single",
        melody_engine="monk",
        export_mode="composition",
        population_size=8,
        finalist_count=3,
    ),
    "bartok_night": StudioPreset(
        name="bartok_night",
        engine_mode="single",
        melody_engine="bartok_night",
        export_mode="composition",
        population_size=8,
        finalist_count=3,
    ),
    "wheeler_lyric": StudioPreset(
        name="wheeler_lyric",
        engine_mode="single",
        melody_engine="wheeler_lyric",
        export_mode="composition",
        population_size=8,
        finalist_count=3,
    ),
    "frisell_atmosphere": StudioPreset(
        name="frisell_atmosphere",
        engine_mode="single",
        melody_engine="frisell_atmosphere",
        export_mode="composition",
        population_size=8,
        finalist_count=3,
    ),
    "hybrid_counterpoint": StudioPreset(
        name="hybrid_counterpoint",
        engine_mode="hybrid",
        melody_engine="wayne_shorter",
        harmony_engine="barry_harris",
        counter_engine="andrew_hill",
        rhythm_engine="monk",
        export_mode="composition",
        population_size=12,
        finalist_count=5,
    ),
    "chamber_jazz": StudioPreset(
        name="chamber_jazz",
        engine_mode="hybrid",
        melody_engine="wheeler_lyric",
        harmony_engine="frisell_atmosphere",
        counter_engine="bartok_night",
        export_mode="composition",
        population_size=10,
        finalist_count=4,
        bridge_orchestration=True,
        ensemble_type="chamber_jazz_sextet",
    ),
    "lead_sheet_song": StudioPreset(
        name="lead_sheet_song",
        engine_mode="single",
        melody_engine="wheeler_lyric",
        export_mode="composition",
        population_size=8,
        finalist_count=3,
        bridge_lead_sheet=True,
        voice_type="male_tenor",
    ),
    "guitar_string_quartet": StudioPreset(
        name="guitar_string_quartet",
        engine_mode="single",
        melody_engine="frisell_atmosphere",
        export_mode="composition",
        population_size=8,
        finalist_count=3,
        bridge_orchestration=True,
        ensemble_type="guitar_string_quartet",
    ),
    "scofield_holland": StudioPreset(
        name="scofield_holland",
        engine_mode="single",
        melody_engine="scofield_holland",
        export_mode="composition",
        population_size=8,
        finalist_count=3,
    ),
    "stravinsky_pulse": StudioPreset(
        name="stravinsky_pulse",
        engine_mode="single",
        melody_engine="stravinsky_pulse",
        export_mode="composition",
        population_size=8,
        finalist_count=3,
    ),
    "zappa_disruption": StudioPreset(
        name="zappa_disruption",
        engine_mode="single",
        melody_engine="zappa_disruption",
        export_mode="composition",
        population_size=8,
        finalist_count=3,
    ),
    "messiaen_colour": StudioPreset(
        name="messiaen_colour",
        engine_mode="single",
        melody_engine="messiaen_colour",
        export_mode="composition",
        population_size=8,
        finalist_count=3,
    ),
    "slonimsky_harmonic": StudioPreset(
        name="slonimsky_harmonic",
        engine_mode="single",
        melody_engine="slonimsky_harmonic",
        export_mode="composition",
        population_size=8,
        finalist_count=3,
    ),
    "big_band": StudioPreset(
        name="big_band",
        engine_mode="single",
        melody_engine="big_band",
        export_mode="composition",
        population_size=8,
        finalist_count=3,
    ),
    "shorter_form": StudioPreset(
        name="shorter_form",
        engine_mode="single",
        melody_engine="shorter_form",
        export_mode="composition",
        population_size=8,
        finalist_count=3,
    ),
    "ligeti_texture": StudioPreset(
        name="ligeti_texture",
        engine_mode="single",
        melody_engine="ligeti_texture",
        export_mode="composition",
        population_size=8,
        finalist_count=3,
    ),
}


def get_preset(name: str) -> Optional[StudioPreset]:
    """Return preset by name."""
    return PRESETS.get(name)


def list_presets() -> List[str]:
    """List preset names."""
    return list(PRESETS.keys())
