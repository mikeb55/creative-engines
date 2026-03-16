"""
IR Generation Strategies — Deterministic strategy builders.
Varies form, section order, hook boldness, image density, etc.
"""

from typing import Any, Dict, List, Tuple


def _hash_int(s: str, seed: int) -> int:
    """Deterministic hash for seeding."""
    h = seed
    for c in s.encode("utf-8", errors="replace"):
        h = (h * 31 + c) & 0xFFFFFFFF
    return h


def _pick(items: List[Any], key: str, seed: int) -> Any:
    """Pick item by deterministic index."""
    h = _hash_int(key, seed)
    return items[h % len(items)]


FORM_OPTIONS = ["short", "medium", "long"]
SECTION_ORDERS = [
    ["verse", "chorus", "verse", "chorus"],
    ["verse", "chorus", "verse", "chorus", "chorus"],
    ["verse", "verse", "chorus", "verse", "chorus"],
    ["verse", "chorus", "prechorus", "chorus", "verse", "chorus"],
    ["verse", "chorus", "bridge", "chorus"],
]
PROGRESSIONS = [
    ["C", "Am", "F", "G"],
    ["G", "Em", "C", "D"],
    ["Am", "F", "G", "C"],
    ["D", "Bm", "G", "A"],
    ["F", "Dm", "Bb", "C"],
    ["C", "G", "Am", "F"],
]
KEYS = ["C", "G", "Am", "D", "F", "Em"]


def build_practical_strategy(input_text: str, seed: int) -> Dict[str, Any]:
    """Balanced, common forms. Moderate hook, moderate asymmetry."""
    h = _hash_int(input_text.strip().lower(), seed)
    form_idx = (h >> 0) % len(FORM_OPTIONS)
    order_idx = (h >> 4) % len(SECTION_ORDERS)
    prog_idx = (h >> 8) % len(PROGRESSIONS)
    key_idx = (h >> 12) % len(KEYS)
    lyric_dens = 0.55 + ((h >> 16) % 35) / 100  # 0.55–0.90
    hook_energy = 0.65 + ((h >> 20) % 25) / 100  # 0.65–0.90
    asym = (h >> 24) % 2 == 0
    return {
        "form": FORM_OPTIONS[form_idx],
        "section_order": SECTION_ORDERS[order_idx].copy(),
        "hook_boldness": hook_energy,
        "image_density": 2 + (h % 3),
        "lyric_density": lyric_dens,
        "harmonic_adventurousness": 0.4 + (prog_idx % 3) * 0.2,
        "emotional_temperature": 0.5 + ((h >> 28) % 40) / 100,
        "asymmetry": asym,
        "key_center": KEYS[key_idx],
        "progression": PROGRESSIONS[prog_idx].copy(),
    }


def build_hook_forward_strategy(input_text: str, seed: int) -> Dict[str, Any]:
    """Strong hook, chorus emphasis, high identity."""
    cfg = build_practical_strategy(input_text, seed)
    cfg["hook_boldness"] = min(0.95, cfg["hook_boldness"] + 0.15)
    cfg["section_order"] = [s for s in cfg["section_order"] if s in ("verse", "chorus")]
    if cfg["section_order"].count("chorus") < 2:
        cfg["section_order"] = ["verse", "chorus", "verse", "chorus"]
    cfg["emotional_temperature"] = min(0.9, cfg["emotional_temperature"] + 0.1)
    return cfg


def build_image_driven_strategy(input_text: str, seed: int) -> Dict[str, Any]:
    """Rich image_family, image-centric lyrics."""
    cfg = build_practical_strategy(input_text, seed)
    cfg["image_density"] = min(6, cfg["image_density"] + 2)
    cfg["lyric_density"] = min(0.85, cfg["lyric_density"] + 0.1)
    cfg["asymmetry"] = True
    return cfg


def build_premise_driven_strategy(input_text: str, seed: int) -> Dict[str, Any]:
    """Premise-driven, lyrical focus."""
    cfg = build_practical_strategy(input_text, seed)
    cfg["lyric_density"] = 0.7 + ((_hash_int(input_text, seed + 1) >> 8) % 20) / 100
    cfg["harmonic_adventurousness"] = 0.3 + (cfg["harmonic_adventurousness"] * 0.5)
    return cfg


def extract_image_words(text: str, seed: int, count: int) -> List[str]:
    """Derive image-like words from input. Deterministic."""
    words = [w.strip().lower() for w in text.replace(",", " ").replace(".", " ").split() if len(w.strip()) > 2]
    if not words:
        return ["light", "road", "sky"]
    out = []
    h = seed
    for i in range(count):
        idx = (h + i * 7) % len(words)
        out.append(words[idx])
        h = (h * 17 + ord(words[idx][0]) if words[idx] else 0) & 0xFFFFFFFF
    return out[:count]
