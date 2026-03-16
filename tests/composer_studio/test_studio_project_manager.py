"""Tests for studio_project_manager."""
import pytest
import os
import tempfile
from composer_studio.studio_project_manager import create_studio_project, create_run_folder, save_project_metadata


def test_create_studio_project():
    with tempfile.TemporaryDirectory() as d:
        path = create_studio_project("test_proj", base_dir=d)
        assert os.path.isdir(path)
        assert "test_proj" in path


def test_create_run_folder():
    with tempfile.TemporaryDirectory() as d:
        path = create_run_folder("test_proj", run_label="run1", base_dir=d)
        assert os.path.isdir(path)
        assert os.path.isdir(os.path.join(path, "compositions_musicxml"))


def test_save_project_metadata():
    with tempfile.TemporaryDirectory() as d:
        run_path = os.path.join(d, "run1")
        os.makedirs(run_path)
        os.makedirs(os.path.join(run_path, "metadata"), exist_ok=True)
        out = save_project_metadata(run_path, "wheeler_lyric", "My Tune", 0)
        assert os.path.isfile(out)
