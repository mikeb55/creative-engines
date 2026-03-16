"""
Song Generator — Full pipeline: sections → harmony → melody → lyrics → hooks.
"""

import random
from datetime import datetime
from typing import Any, Dict, List, Optional

try:
    from .section_generator import generate_sections
    from .melody_generator import (
        generate_motifs,
        generate_melody_for_section,
        generate_harmonic_outline,
        MAX_MOTIFS,
    )
    from .lyric_generator import generate_lyrics_for_section, align_syllables_to_melody
    from .hook_generator import place_hooks_in_sections
    from .song_identity import create_identity, update_identity_after_section, get_identity_for_lyrics, get_identity_for_chorus
except ImportError:
    from section_generator import generate_sections
    from melody_generator import (
        generate_motifs,
        generate_melody_for_section,
        generate_harmonic_outline,
        MAX_MOTIFS,
    )
    from lyric_generator import generate_lyrics_for_section, align_syllables_to_melody
    from hook_generator import place_hooks_in_sections
    from song_identity import create_identity, update_identity_after_section, get_identity_for_lyrics, get_identity_for_chorus


class SongGenerator:
    """Generates complete CandidateComposition from rules."""

    def __init__(self, rules: Dict[str, Any]):
        self.rules = rules
        self.spec = rules.get("spec", {})
        self.section_defaults = rules.get("sections", {})
        self.profiles = rules.get("profiles", {})
        self.max_profiles = 2

    def _choose_profiles(self, requested: List[str], seed: Optional[int]) -> List[str]:
        """Max 2 profiles from spec."""
        valid = [p for p in requested if p in self.profiles]
        if len(valid) <= self.max_profiles:
            return valid
        if seed is not None:
            random.seed(seed)
        return random.sample(valid, self.max_profiles)

    def generate(
        self,
        style_profiles: List[str],
        vocal_target: str = "male_tenor",
        structure_type: str = "default",
        lyric_theme: str = "love",
        title: str = "Untitled Song",
        seed: str = "0",
    ) -> Dict[str, Any]:
        """Generate full CandidateComposition."""
        seed_int = int(seed) if seed.isdigit() else hash(seed) % 1000000
        random.seed(seed_int)

        profiles = self._choose_profiles(style_profiles, seed_int)
        key_center = "C"
        tempo_range = [90, 100]
        tempo = (tempo_range[0] + tempo_range[1]) // 2

        sections = generate_sections(
            structure_type=structure_type,
            section_defaults=self.section_defaults,
            seed=seed_int,
        )

        root_midi = 60
        motifs = generate_motifs(MAX_MOTIFS, root_midi, vocal_target, seed_int)

        identity = create_identity(title, lyric_theme, sections, motifs, seed_int)

        all_melody = []
        all_harmony = []

        for s in sections:
            bars = s["bar_end"] - s["bar_start"]
            harm = generate_harmonic_outline(s, key_center, bars, seed_int + hash(s["id"]) % 1000)
            s["harmonic_outline"] = harm
            all_harmony.extend(harm)

            mel = generate_melody_for_section(
                s, motifs, vocal_target, bars, harm, seed_int + hash(s["id"]) % 1000,
                song_identity=get_identity_for_chorus(identity) if s.get("section_role") == "chorus" else get_identity_for_lyrics(identity),
            )

            subtext = "oblique" if s.get("section_role") == "bridge" else "balanced"
            lyric_identity = get_identity_for_chorus(identity) if s.get("section_role") == "chorus" else get_identity_for_lyrics(identity)
            lyrics = generate_lyrics_for_section(
                s, mel, title, lyric_theme, subtext, seed_int + hash(s["id"]) % 1000,
                song_identity=lyric_identity,
            )
            s["lyric_block"] = lyrics
            identity = update_identity_after_section(identity, s, lyrics)

            aligned = align_syllables_to_melody(lyrics, mel)
            s["melody_line"] = aligned
            all_melody.extend(aligned)

        sections, hook_locations = place_hooks_in_sections(sections, title, tempo, seed_int)

        emotional_arc = {
            "polarity": 0.6,
            "tension_curve": [s.get("energy_level", 0.5) for s in sections],
            "release_points": [i for i, s in enumerate(sections) if s.get("section_role") == "chorus"],
        }

        candidate = {
            "metadata": {
                "engine": "songwriting_engine",
                "version": "1.0.0",
                "created_at": datetime.utcnow().isoformat() + "Z",
                "seed": seed,
            },
            "seed": seed,
            "title": title,
            "lyric_theme": lyric_theme,
            "vocal_target": vocal_target,
            "tempo_range": tempo_range,
            "key_center": key_center,
            "style_profiles": profiles,
            "intelligence_layers": {
                "songwriting_intelligence_layer": True,
                "classical_songcraft_layer": True,
                "listener_psychology_layer": True,
                "memory_hook_retention_layer": True,
                "emotional_narrative_arc_layer": True,
            },
            "sections": sections,
            "lyrics": [{"section_id": s["id"], "lines": s["lyric_block"].split("\n")} for s in sections],
            "melody": all_melody,
            "harmony": all_harmony,
            "hook_locations": hook_locations,
            "motifs": [{"pitches": m} for m in motifs],
            "emotional_arc": emotional_arc,
            "evaluation_scores": {},
            "repair_history": [],
            "warnings": {},
            "song_identity": identity,
        }
        return candidate
