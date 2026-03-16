"""Orchestration Bridge — Map compositions to ensemble arrangements."""

from .orchestration_bridge import orchestrate_composition, orchestrate_population
from .ensemble_musicxml_exporter import export_ensemble_to_musicxml
from .instrument_profiles import (
    ENSEMBLE_PROFILES,
    get_ensemble_profile,
    EnsembleProfile,
    InstrumentSpec,
)
