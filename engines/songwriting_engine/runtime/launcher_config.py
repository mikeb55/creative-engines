"""
Launcher Config — Defaults for Windows launcher.
"""

from typing import Dict, Any, List


def get_launcher_defaults() -> Dict[str, Any]:
    """Default parameters for launcher generation."""
    return {
        "input_text": "River Road",
        "mode": "title",
        "count": 12,
        "finalist_limit": 5,
        "seed": 0,
    }


def get_supported_input_modes() -> List[str]:
    """Supported input modes."""
    return ["title", "premise", "hook"]


def get_output_directory_defaults() -> Dict[str, str]:
    """Default output paths. Relative to repo root."""
    return {
        "base": "outputs/songwriting_engine",
        "finalists_musicxml": "finalists_musicxml",
        "finalists_summary": "finalists_summary.json",
        "run_summary": "run_summary.txt",
    }
