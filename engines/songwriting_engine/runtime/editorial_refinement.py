"""
Editorial Refinement — Late-stage targeted refinement passes.
Preserves structure; sharpens hook, lyric, motif, bridge, title.
"""

import random
from copy import deepcopy
from typing import Any, Dict, Optional

try:
    from .melody_generator import (
        generate_melody_for_section,
        generate_harmonic_outline,
    )
    from .lyric_generator import generate_lyrics_for_section, align_syllables_to_melody
    from .hook_generator import place_hooks_in_sections
    from .song_identity import get_identity_for_chorus, get_identity_for_lyrics
    from .section_generator import ENERGY_BY_ROLE
    from .chorus_generator import generate_stronger_chorus, refine_existing_hook_derived_chorus
    from .melodic_identity_tools import reinforce_melodic_identity
    from .premise_tools import reinforce_premise_images
    from .hook_dna_contract import extract_hook_dna
    from .song_from_hook import (
        derive_verse_from_hook_dna,
        derive_bridge_from_hook_dna,
        derive_prechorus_from_hook_dna,
        derive_outro_from_hook_dna,
    )
    from .contrast_arc_planner import plan_section_contrast_arc, apply_contrast_arc
    from .chorus_arrival_engine import strengthen_prechorus_to_chorus_arrival, strengthen_bridge_to_final_chorus_payoff
    from .verse_development_engine import differentiate_verse_2
    from .final_chorus_tools import intensify_final_chorus
except ImportError:
    from melody_generator import (
        generate_melody_for_section,
        generate_harmonic_outline,
    )
    from lyric_generator import generate_lyrics_for_section, align_syllables_to_melody
    from hook_generator import place_hooks_in_sections
    from song_identity import get_identity_for_chorus, get_identity_for_lyrics
    from section_generator import ENERGY_BY_ROLE
    from chorus_generator import generate_stronger_chorus, refine_existing_hook_derived_chorus
    from melodic_identity_tools import reinforce_melodic_identity
    from premise_tools import reinforce_premise_images
    from hook_dna_contract import extract_hook_dna
    from song_from_hook import (
        derive_verse_from_hook_dna,
        derive_bridge_from_hook_dna,
        derive_prechorus_from_hook_dna,
        derive_outro_from_hook_dna,
    )
    from contrast_arc_planner import plan_section_contrast_arc, apply_contrast_arc
    from chorus_arrival_engine import strengthen_prechorus_to_chorus_arrival, strengthen_bridge_to_final_chorus_payoff
    from verse_development_engine import differentiate_verse_2
    from final_chorus_tools import intensify_final_chorus
except ImportError:
    from melody_generator import generate_melody_for_section, generate_harmonic_outline
    from lyric_generator import generate_lyrics_for_section, align_syllables_to_melody
    from hook_generator import place_hooks_in_sections
    from song_identity import get_identity_for_chorus, get_identity_for_lyrics
    from section_generator import ENERGY_BY_ROLE
    from chorus_generator import generate_stronger_chorus, refine_existing_hook_derived_chorus
    from melodic_identity_tools import reinforce_melodic_identity
    from premise_tools import reinforce_premise_images
    from hook_dna_contract import extract_hook_dna
    from song_from_hook import (
        derive_verse_from_hook_dna,
        derive_bridge_from_hook_dna,
        derive_prechorus_from_hook_dna,
        derive_outro_from_hook_dna,
    )
    from contrast_arc_planner import plan_section_contrast_arc, apply_contrast_arc
    from chorus_arrival_engine import strengthen_prechorus_to_chorus_arrival, strengthen_bridge_to_final_chorus_payoff
    from verse_development_engine import differentiate_verse_2
    from final_chorus_tools import intensify_final_chorus


def sharpen_chorus_hook(song: Dict[str, Any], seed: Optional[int] = None) -> Dict[str, Any]:
    """Regenerate chorus via generate_stronger_chorus for stronger hook."""
    return generate_stronger_chorus(song, seed)


def repair_section_roles(song: Dict[str, Any], hook_dna: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Re-derive sections from hook DNA to enforce role contracts."""
    hook_dna = hook_dna or song.get("hook_dna") or extract_hook_dna(song.get("hook_dna_raw", {}))
    if not hook_dna:
        return song
    s = song
    for role, fn in [("verse", derive_verse_from_hook_dna), ("prechorus", derive_prechorus_from_hook_dna),
                     ("bridge", derive_bridge_from_hook_dna), ("outro", derive_outro_from_hook_dna)]:
        if any(sec.get("section_role") == role for sec in s.get("sections", [])):
            s = fn(s, hook_dna)
    return s


def repair_transition_flow(song: Dict[str, Any], hook_dna: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Adjust section energies for clearer transitions."""
    c = deepcopy(song)
    sections = c.get("sections", [])
    for i, s in enumerate(sections):
        role = s.get("section_role", "")
        if role == "verse" and i > 0 and sections[i - 1].get("section_role") == "chorus":
            s["energy_level"] = min(s.get("energy_level", 0.5), 0.55)
        elif role == "prechorus":
            s["energy_level"] = max(s.get("energy_level", 0.5), 0.58)
        elif role == "chorus" and i > 0 and sections[i - 1].get("section_role") == "prechorus":
            s["energy_level"] = max(s.get("energy_level", 0.7), 0.72)
    return c


def repair_bridge_premise_link(song: Dict[str, Any], hook_dna: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Ensure bridge contains premise images."""
    return repair_section_roles(song, hook_dna)


def repair_contrast_arc(song: Dict[str, Any], hook_dna: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Apply contrast arc plan to enforce section-to-section contrast."""
    hook_dna = hook_dna or song.get("hook_dna") or extract_hook_dna(song.get("hook_dna_raw", {}))
    plan = plan_section_contrast_arc(song, hook_dna)
    return apply_contrast_arc(song, plan)


def repair_chorus_arrival(song: Dict[str, Any], hook_dna: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Strengthen prechorus-to-chorus and bridge-to-final-chorus."""
    hook_dna = hook_dna or song.get("hook_dna") or extract_hook_dna(song.get("hook_dna_raw", {}))
    s = strengthen_prechorus_to_chorus_arrival(song, hook_dna)
    return strengthen_bridge_to_final_chorus_payoff(s, hook_dna)


def repair_verse_development(song: Dict[str, Any], hook_dna: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Differentiate verse 2 from verse 1."""
    hook_dna = hook_dna or song.get("hook_dna") or extract_hook_dna(song.get("hook_dna_raw", {}))
    return differentiate_verse_2(song, hook_dna)


def repair_final_chorus_payoff(song: Dict[str, Any], hook_dna: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Intensify final chorus payoff."""
    hook_dna = hook_dna or song.get("hook_dna") or extract_hook_dna(song.get("hook_dna_raw", {}))
    return intensify_final_chorus(song, hook_dna)


def apply_editorial_repair_passes(song: Dict[str, Any], seed: Optional[int] = None, evaluator=None) -> Dict[str, Any]:
    """
    Repair-first pipeline: run all structural repairs. If structural health low after first pass,
    run repair again before scoring penalties apply.
    """
    s = reinforce_song_identity(song, seed)
    if evaluator and s.get("hook_dna"):
        try:
            from .editorial_selector import compute_structural_health
        except ImportError:
            from editorial_selector import compute_structural_health
        res = evaluator.evaluate(s)
        s["evaluation_scores"] = res["scores"]
        if compute_structural_health(s) < 4.5:
            s = reinforce_song_identity(s, (seed or 0) + 100)
    return s


def _should_regenerate_chorus(song: Dict[str, Any]) -> bool:
    """Use full regeneration only when chorus_dominance low, title missing, or motif broken."""
    scores = song.get("evaluation_scores", {})
    if scores.get("chorus_dominance", 6) < 5.0:
        return True
    if scores.get("title_integration", 6) < 5.0:
        return True
    if scores.get("melodic_identity", 6) < 4.5:
        return True
    return False


def reinforce_song_identity(song: Dict[str, Any], seed: Optional[int] = None) -> Dict[str, Any]:
    """
    Full identity reinforcement. When hook_dna exists, use guarded chorus refinement.
    Order: reinforce identity, repair section roles, contrast arc, chorus arrival,
    bridge premise, verse development, final chorus payoff.
    """
    s = song
    s = reinforce_melodic_identity(s, (seed or 0) + 1)
    s = reinforce_premise_images(s, (seed or 0) + 2)

    hook_dna = s.get("hook_dna") or extract_hook_dna(s.get("hook_dna_raw", s.get("hook_dna", {})))
    if hook_dna and not _should_regenerate_chorus(s):
        s = refine_existing_hook_derived_chorus(s, hook_dna, (seed or 0) + 3)
    else:
        s = generate_stronger_chorus(s, (seed or 0) + 3)

    if hook_dna:
        s = repair_section_roles(s, hook_dna)
        s = repair_transition_flow(s, hook_dna)
        s = repair_contrast_arc(s, hook_dna)
        s = repair_chorus_arrival(s, hook_dna)
        s = repair_bridge_premise_link(s, hook_dna)
        s = repair_verse_development(s, hook_dna)
        s = repair_final_chorus_payoff(s, hook_dna)
    return s


def compress_weak_lyric_line(song: Dict[str, Any], seed: Optional[int] = None) -> Dict[str, Any]:
    """Regenerate lyrics for the section with the longest/weakest line."""
    c = deepcopy(song)
    if seed is not None:
        random.seed(seed)
    sections = c.get("sections", [])
    identity = c.get("song_identity", {})
    title = c.get("title", "")

    longest_idx = 0
    longest_len = 0
    for i, s in enumerate(sections):
        block = s.get("lyric_block", "")
        lines = block.split("\n")
        for line in lines:
            if len(line) > longest_len:
                longest_len = len(line)
                longest_idx = i

    s = sections[longest_idx]
    mel = s.get("melody_line", [])
    subtext = "oblique" if s.get("section_role") == "bridge" else "balanced"
    lyric_id = get_identity_for_chorus(identity) if s.get("section_role") == "chorus" else get_identity_for_lyrics(identity)
    new_lyrics = generate_lyrics_for_section(s, mel, title, c.get("lyric_theme", "love") or "love", subtext, seed or 0, song_identity=lyric_id)
    s["lyric_block"] = new_lyrics
    s["melody_line"] = align_syllables_to_melody(new_lyrics, mel)

    c["lyrics"] = [{"section_id": sec["id"], "lines": sec.get("lyric_block", "").split("\n")} for sec in c["sections"]]
    c["melody"] = [e for sec in c["sections"] for e in sec.get("melody_line", [])]
    return c


def reinforce_motif_recurrence(song: Dict[str, Any], seed: Optional[int] = None) -> Dict[str, Any]:
    """Regenerate melody for one section to strengthen motif presence."""
    c = deepcopy(song)
    if seed is not None:
        random.seed(seed)
    sections = c.get("sections", [])
    motifs_raw = c.get("motifs", [])
    motifs = [m.get("pitches", m) if isinstance(m, dict) else m for m in motifs_raw]
    if not motifs:
        motifs = [[60, 62, 64]]
    vocal_target = c.get("vocal_target", "male_tenor")
    key_center = c.get("key_center", "C")
    identity = c.get("song_identity", {})

    idx = random.randint(0, len(sections) - 1) if sections else 0
    s = sections[idx]
    bars = s["bar_end"] - s["bar_start"]
    harm = s.get("harmonic_outline") or generate_harmonic_outline(s, key_center, bars, seed or 0)
    s["harmonic_outline"] = harm
    lyric_id = get_identity_for_chorus(identity) if s.get("section_role") == "chorus" else get_identity_for_lyrics(identity)
    mel = generate_melody_for_section(s, motifs, vocal_target, bars, harm, (seed or 0) + 1, song_identity=lyric_id)
    s["melody_line"] = align_syllables_to_melody(s.get("lyric_block", ""), mel)

    c["melody"] = [e for sec in c["sections"] for e in sec.get("melody_line", [])]
    return c


def strengthen_bridge_contrast(song: Dict[str, Any], seed: Optional[int] = None) -> Dict[str, Any]:
    """Adjust bridge energy for clearer contrast with chorus/verse."""
    c = deepcopy(song)
    if seed is not None:
        random.seed(seed)
    bridge = next((s for s in c.get("sections", []) if s.get("section_role") == "bridge"), None)
    if bridge:
        rng = ENERGY_BY_ROLE.get("bridge", (0.4, 0.65))
        bridge["energy_level"] = round(random.uniform(rng[0], rng[1]), 2)
    return c


def clarify_title_placement(song: Dict[str, Any], seed: Optional[int] = None) -> Dict[str, Any]:
    """Regenerate chorus lyrics to ensure title lands clearly."""
    return sharpen_chorus_hook(song, seed)
