"""Pytest conftest: add wheeler-lyric-engine to path for imports."""

import sys
import os

_engine_dir = os.path.join(os.path.dirname(__file__), "..", "..", "engines", "wheeler-lyric-engine")
_engine_dir = os.path.abspath(_engine_dir)
if _engine_dir not in sys.path:
    sys.path.insert(0, _engine_dir)

_engines = os.path.join(os.path.dirname(__file__), "..", "..", "engines")
_engines = os.path.abspath(_engines)
if _engines not in sys.path:
    sys.path.insert(0, _engines)
