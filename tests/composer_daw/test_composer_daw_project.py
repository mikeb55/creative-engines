"""Composer DAW project creation and save/load tests."""
import json
import os
import tempfile
import pytest

from composer_daw.composer_project_manager import (
    create_project,
    load_project,
    save_project,
    get_project_path,
)
from composer_daw.composer_project_types import ComposerProject


def test_create_project():
    """Project creation creates folder structure."""
    with tempfile.TemporaryDirectory() as d:
        p = create_project("TestProject", base_dir=d)
        assert p.name == "TestProject"
        assert os.path.isdir(p.project_path)
        assert os.path.isdir(os.path.join(p.project_path, "sessions"))
        assert os.path.isdir(os.path.join(p.project_path, "exports"))
        assert os.path.isfile(os.path.join(p.project_path, "project.json"))


def test_save_and_load_project():
    """Save and load project preserves metadata."""
    with tempfile.TemporaryDirectory() as d:
        p = create_project("SaveLoad", base_dir=d)
        p.idea = "Test idea"
        p.preset_name = "bartok_night"
        save_project(p)
        loaded = load_project(p.project_path)
        assert loaded is not None
        assert loaded.name == "SaveLoad"
        assert loaded.idea == "Test idea"
        assert loaded.preset_name == "bartok_night"


def test_load_project_nonexistent():
    """Load returns None for missing project."""
    with tempfile.TemporaryDirectory() as d:
        missing = os.path.join(d, "nonexistent")
        assert load_project(missing) is None


def test_get_project_path():
    """get_project_path returns correct path."""
    with tempfile.TemporaryDirectory() as d:
        path = get_project_path("MyProj", base_dir=d)
        assert "composer_daw" in path
        assert "MyProj" in path
