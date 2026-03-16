"""
Runtime Cutover — Default engine mode. New Song IR is default.
Legacy path deprecated, isolated behind explicit opt-in.
"""

from typing import Dict, Any

_DEFAULT_MODE = "song_ir"
_LEGACY_ENABLED = False


def get_default_songwriting_engine_mode() -> str:
    """Return the default engine mode. 'song_ir' = new engine."""
    return _DEFAULT_MODE


def set_new_engine_default() -> None:
    """Ensure new Song IR engine is the default. No-op if already default."""
    global _DEFAULT_MODE
    _DEFAULT_MODE = "song_ir"


def is_legacy_path_enabled() -> bool:
    """Legacy generate-score-repair path is not default. Returns False."""
    return _LEGACY_ENABLED


def get_runtime_mode_summary() -> Dict[str, Any]:
    """Summary of current runtime configuration."""
    return {
        "default_mode": _DEFAULT_MODE,
        "legacy_enabled": _LEGACY_ENABLED,
        "recommended_entrypoint": "run_songwriting_engine",
        "legacy_deprecated": True,
    }
