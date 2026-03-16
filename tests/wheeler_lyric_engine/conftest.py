"""Pytest conftest: add wheeler-lyric-engine to path for imports."""

import sys
import os
import pytest

_engine_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "engines", "wheeler-lyric-engine"))
_engines = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "engines"))

_CONFLICTING = ("compiled_composition_types", "section_compiler", "composer_ir", "composer_ir_validator", "harmonic_fields", "interval_language", "motif_development", "musicxml_exporter", "generator")


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
