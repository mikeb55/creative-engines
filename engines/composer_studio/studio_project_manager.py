"""
Studio Project Manager — Create and manage project folders.
"""

import os
from datetime import datetime
from typing import Any, Dict, Optional


def create_studio_project(project_name: str, base_dir: Optional[str] = None) -> str:
    """
    Create project directory. Returns path.
    """
    base = base_dir or os.path.join(os.getcwd(), "outputs", "composer_studio")
    path = os.path.join(base, project_name)
    os.makedirs(path, exist_ok=True)
    return path


def create_run_folder(project_name: str, run_label: Optional[str] = None, base_dir: Optional[str] = None) -> str:
    """
    Create timestamped run folder.
    """
    base = base_dir or os.path.join(os.getcwd(), "outputs", "composer_studio")
    proj = os.path.join(base, project_name)
    os.makedirs(proj, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    label = run_label or stamp
    run_path = os.path.join(proj, label)
    os.makedirs(run_path, exist_ok=True)
    for sub in ["compositions_musicxml", "ensemble_musicxml", "lead_sheets_musicxml", "summaries", "metadata"]:
        os.makedirs(os.path.join(run_path, sub), exist_ok=True)
    return run_path


def save_project_metadata(
    run_path: str,
    preset_name: str,
    input_text: str,
    seed: int,
    metadata: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Save metadata to run folder.
    """
    meta = metadata or {}
    meta["preset"] = preset_name
    meta["input_text"] = input_text
    meta["seed"] = seed
    meta_path = os.path.join(run_path, "metadata", "run_metadata.json")
    import json
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)
    return meta_path
