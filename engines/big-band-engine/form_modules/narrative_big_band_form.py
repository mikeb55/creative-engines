"""
Narrative Big Band Form — Modern narrative large-ensemble form profile.
Builds on Big Band Engine, Shorter Form, Ligeti Texture, Big Band bridge.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

# ---------------------------------------------------------------------------
# PART 1 — FORM ARCHETYPES
# ---------------------------------------------------------------------------

FORM_ARCHETYPES = {
    "luminous_arc_form": {
        "sections": [
            {"id": "IntroAtmosphere", "function": "atmosphere", "duration_range": (4, 8), "meter": "4/4", "dynamic": "pp-mp", "density": 0.2, "texture": "suspended", "motive": "none"},
            {"id": "Exposition", "function": "exposition", "duration_range": (8, 14), "meter": "4/4", "dynamic": "mp-mf", "density": 0.5, "texture": "lyrical", "motive": "introduction"},
            {"id": "TransitionalBuild", "function": "transition", "duration_range": (6, 10), "meter": "4/4", "dynamic": "mf-ff", "density": 0.7, "texture": "building", "motive": "variation"},
            {"id": "SoloEnvironment", "function": "solo_space", "duration_range": (12, 24), "meter": "4/4", "dynamic": "mp-f", "density": 0.4, "texture": "open", "motive": "fragmentation"},
            {"id": "Recomposition", "function": "recap", "duration_range": (8, 14), "meter": "4/4", "dynamic": "mf-ff", "density": 0.6, "texture": "transformed", "motive": "recomposition"},
            {"id": "Coda", "function": "coda", "duration_range": (4, 12), "meter": "4/4", "dynamic": "f-pp", "density": 0.3, "texture": "dissolve", "motive": "fragment_return"},
        ],
    },
    "transformed_return_form": {
        "sections": [
            {"id": "IntroAtmosphere", "function": "atmosphere", "duration_range": (6, 10), "meter": "4/4", "dynamic": "p-mp", "density": 0.25, "texture": "hovering", "motive": "none"},
            {"id": "Exposition", "function": "exposition", "duration_range": (10, 16), "meter": "4/4", "dynamic": "mp", "density": 0.45, "texture": "motivic", "motive": "introduction"},
            {"id": "TransitionalBuild", "function": "transition", "duration_range": (8, 12), "meter": "4/4", "dynamic": "mf-ff", "density": 0.75, "texture": "saturation", "motive": "expansion"},
            {"id": "SoloEnvironment", "function": "solo_space", "duration_range": (16, 32), "meter": "4/4", "dynamic": "mp", "density": 0.35, "texture": "static", "motive": "recontextualisation"},
            {"id": "Recomposition", "function": "recap", "duration_range": (10, 16), "meter": "4/4", "dynamic": "mf-ff", "density": 0.65, "texture": "transformed_echo", "motive": "transformed_return"},
            {"id": "Coda", "function": "coda", "duration_range": (6, 14), "meter": "4/4", "dynamic": "ff-ppp", "density": 0.2, "texture": "ostinato_fade", "motive": "dissolve"},
        ],
    },
}

# ---------------------------------------------------------------------------
# PART 2 — PHRASE ARCHETYPES
# ---------------------------------------------------------------------------

PHRASE_ARCHETYPES = {
    "structural_phrase": {"bar_range": (4, 8), "rhythmic": "mixed", "start": "strong", "end": "open", "cadence": 0.3, "register": "stable"},
    "answering_phrase": {"bar_range": (3, 6), "rhythmic": "responsive", "start": "weak", "end": "resolving", "cadence": 0.6, "register": "descending"},
    "hovering_texture_phrase": {"bar_range": (5, 9), "rhythmic": "sustained", "start": "soft", "end": "float", "cadence": 0.1, "register": "mid"},
    "sequential_build_phrase": {"bar_range": (4, 7), "rhythmic": "ascending", "start": "soft", "end": "peak", "cadence": 0.2, "register": "climbing"},
    "release_phrase": {"bar_range": (3, 6), "rhythmic": "decaying", "start": "strong", "end": "release", "cadence": 0.5, "register": "descending"},
}

# ---------------------------------------------------------------------------
# PART 3 — MOTIVE RULES
# ---------------------------------------------------------------------------

MOTIVE_RULES = {
    "introduction": {"section": "Exposition", "length": (3, 7), "method": "statement"},
    "variation_methods": ["interval_expansion", "rhythmic_diminution", "rhythmic_expansion", "fragmentation", "sequence", "registral_transfer", "contour_reversal"],
    "recomposition": {"section": "Recomposition", "methods": ["fragment_return", "register_shift", "texture_change", "harmony_colour"]},
    "fragmentation": {"min_fragment": 1, "max_fragment": 3},
    "sequence_usage": {"allowed": True, "max_sequence_length": 3},
}

# ---------------------------------------------------------------------------
# PART 4 — TRANSITION LOGIC
# ---------------------------------------------------------------------------

TRANSITION_STRATEGIES = {
    ("IntroAtmosphere", "Exposition"): ["density_increase", "pedal_harmonic_brightening", "register_climb"],
    ("Exposition", "TransitionalBuild"): ["density_increase", "motive_saturation", "texture_thickening"],
    ("TransitionalBuild", "SoloEnvironment"): ["harmonic_arrival", "thinning_before_return", "register_climb"],
    ("SoloEnvironment", "Recomposition"): ["density_increase", "motive_saturation", "harmonic_arrival"],
    ("Recomposition", "Coda"): ["thinning_before_return", "dynamic_decay", "texture_thinning"],
}

# ---------------------------------------------------------------------------
# PART 5 — STATE MACHINE
# ---------------------------------------------------------------------------

STATES = ["IntroAtmosphere", "Exposition", "TransitionalBuild", "SoloEnvironment", "Recomposition", "Coda"]

STATE_TRANSITIONS = {
    "IntroAtmosphere": {"next": ["Exposition"], "conditions": ["density_threshold_0.3", "dynamic_peak_reached"]},
    "Exposition": {"next": ["TransitionalBuild"], "conditions": ["motive_saturation_0.6", "harmonic_arrival"]},
    "TransitionalBuild": {"next": ["SoloEnvironment"], "conditions": ["density_threshold_0.7", "dynamic_peak_reached"]},
    "SoloEnvironment": {"next": ["Recomposition"], "conditions": ["motive_saturation_0.5", "harmonic_arrival"]},
    "Recomposition": {"next": ["Coda"], "conditions": ["motive_saturation_0.8", "harmonic_arrival"]},
    "Coda": {"next": [], "conditions": []},
}

TRANSITION_PROBABILITIES = {
    ("IntroAtmosphere", "Exposition"): [0.7, 0.3],
    ("Exposition", "TransitionalBuild"): [0.6, 0.4],
    ("TransitionalBuild", "SoloEnvironment"): [0.65, 0.35],
    ("SoloEnvironment", "Recomposition"): [0.6, 0.4],
    ("Recomposition", "Coda"): [0.8, 0.2],
}

# ---------------------------------------------------------------------------
# PART 6 — SOLO ENVIRONMENT RULES
# ---------------------------------------------------------------------------

SOLO_ENVIRONMENT_PROFILES = {
    "floating": {"mode": "static", "harmonic": "slow_sequence", "center": "expanding", "intensity_curve": "flat"},
    "building": {"mode": "slow_sequence", "harmonic": "expanding_center", "center": "chromatic_drift", "intensity_curve": "ascending"},
    "static": {"mode": "static", "harmonic": "pedal", "center": "fixed", "intensity_curve": "flat"},
}

SOLO_RULES = {
    "background_intensity_curve": ["flat", "ascending", "wave"],
    "orchestral_commentary": ["sparse_hits", "counterline_fragments", "density_pads"],
    "mini_shout_insertion": {"allowed": True, "max_length_bars": 4, "placement": "mid_solo"},
    "solo_length_distribution": {"min": 12, "max": 32, "prefer_odd": True},
}

# ---------------------------------------------------------------------------
# PART 7 — RECOMPOSITION / RECAP RULES
# ---------------------------------------------------------------------------

RECAP_ARCHETYPES = {
    "luminous_homecoming": {
        "what_returns": "primary_motive",
        "what_changes": ["register_shift_up", "texture_thickening", "harmony_brightening"],
        "register_shift": "+7",
        "texture_shift": "denser",
        "harmony_colour": "brighter",
        "meter_tempo": "same",
    },
    "transformed_echo": {
        "what_returns": "fragment",
        "what_changes": ["fragmentation", "register_shift", "texture_thinning", "harmony_darkening"],
        "register_shift": "-5",
        "texture_shift": "sparser",
        "harmony_colour": "darker",
        "meter_tempo": "optional_rubato",
    },
}

# ---------------------------------------------------------------------------
# PART 8 — CODA TYPES
# ---------------------------------------------------------------------------

CODA_TYPES = {
    "dissolve": {"duration_range": (4, 10), "motive": "fragment_fade", "dynamic": "ff-ppp", "texture": "thinning"},
    "final_broad_sonority": {"duration_range": (6, 14), "motive": "sustained", "dynamic": "ff-pp", "texture": "broad"},
    "ostinato_fade": {"duration_range": (8, 16), "motive": "ostinato_diminuendo", "dynamic": "mf-ppp", "texture": "repeating_fade"},
}

# ---------------------------------------------------------------------------
# ENGINE FUNCTIONS
# ---------------------------------------------------------------------------


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


def build_narrative_form_plan(seed: int, profile: str = "luminous_arc_form") -> Dict[str, Any]:
    """Build narrative form plan. Deterministic."""
    arch = FORM_ARCHETYPES.get(profile, FORM_ARCHETYPES["luminous_arc_form"])
    sections = arch["sections"]
    section_order = [s["id"] for s in sections]
    phrase_lengths = []
    section_roles = {}
    h = _hash_int(seed)
    for i, sec in enumerate(sections):
        lo, hi = sec["duration_range"]
        bars = lo + (h % (hi - lo + 1))
        h = _hash_int(h, i + 1)
        phrase_lengths.append(bars)
        section_roles[sec["id"]] = {
            "function": sec["function"],
            "bar_count": bars,
            "duration_range": sec["duration_range"],
            "dynamic": sec["dynamic"],
            "density": sec["density"],
            "texture": sec["texture"],
            "motive_behaviour": sec["motive"],
        }
    return {
        "profile": profile,
        "section_order": section_order,
        "section_roles": section_roles,
        "phrase_lengths": phrase_lengths,
        "total_bars": sum(phrase_lengths),
        "archetype": arch,
    }


def score_narrative_form_interest(form_plan: Dict[str, Any]) -> float:
    """Score 0-1: narrative form interest."""
    lengths = form_plan.get("phrase_lengths", [])
    if not lengths:
        return 0.0
    mn, mx = min(lengths), max(lengths)
    spread = (mx - mn) / max(mx, 1)
    odd = sum(1 for L in lengths if L % 2 == 1) / max(len(lengths), 1)
    n_sections = len(form_plan.get("section_order", []))
    return min(1.0, spread * 0.4 + odd * 0.3 + (n_sections / 8) * 0.3)


def choose_next_state(current_state: str, state_metrics: Dict[str, float], seed: int) -> Optional[str]:
    """Choose next state from current. Returns None if terminal."""
    next_states = STATE_TRANSITIONS.get(current_state, {}).get("next", [])
    if not next_states:
        return None
    h = _hash_int(seed)
    probs = TRANSITION_PROBABILITIES.get((current_state, next_states[0]), [0.5, 0.5])
    idx = 0 if (h % 100) < (probs[0] * 100) else min(1, len(next_states) - 1)
    return next_states[idx]


def build_solo_environment(seed: int, profile: str = "floating") -> Dict[str, Any]:
    """Build solo environment config."""
    prof = SOLO_ENVIRONMENT_PROFILES.get(profile, SOLO_ENVIRONMENT_PROFILES["floating"])
    h = _hash_int(seed)
    lo, hi = SOLO_RULES["solo_length_distribution"]["min"], SOLO_RULES["solo_length_distribution"]["max"]
    bars = lo + (h % (hi - lo + 1))
    if SOLO_RULES["solo_length_distribution"].get("prefer_odd") and bars % 2 == 0:
        bars += 1
    return {
        "profile": profile,
        "mode": prof["mode"],
        "harmonic": prof["harmonic"],
        "center": prof["center"],
        "intensity_curve": prof["intensity_curve"],
        "bar_count": bars,
        **SOLO_RULES,
    }


def score_solo_environment(solo_env: Dict[str, Any]) -> float:
    """Score 0-1: solo environment interest."""
    bars = solo_env.get("bar_count", 16)
    t = 0.0
    if bars % 2 == 1:
        t += 0.2
    if solo_env.get("center") == "expanding":
        t += 0.2
    if solo_env.get("intensity_curve") != "flat":
        t += 0.2
    return min(1.0, t + 0.3)


def get_section_function(section_id: str, profile: str = "luminous_arc_form") -> Optional[Dict[str, Any]]:
    """Get section metadata for compiler."""
    arch = FORM_ARCHETYPES.get(profile, FORM_ARCHETYPES["luminous_arc_form"])
    for s in arch["sections"]:
        if s["id"] == section_id:
            return dict(s)
    return None


def map_narrative_to_big_band_sections(form_plan: Dict[str, Any]) -> List[str]:
    """Map narrative sections to Big Band Engine section roles."""
    mapping = {
        "IntroAtmosphere": "intro",
        "Exposition": "primary",
        "TransitionalBuild": "contrast",
        "SoloEnvironment": "solo",
        "Recomposition": "return",
        "Coda": "coda",
    }
    order = form_plan.get("section_order", [])
    return [mapping.get(s, "primary") for s in order]
