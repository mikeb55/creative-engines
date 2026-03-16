"""
Composer Generation Manager — Use Composer Studio for generation.
"""

import os
import sys
from typing import Any, Dict, List, Optional

_base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _base not in sys.path:
    sys.path.insert(0, _base)

from composer_studio.studio_batch_runner import run_batch_generation
from .composer_project_types import GenerationBatch, GeneratedComposition


def run_generation(
    idea: str,
    preset_name: str,
    seed: int = 0,
    population_size: Optional[int] = None,
    finalist_count: Optional[int] = None,
) -> GenerationBatch:
    """
    Run generation via Composer Studio. Returns GenerationBatch with candidates.
    """
    result = run_batch_generation(preset_name, idea, seed)
    if result.get("error"):
        return GenerationBatch(
            idea=idea,
            preset_name=preset_name,
            seed=seed,
            candidates=[],
            ranked=[],
        )
    ranked = result.get("ranked", [])
    candidates = []
    for i, r in enumerate(ranked):
        cr = r.compiled_result if hasattr(r, "compiled_result") else r
        comp = cr.get("compiled") if isinstance(cr, dict) else cr
        if not comp:
            continue
        mel = cr.get("melody_engine", "") if isinstance(cr, dict) else getattr(r, "melody_engine", "")
        harm = cr.get("harmony_engine", mel) if isinstance(cr, dict) else getattr(r, "harmony_engine", mel)
        score = getattr(r, "adjusted_score", 0.0)
        candidates.append(GeneratedComposition(
            compiled=comp,
            melody_engine=mel,
            harmony_engine=harm,
            score=score,
            rank=i + 1,
            raw_candidate=r,
        ))
    return GenerationBatch(
        idea=idea,
        preset_name=preset_name,
        seed=seed,
        candidates=candidates,
        ranked=ranked,
    )
