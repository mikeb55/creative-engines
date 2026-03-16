"""
Studio Launcher Entry — Launcher-facing interface.
"""

import os
import sys
from typing import Any, Dict, Optional

_base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _base not in sys.path:
    sys.path.insert(0, _base)


def run_studio_launcher(
    input_text: str = "Untitled",
    preset_name: str = "wheeler_lyric",
    seed: int = 0,
) -> Dict[str, Any]:
    """
    Launcher entry: run studio and return result.
    """
    from composer_studio.studio_runtime import run_composer_studio
    return run_composer_studio(input_text, preset_name, seed=seed, output_mode="auto")


def save_studio_outputs(result: Dict[str, Any], target_dir: Optional[str] = None) -> str:
    """
    Result already contains run_path and exported_paths. Return run_path.
    """
    return result.get("run_path", "")


def get_studio_status() -> Dict[str, Any]:
    """
    Return status: presets available, engines loaded.
    """
    from composer_studio.studio_presets import list_presets
    from shared_composer.engine_registry import list_engines, ensure_engines_loaded
    ensure_engines_loaded()
    return {
        "presets": list_presets(),
        "engines": list_engines(),
    }
