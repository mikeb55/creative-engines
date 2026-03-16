"""Pytest conftest: add engines, load registry, then stravinsky-pulse for tests."""

import sys
import os

_engines = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "engines"))
if _engines not in sys.path:
    sys.path.insert(0, _engines)
from shared_composer.engine_registry import ensure_engines_loaded
ensure_engines_loaded()
_stravinsky = os.path.join(_engines, "stravinsky-pulse-engine")
if _stravinsky not in sys.path:
    sys.path.insert(0, _stravinsky)
