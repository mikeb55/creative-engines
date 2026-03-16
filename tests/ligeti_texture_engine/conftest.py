"""Pytest conftest: add ligeti-texture-engine to path for imports."""

import sys
import os
import pytest

_engine_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "engines", "ligeti-texture-engine"))
_engines = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "engines"))

_CONFLICTING = ("interval_language", "harmonic_fields", "composer_ir", "composer_ir_validator", "section_compiler", "compiled_composition_types", "motif_development", "generator", "musicxml_exporter")


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
