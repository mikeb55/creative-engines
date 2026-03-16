"""
Lyric Generator — Dynamic assembly from composable parts.
Uses songwriting_intelligence for choose_image_family.
"""

import random
from typing import Any, Dict, List, Optional, Tuple

try:
    from .songwriting_intelligence import choose_image_family
except ImportError:
    from songwriting_intelligence import choose_image_family

CLICHE_PHRASES = frozenset({
    "love is all we need", "hold me close", "never let go", "forever more",
    "every moment", "feels so right", "meant to be", "you and i",
    "together we are strong", "this is where we belong", "came along",
    "building up", "here we go", "closer to the edge",
})

IMAGE_FAMILIES = {
    "nature": ["river", "dawn", "rain", "light", "bridge", "train", "street"],
    "domestic": ["window", "door", "table", "kitchen", "glass"],
    "urban": ["streetlamps", "sidewalk", "platform", "station"],
}
ACTIONS = ["walk", "run", "fall", "rise", "break", "burn", "fade", "spin", "drift", "catch", "blur", "pulls"]
MODIFIERS = ["dark", "empty", "past", "under", "until", "over", "through"]
SETTING_FRAGMENTS = ["past the window", "under the bridge", "over the platform", "till dawn", "on the glass"]
CONTRAST_TURNS = ["But now", "What if", "Maybe", "And yet", "Still"]

VERSE_POOL = [
    ("The streetlamps blur past the window", "oblique"),
    ("Rain on the glass, the train pulls out", "direct"),
    ("Dawn breaks over the empty platform", "balanced"),
    ("You left a note on the kitchen table", "direct"),
    ("The river runs dark under the bridge", "oblique"),
    ("Every crack in the sidewalk tells a story", "oblique"),
]
CHORUS_POOL = [
    ("The light in your eyes when you smile", "balanced"),
    ("We burn through the night till dawn", "oblique"),
    ("Catch me before I fall", "balanced"),
]
BRIDGE_POOL = [
    ("But now I see it differently", "balanced"),
    ("The world spins on without us", "oblique"),
    ("What if we had stayed", "oblique"),
]
PRECHORUS_POOL = [
    ("And I can feel it building up", "direct"),
    ("Getting closer to the edge", "balanced"),
]

MAX_LINE_ITERATIONS = 10


def _syllable_count(text: str) -> int:
    words = text.split()
    count = 0
    for w in words:
        w = w.lower()
        vowels = "aeiouy"
        prev_vowel = False
        for c in w:
            is_vowel = c in vowels
            if is_vowel and not prev_vowel:
                count += 1
            prev_vowel = is_vowel
        if count == 0 and w:
            count = 1
    return max(count, len(words))


def _score_anti_cliche(line: str) -> float:
    lower = line.lower().strip()
    if lower in CLICHE_PHRASES:
        return 0.2
    for phrase in CLICHE_PHRASES:
        if phrase in lower:
            return 0.4
    return 0.9


def _score_imagery(line: str) -> float:
    words = set(w.lower() for w in line.split())
    score = 0.5
    for family in IMAGE_FAMILIES.values():
        for n in family:
            if n in words:
                score += 0.12
    for v in ACTIONS:
        if v in words:
            score += 0.08
    return min(1.0, score)


def _build_dynamic_line(
    title_words: List[str],
    key_images: List[str],
    emotional_premise: str,
    role: str,
    subtext_mode: str,
    seed: int,
) -> Optional[str]:
    """Assemble line from composable parts. Returns None if unusable."""
    random.seed(seed)

    if title_words and role == "chorus" and random.random() < 0.65:
        title_phrase = " ".join(title_words[:2]) if len(title_words) >= 2 else title_words[0]
        templates = [
            f"Take me down to {title_phrase}",
            f"{title_phrase}, we're going home",
            f"On {title_phrase} we stand",
        ]
        return random.choice(templates)

    images = key_images or list(IMAGE_FAMILIES["nature"])[:3]
    if images and random.random() < 0.5:
        img = random.choice(images)
        templates = [
            f"The {img} runs dark under the bridge",
            f"Dawn breaks over the {img}",
            f"Rain on the glass, the {img} waits",
            f"The {img} blurs past the window",
        ]
        line = random.choice(templates)
        if _score_anti_cliche(line) >= 0.4:
            return line

    if role == "verse" and images:
        img = random.choice(images)
        frag = random.choice(SETTING_FRAGMENTS)
        line = f"The {img} {frag}"
        if _score_anti_cliche(line) >= 0.4:
            return line

    if role == "bridge":
        turn = random.choice(CONTRAST_TURNS)
        line = f"{turn} I see it differently" if random.random() < 0.5 else f"{turn} we had stayed"
        if _score_anti_cliche(line) >= 0.4:
            return line

    return None


def generate_lyrics_for_section(
    section: Dict[str, Any],
    melody_events: List[Dict],
    title: str,
    lyric_theme: str,
    subtext_mode: str = "balanced",
    seed: Optional[int] = None,
    song_identity: Optional[Dict[str, Any]] = None,
) -> str:
    """Generate lyric block. Dynamic assembly + pool fallback. Stronger identity coherence."""
    if seed is not None:
        random.seed(seed)

    identity = song_identity or {}
    key_images = identity.get("key_images", [])
    main_image_family = identity.get("main_image_family", [])
    main_hook = identity.get("main_hook_phrase", title or "")
    emotional_premise = identity.get("emotional_premise", lyric_theme)
    title_words = [w for w in (title or "").split() if len(w) > 2] if title else []

    theme_words = choose_image_family(lyric_theme or "default", seed)
    images_to_use = key_images or main_image_family or theme_words[:5]

    role = section.get("section_role", "verse")
    note_count = len(melody_events) or 8
    target_syllables = max(1, min(note_count, 16))

    if role == "verse":
        pool = list(VERSE_POOL)
    elif role == "chorus":
        pool = list(CHORUS_POOL)
    elif role == "bridge":
        pool = list(BRIDGE_POOL)
    elif role == "prechorus":
        pool = list(PRECHORUS_POOL)
    else:
        pool = list(VERSE_POOL)

    if main_hook and main_hook.lower() not in ("untitled song", "untitled"):
        for line, sub in [
            (f"Take me down to {main_hook}", "balanced"),
            (f"{main_hook}, we're going home", "direct"),
            (f"On {main_hook} we stand", "balanced"),
        ]:
            if (line, sub) not in pool:
                pool.append((line, sub))

    lines = []
    syllables_used = 0
    used_lines = set()

    for attempt in range(MAX_LINE_ITERATIONS):
        if syllables_used >= target_syllables:
            break
        if attempt < 4:
            dyn = _build_dynamic_line(
                title_words, images_to_use, emotional_premise, role, subtext_mode, (seed or 0) + attempt * 77
            )
            if dyn and dyn not in used_lines and _score_anti_cliche(dyn) >= 0.4:
                syl = _syllable_count(dyn)
                if syl <= target_syllables - syllables_used or not lines:
                    lines.append(dyn)
                    used_lines.add(dyn)
                    syllables_used += syl
                    continue

        def score_line(ln: str) -> float:
            s = 0.5
            if key_images and any(im in ln.lower() for im in key_images):
                s += 0.3
            if main_hook and main_hook.lower() in ln.lower():
                s += 0.4
            s += _score_imagery(ln) * 0.2
            return s

        candidates = [(line, score_line(line)) for line, _ in pool if line not in used_lines]
        if candidates:
            candidates.sort(key=lambda x: x[1], reverse=True)
            for line, _ in candidates[:4]:
                syl = _syllable_count(line)
                if (syl <= target_syllables - syllables_used or not lines) and _score_anti_cliche(line) >= 0.25:
                    lines.append(line)
                    used_lines.add(line)
                    syllables_used += syl
                    break
            else:
                line = random.choice([p[0] for p in pool])
                syl = _syllable_count(line)
                if syl <= target_syllables - syllables_used or not lines:
                    lines.append(line)
                    syllables_used += syl
        else:
            line = random.choice([p[0] for p in pool])
            syl = _syllable_count(line)
            if syl <= target_syllables - syllables_used or not lines:
                lines.append(line)
                syllables_used += syl

    return "\n".join(lines) if lines else pool[0][0]


def align_syllables_to_melody(lyric_block: str, melody_events: List[Dict]) -> List[Dict]:
    lines = lyric_block.strip().split("\n")
    words = []
    for line in lines:
        words.extend(line.split())

    events = []
    word_idx = 0
    for i, ev in enumerate(melody_events):
        ev_copy = dict(ev)
        if word_idx < len(words):
            ev_copy["syllable"] = words[word_idx]
            ev_copy["melisma"] = False
            word_idx += 1
        else:
            ev_copy["syllable"] = None
            ev_copy["melisma"] = i > 0 and events and events[-1].get("syllable")
        events.append(ev_copy)

    return events
