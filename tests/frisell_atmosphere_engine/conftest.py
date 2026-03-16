"""Pytest conftest: add frisell-atmosphere-engine to path for imports."""

import sys
import os
import pytest

_engine_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "engines", "frisell-atmosphere-engine"))
_engines = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "engines"))
if _engine_dir not in sys.path:
    sys.path.insert(0, _engine_dir)
if _engines not in sys.path:
    sys.path.insert(0, _engines)


@pytest.fixture(autouse=True)
def _engine_path_first():
    """Ensure this engine's dir is first in sys.path before each test."""
    if _engine_dir in sys.path:
        sys.path.remove(_engine_dir)
    sys.path.insert(0, _engine_dir)
