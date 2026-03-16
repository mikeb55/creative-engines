"""
Composer Export Manager — Export via orchestration and songwriting bridges.
"""

import os
import sys
from datetime import datetime
from typing import Any, Dict, List, Optional

_base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _base not in sys.path:
    sys.path.insert(0, _base)

from composer_studio.studio_presets import get_preset
from composer_studio.studio_export_manager import (
    export_composer_outputs,
    export_orchestrated_outputs,
    export_lead_sheet_outputs,
)
from .composer_project_types import ComposerProject, ComposerSession, ExportRecord, SelectedComposition


def _make_finalist_from_selected(selected: SelectedComposition) -> Any:
    """Wrap selected composition as object with .compiled_result for export functions."""
    raw = selected.composition.raw_candidate
    if raw and hasattr(raw, "compiled_result"):
        return raw
    comp = selected.composition

    class _Finalist:
        def __init__(self):
            self.compiled_result = {
                "compiled": comp.compiled,
                "melody_engine": comp.melody_engine,
                "harmony_engine": comp.harmony_engine,
            }

    return _Finalist()


def export_composition(
    project: ComposerProject,
    session: ComposerSession,
    export_type: str = "composition",
    ensemble_type: Optional[str] = None,
    voice_type: str = "male_tenor",
) -> List[ExportRecord]:
    """
    Export selected composition. Types: composition, ensemble, lead_sheet, all.
    Saves to projects/composer_daw/<project>/exports/
    """
    if not session.selected_composition:
        return []
    preset = get_preset(session.preset_name)
    if not preset:
        preset = get_preset("wheeler_lyric")
    exports_dir = os.path.join(project.project_path, "exports")
    os.makedirs(exports_dir, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    run_path = os.path.join(exports_dir, f"export_{stamp}_{session.session_id}")
    os.makedirs(run_path, exist_ok=True)
    records = []
    finalist = _make_finalist_from_selected(session.selected_composition)
    finalists = [finalist]
    if export_type in ("composition", "all"):
        paths = export_composer_outputs(finalists, run_path, preset)
        for p in paths:
            records.append(ExportRecord(
                export_type="composition",
                file_path=p,
                session_id=session.session_id,
                metadata={"ensemble_type": None, "voice_type": None},
            ))
    if export_type in ("ensemble", "all") and (ensemble_type or (preset and preset.ensemble_type)):
        et = ensemble_type or (preset.ensemble_type if preset else "string_quartet")
        paths = export_orchestrated_outputs(finalists, run_path, et, session.seed)
        for p in paths:
            records.append(ExportRecord(
                export_type="ensemble",
                file_path=p,
                session_id=session.session_id,
                metadata={"ensemble_type": et},
            ))
    if export_type in ("lead_sheet", "all"):
        vt = voice_type or (preset.voice_type if preset else "male_tenor")
        paths = export_lead_sheet_outputs(finalists, run_path, vt)
        for p in paths:
            records.append(ExportRecord(
                export_type="lead_sheet",
                file_path=p,
                session_id=session.session_id,
                metadata={"voice_type": vt},
            ))
    project.export_history.extend(records)
    return records
