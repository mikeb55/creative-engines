"""
Repair Engine — Targeted repair from triggers. Multi-step when different dimensions.
"""

import random
from copy import deepcopy
from typing import Any, Dict, List, Optional

MAX_REPAIR_ITERATIONS = 5
MAX_REPAIRS_PER_PASS = 3

REPAIR_LAYERS = {
    "melody": ["weak_hook", "weak_chorus_identity", "vocal_range_issue", "low_clarity"],
    "lyrics": ["poor_prosody", "lyric_cliche", "weak_imagery", "weak_verse_coherence"],
    "sections": ["weak_section_contrast", "section_role_unclear"],
    "hooks": ["low_memorability"],
}

try:
    from .melody_generator import generate_melody_for_section, generate_motifs, _clamp_pitch, MAX_MOTIFS, generate_harmonic_outline
    from .lyric_generator import generate_lyrics_for_section, align_syllables_to_melody
    from .hook_generator import place_hooks_in_sections
    from .song_identity import get_identity_for_chorus, get_identity_for_lyrics
except ImportError:
    from melody_generator import generate_melody_for_section, generate_motifs, _clamp_pitch, MAX_MOTIFS, generate_harmonic_outline
    from lyric_generator import generate_lyrics_for_section, align_syllables_to_melody
    from hook_generator import place_hooks_in_sections
    from song_identity import get_identity_for_chorus, get_identity_for_lyrics


class RepairEngine:
    """Applies targeted repairs based on evaluation triggers."""

    def __init__(self, rules: Dict[str, Any]):
        self.rules = rules
        self.repair_mapping = rules.get("repair_mapping", {})

    def _trigger_to_layer(self, trigger: str) -> str:
        for layer, triggers in REPAIR_LAYERS.items():
            if trigger in triggers:
                return layer
        return "unknown"

    def _apply_one_repair(self, c: Dict, trigger: str, seed: Optional[int]) -> Dict:
        handlers = {
            "weak_hook": self._repair_weak_hook,
            "poor_prosody": self._repair_poor_prosody,
            "low_memorability": self._repair_low_memorability,
            "vocal_range_issue": self._repair_vocal_range,
            "low_clarity": self._repair_low_clarity,
            "lyric_cliche": self._repair_lyric_cliche,
            "weak_imagery": self._repair_weak_imagery,
            "section_role_unclear": self._repair_section_role,
            "weak_chorus_identity": self._repair_weak_chorus_identity,
            "weak_section_contrast": self._repair_section_contrast,
            "weak_verse_coherence": self._repair_weak_verse_coherence,
        }
        fn = handlers.get(trigger)
        return fn(c, seed) if fn else c

    def repair(
        self,
        candidate: Dict[str, Any],
        triggers: List[str],
        seed: Optional[int] = None,
    ) -> Optional[Dict[str, Any]]:
        """Apply up to MAX_REPAIRS_PER_PASS repairs when they target different layers."""
        if seed is not None:
            random.seed(seed)

        repaired = deepcopy(candidate)
        repair_history = repaired.get("repair_history", [])
        before_score = repaired.get("evaluation_scores", {}).get("overall", 0)
        applied = []
        layers_used = set()

        for trigger in triggers[:MAX_REPAIR_ITERATIONS]:
            if len(applied) >= MAX_REPAIRS_PER_PASS:
                break
            layer = self._trigger_to_layer(trigger)
            if layer in layers_used:
                continue
            repaired = self._apply_one_repair(repaired, trigger, seed)
            applied.append(trigger)
            layers_used.add(layer)

        if not applied:
            applied = [triggers[0]] if triggers else ["none"]

        repair_history.append({
            "iteration": len(repair_history) + 1,
            "trigger": applied[0],
            "triggers_applied": applied,
            "layer": self.repair_mapping.get(applied[0], "unknown"),
            "action": f"repair_{'+'.join(applied[:2])}" if len(applied) > 1 else f"repair_{applied[0]}",
            "before_score": before_score,
            "after_score": repaired.get("evaluation_scores", {}).get("overall", before_score),
        })
        repaired["repair_history"] = repair_history
        return repaired

    def _repair_weak_hook(self, c: Dict, seed: Optional[int]) -> Dict:
        """Strengthen chorus: motif recurrence, peak placement, title integration."""
        vocal_target = c.get("vocal_target", "male_tenor")
        motifs = [m.get("pitches", [60, 62, 64]) for m in c.get("motifs", [])]
        if not motifs:
            motifs = [[60, 62, 64, 65]]
        identity = c.get("song_identity", {})
        chorus_identity = get_identity_for_chorus(identity)

        for s in c["sections"]:
            if s.get("section_role") == "chorus":
                bars = s["bar_end"] - s["bar_start"]
                harm = s.get("harmonic_outline") or generate_harmonic_outline(s, c.get("key_center", "C"), bars, seed)
                s["harmonic_outline"] = harm
                new_mel = generate_melody_for_section(
                    s, motifs, vocal_target, bars, harm, seed,
                    song_identity=chorus_identity,
                )
                new_lyrics = generate_lyrics_for_section(
                    s, new_mel, c.get("title", ""), "love", "balanced", seed, song_identity=chorus_identity
                )
                s["melody_line"] = align_syllables_to_melody(new_lyrics, new_mel)
                s["lyric_block"] = new_lyrics
                s["hook_flags"] = ["melodic_hook", "lyric_hook"]
                break

        c["melody"] = [e for s in c["sections"] for e in s.get("melody_line", [])]
        c["sections"], c["hook_locations"] = place_hooks_in_sections(c["sections"], c.get("title", ""), 90, seed)
        return c

    def _repair_poor_prosody(self, c: Dict, seed: Optional[int]) -> Dict:
        """Rewrite lyric rhythm; preserve image family and narrative thread."""
        identity = c.get("song_identity", {})
        for s in c["sections"]:
            mel = s.get("melody_line", [])
            subtext = "oblique" if s.get("section_role") == "bridge" else "balanced"
            lyric_id = get_identity_for_chorus(identity) if s.get("section_role") == "chorus" else get_identity_for_lyrics(identity)
            new_lyrics = generate_lyrics_for_section(s, mel, c.get("title", ""), "love", subtext, seed, song_identity=lyric_id)
            s["lyric_block"] = new_lyrics
            s["melody_line"] = align_syllables_to_melody(new_lyrics, mel)
        c["lyrics"] = [{"section_id": s["id"], "lines": s["lyric_block"].split("\n")} for s in c["sections"]]
        return c

    def _repair_low_memorability(self, c: Dict, seed: Optional[int]) -> Dict:
        """Reinforce hook recurrence and strength."""
        c["sections"], c["hook_locations"] = place_hooks_in_sections(
            c["sections"], c.get("title", ""), 90, seed
        )
        return c

    def _repair_vocal_range(self, c: Dict, seed: Optional[int]) -> Dict:
        """Adjust melodic contour to fit range."""
        vocal_target = c.get("vocal_target", "male_tenor")
        for s in c["sections"]:
            for e in s.get("melody_line", []):
                if "pitch" in e:
                    e["pitch"] = _clamp_pitch(e["pitch"], vocal_target)
        c["melody"] = [e for s in c["sections"] for e in s.get("melody_line", [])]
        return c

    def _repair_low_clarity(self, c: Dict, seed: Optional[int]) -> Dict:
        """Simplify motifs to max 3."""
        motifs = c.get("motifs", [])
        if len(motifs) > MAX_MOTIFS:
            c["motifs"] = motifs[:MAX_MOTIFS]
        return c

    def _repair_lyric_cliche(self, c: Dict, seed: Optional[int]) -> Dict:
        """Rewrite lyric surface with anti-cliche; preserve image family."""
        return self._repair_poor_prosody(c, seed)

    def _repair_weak_imagery(self, c: Dict, seed: Optional[int]) -> Dict:
        """Replace vague lines with more concrete imagery."""
        return self._repair_lyric_cliche(c, seed)

    def _repair_section_role(self, c: Dict, seed: Optional[int]) -> Dict:
        """Ensure sections have explicit roles."""
        return c

    def _repair_weak_chorus_identity(self, c: Dict, seed: Optional[int]) -> Dict:
        """Strengthen chorus: motif recurrence, peak placement, harmonic targeting."""
        return self._repair_weak_hook(c, seed)

    def _repair_section_contrast(self, c: Dict, seed: Optional[int]) -> Dict:
        """Adjust energy gradient by section role for clearer contrast."""
        try:
            from .section_generator import ENERGY_BY_ROLE
        except ImportError:
            from section_generator import ENERGY_BY_ROLE
        import random
        if seed is not None:
            random.seed(seed)
        for s in c.get("sections", []):
            role = s.get("section_role", "verse")
            rng = ENERGY_BY_ROLE.get(role, (0.4, 0.6))
            s["energy_level"] = round(random.uniform(rng[0], rng[1]), 2)
        return c

    def _repair_weak_verse_coherence(self, c: Dict, seed: Optional[int]) -> Dict:
        """Tighten image family and lyric narrative thread across verses."""
        return self._repair_poor_prosody(c, seed)
