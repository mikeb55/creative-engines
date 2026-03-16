"""
Evaluation Adapter — Identity-first selection, search vs editorial scoring.
Rewards distinctive winners over balanced averages.
"""

from typing import Any, Dict, List, Optional

try:
    from .melody_generator import _vocal_range, CHORD_TONES
    from .lyric_generator import _score_anti_cliche, _score_imagery
    from .song_identity import score_identity_coherence
    from .identity_scoring import (
        identity_score as _identity_score_fn,
        premise_integrity_score as _premise_integrity_fn,
        chorus_dominance_score as _chorus_dominance_fn,
    )
    from .hook_dna_contract import score_hook_dna_coherence
    from .section_role_contracts import score_section_role_clarity
    from .transition_scoring import score_transition_flow
    from .contrast_arc_planner import score_contrast_arc
    from .chorus_arrival_engine import score_chorus_arrival
    from .verse_development_engine import score_verse_development
    from .final_chorus_tools import score_final_chorus_payoff
    from .standout_factor import score_standout_factor, score_afterglow, score_quotable_hook, score_signature_moment
except ImportError:
    from melody_generator import _vocal_range, CHORD_TONES
    from lyric_generator import _score_anti_cliche, _score_imagery
    from song_identity import score_identity_coherence
    from identity_scoring import (
        identity_score as _identity_score_fn,
        premise_integrity_score as _premise_integrity_fn,
        chorus_dominance_score as _chorus_dominance_fn,
    )
    from hook_dna_contract import score_hook_dna_coherence
    from section_role_contracts import score_section_role_clarity
    from transition_scoring import score_transition_flow
    from contrast_arc_planner import score_contrast_arc
    from chorus_arrival_engine import score_chorus_arrival
    from verse_development_engine import score_verse_development
    from final_chorus_tools import score_final_chorus_payoff
    from standout_factor import score_standout_factor, score_afterglow, score_quotable_hook, score_signature_moment

CHORUS_DOMINANCE_THRESHOLD = 5.5
PREMISE_INTEGRITY_MIN = 4.0


def _lyric_imagery_score(lyrics: List[Dict]) -> float:
    if not lyrics:
        return 5.0
    total = sum(_score_imagery(line) * 10 for entry in lyrics for line in entry.get("lines", []) if line.strip())
    count = sum(1 for entry in lyrics for line in entry.get("lines", []) if line.strip())
    return round(total / count, 1) if count else 5.0


def _anti_cliche_score(lyrics: List[Dict]) -> float:
    if not lyrics:
        return 5.0
    total = sum(_score_anti_cliche(line) * 10 for entry in lyrics for line in entry.get("lines", []) if line.strip())
    count = sum(1 for entry in lyrics for line in entry.get("lines", []) if line.strip())
    return round(total / count, 1) if count else 5.0


def _motif_identity_score(motifs: List, melody: List) -> float:
    """Score 0-10: motif reuse and transformation presence."""
    if not motifs or not melody:
        return 5.0
    motif_pitches = set()
    for m in motifs:
        p = m.get("pitches", m) if isinstance(m, dict) else m
        motif_pitches.update(p)
    mel_pitches = set(e.get("pitch") for e in melody if e.get("pitch") is not None)
    overlap = len(motif_pitches & mel_pitches) / max(1, len(motif_pitches))
    return round(5 + overlap * 5, 1)


def _section_contrast_score(sections: List[Dict]) -> float:
    """Score 0-10: energy gradient across sections."""
    if len(sections) < 2:
        return 5.0
    energies = [s.get("energy_level", 0.5) for s in sections]
    chorus_idxs = [i for i, s in enumerate(sections) if s.get("section_role") == "chorus"]
    verse_idxs = [i for i, s in enumerate(sections) if s.get("section_role") == "verse"]
    if not chorus_idxs or not verse_idxs:
        return 6.0
    chorus_avg = sum(energies[i] for i in chorus_idxs) / len(chorus_idxs)
    verse_avg = sum(energies[i] for i in verse_idxs) / len(verse_idxs)
    contrast = abs(chorus_avg - verse_avg)
    return round(5 + contrast * 5, 1)


def _title_integration_score(lyrics: List[Dict], title: str) -> float:
    """Score 0-10: title phrase in lyrics."""
    if not title or not lyrics:
        return 5.0
    title_lower = title.lower()
    for entry in lyrics:
        for line in entry.get("lines", []):
            if title_lower in line.lower():
                return 8.0
    return 5.0


def _image_recurrence_score(lyrics: List[Dict], key_images: List[str]) -> float:
    """Score 0-10: key images recur across sections."""
    if not key_images or not lyrics:
        return 5.0
    all_text = " ".join(line for entry in lyrics for line in entry.get("lines", [])).lower()
    return round(5 + sum(0.5 for im in key_images if im in all_text), 1)


def _chorus_peak_score(sections: List[Dict], melody: List[Dict]) -> float:
    """Score 0-10: chorus has stronger melodic peak than verse."""
    if not sections or not melody:
        return 5.0
    chorus_bars = set()
    verse_bars = set()
    for s in sections:
        for b in range(s.get("bar_start", 0), s.get("bar_end", 0)):
            if s.get("section_role") == "chorus":
                chorus_bars.add(b)
            elif s.get("section_role") == "verse":
                verse_bars.add(b)
    chorus_pitches = [e.get("pitch") for e in melody if e.get("measure") in chorus_bars and e.get("pitch")]
    verse_pitches = [e.get("pitch") for e in melody if e.get("measure") in verse_bars and e.get("pitch")]
    if not chorus_pitches or not verse_pitches:
        return 6.0
    chorus_max = max(chorus_pitches)
    verse_max = max(verse_pitches)
    return round(5 + (1 if chorus_max >= verse_max else 0) * 3, 1)




def _harmony_melody_fit_score(melody: List[Dict], harmony: List[Dict]) -> float:
    """Score 0-10: melody notes align with chord tones."""
    if not melody or not harmony:
        return 5.0
    chord_by_measure = {h.get("measure", 0): h.get("symbol", "C") for h in harmony}
    measures = sorted(chord_by_measure.keys()) or [0]
    root_map = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
    hits = 0
    total = 0
    for e in melody:
        m = e.get("measure", 0)
        p = e.get("pitch")
        if p is None:
            continue
        chord = chord_by_measure.get(m)
        if chord is None and measures:
            idx = min(m, len(measures) - 1) if m >= 0 else 0
            chord = chord_by_measure.get(measures[idx], "C")
        chord = chord or "C"
        key = chord[0] + ("m" if "m" in chord else "") + ("7" if "7" in chord else "")
        degrees = CHORD_TONES.get(key, [0, 4, 7])
        root_pc = root_map.get(chord[0] if chord else "C", 0)
        chord_pcs = set((d + root_pc) % 12 for d in degrees)
        if (p % 12) in chord_pcs:
            hits += 1
        total += 1
    if total == 0:
        return 5.0
    return round(5 + (hits / total) * 4, 1)


class EvaluationAdapter:
    def __init__(self, rules: Dict[str, Any]):
        self.rules = rules
        eval_data = rules.get("evaluation", {})
        self.dimensions = eval_data.get("dimensions", eval_data) if isinstance(eval_data, dict) else {}
        self.pass_threshold = 7
        self.warning_threshold = 5
        self.fail_threshold = 4

    def evaluate(self, candidate: Dict[str, Any]) -> Dict[str, Any]:
        scores = {}
        warnings = {}
        repair_triggers = []

        melody = candidate.get("melody", [])
        sections = candidate.get("sections", [])
        hook_locations = candidate.get("hook_locations", [])
        vocal_target = candidate.get("vocal_target", "male_tenor")
        lyrics = candidate.get("lyrics", [])
        motifs = candidate.get("motifs", [])
        harmony = candidate.get("harmony", [])
        identity = candidate.get("song_identity", {})

        scores["melodic_identity"] = _motif_identity_score(motifs, melody)

        lo, hi = _vocal_range(vocal_target)
        out_of_range = [e for e in melody if isinstance(e.get("pitch"), (int, float)) and (e["pitch"] < lo or e["pitch"] > hi)]
        if out_of_range:
            scores["singability"] = 4.0
            repair_triggers.append("vocal_range_issue")
            warnings["vocal_range_issue"] = True
        else:
            scores["singability"] = 7.5

        chorus_hooks = [h for h in hook_locations if "chorus" in h.get("section_id", "")]
        hook_strength_val = max(h.get("strength", 0.5) for h in chorus_hooks) if chorus_hooks else 0.0
        if not chorus_hooks:
            scores["hook_strength"] = 3.0
            repair_triggers.append("weak_hook")
            warnings["weak_hook"] = True
        else:
            scores["hook_strength"] = round(5 + hook_strength_val * 4, 1)

        has_syllables = any(e.get("syllable") for e in melody)
        scores["prosody_accuracy"] = 7.5 if has_syllables and melody else 6.0

        scores["lyric_imagery"] = _lyric_imagery_score(lyrics)
        if scores["lyric_imagery"] < 5:
            repair_triggers.append("weak_imagery")

        scores["subtext_quality"] = 6.5

        has_roles = all(s.get("section_role") for s in sections)
        scores["section_role_clarity"] = 8.0 if has_roles else 5.0

        scores["energy_arc"] = _section_contrast_score(sections)

        release_pts = [i for i, s in enumerate(sections) if s.get("section_role") == "chorus"]
        scores["emotional_arc"] = 7.5 if release_pts else 6.0

        scores["memorability"] = 7.5 if len(chorus_hooks) >= 1 and hook_strength_val >= 0.6 else (5.5 if chorus_hooks else 4.0)
        if scores["memorability"] < 6:
            repair_triggers.append("low_memorability")

        scores["novelty_score"] = 6.5

        motif_count = len(motifs) if motifs else 0
        if motif_count > 3:
            scores["clarity_score"] = 5.0
            repair_triggers.append("low_clarity")
            warnings["low_clarity"] = True
        else:
            scores["clarity_score"] = 7.5

        scores["anti_cliche_score"] = _anti_cliche_score(lyrics)
        if scores["anti_cliche_score"] < 5:
            repair_triggers.append("lyric_cliche")

        chord_variety = len(set(h.get("symbol", "") for h in harmony)) if harmony else 0
        scores["intent_match"] = 7.0 if chord_variety >= 4 else 6.0

        title = candidate.get("title", "")
        scores["title_integration"] = _title_integration_score(lyrics, title)

        scores["image_recurrence"] = _image_recurrence_score(lyrics, identity.get("key_images", []))

        scores["chorus_peak"] = _chorus_peak_score(sections, melody)

        scores["harmony_melody_fit"] = _harmony_melody_fit_score(melody, harmony)

        scores["identity_coherence"] = score_identity_coherence(candidate)

        scores["identity_score"] = _identity_score_fn(candidate)
        scores["premise_integrity"] = _premise_integrity_fn(candidate)
        scores["chorus_dominance"] = _chorus_dominance_fn(candidate)
        scores["hook_dna_coherence"] = score_hook_dna_coherence(candidate)
        scores["section_role_clarity"] = score_section_role_clarity(candidate)
        scores["transition_flow"] = score_transition_flow(candidate)
        scores["contrast_arc_score"] = score_contrast_arc(candidate)
        scores["chorus_arrival_score"] = score_chorus_arrival(candidate)
        scores["verse_development_score"] = score_verse_development(candidate)
        scores["final_chorus_payoff_score"] = score_final_chorus_payoff(candidate)
        scores["standout_factor"] = score_standout_factor(candidate)
        scores["afterglow"] = score_afterglow(candidate)
        scores["quotable_hook"] = score_quotable_hook(candidate)
        scores["signature_moment"] = score_signature_moment(candidate)

        scores["search_score"] = self._compute_search_score(scores)
        scores["final_editorial_score"] = self._compute_final_editorial_score(scores)

        if scores["chorus_peak"] < 6 or scores["melodic_identity"] < 5:
            repair_triggers.append("weak_chorus_identity")
        if scores["energy_arc"] < 6:
            repair_triggers.append("weak_section_contrast")
        if scores["image_recurrence"] < 5 and identity.get("key_images"):
            repair_triggers.append("weak_verse_coherence")

        scores["overall"] = self._weighted_overall(scores)
        soft_penalty = 0.0
        if scores["chorus_dominance"] < 4.0:
            soft_penalty += max(0, 4.0 - scores["chorus_dominance"]) * 0.15
        if scores.get("hook_dna_coherence", 7) < 5 and candidate.get("hook_dna"):
            soft_penalty += max(0, 5 - scores.get("hook_dna_coherence", 7)) * 0.2
        if scores.get("section_role_clarity", 7) < 5:
            soft_penalty += max(0, 5 - scores.get("section_role_clarity", 7)) * 0.2
        if scores.get("contrast_arc_score", 7) < 5:
            soft_penalty += max(0, 5 - scores.get("contrast_arc_score", 7)) * 0.2
        if scores.get("chorus_arrival_score", 7) < 5:
            soft_penalty += max(0, 5 - scores.get("chorus_arrival_score", 7)) * 0.2
        if scores.get("verse_development_score", 7) < 5:
            soft_penalty += max(0, 5 - scores.get("verse_development_score", 7)) * 0.2
        if scores.get("final_chorus_payoff_score", 7) < 5:
            soft_penalty += max(0, 5 - scores.get("final_chorus_payoff_score", 7)) * 0.2
        scores["overall"] = max(0, round(scores["overall"] - soft_penalty, 1))

        identity_str = (scores.get("identity_score", 5) + scores.get("hook_strength", 5) + scores.get("memorability", 5) + scores.get("chorus_dominance", 5)) / 4
        structural_str = (scores.get("section_role_clarity", 5) + scores.get("transition_flow", 5)) / 2
        standout = scores.get("standout_factor", 5)
        quotable = scores.get("quotable_hook", 5)
        afterglow = scores.get("afterglow", 5)
        if identity_str >= 7.5 and structural_str >= 5.5 and standout >= 6.5 and quotable >= 6.0 and afterglow >= 5.5:
            ceiling_bonus = min(1.0, (standout - 6) * 0.1 + (quotable - 6) * 0.1 + (afterglow - 5) * 0.05)
            scores["overall"] = min(10.0, round(scores["overall"] + ceiling_bonus, 1))

        if scores["overall"] >= self.pass_threshold and not repair_triggers:
            verdict = "pass"
        elif scores["overall"] >= self.warning_threshold:
            verdict = "warning"
        else:
            verdict = "fail"

        return {
            "scores": scores,
            "warnings": warnings,
            "verdict": verdict,
            "repair_triggers": repair_triggers,
        }

    HIGH_IMPACT_WEIGHTS = {
        "melodic_identity": 1.8,
        "hook_strength": 1.7,
        "clarity_score": 1.5,
        "memorability": 1.8,
        "section_role_clarity": 1.2,
        "image_recurrence": 1.5,
        "title_integration": 1.7,
        "harmony_melody_fit": 1.5,
        "chorus_peak": 1.4,
        "energy_arc": 1.3,
        "identity_coherence": 1.4,
    }

    def _compute_search_score(self, scores: Dict[str, float]) -> float:
        """Broad, exploration-friendly: identity, contrast, energy, motif potential."""
        search_dims = [
            "identity_score", "melodic_identity", "hook_strength", "energy_arc",
            "chorus_peak", "chorus_dominance", "image_recurrence", "title_integration",
        ]
        total = 0.0
        for d in search_dims:
            total += scores.get(d, 5.0)
        return round(total / len(search_dims), 1)

    def _compute_final_editorial_score(self, scores: Dict[str, float]) -> float:
        """Stricter: coherence, memorability, premise integrity, hook_dna, section roles, transitions, contrast."""
        editorial_dims = [
            "premise_integrity", "chorus_dominance", "identity_score", "memorability",
            "clarity_score", "harmony_melody_fit", "anti_cliche_score", "identity_coherence",
            "hook_dna_coherence", "section_role_clarity", "transition_flow",
            "contrast_arc_score", "chorus_arrival_score", "verse_development_score", "final_chorus_payoff_score",
        ]
        total = 0.0
        for d in editorial_dims:
            total += scores.get(d, 5.0)
        return round(total / len(editorial_dims), 1)

    def _weighted_overall(self, scores: Dict[str, float]) -> float:
        weights = dict(self.HIGH_IMPACT_WEIGHTS)
        weights["identity_score"] = 2.8
        weights["premise_integrity"] = 2.0
        weights["chorus_dominance"] = 2.8
        weights["memorability"] = 1.8
        weights["hook_dna_coherence"] = 1.6
        weights["section_role_clarity"] = 1.0
        weights["transition_flow"] = 1.0
        weights["contrast_arc_score"] = 1.0
        weights["chorus_arrival_score"] = 1.0
        weights["verse_development_score"] = 0.8
        weights["final_chorus_payoff_score"] = 1.0
        weights["standout_factor"] = 1.4
        weights["afterglow"] = 1.2
        weights["quotable_hook"] = 1.4
        weights["signature_moment"] = 1.2
        for dim, cfg in (self.dimensions or {}).items():
            if isinstance(cfg, dict) and "weight" in cfg:
                weights[dim] = cfg["weight"]
        weighted_sum = 0.0
        weight_total = 0.0
        for dim, score in scores.items():
            if dim in ("overall", "search_score", "final_editorial_score"):
                continue
            w = weights.get(dim, 1.0)
            weighted_sum += score * w
            weight_total += w
        return round(weighted_sum / weight_total, 1) if weight_total else 7.0
