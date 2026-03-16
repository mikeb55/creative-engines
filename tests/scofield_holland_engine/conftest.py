"""Pytest conftest: add engines, load registry first, then scofield-holland first for scofield tests."""

import sys
import os

_engines = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "engines"))
if _engines not in sys.path:
    sys.path.insert(0, _engines)
# Load registry before any engine-specific imports so wayne-shorter gets its own composer_ir
from shared_composer.engine_registry import ensure_engines_loaded
ensure_engines_loaded()
# Ensure scofield-holland-engine is first for scofield test imports (harmonic_fields, interval_language, etc.)
_scofield = os.path.join(_engines, "scofield-holland-engine")
if _scofield not in sys.path:
    sys.path.insert(0, _scofield)
