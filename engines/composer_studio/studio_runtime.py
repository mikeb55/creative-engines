"""
Studio Runtime — Main entrypoint for Composer Studio.
"""

import os
import sys
from typing import Any, Dict, List, Optional

_base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _base not in sys.path:
    sys.path.insert(0, _base)

from composer_studio.studio_presets import get_preset
from composer_studio.studio_batch_runner import run_batch_generation
from composer_studio.studio_project_manager import create_run_folder, save_project_metadata
from composer_studio.studio_export_manager import (
    export_composer_outputs,
    export_orchestrated_outputs,
    export_lead_sheet_outputs,
    export_run_summary,
)


def run_composer_studio(
    input_text: str,
    preset_name: str,
    seed: int = 0,
    output_mode: str = "auto",
    base_dir: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Main entrypoint: load preset, run generation, rank, export, save.
    output_mode: auto (from preset), composition, orchestration, lead_sheet, all
    """
    preset = get_preset(preset_name)
    if not preset:
        return {"error": f"Unknown preset: {preset_name}", "finalists": []}
    result = run_batch_generation(preset_name, input_text, seed)
    if result.get("error"):
        return result
    finalists = result.get("finalists", [])
    if not finalists:
        return {**result, "exported_paths": {}}
    base = base_dir or os.path.join(os.getcwd(), "outputs", "composer_studio")
    run_path = create_run_folder("studio_runs", base_dir=base)
    save_project_metadata(run_path, preset_name, input_text, seed)
    exported = {}
    exported["compositions"] = export_composer_outputs(finalists, run_path, preset)
    if output_mode == "auto":
        if preset.bridge_orchestration and preset.ensemble_type:
            exported["ensemble"] = export_orchestrated_outputs(
                finalists, run_path, preset.ensemble_type, seed
            )
        if preset.bridge_lead_sheet:
            exported["lead_sheets"] = export_lead_sheet_outputs(
                finalists, run_path, preset.voice_type
            )
    elif output_mode == "orchestration" and preset.ensemble_type:
        exported["ensemble"] = export_orchestrated_outputs(
            finalists, run_path, preset.ensemble_type, seed
        )
    elif output_mode == "lead_sheet":
        exported["lead_sheets"] = export_lead_sheet_outputs(
            finalists, run_path, preset.voice_type
        )
    elif output_mode == "all":
        if preset.ensemble_type:
            exported["ensemble"] = export_orchestrated_outputs(
                finalists, run_path, preset.ensemble_type, seed
            )
        exported["lead_sheets"] = export_lead_sheet_outputs(
            finalists, run_path, preset.voice_type
        )
    export_run_summary(run_path, result, exported)
    return {
        **result,
        "run_path": run_path,
        "exported_paths": exported,
    }
