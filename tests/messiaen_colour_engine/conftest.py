"""Pytest conftest: add engines, load registry, then messiaen-colour for tests."""

import sys
import os
import pytest

_engines = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "engines"))
_engine_dir = os.path.join(_engines, "messiaen-colour-engine")
if _engines not in sys.path:
    sys.path.insert(0, _engines)
from shared_composer.engine_registry import ensure_engines_loaded
ensure_engines_loaded()

_CONFLICTING = ("compiled_composition_types", "interval_language", "harmonic_fields", "section_compiler", "composer_ir", "composer_ir_validator", "generator", "motif_development", "musicxml_exporter")


def _ensure_engine_first():
    for m in _CONFLICTING:
        sys.modules.pop(m, None)
    if _engine_dir in sys.path:
        sys.path.remove(_engine_dir)
    sys.path.insert(0, _engine_dir)


_ensure_engine_first()


@pytest.fixture(autouse=True)
def _engine_path_first():
    _ensure_engine_first()
