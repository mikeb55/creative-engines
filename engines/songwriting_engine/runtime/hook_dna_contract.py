"""
Hook DNA Contract — Extract, validate, score hook DNA for section derivation.
"""

from typing import Any, Dict, List, Optional


def extract_hook_dna(hook_candidate: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract reusable DNA contract from hook candidate.
    Includes: motif cell, contour, rhythm, title, image family, premise, energy, intervals, phrase tendency.
    """
    melody = hook_candidate.get("chorus_melody_idea", [])
    motif = hook_candidate.get("motif_cell", melody[:4] if melody else [60, 62, 64])
    if not motif and melody:
        motif = melody[: min(4, len(melody))]

    intervals = []
    if len(melody) >= 2:
        intervals = [melody[i + 1] - melody[i] for i in range(len(melody) - 1)]

    interval_personality = "stepwise" if intervals and sum(1 for i in intervals if abs(i) <= 1) / len(intervals) > 0.6 else "leapy"
    phrase_tendency = "short" if len(melody) <= 6 else "extended"

    return {
        "motif_cell": list(motif) if motif else [60, 62, 64],
        "contour_archetype": hook_candidate.get("contour_archetype", "arch"),
        "rhythmic_signature": hook_candidate.get("rhythmic_hook_profile", "motif_repeat"),
        "title_phrase": hook_candidate.get("title_line", ""),
        "title_variant": hook_candidate.get("title_line", "").split()[0] if hook_candidate.get("title_line") else "",
        "image_family": hook_candidate.get("image_premise_link", [])[:3],
        "premise_keywords": hook_candidate.get("image_premise_link", []),
        "energy_profile": hook_candidate.get("energy_level", 0.7),
        "interval_personality": interval_personality,
        "phrase_length_tendency": phrase_tendency,
        "chorus_melody_idea": list(melody) if melody else [60, 62, 64, 65, 67],
        "peak_pitch": max(melody) if melody else 67,
        "trough_pitch": min(melody) if melody else 60,
    }


def validate_song_against_hook_dna(song: Dict[str, Any], hook_dna: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate song sections against hook DNA. Returns violations and pass/fail per dimension.
    """
    violations = []
    sections = song.get("sections", [])
    lyrics = song.get("lyrics", [])
    melody = song.get("melody", [])
    title = song.get("title", "")

    motif = set(hook_dna.get("motif_cell", []))
    mel_pitches = set(e.get("pitch") for e in melody if e.get("pitch") is not None)
    if motif and not (motif & mel_pitches):
        violations.append("motif_not_in_melody")

    all_text = " ".join(line for entry in lyrics for line in entry.get("lines", [])).lower()
    if hook_dna.get("title_phrase") and hook_dna["title_phrase"].lower() not in all_text:
        title_words = (title or "").lower().split()
        if not any(w in all_text for w in title_words if len(w) > 2):
            violations.append("title_not_in_lyrics")

    key_images = hook_dna.get("image_family", [])
    if key_images:
        found = sum(1 for im in key_images if im in all_text)
        if found == 0:
            violations.append("image_family_missing")

    return {
        "valid": len(violations) == 0,
        "violations": violations,
        "motif_present": bool(motif & mel_pitches) if motif else True,
        "title_present": (title or "").lower() in all_text or any(
            w in all_text for w in (hook_dna.get("title_phrase", "") or "").lower().split() if len(w) > 2
        ),
        "images_present": sum(1 for im in key_images if im in all_text) if key_images else 1,
    }


def score_hook_dna_coherence(song: Dict[str, Any], hook_dna: Optional[Dict[str, Any]] = None) -> float:
    """
    Score 0-10: how well song inherits and maintains hook DNA.
    """
    hook_dna = hook_dna or song.get("hook_dna") or song.get("hook_dna_raw") or {}
    if isinstance(hook_dna, dict) and hook_dna and "title_phrase" not in hook_dna and ("title_line" in hook_dna or "chorus_melody_idea" in hook_dna):
        hook_dna = extract_hook_dna(hook_dna)

    if not hook_dna:
        return 5.0

    score = 5.0
    validation = validate_song_against_hook_dna(song, hook_dna)
    if validation.get("motif_present"):
        score += 1.5
    if validation.get("title_present"):
        score += 1.5
    if validation.get("images_present", 0) > 0:
        score += 1.0
    if validation.get("valid"):
        score += 1.0

    sections = song.get("sections", [])
    chorus = next((s for s in sections if s.get("section_role") == "chorus"), None)
    if chorus and chorus.get("lyric_block"):
        title_phrase = hook_dna.get("title_phrase", "")
        if title_phrase and title_phrase.lower() in chorus.get("lyric_block", "").lower():
            score += 0.5

    return round(min(10.0, score), 1)
