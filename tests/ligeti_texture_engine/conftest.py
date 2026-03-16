"""Pytest conftest: add ligeti-texture-engine to path for imports."""

import sys
import os

_engine_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "engines", "ligeti-texture-engine"))
_engines = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "engines"))
if _engine_dir in sys.path:
    sys.path.remove(_engine_dir)
sys.path.insert(0, _engine_dir)
if _engines not in sys.path:
    sys.path.insert(0, _engines)
