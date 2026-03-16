"""
Engine Registry — Automatic discovery and registration of composer engines.
"""

import importlib.util
import os
import sys
from typing import Any, Dict, List, Type

_ENGINES: Dict[str, Type] = {}
_LOADED = False


def register_engine(engine_name: str, engine_class: Type) -> None:
    """Register a composer engine by name."""
    _ENGINES[engine_name] = engine_class


def get_engine(engine_name: str) -> Any:
    """Get engine instance by name. Returns new instance each call."""
    ensure_engines_loaded()
    cls = _ENGINES.get(engine_name)
    if cls is None:
        raise KeyError(f"Engine '{engine_name}' not registered. Available: {list(_ENGINES.keys())}")
    return cls()


def list_engines() -> List[str]:
    """List all registered engine names."""
    ensure_engines_loaded()
    return list(_ENGINES.keys())


def _load_engine_from_path(engine_dir: str, adapter_module: str, engine_class: str, reg_name: str) -> None:
    """Load engine adapter from directory and register."""
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    path = os.path.join(base, engine_dir, adapter_module + ".py")
    if not os.path.exists(path):
        return
    if base not in sys.path:
        sys.path.insert(0, base)
    if os.path.dirname(path) not in sys.path:
        sys.path.insert(0, os.path.dirname(path))
    spec = importlib.util.spec_from_file_location(adapter_module, path)
    if spec and spec.loader:
        mod = importlib.util.module_from_spec(spec)
        sys.modules[adapter_module] = mod
        spec.loader.exec_module(mod)
        cls = getattr(mod, engine_class, None)
        if cls:
            register_engine(reg_name, cls)


def _register_builtin_engines() -> None:
    """Register built-in engines. Called on first import."""
    global _LOADED
    if _LOADED:
        return
    _LOADED = True
    _load_engine_from_path("wayne-shorter-engine", "engine_adapter", "WayneShorterEngine", "wayne_shorter")
    _load_engine_from_path("barry-harris-engine", "engine_adapter", "BarryHarrisEngine", "barry_harris")
    _load_engine_from_path("andrew-hill-engine", "engine_adapter", "AndrewHillEngine", "andrew_hill")
    _load_engine_from_path("monk-engine", "engine_adapter", "MonkEngine", "monk")
    _load_engine_from_path("bartok-night-engine", "engine_adapter", "BartokNightEngine", "bartok_night")
    _load_engine_from_path("wheeler-lyric-engine", "engine_adapter", "WheelerLyricEngine", "wheeler_lyric")
    _load_engine_from_path("frisell-atmosphere-engine", "engine_adapter", "FrisellAtmosphereEngine", "frisell_atmosphere")
    _load_engine_from_path("scofield-holland-engine", "engine_adapter", "ScofieldHollandEngine", "scofield_holland")
    _load_engine_from_path("stravinsky-pulse-engine", "engine_adapter", "StravinskyPulseEngine", "stravinsky_pulse")
    _load_engine_from_path("zappa-disruption-engine", "engine_adapter", "ZappaDisruptionEngine", "zappa_disruption")
    _load_engine_from_path("messiaen-colour-engine", "engine_adapter", "MessiaenColourEngine", "messiaen_colour")
    _load_engine_from_path("slonimsky-harmonic-engine", "engine_adapter", "SlonimskyHarmonicEngine", "slonimsky_harmonic")


def ensure_engines_loaded() -> None:
    """Ensure built-in engines are registered. Call before list_engines/get_engine."""
    _register_builtin_engines()
