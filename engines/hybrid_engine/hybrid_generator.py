"""
Hybrid Generator — Generate hybrid composition candidates with varied engine combinations.
"""

from typing import Any, List, Optional

try:
    from hybrid_engine.hybrid_planner import plan_hybrid_composition
    from hybrid_engine.hybrid_section_compiler import compile_hybrid_composition
    from hybrid_engine.hybrid_composer_ir import HybridComposerIR
except ImportError:
    import sys
    import os
    _base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if _base not in sys.path:
        sys.path.insert(0, _base)
    from hybrid_engine.hybrid_planner import plan_hybrid_composition
    from hybrid_engine.hybrid_section_compiler import compile_hybrid_composition
    from hybrid_engine.hybrid_composer_ir import HybridComposerIR

DEFAULT_ENGINE_POOL = ["wayne_shorter", "barry_harris", "andrew_hill", "monk", "bartok_night", "wheeler_lyric", "frisell_atmosphere"]

PLAUSIBLE_COMBINATIONS = [
    ("wayne_shorter", "barry_harris", None, "monk"),
    ("wayne_shorter", "barry_harris", None, None),
    ("wayne_shorter", "monk", None, None),
    ("barry_harris", "wayne_shorter", None, None),
    ("wayne_shorter", "andrew_hill", None, None),
    ("andrew_hill", "monk", None, None),
    ("andrew_hill", "wayne_shorter", None, "monk"),
    ("monk", "barry_harris", "andrew_hill", None),
    ("monk", "barry_harris", None, None),
    ("barry_harris", "monk", None, None),
    ("wayne_shorter", "monk", "barry_harris", None),
    ("monk", "wayne_shorter", None, None),
    ("wheeler_lyric", "frisell_atmosphere", "bartok_night", None),
    ("wheeler_lyric", "frisell_atmosphere", None, None),
    ("frisell_atmosphere", "wheeler_lyric", "bartok_night", None),
    ("wayne_shorter", "barry_harris", "monk", "andrew_hill"),
]


def generate_hybrid_candidate(
    melody_engine: str,
    harmony_engine: str,
    counter_engine: Optional[str] = None,
    rhythm_engine: Optional[str] = None,
    input_text: str = "Untitled",
    seed: int = 0,
) -> dict:
    """
    Generate one hybrid composition from the given engine combination.
    Returns dict with hybrid_ir, compiled_result, melody_engine, harmony_engine, counter_engine, rhythm_engine.
    """
    hybrid_ir = plan_hybrid_composition(
        melody_engine=melody_engine,
        harmony_engine=harmony_engine,
        counter_engine=counter_engine,
        rhythm_engine=rhythm_engine,
        seed=seed,
        title=input_text,
    )
    result = compile_hybrid_composition(hybrid_ir, input_text)
    result["hybrid_ir"] = hybrid_ir
    result["counter_engine"] = result.get("counter_engine") or counter_engine
    result["rhythm_engine"] = result.get("rhythm_engine") or rhythm_engine
    return result


def generate_hybrid_candidates(
    input_text: str = "Untitled",
    engine_pool: Optional[List[str]] = None,
    count: int = 12,
    seed: int = 0,
) -> List[dict]:
    """
    Generate multiple hybrid candidates with varied engine combinations.
    Deterministic for same input + seed.
    """
    pool = engine_pool or DEFAULT_ENGINE_POOL
    pool = [e for e in pool if e]
    if not pool:
        pool = DEFAULT_ENGINE_POOL
    candidates = []
    used = set()
    idx = 0
    while len(candidates) < count:
        combo_idx = (seed + idx) % len(PLAUSIBLE_COMBINATIONS)
        combo = PLAUSIBLE_COMBINATIONS[combo_idx]
        mel, harm, cnt, rhy = combo
        if mel not in pool or harm not in pool:
            mel = pool[(seed + idx) % len(pool)]
            harm = pool[(seed + idx + 1) % len(pool)]
            cnt = pool[(seed + idx + 2) % len(pool)] if len(pool) >= 3 else None
            rhy = pool[(seed + idx + 3) % len(pool)] if len(pool) >= 4 else None
        key = (mel, harm, cnt or "", rhy or "", seed + idx)
        if key not in used:
            used.add(key)
            result = generate_hybrid_candidate(
                melody_engine=mel,
                harmony_engine=harm,
                counter_engine=cnt,
                rhythm_engine=rhy,
                input_text=input_text,
                seed=seed + idx,
            )
            candidates.append(result)
        idx += 1
        if idx > count * 4:
            break
    return candidates[:count]
