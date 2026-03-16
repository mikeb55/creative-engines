"""
Premium Finalist Refinement — High-level polish for top finalists only.
Preserves asymmetry. Sharpens strongest feature. Keeps hook-derived identity intact.
"""

from copy import deepcopy
from typing import Any, Dict, List, Optional

try:
    from .lyric_generator import generate_lyrics_for_section, align_syllables_to_melody
    from .song_identity import get_identity_for_chorus, get_identity_for_lyrics
    from .hook_dna_contract import extract_hook_dna
except ImportError:
    from lyric_generator import generate_lyrics_for_section, align_syllables_to_melody
    from song_identity import get_identity_for_chorus, get_identity_for_lyrics
    from hook_dna_contract import extract_hook_dna

GENERIC_PATTERNS = ["and I", "every time", "all we need", "feel so", "meant to be", "here we go", "together we"]


def select_premium_finalists(candidates: List[Dict[str, Any]], top_n: int = 3) -> List[Dict[str, Any]]:
    """Select top N candidates for premium refinement."""
    if not candidates:
        return []
    return candidates[:top_n]


def premium_refine_hook_line(song: Dict[str, Any]) -> Dict[str, Any]:
    """Sharpen chorus hook line. Ensure title lands. Preserve hook-derived identity."""
    c = deepcopy(song)
    sections = c.get("sections", [])
    title = c.get("title", "")
    hook_dna = c.get("hook_dna") or extract_hook_dna(c.get("hook_dna_raw", {}))
    title_phrase = (hook_dna or {}).get("title_phrase", title) or title

    for s in sections:
        if s.get("section_role") != "chorus":
            continue
        block = s.get("lyric_block", "")
        if not block or not title_phrase:
            break
        lines = block.split("\n")
        if title_phrase.lower() not in block.lower():
            if lines:
                lines[0] = f"{title_phrase}\n{lines[0]}"
                s["lyric_block"] = "\n".join(lines[:5])
                mel = s.get("melody_line", [])
                if mel:
                    s["melody_line"] = align_syllables_to_melody(s["lyric_block"], mel)
        break

    c["lyrics"] = [{"section_id": sec["id"], "lines": sec.get("lyric_block", "").split("\n")} for sec in sections]
    c["melody"] = [e for sec in sections for e in sec.get("melody_line", [])]
    return c


def premium_refine_title_moment(song: Dict[str, Any]) -> Dict[str, Any]:
    """Strengthen title placement in chorus. Do not globally rewrite."""
    return premium_refine_hook_line(song)


def premium_refine_signature_phrase(song: Dict[str, Any]) -> Dict[str, Any]:
    """Intensify the song's signature moment. Chorus peak, distinctive line."""
    c = deepcopy(song)
    sections = c.get("sections", [])
    choruses = [s for s in sections if s.get("section_role") == "chorus"]
    if choruses:
        for ch in choruses:
            e = ch.get("energy_level", 0.75)
            ch["energy_level"] = min(0.95, e + 0.03)
    return c


def premium_reduce_generic_lines(song: Dict[str, Any]) -> Dict[str, Any]:
    """Remove or shorten one or two generic lines. Preserve asymmetry."""
    c = deepcopy(song)
    sections = c.get("sections", [])
    for s in sections:
        if s.get("section_role") == "verse":
            block = s.get("lyric_block", "")
            lines = block.split("\n")
            new_lines = []
            removed = 0
            for line in lines:
                lower = line.lower()
                if removed < 2 and any(p in lower for p in GENERIC_PATTERNS) and len(line) > 45:
                    words = line.split()
                    if len(words) > 6:
                        new_lines.append(" ".join(words[:4]))
                        removed += 1
                        continue
                new_lines.append(line)
            if new_lines != lines:
                s["lyric_block"] = "\n".join(new_lines)
                mel = s.get("melody_line", [])
                if mel:
                    s["melody_line"] = align_syllables_to_melody(s["lyric_block"], mel)
            break

    c["lyrics"] = [{"section_id": sec["id"], "lines": sec.get("lyric_block", "").split("\n")} for sec in sections]
    c["melody"] = [e for sec in sections for e in sec.get("melody_line", [])]
    return c


def premium_refine_finalist(song: Dict[str, Any]) -> Dict[str, Any]:
    """
    Full premium refinement: hook line, title moment, signature phrase, reduce generic.
    Preserve asymmetry. Do not globally rewrite.
    """
    s = song
    s = premium_refine_hook_line(s)
    s = premium_refine_title_moment(s)
    s = premium_refine_signature_phrase(s)
    s = premium_reduce_generic_lines(s)
    return s
