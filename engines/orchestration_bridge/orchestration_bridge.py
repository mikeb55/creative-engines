"""
Orchestration Bridge — Orchestrate compositions for ensemble output.
"""

from typing import Any, Dict, List, Optional

from .ensemble_planner import plan_ensemble_arrangement
from .ensemble_musicxml_exporter import export_ensemble_to_musicxml


def orchestrate_composition(
    compiled_composition: Any,
    ensemble_type: str,
    seed: int = 0,
    hybrid_result: Optional[Dict] = None,
) -> Dict[str, Any]:
    """
    Orchestrate one composition for ensemble.
    Returns ensemble arrangement object.
    """
    arrangement = plan_ensemble_arrangement(
        compiled_composition,
        ensemble_type,
        seed=seed,
        hybrid_result=hybrid_result,
    )
    arrangement["musicxml"] = export_ensemble_to_musicxml(arrangement)
    return arrangement


def orchestrate_population(
    list_of_compositions: List[Any],
    ensemble_type: str,
    seed: int = 0,
) -> List[Dict[str, Any]]:
    """
    Orchestrate multiple compositions. Each can be compiled or hybrid result dict.
    """
    results = []
    for i, item in enumerate(list_of_compositions):
        if isinstance(item, dict) and "compiled" in item:
            results.append(orchestrate_composition(
                item.get("compiled"),
                ensemble_type,
                seed=seed + i,
                hybrid_result=item,
            ))
        else:
            results.append(orchestrate_composition(
                item,
                ensemble_type,
                seed=seed + i,
            ))
    return results
