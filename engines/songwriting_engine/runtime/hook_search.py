"""
Hook Search — Hook-first search. Generate and score chorus DNA before full songs.
"""

import random
from typing import Any, Dict, List, Optional

try:
    from .melody_generator import (
        _vocal_range,
        _clamp_pitch,
        CONTOUR_FNS,
        _contour_rise,
        _contour_arch,
        _contour_rise_hold_fall,
        _contour_repeat_then_leap,
        _contour_fall,
    )
    from .hook_lanes import assign_hook_to_lane, HOOK_LANES
except ImportError:
    from melody_generator import (
        _vocal_range,
        _clamp_pitch,
        CONTOUR_FNS,
        _contour_rise,
        _contour_arch,
        _contour_rise_hold_fall,
        _contour_repeat_then_leap,
        _contour_fall,
    )
    from hook_lanes import assign_hook_to_lane, HOOK_LANES

CONTOUR_ARCHETYPES = ["rise", "arch", "rise_hold_fall", "repeat_then_leap", "fall", "narrow_gradual"]
RHYTHM_PROFILES = ["strong_downbeat", "soft_landing", "lyric_forward", "syncopated", "motif_repeat"]
TITLE_TEMPLATES = [
    "{title}",
    "On {title}",
    "{title} again",
    "Take me to {title}",
    "{title}, we rise",
]


def generate_hook_candidates(
    title: Optional[str] = None,
    premise: Optional[str] = None,
    count: int = 24,
    seed: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """Generate hook candidates: short chorus melody, title line, rhythm, contour, motif cell."""
    if seed is not None:
        random.seed(seed)
    title = title or "Untitled"
    premise = premise or "love"
    lo, hi = _vocal_range("male_tenor")
    candidates = []

    for i in range(count):
        contour_type = random.choice(CONTOUR_ARCHETYPES)
        fn = CONTOUR_FNS.get(contour_type, _contour_arch)
        length = random.randint(6, 10)
        melody_pitches = fn(length, lo, hi, (seed or 0) + i * 100)
        motif_cell = melody_pitches[: min(4, len(melody_pitches))]

        title_line = random.choice(TITLE_TEMPLATES).format(title=title)
        if random.random() < 0.3:
            title_line = title

        rhythm_profile = random.choice(RHYTHM_PROFILES)
        energy = random.uniform(0.5, 0.95)

        image_link = []
        if premise and random.random() < 0.5:
            for w in premise.lower().split():
                if len(w) > 3:
                    image_link.append(w)
                    break

        candidates.append({
            "id": f"hook_{i}",
            "chorus_melody_idea": melody_pitches,
            "title_line": title_line,
            "rhythmic_hook_profile": rhythm_profile,
            "contour_archetype": contour_type,
            "motif_cell": motif_cell,
            "image_premise_link": image_link[:2],
            "energy_level": round(energy, 2),
            "seed": (seed or 0) + i,
        })

    return candidates


def score_hook_candidate(hook_candidate: Dict[str, Any], title: Optional[str] = None) -> float:
    """
    Score 0-10. Rewards: title landing, repeatability, melodic distinctiveness,
    rhythmic recognisability, emotional specificity, singability, asymmetry.
    """
    score = 5.0
    title_line = hook_candidate.get("title_line", "")
    title_ref = (title or "").lower()
    if title_ref and title_ref in title_line.lower():
        score += 1.5
    if len(title_line) <= 35:
        score += 0.5
    melody = hook_candidate.get("chorus_melody_idea", [])
    if len(melody) >= 4:
        score += 0.5
    intervals = [melody[i + 1] - melody[i] for i in range(len(melody) - 1)] if len(melody) >= 2 else []
    if intervals:
        stepwise = sum(1 for i in intervals if abs(i) <= 1) / len(intervals)
        if stepwise < 0.7:
            score += 0.5
    span = max(melody) - min(melody) if melody else 0
    if 4 <= span <= 12:
        score += 0.5
    if hook_candidate.get("motif_cell"):
        score += 0.5
    if hook_candidate.get("image_premise_link"):
        score += 0.3
    return round(min(10.0, score), 1)


def select_hook_elites(
    hook_candidates: List[Dict[str, Any]],
    elite_count: int = 6,
    title: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Score and select top hook candidates."""
    scored = [(h, score_hook_candidate(h, title)) for h in hook_candidates]
    scored.sort(key=lambda x: x[1], reverse=True)
    return [h for h, _ in scored[:elite_count]]
