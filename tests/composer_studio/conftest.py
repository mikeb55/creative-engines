"""Composer studio tests conftest."""
import sys
import os
_base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_root = os.path.dirname(_base)
_engines = os.path.join(_root, "engines")
if _engines not in sys.path:
    sys.path.insert(0, _engines)
