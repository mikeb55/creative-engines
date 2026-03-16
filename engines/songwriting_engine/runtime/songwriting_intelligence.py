"""
Songwriting Intelligence — Reusable musical knowledge from real songwriting practice.
Curated pattern selection for progression, motif, hook, imagery, contour.
"""

import random
from typing import Any, Dict, List, Optional

try:
    from .songwriting_patterns import (
        PROGRESSION_LIBRARY,
        HOOK_RHYTHMS,
        MELODIC_CONTOURS,
        MOTIF_SHAPES,
        MELODIC_PEAK_LOCATIONS,
        IMAGE_FAMILIES,
        THEME_TO_IMAGE_FAMILY,
        KEY_C,
        KEY_G,
    )
except ImportError:
    from songwriting_patterns import (
        PROGRESSION_LIBRARY,
        HOOK_RHYTHMS,
        MELODIC_CONTOURS,
        MOTIF_SHAPES,
        MELODIC_PEAK_LOCATIONS,
        IMAGE_FAMILIES,
        THEME_TO_IMAGE_FAMILY,
        KEY_C,
        KEY_G,
    )


def choose_progression_by_section(
    section_role: str,
    key_center: str = "C",
    seed: Optional[int] = None,
) -> List[str]:
    """Return chord symbols for section role. Uses curated progressions."""
    if seed is not None:
        random.seed(seed)
    key = f"{section_role}_progressions"
    progs = PROGRESSION_LIBRARY.get(key, PROGRESSION_LIBRARY["verse_progressions"])
    roman_prog = random.choice(progs)
    chord_map = KEY_G if key_center == "G" else KEY_C
    return [chord_map.get(r, "C") for r in roman_prog]


def choose_motif_shape(section_role: str, seed: Optional[int] = None) -> str:
    """Return motif shape for section role."""
    if seed is not None:
        random.seed(seed)
    shapes = MOTIF_SHAPES.get(section_role, MOTIF_SHAPES["verse"])
    return random.choice(shapes)


def choose_hook_rhythm(seed: Optional[int] = None) -> str:
    """Return hook rhythm template."""
    if seed is not None:
        random.seed(seed)
    return random.choice(HOOK_RHYTHMS)


def choose_image_family(theme: str, seed: Optional[int] = None) -> List[str]:
    """Return word list for theme-driven imagery."""
    if seed is not None:
        random.seed(seed)
    family_keys = THEME_TO_IMAGE_FAMILY.get(theme, THEME_TO_IMAGE_FAMILY["default"])
    key = random.choice(family_keys)
    words = IMAGE_FAMILIES.get(key, IMAGE_FAMILIES["light_dark"])
    return list(words)


def choose_phrase_contour(section_role: str, seed: Optional[int] = None) -> str:
    """Return melodic contour type for section role."""
    if seed is not None:
        random.seed(seed)
    contours = MELODIC_CONTOURS.get(section_role, MELODIC_CONTOURS["verse"])
    return random.choice(contours)


def choose_melodic_peak_location(section_role: str, seed: Optional[int] = None) -> float:
    """Return phrase position (0-1) for melodic peak."""
    if seed is not None:
        random.seed(seed)
    positions = MELODIC_PEAK_LOCATIONS.get(section_role, MELODIC_PEAK_LOCATIONS["verse"])
    return random.choice(positions)
