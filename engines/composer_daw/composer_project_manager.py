"""
Composer Project Manager — Create, load, save projects.
"""

import json
import os
from datetime import datetime
from typing import Any, Dict, Optional

from .composer_project_types import ComposerProject, ComposerSession, ExportRecord

PROJECTS_BASE = "projects"
COMPOSER_DAW_FOLDER = "composer_daw"


def _projects_root(base_dir: Optional[str] = None) -> str:
    root = base_dir or os.getcwd()
    return os.path.join(root, PROJECTS_BASE, COMPOSER_DAW_FOLDER)


def create_project(
    project_name: str,
    base_dir: Optional[str] = None,
) -> ComposerProject:
    """
    Create a new Composer DAW project.
    Creates project folder with project.json, sessions/, exports/.
    """
    root = _projects_root(base_dir)
    project_path = os.path.join(root, project_name)
    os.makedirs(project_path, exist_ok=True)
    os.makedirs(os.path.join(project_path, "sessions"), exist_ok=True)
    os.makedirs(os.path.join(project_path, "exports"), exist_ok=True)
    project = ComposerProject(
        name=project_name,
        project_path=project_path,
    )
    _save_project_internal(project)
    return project


def load_project(
    project_path: str,
) -> Optional[ComposerProject]:
    """
    Load project from path. Reads project.json, restores metadata.
    Sessions are restored as metadata only; run generation to rehydrate.
    """
    project_json_path = os.path.join(project_path, "project.json")
    if not os.path.isfile(project_json_path):
        return None
    with open(project_json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    project = ComposerProject(
        name=data.get("name", os.path.basename(project_path)),
        project_path=project_path,
        idea=data.get("idea", ""),
        preset_name=data.get("preset_name", "wheeler_lyric"),
        generation_settings=data.get("generation_settings", {}),
        sessions=[],  # Session data not persisted; metadata only
        export_history=[
            ExportRecord(
                export_type=r.get("export_type", ""),
                file_path=r.get("file_path", ""),
                session_id=r.get("session_id", ""),
                exported_at=r.get("exported_at", ""),
                metadata=r.get("metadata", {}),
            )
            for r in data.get("export_history", [])
        ],
        created_at=data.get("created_at", ""),
        updated_at=data.get("updated_at", ""),
    )
    return project


def save_project(project: ComposerProject) -> str:
    """Save project to disk. Returns project.json path."""
    return _save_project_internal(project)


def _save_project_internal(project: ComposerProject) -> str:
    project.updated_at = datetime.now().isoformat()
    data = {
        "name": project.name,
        "project_path": project.project_path,
        "idea": project.idea,
        "preset_name": project.preset_name,
        "generation_settings": project.generation_settings,
        "session_count": len(project.sessions),
        "export_history": [
            {
                "export_type": r.export_type,
                "file_path": r.file_path,
                "session_id": r.session_id,
                "exported_at": r.exported_at,
                "metadata": r.metadata,
            }
            for r in project.export_history
        ],
        "created_at": project.created_at,
        "updated_at": project.updated_at,
    }
    path = os.path.join(project.project_path, "project.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    return path


def get_project_path(project_name: str, base_dir: Optional[str] = None) -> str:
    """Return path for project by name."""
    root = _projects_root(base_dir)
    return os.path.join(root, project_name)
