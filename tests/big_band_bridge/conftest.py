"""Pytest conftest: add engines to path for big_band_bridge imports."""

import sys
import os
import pytest

_engines = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "engines"))
_bb = os.path.join(_engines, "big-band-engine")
_bridge = os.path.join(_engines, "big_band_bridge")
for p in [_bb, _engines, _bridge]:
    if p not in sys.path:
        sys.path.insert(0, p)


@pytest.fixture(autouse=True)
def _engine_path_first():
    """Ensure big-band-engine and bridge are first in sys.path before each test."""
    for p in [_bb, _engines, _bridge]:
        if p in sys.path:
            sys.path.remove(p)
    sys.path.insert(0, _bridge)
    sys.path.insert(0, _engines)
    sys.path.insert(0, _bb)
