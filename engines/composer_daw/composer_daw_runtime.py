"""
Composer DAW Runtime — Main entry point for project-based composition.
"""

import os
import sys
from typing import Any, Dict, List, Optional

_base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _base not in sys.path:
    sys.path.insert(0, _base)

from .composer_project_types import ComposerProject, ComposerSession
from .composer_project_manager import create_project, load_project, save_project, get_project_path
from .composer_session_manager import (
    create_session,
    run_generation_session,
    rank_session_candidates,
    select_session_winner,
)
from .composer_export_manager import export_composition


def run_composer_daw(
    project_name: str,
    idea: str = "",
    preset_name: str = "wheeler_lyric",
    seed: int = 0,
    create_if_missing: bool = True,
    run_generation: bool = True,
    select_index: int = 0,
    export_mode: str = "all",
    base_dir: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Main entry point. Creates/loads project, optionally runs session and export.
    Simulates how a future desktop UI will control the system.
    """
    project_path = get_project_path(project_name, base_dir)
    project = load_project(project_path) if os.path.isfile(os.path.join(project_path, "project.json")) else None
    if not project and create_if_missing:
        project = create_project(project_name, base_dir)
    if not project:
        return {"error": f"Project not found: {project_name}", "status": {}}
    idea = idea or project.idea or "Untitled"
    preset_name = preset_name or project.preset_name
    session = None
    if run_generation:
        session = create_session(project, idea, preset_name, seed)
        batch = run_generation_session(session)
        if batch.candidates:
            select_session_winner(session, min(select_index, len(batch.candidates) - 1))
            if session.selected_composition and export_mode:
                export_composition(project, session, export_type=export_mode)
    save_project(project)
    return {
        "project": project,
        "session": session,
        "status": get_project_status(project),
        "error": None,
    }


def get_project_status(project: ComposerProject) -> Dict[str, Any]:
    """Return project status: sessions count, compositions count, export history."""
    total_compositions = sum(
        len(s.batch.candidates) if s.batch else 0
        for s in project.sessions
    )
    return {
        "name": project.name,
        "project_path": project.project_path,
        "session_count": len(project.sessions),
        "composition_count": total_compositions,
        "export_count": len(project.export_history),
        "export_history": [
            {"type": r.export_type, "path": r.file_path}
            for r in project.export_history[-10:]
        ],
    }
