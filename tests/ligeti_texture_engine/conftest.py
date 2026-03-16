"""Pytest conftest: add ligeti-texture-engine to path for imports."""

import sys
import os

_engine_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "engines", "ligeti-texture-engine"))
_engines = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "engines"))
# Add at 0 so ligeti modules are found (not big-band etc.)
for p in (_engine_dir, _engines):
    if p in sys.path:
        sys.path.remove(p)
sys.path.insert(0, _engines)
sys.path.insert(0, _engine_dir)
