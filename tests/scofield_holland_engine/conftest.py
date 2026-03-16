"""Pytest conftest: add engines, load registry first, then scofield-holland first for scofield tests."""

import sys
import os
import pytest

_engines = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "engines"))
if _engines not in sys.path:
    sys.path.insert(0, _engines)
from shared_composer.engine_registry import ensure_engines_loaded
ensure_engines_loaded()
_engine_dir = os.path.join(_engines, "scofield-holland-engine")
if _engine_dir not in sys.path:
    sys.path.insert(0, _engine_dir)


@pytest.fixture(autouse=True)
def _engine_path_first():
    """Ensure this engine's dir is first in sys.path before each test."""
    if _engine_dir in sys.path:
        sys.path.remove(_engine_dir)
    sys.path.insert(0, _engine_dir)
