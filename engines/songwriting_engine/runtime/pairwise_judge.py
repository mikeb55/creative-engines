"""
Pairwise Judge — Tournament-style comparison for final winner selection.
Aligned to 9+ criteria: standout_factor, quotable_hook, afterglow, signature_moment.
"""

from typing import Any, Dict, List, Optional

try:
    from .identity_scoring import identity_score, chorus_dominance_score, premise_integrity_score
    from .standout_factor import score_standout_factor, score_quotable_hook, score_afterglow, score_signature_moment
except ImportError:
    from identity_scoring import identity_score, chorus_dominance_score, premise_integrity_score
    from standout_factor import score_standout_factor, score_quotable_hook, score_afterglow, score_signature_moment


def compare_hooks(hook_a: Dict[str, Any], hook_b: Dict[str, Any], title: Optional[str] = None) -> int:
    """
    Compare two hooks. Returns 1 if A wins, -1 if B wins, 0 if tie.
    Questions: more memorable? title lands more naturally? more distinctive?
    """
    sa = _hook_compare_score(hook_a, title)
    sb = _hook_compare_score(hook_b, title)
    if sa > sb:
        return 1
    if sb > sa:
        return -1
    return 0


def _hook_compare_score(hook: Dict[str, Any], title: Optional[str] = None) -> float:
    s = 0.0
    if title and title.lower() in hook.get("title_line", "").lower():
        s += 2.0
    if len(hook.get("chorus_melody_idea", [])) >= 6:
        s += 0.5
    if hook.get("motif_cell"):
        s += 0.5
    if hook.get("image_premise_link"):
        s += 0.3
    s += hook.get("energy_level", 0.5) * 0.5
    return s


def compare_songs(song_a: Dict[str, Any], song_b: Dict[str, Any]) -> int:
    """
    Compare two songs. Returns 1 if A wins, -1 if B wins, 0 if tie.
    Aligned to 9+ criteria: standout_factor, quotable_hook, afterglow, signature_moment.
    Structural competence as sanity check, not main criterion.
    """
    sa = _song_compare_score(song_a)
    sb = _song_compare_score(song_b)
    if sa > sb:
        return 1
    if sb > sa:
        return -1
    return 0


def _song_compare_score(song: Dict[str, Any]) -> float:
    s = 0.0
    standout = score_standout_factor(song)
    quotable = score_quotable_hook(song)
    afterglow = score_afterglow(song)
    signature = score_signature_moment(song)
    s += standout * 0.35
    s += quotable * 0.25
    s += afterglow * 0.15
    s += signature * 0.15
    scores = song.get("evaluation_scores", {})
    structural = scores.get("section_role_clarity", 5) * 0.05
    s += structural
    return s


def run_pairwise_tournament(candidates: List[Dict[str, Any]], is_hooks: bool = False) -> Dict[str, Any]:
    """
    Run round-robin pairwise tournament. Return winner.
    For hooks, use compare_hooks; for songs, use compare_songs.
    """
    if not candidates:
        return None
    if len(candidates) == 1:
        return candidates[0]

    wins = [0] * len(candidates)
    for i in range(len(candidates)):
        for j in range(i + 1, len(candidates)):
            if is_hooks:
                result = compare_hooks(candidates[i], candidates[j])
            else:
                result = compare_songs(candidates[i], candidates[j])
            if result > 0:
                wins[i] += 1
            elif result < 0:
                wins[j] += 1

    best_idx = max(range(len(wins)), key=lambda k: wins[k])
    return candidates[best_idx]
