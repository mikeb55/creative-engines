"""Pytest conftest: add engines to path for big_band_bridge imports."""

import sys
import os

_engines = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "engines"))
_bb = os.path.join(_engines, "big-band-engine")
_bridge = os.path.join(_engines, "big_band_bridge")
# Insert big-band-engine first so get_engine("big_band") produces Big Band IR
for p in [_bb, _engines, _bridge]:
    if p in sys.path:
        sys.path.remove(p)
sys.path.insert(0, _bridge)
sys.path.insert(0, _engines)
sys.path.insert(0, _bb)
