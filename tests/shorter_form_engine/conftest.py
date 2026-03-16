"""Shorter Form Engine test fixtures."""

import sys
import os
import pytest

_engine_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "engines", "shorter-form-engine"))
_engines = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "engines"))

_CONFLICTING = (
    "interval_language", "harmonic_fields", "section_compiler", "composer_ir_validator",
    "generator", "compiled_composition_types", "composer_ir", "musicxml_exporter",
    "example_compositions", "motif_development",
)


def _ensure_engine_first():
    for m in _CONFLICTING:
        sys.modules.pop(m, None)
    if _engine_dir in sys.path:
        sys.path.remove(_engine_dir)
    sys.path.insert(0, _engine_dir)
    if _engines not in sys.path:
        sys.path.insert(0, _engines)


_ensure_engine_first()


@pytest.fixture(autouse=True)
def _engine_path_first():
    _ensure_engine_first()
