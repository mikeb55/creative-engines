"""
Root conftest: ensure engines/ is on path for shared imports.
Per-package conftests handle engine-specific path ordering.
"""

import sys
import os

_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_engines = os.path.join(_root, "engines")
if _engines not in sys.path:
    sys.path.insert(0, _engines)
