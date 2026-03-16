"""Pytest conftest: add engines for shared_rhythm_disruption."""

import sys
import os

_engines = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "engines"))
if _engines not in sys.path:
    sys.path.insert(0, _engines)
