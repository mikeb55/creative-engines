#!/usr/bin/env python3
"""Smoke test: run 24+ hook-first generations and report GCE scores."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from songwriting_engine_runtime import load_rule_package, generate_song

TITLES = [
    "River Road", "Dawn Breaks", "Edge of Night", "Window Light", "Street Rain",
    "Bridge to You", "Train at Dawn", "Empty Platform", "Glass and Rain", "Light the Way",
    "Silver Lining", "Broken Glass", "Cold Morning", "Last Train", "Open Door",
    "Fading Light", "Quiet Storm", "Halfway Home", "Paper Moon", "Wide Awake",
    "Midnight Drive", "Hold the Line", "Quiet Fire", "Second Chance",
]

def main():
    load_rule_package()
    n = 24
    print(f"Songwriting Engine — Smoke Test ({n} hook-first generations)")
    print("-" * 50)
    scores = []
    hook_avgs = []
    full_avgs = []
    full_avgs_pre = []
    full_avgs_post = []
    pairwise_scores = []
    dna_coherence = []
    role_clarity = []
    transition_flow = []
    contrast_arc = []
    chorus_arrival = []
    verse_dev = []
    final_chorus_payoff = []
    identity_strength = []
    structural_health = []
    standout_factor = []
    afterglow = []
    quotable_hook = []
    nine_plus_count = []
    for i in range(n):
        seed = str(4000 + i * 111)
        c = generate_song(
            style_profiles=[],
            song_seed=seed,
            structure_type="short",
            title=TITLES[i],
            use_population_search=True,
            use_hook_first=True,
        )
        s = c.get("evaluation_scores", {}).get("overall", 0)
        scores.append(s)
        stats = c.get("_hook_first_stats", {})
        hook_avgs.append(stats.get("hook_avg_score", 0))
        full_avgs.append(stats.get("full_song_avg", 0))
        full_avgs_pre.append(stats.get("full_song_avg_pre_repair", stats.get("full_song_avg", 0)))
        full_avgs_post.append(stats.get("full_song_avg_post_repair", stats.get("full_song_avg", 0)))
        pairwise_scores.append(stats.get("pairwise_winner_score", s))
        dna_coherence.append(stats.get("hook_dna_coherence_avg", c.get("evaluation_scores", {}).get("hook_dna_coherence", 5)))
        role_clarity.append(stats.get("section_role_clarity_avg", c.get("evaluation_scores", {}).get("section_role_clarity", 5)))
        transition_flow.append(stats.get("transition_flow_avg", c.get("evaluation_scores", {}).get("transition_flow", 5)))
        contrast_arc.append(stats.get("contrast_arc_score_avg", c.get("evaluation_scores", {}).get("contrast_arc_score", 5)))
        chorus_arrival.append(stats.get("chorus_arrival_score_avg", c.get("evaluation_scores", {}).get("chorus_arrival_score", 5)))
        verse_dev.append(stats.get("verse_development_score_avg", c.get("evaluation_scores", {}).get("verse_development_score", 5)))
        final_chorus_payoff.append(stats.get("final_chorus_payoff_score_avg", c.get("evaluation_scores", {}).get("final_chorus_payoff_score", 5)))
        identity_strength.append(stats.get("identity_strength_avg", 5))
        structural_health.append(stats.get("structural_health_avg", 5))
        standout_factor.append(stats.get("standout_factor_avg", 5))
        afterglow.append(stats.get("afterglow_avg", 5))
        quotable_hook.append(stats.get("quotable_hook_avg", 5))
        nine_plus_count.append(stats.get("nine_plus_count", 0))
        print(f"  Run {i+1:2d} (seed={seed}): best={s}")
    avg = sum(scores) / len(scores) if scores else 0
    print("-" * 50)
    print(f"  Average best: {avg:.2f}")
    print(f"  Min: {min(scores):.2f}, Max: {max(scores):.2f}")
    print(f"  Highest score reached: {max(scores):.2f}")
    if hook_avgs:
        print(f"  Hook-only average: {sum(hook_avgs)/len(hook_avgs):.2f}")
    if full_avgs:
        print(f"  Full-song average (pre-repair): {sum(full_avgs_pre)/len(full_avgs_pre):.2f}")
        print(f"  Full-song average (post-repair): {sum(full_avgs_post)/len(full_avgs_post):.2f}")
    if pairwise_scores:
        print(f"  Final selected average: {sum(pairwise_scores)/len(pairwise_scores):.2f}")
    if dna_coherence:
        print(f"  Average hook_dna_coherence: {sum(dna_coherence)/len(dna_coherence):.2f}")
    if role_clarity:
        print(f"  Average section_role_clarity: {sum(role_clarity)/len(role_clarity):.2f}")
    if transition_flow:
        print(f"  Average transition_flow: {sum(transition_flow)/len(transition_flow):.2f}")
    if contrast_arc:
        print(f"  Average contrast_arc_score: {sum(contrast_arc)/len(contrast_arc):.2f}")
    if chorus_arrival:
        print(f"  Average chorus_arrival_score: {sum(chorus_arrival)/len(chorus_arrival):.2f}")
    if verse_dev:
        print(f"  Average verse_development_score: {sum(verse_dev)/len(verse_dev):.2f}")
    if final_chorus_payoff:
        print(f"  Average final_chorus_payoff_score: {sum(final_chorus_payoff)/len(final_chorus_payoff):.2f}")
    if identity_strength:
        print(f"  Average identity_strength: {sum(identity_strength)/len(identity_strength):.2f}")
    if structural_health:
        print(f"  Average structural_health: {sum(structural_health)/len(structural_health):.2f}")
    if standout_factor:
        print(f"  Average standout_factor: {sum(standout_factor)/len(standout_factor):.2f}")
    if afterglow:
        print(f"  Average afterglow: {sum(afterglow)/len(afterglow):.2f}")
    if quotable_hook:
        print(f"  Average quotable_hook: {sum(quotable_hook)/len(quotable_hook):.2f}")
    if nine_plus_count:
        print(f"  Nine-plus candidates found (total): {sum(nine_plus_count)}")
    print(f"  Previous average: 8.17, best: 8.20")
    print(f"  Target: average >= 8.5, best >= 9")

if __name__ == "__main__":
    main()
