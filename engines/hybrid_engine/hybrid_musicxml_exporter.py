"""
Hybrid MusicXML Exporter — Combine voices into multi-part MusicXML.
"""

from typing import Any, Dict, List

import sys
import os
_base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _base not in sys.path:
    sys.path.insert(0, _base)
from shared_composer.engine_registry import get_engine, ensure_engines_loaded


def export_hybrid_to_musicxml(compiled_result: Dict[str, Any]) -> str:
    """
    Export hybrid composition to MusicXML.
    Includes melody part; harmony from harmony engine; section labels via metadata.
    Uses melody engine's exporter for valid output.
    """
    ensure_engines_loaded()
    compiled = compiled_result.get("compiled")
    if not compiled:
        return '<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><work><work-title>Untitled</work-title></work></score-partwise>'
    melody_engine = compiled_result.get("melody_engine", "wayne_shorter")
    eng = get_engine(melody_engine)
    return eng.export_musicxml(compiled)
