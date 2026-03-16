"""Pytest conftest: add engines, load registry, then zappa-disruption for tests."""

import sys
import os

_engines = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "engines"))
if _engines not in sys.path:
    sys.path.insert(0, _engines)
from shared_composer.engine_registry import ensure_engines_loaded
ensure_engines_loaded()
_zappa = os.path.join(_engines, "zappa-disruption-engine")
if _zappa not in sys.path:
    sys.path.insert(0, _zappa)
