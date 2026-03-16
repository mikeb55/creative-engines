"""
Studio Batch Runner — Run generation, rank, optionally bridge.
"""

import os
import sys
from typing import Any, Dict, List, Optional

_base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _base not in sys.path:
    sys.path.insert(0, _base)

from shared_composer.engine_registry import get_engine, ensure_engines_loaded
from hybrid_engine.hybrid_generator import generate_hybrid_candidate, generate_hybrid_candidates
from hybrid_engine.hybrid_ranker import rank_hybrid_candidates, select_top_hybrids
from hybrid_engine.hybrid_planner import plan_hybrid_composition
from hybrid_engine.hybrid_section_compiler import compile_hybrid_composition
from composer_studio.studio_presets import get_preset, StudioPreset


def _run_single_engine(preset: StudioPreset, input_text: str, seed: int) -> List[Dict]:
    """Run single engine multiple times."""
    ensure_engines_loaded()
    eng = get_engine(preset.melody_engine)
    candidates = []
    for i in range(preset.population_size):
        ir = eng.generate_ir(input_text, mode="title", seed=seed + i)
        compiled = eng.compile_from_ir(ir)
        candidates.append({
            "compiled": compiled,
            "melody_engine": preset.melody_engine,
            "harmony_engine": preset.melody_engine,
            "hybrid_ir": None,
        })
    return candidates


def _run_hybrid(preset: StudioPreset, input_text: str, seed: int) -> List[Dict]:
    """Run hybrid engine."""
    candidates = generate_hybrid_candidates(
        input_text=input_text,
        count=preset.population_size,
        seed=seed,
    )
    return candidates


def run_batch_generation(
    preset_name: str,
    input_text: str,
    seed: int = 0,
) -> Dict[str, Any]:
    """
    Run batch generation: rank outputs, optionally bridge.
    """
    preset = get_preset(preset_name)
    if not preset:
        return {"candidates": [], "finalists": [], "error": f"Unknown preset: {preset_name}"}
    if preset.engine_mode == "hybrid":
        candidates = _run_hybrid(preset, input_text, seed)
    else:
        candidates = _run_single_engine(preset, input_text, seed)
    ranked = rank_hybrid_candidates(candidates)
    finalists = ranked[: preset.finalist_count]
    return {
        "preset": preset_name,
        "input_text": input_text,
        "seed": seed,
        "candidates": candidates,
        "ranked": ranked,
        "finalists": finalists,
        "preset_config": preset,
    }


def run_batch_generation_multiple(
    preset_name: str,
    inputs: List[str],
    seed: int = 0,
) -> List[Dict[str, Any]]:
    """
    Run batch generation for multiple inputs.
    """
    return [run_batch_generation(preset_name, inp, seed + i) for i, inp in enumerate(inputs)]
