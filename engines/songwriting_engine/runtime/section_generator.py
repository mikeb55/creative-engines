"""
Section Generator — Energy gradient, pre-chorus lift, chorus inevitability, bridge contrast.
"""

import random
from typing import Any, Dict, List, Optional

DEFAULT_STRUCTURE = [
    "verse", "verse", "chorus", "verse", "chorus", "bridge", "chorus"
]

STRUCTURE_TEMPLATES = {
    "default": DEFAULT_STRUCTURE,
    "short": ["verse", "chorus", "verse", "chorus"],
    "with_prechorus": ["verse", "prechorus", "chorus", "verse", "prechorus", "chorus"],
    "extended": ["verse", "verse", "chorus", "verse", "chorus", "bridge", "chorus", "chorus"],
}

BAR_COUNTS = {
    "verse": 8,
    "prechorus": 4,
    "chorus": 8,
    "bridge": 8,
    "intro": 4,
    "outro": 4,
}

# Energy gradient: verse=lower, prechorus=lift, chorus=peak, bridge=contrast
ENERGY_BY_ROLE = {
    "verse": (0.35, 0.55),
    "prechorus": (0.55, 0.75),
    "chorus": (0.7, 0.95),
    "bridge": (0.4, 0.65),
    "intro": (0.3, 0.5),
    "outro": (0.4, 0.6),
}


def generate_sections(
    structure_type: str = "default",
    section_defaults: Optional[Dict[str, Any]] = None,
    seed: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """Generate section list with energy gradient and structural weighting."""
    if seed is not None:
        random.seed(seed)

    structure = STRUCTURE_TEMPLATES.get(structure_type, DEFAULT_STRUCTURE)
    defaults = section_defaults or {}

    sections = []
    bar_start = 0

    for i, role in enumerate(structure):
        bars = BAR_COUNTS.get(role, 8)
        bar_end = bar_start + bars

        role_defaults = defaults.get(role, {})
        energy_range = role_defaults.get("energy_expectation") or ENERGY_BY_ROLE.get(role, (0.4, 0.7))
        energy = random.uniform(energy_range[0], energy_range[1])

        role_count = sum(1 for s in sections if s.get("section_role") == role)
        section_id = f"{role}_{role_count + 1}" if role in ("verse", "chorus") else role

        sections.append({
            "id": section_id,
            "section_role": role,
            "section_index": i,
            "bar_start": bar_start,
            "bar_end": bar_end,
            "energy_level": round(energy, 2),
            "hook_flags": [],
            "lyric_block": "",
            "melody_line": [],
            "harmonic_outline": [],
        })
        bar_start = bar_end

    return sections
