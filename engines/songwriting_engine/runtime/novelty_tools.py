"""
Novelty Tools — Replaceability / novelty pressure.
Penalise population-median behaviour; reward coherent distinctiveness.
"""

from typing import Any, Dict, List


def population_replaceability_penalty(song: Dict[str, Any], population: List[Dict[str, Any]]) -> float:
    """
    Penalise: population-median contour, generic title placement, generic chorus rhythm,
    structure sameness, image-family sameness. 0 = no penalty, 2.5 = max.
    """
    if len(population) < 3:
        return 0.0
    scores = song.get("evaluation_scores", {})
    medians = {}
    for dim in ["energy_arc", "chorus_peak", "image_recurrence", "identity_score", "chorus_dominance"]:
        vals = [c.get("evaluation_scores", {}).get(dim, 5) for c in population]
        medians[dim] = sum(vals) / len(vals) if vals else 5

    penalty = 0.0
    for dim, med in medians.items():
        diff = abs(scores.get(dim, 5) - med)
        if diff < 0.5:
            penalty += 0.5

    structure = _structure_signature(song)
    pop_structures = [_structure_signature(c) for c in population]
    same_count = sum(1 for p in pop_structures if p == structure)
    if same_count > len(population) * 0.4:
        penalty += 0.5

    key_images = song.get("song_identity", {}).get("key_images", [])
    if key_images:
        pop_images = []
        for c in population:
            pop_images.extend(c.get("song_identity", {}).get("key_images", []))
        if pop_images:
            overlap = sum(1 for im in key_images if im in pop_images)
            if overlap >= len(key_images):
                penalty += 0.3

    return min(2.5, penalty)


def hook_replaceability_penalty(hook_candidate: Dict[str, Any], hook_population: List[Dict[str, Any]]) -> float:
    """
    Penalise hooks similar to population median. 0 = no penalty, 2 = max.
    """
    if len(hook_population) < 3:
        return 0.0

    contours = [h.get("contour_archetype", "arch") for h in hook_population]
    contour_counts = {}
    for c in contours:
        contour_counts[c] = contour_counts.get(c, 0) + 1
    my_contour = hook_candidate.get("contour_archetype", "arch")
    if contour_counts.get(my_contour, 0) > len(hook_population) * 0.5:
        penalty = 0.8
    else:
        penalty = 0.0

    energies = [h.get("energy_level", 0.5) for h in hook_population]
    med_energy = sum(energies) / len(energies) if energies else 0.5
    if abs(hook_candidate.get("energy_level", 0.5) - med_energy) < 0.1:
        penalty += 0.5

    return min(2.0, penalty)


def _structure_signature(song: Dict[str, Any]) -> str:
    sections = song.get("sections", [])
    return "-".join(s.get("section_role", "?") for s in sections)
