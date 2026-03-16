"""Pytest conftest: add engines, load registry, then messiaen-colour for tests."""

import sys
import os

_engines = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "engines"))
if _engines not in sys.path:
    sys.path.insert(0, _engines)
from shared_composer.engine_registry import ensure_engines_loaded
ensure_engines_loaded()
_messiaen = os.path.join(_engines, "messiaen-colour-engine")
if _messiaen not in sys.path:
    sys.path.insert(0, _messiaen)
