"""
Population Generator — Evolutionary search for stronger songs.
Generate population, evaluate, select elites, mutate, recombine, iterate.
"""

import random
from copy import deepcopy
from typing import Any, Dict, List, Optional, Tuple

POPULATION_SIZE = 12
ELITE_COUNT = 3
GENERATIONS = 4
MUTATION_RATE = 0.25

try:
    from .song_generator import SongGenerator
    from .evaluation_adapter import (
        EvaluationAdapter,
        CHORUS_DOMINANCE_THRESHOLD,
        PREMISE_INTEGRITY_MIN,
    )
    from .identity_scoring import genericness_penalty
    from .editorial_refinement import (
        sharpen_chorus_hook,
        compress_weak_lyric_line,
        reinforce_motif_recurrence,
        strengthen_bridge_contrast,
        clarify_title_placement,
        reinforce_song_identity,
    )
    from .repair_engine import RepairEngine
    from .melody_generator import (
        generate_motifs,
        generate_melody_for_section,
        generate_harmonic_outline,
        MAX_MOTIFS,
        _clamp_pitch,
    )
    from .lyric_generator import generate_lyrics_for_section, align_syllables_to_melody
    from .hook_generator import place_hooks_in_sections
    from .song_identity import (
        create_identity,
        update_identity_after_section,
        get_identity_for_lyrics,
        get_identity_for_chorus,
    )
    from .songwriting_intelligence import choose_progression_by_section
    from .section_generator import ENERGY_BY_ROLE, generate_sections, STRUCTURE_TEMPLATES
    from .hook_search import generate_hook_candidates, score_hook_candidate, select_hook_elites
    from .hook_lanes import get_top_per_lane, assign_hook_to_lane
    from .song_from_hook import build_song_from_hook
    from .novelty_tools import population_replaceability_penalty, hook_replaceability_penalty
    from .pairwise_judge import run_pairwise_tournament
    from .editorial_selector import editorial_rank_candidates, compute_structural_health, compute_identity_strength
    from .hook_final_filter import hook_final_filter
    from .editorial_refinement import apply_editorial_repair_passes
    from .premium_finalist_refinement import select_premium_finalists, premium_refine_finalist
    from .nine_plus_selector import is_nine_plus_candidate, rank_nine_plus_candidates
except ImportError:
    from song_generator import SongGenerator
    from evaluation_adapter import (
        EvaluationAdapter,
        CHORUS_DOMINANCE_THRESHOLD,
        PREMISE_INTEGRITY_MIN,
    )
    from identity_scoring import genericness_penalty
    from editorial_refinement import (
        sharpen_chorus_hook,
        compress_weak_lyric_line,
        reinforce_motif_recurrence,
        strengthen_bridge_contrast,
        clarify_title_placement,
        reinforce_song_identity,
    )
    from repair_engine import RepairEngine
    from melody_generator import (
        generate_motifs,
        generate_melody_for_section,
        generate_harmonic_outline,
        MAX_MOTIFS,
        _clamp_pitch,
    )
    from lyric_generator import generate_lyrics_for_section, align_syllables_to_melody
    from hook_generator import place_hooks_in_sections
    from song_identity import (
        create_identity,
        update_identity_after_section,
        get_identity_for_lyrics,
        get_identity_for_chorus,
    )
    from songwriting_intelligence import choose_progression_by_section
    from section_generator import ENERGY_BY_ROLE, generate_sections, STRUCTURE_TEMPLATES
    from hook_search import generate_hook_candidates, score_hook_candidate, select_hook_elites
    from hook_lanes import get_top_per_lane, assign_hook_to_lane
    from song_from_hook import build_song_from_hook
    from novelty_tools import population_replaceability_penalty, hook_replaceability_penalty
    from pairwise_judge import run_pairwise_tournament
    from editorial_selector import editorial_rank_candidates, compute_structural_health, compute_identity_strength
    from hook_final_filter import hook_final_filter
    from editorial_refinement import apply_editorial_repair_passes
    from premium_finalist_refinement import select_premium_finalists, premium_refine_finalist
    from nine_plus_selector import is_nine_plus_candidate, rank_nine_plus_candidates


def _refresh_hooks(candidate: Dict[str, Any], seed: int) -> None:
    """Refresh hook_locations from sections."""
    sections = candidate.get("sections", [])
    title = candidate.get("title", "")
    tempo = 90
    sections, hook_locations = place_hooks_in_sections(sections, title, tempo, seed)
    candidate["sections"] = sections
    candidate["hook_locations"] = hook_locations


def _passes_hard_gates(candidate: Dict[str, Any]) -> bool:
    """Anti-mush, clarity, identity coherence, chorus dominance gate."""
    motifs = candidate.get("motifs", [])
    if len(motifs) > MAX_MOTIFS:
        return False
    scores = candidate.get("evaluation_scores", {})
    if scores.get("clarity_score", 10) < 4:
        return False
    if scores.get("identity_coherence", 5) < 3 and candidate.get("song_identity"):
        return False
    if scores.get("chorus_dominance", 10) < CHORUS_DOMINANCE_THRESHOLD:
        return False
    if scores.get("premise_integrity", 10) < PREMISE_INTEGRITY_MIN:
        return False
    return True


def _effective_final_editorial_score(c: Dict[str, Any], population: List[Dict[str, Any]]) -> float:
    """Final editorial score minus genericness penalty for winner selection."""
    base = c.get("evaluation_scores", {}).get("final_editorial_score", 0)
    return base - genericness_penalty(c, population)


def _identity_first_rank(
    candidates: List[Dict[str, Any]],
    population: Optional[List[Dict[str, Any]]] = None,
) -> List[Dict[str, Any]]:
    """Rank by identity_score first, then effective final_editorial_score. Only candidates passing gates."""
    gate_pass = [c for c in candidates if _passes_hard_gates(c)]
    if not gate_pass:
        gate_pass = candidates
    pop = population or candidates

    def key_fn(c):
        ed = _effective_final_editorial_score(c, pop)
        return (
            c.get("evaluation_scores", {}).get("identity_score", 0),
            ed,
            c.get("evaluation_scores", {}).get("overall", 0),
        )

    return sorted(gate_pass, key=key_fn, reverse=True)


def _effective_search_score(c: Dict[str, Any], population: List[Dict[str, Any]]) -> float:
    """Search score minus genericness penalty for ranking."""
    base = c.get("evaluation_scores", {}).get("search_score", 0)
    return base - genericness_penalty(c, population)


def _rank_candidates(
    candidates: List[Dict[str, Any]],
    use_search: bool = False,
    population: Optional[List[Dict[str, Any]]] = None,
) -> List[Dict[str, Any]]:
    """Rank: during search use search_score - genericness (permissive); at end use identity-first (gated)."""
    if use_search:
        pop = population or candidates
        return sorted(candidates, key=lambda c: _effective_search_score(c, pop), reverse=True)
    return _identity_first_rank(candidates, population=population or candidates)




def mutate_melody(candidate: Dict[str, Any], seed: int) -> Dict[str, Any]:
    """Alter contour, peak placement, motif ending; compress/expand motif."""
    c = deepcopy(candidate)
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
    harm = s.get("harmonic_outline") or generate_harmonic_outline(s, key_center, bars, seed)
    s["harmonic_outline"] = harm
    lyric_id = get_identity_for_chorus(identity) if s.get("section_role") == "chorus" else get_identity_for_lyrics(identity)
    mel = generate_melody_for_section(s, motifs, vocal_target, bars, harm, seed + 1, song_identity=lyric_id)
    s["melody_line"] = align_syllables_to_melody(s.get("lyric_block", ""), mel)

    c["melody"] = [e for sec in c["sections"] for e in sec.get("melody_line", [])]
    return c


def mutate_lyrics(candidate: Dict[str, Any], seed: int) -> Dict[str, Any]:
    """Strengthen title integration; swap image family; tighten line economy."""
    c = deepcopy(candidate)
    random.seed(seed)
    sections = c.get("sections", [])
    identity = c.get("song_identity", {})
    title = c.get("title", "")
    lyric_theme = c.get("lyric_theme", "love") or "love"

    idx = random.randint(0, len(sections) - 1) if sections else 0
    s = sections[idx]
    mel = s.get("melody_line", [])
    subtext = "oblique" if s.get("section_role") == "bridge" else "balanced"
    lyric_id = get_identity_for_chorus(identity) if s.get("section_role") == "chorus" else get_identity_for_lyrics(identity)
    new_lyrics = generate_lyrics_for_section(s, mel, title, lyric_theme, subtext, seed, song_identity=lyric_id)
    s["lyric_block"] = new_lyrics
    s["melody_line"] = align_syllables_to_melody(new_lyrics, mel)
    identity = update_identity_after_section(identity, s, new_lyrics)
    c["song_identity"] = identity
    c["lyrics"] = [{"section_id": sec["id"], "lines": sec.get("lyric_block", "").split("\n")} for sec in c["sections"]]
    c["melody"] = [e for sec in c["sections"] for e in sec.get("melody_line", [])]
    return c


def mutate_harmony(candidate: Dict[str, Any], seed: int) -> Dict[str, Any]:
    """Swap progression from section-appropriate library."""
    c = deepcopy(candidate)
    random.seed(seed)
    key_center = c.get("key_center", "C")
    sections = c.get("sections", [])

    idx = random.randint(0, len(sections) - 1) if sections else 0
    s = sections[idx]
    bars = s["bar_end"] - s["bar_start"]
    bar_start = s.get("bar_start", 0)
    role = s.get("section_role", "verse")
    prog = choose_progression_by_section(role, key_center, seed)
    harm = [{"symbol": prog[m % len(prog)], "measure": bar_start + m, "beat_position": 0, "duration": 4} for m in range(bars)]
    s["harmonic_outline"] = harm

    all_harmony = []
    for sec in c["sections"]:
        all_harmony.extend(sec.get("harmonic_outline", []))
    c["harmony"] = all_harmony
    return c


EDITORIAL_PASSES = [
    ("sharpen_chorus_hook", sharpen_chorus_hook),
    ("compress_weak_lyric_line", compress_weak_lyric_line),
    ("reinforce_motif_recurrence", reinforce_motif_recurrence),
    ("strengthen_bridge_contrast", strengthen_bridge_contrast),
    ("clarify_title_placement", clarify_title_placement),
]


def _editorial_pass(candidate: Dict[str, Any], pass_fn, seed: int) -> Dict[str, Any]:
    """Targeted refinement instead of random mutation. Preserves coherence."""
    return pass_fn(candidate, seed=seed)


def mutate_structure(candidate: Dict[str, Any], seed: int) -> Dict[str, Any]:
    """Strengthen bridge contrast; alter section energy ramp."""
    c = deepcopy(candidate)
    random.seed(seed)
    for s in c.get("sections", []):
        role = s.get("section_role", "verse")
        rng = ENERGY_BY_ROLE.get(role, (0.4, 0.6))
        s["energy_level"] = round(random.uniform(rng[0], rng[1]), 2)
    return c


def crossover(a: Dict[str, Any], b: Dict[str, Any], seed: int) -> Dict[str, Any]:
    """Melody from A + harmony from B; or chorus from A + verse from B."""
    random.seed(seed)
    mode = random.choice(["melody_harmony", "section_swap"])
    if mode == "melody_harmony":
        c = deepcopy(a)
        b_sections = b.get("sections", [])
        for i, sec in enumerate(c.get("sections", [])):
            if i < len(b_sections):
                b_sec = b_sections[i]
                if b_sec.get("bar_end", 0) - b_sec.get("bar_start", 0) == sec.get("bar_end", 0) - sec.get("bar_start", 0):
                    sec["harmonic_outline"] = deepcopy(b_sec.get("harmonic_outline", []))
        c["harmony"] = [h for sec in c["sections"] for h in sec.get("harmonic_outline", [])]
        return c
    else:
        c = deepcopy(a)
        b_sections = b.get("sections", [])
        for sec in c.get("sections", []):
            role = sec.get("section_role", "")
            bars = sec.get("bar_end", 0) - sec.get("bar_start", 0)
            if role == "chorus":
                b_chorus = next((s for s in b_sections if s.get("section_role") == "chorus"), None)
                if b_chorus and (b_chorus.get("bar_end", 0) - b_chorus.get("bar_start", 0)) == bars:
                    sec["melody_line"] = deepcopy(b_chorus.get("melody_line", []))
                    sec["lyric_block"] = b_chorus.get("lyric_block", "")
            elif role == "verse":
                b_verse = next((s for s in b_sections if s.get("section_role") == "verse"), None)
                if b_verse and (b_verse.get("bar_end", 0) - b_verse.get("bar_start", 0)) == bars:
                    sec["melody_line"] = deepcopy(b_verse.get("melody_line", []))
                    sec["lyric_block"] = b_verse.get("lyric_block", "")
        c["melody"] = [e for sec in c["sections"] for e in sec.get("melody_line", [])]
        c["lyrics"] = [{"section_id": sec["id"], "lines": sec.get("lyric_block", "").split("\n")} for sec in c["sections"]]
        return c


def run_hook_first_search(
    generator: SongGenerator,
    evaluator: EvaluationAdapter,
    repairer: Optional[RepairEngine],
    style_profiles: List[str],
    vocal_target: str,
    structure_type: str,
    lyric_theme: str,
    title: str,
    seed: str,
    hook_count: int = 24,
    hook_elite_count: int = 6,
    song_refinement_generations: int = 2,
    apply_repair_to_top: bool = True,
) -> Tuple[Dict[str, Any], List[float], Dict[str, Any]]:
    """
    Hook-first pipeline: generate hooks -> lanes -> elites -> build songs -> refine -> novelty -> pairwise.
    Returns (best_song, score_log, stats).
    """
    seed_int = int(seed) if seed.isdigit() else hash(seed) % 1000000
    random.seed(seed_int)
    stats = {
        "hook_avg_score": 0.0,
        "full_song_avg": 0.0,
        "full_song_avg_pre_repair": 0.0,
        "full_song_avg_post_repair": 0.0,
        "pairwise_winner_score": 0.0,
        "hook_dna_coherence_avg": 0.0,
        "section_role_clarity_avg": 0.0,
        "transition_flow_avg": 0.0,
        "contrast_arc_score_avg": 0.0,
        "chorus_arrival_score_avg": 0.0,
        "verse_development_score_avg": 0.0,
        "final_chorus_payoff_score_avg": 0.0,
        "identity_strength_avg": 0.0,
        "structural_health_avg": 0.0,
        "standout_factor_avg": 0.0,
        "afterglow_avg": 0.0,
        "quotable_hook_avg": 0.0,
        "nine_plus_count": 0,
    }

    hook_candidates = generate_hook_candidates(title=title, premise=lyric_theme, count=hook_count, seed=seed_int)
    for h in hook_candidates:
        base = score_hook_candidate(h, title)
        h["_hook_score"] = base - hook_replaceability_penalty(h, hook_candidates)

    adj_scores = [h.get("_hook_score", 5) for h in hook_candidates]
    lane_filtered = get_top_per_lane(hook_candidates, adj_scores, elite_per_lane=2)
    hook_elites = select_hook_elites(lane_filtered or hook_candidates, elite_count=hook_elite_count, title=title)
    stats["hook_avg_score"] = sum(score_hook_candidate(h, title) for h in hook_elites) / max(1, len(hook_elites))

    song_population = []
    for i, hook in enumerate(hook_elites):
        song = build_song_from_hook(
            hook, title=title, lyric_theme=lyric_theme, structure_type=structure_type,
            vocal_target=vocal_target, seed=seed_int + i * 5000,
        )
        result = evaluator.evaluate(song)
        song["evaluation_scores"] = result["scores"]
        song["warnings"] = result.get("warnings", {})
        song["_hook_dna"] = hook
        song_population.append(song)

    if not song_population:
        fallback = generator.generate(
            style_profiles=style_profiles or [], vocal_target=vocal_target,
            structure_type=structure_type, lyric_theme=lyric_theme, title=title, seed=str(seed_int),
        )
        r = evaluator.evaluate(fallback)
        fallback["evaluation_scores"] = r["scores"]
        return fallback, [r["scores"].get("overall", 7.0)], stats

    for c in song_population:
        pen = population_replaceability_penalty(c, song_population)
        ed = c.get("evaluation_scores", {}).get("final_editorial_score", 5)
        c["evaluation_scores"]["final_editorial_score"] = max(0, ed - pen)

    score_log = [max(c.get("evaluation_scores", {}).get("overall", 0) for c in song_population)]
    stats["full_song_avg"] = sum(c.get("evaluation_scores", {}).get("overall", 0) for c in song_population) / len(song_population)
    stats["full_song_avg_pre_repair"] = stats["full_song_avg"]
    stats["hook_dna_coherence_avg"] = sum(c.get("evaluation_scores", {}).get("hook_dna_coherence", 5) for c in song_population) / len(song_population)
    stats["section_role_clarity_avg"] = sum(c.get("evaluation_scores", {}).get("section_role_clarity", 5) for c in song_population) / len(song_population)
    stats["transition_flow_avg"] = sum(c.get("evaluation_scores", {}).get("transition_flow", 5) for c in song_population) / len(song_population)
    stats["contrast_arc_score_avg"] = sum(c.get("evaluation_scores", {}).get("contrast_arc_score", 5) for c in song_population) / len(song_population)
    stats["chorus_arrival_score_avg"] = sum(c.get("evaluation_scores", {}).get("chorus_arrival_score", 5) for c in song_population) / len(song_population)
    stats["verse_development_score_avg"] = sum(c.get("evaluation_scores", {}).get("verse_development_score", 5) for c in song_population) / len(song_population)
    stats["final_chorus_payoff_score_avg"] = sum(c.get("evaluation_scores", {}).get("final_chorus_payoff_score", 5) for c in song_population) / len(song_population)

    refined = []
    for c in song_population[:6]:
        r = apply_editorial_repair_passes(c, seed=seed_int + 7000, evaluator=evaluator)
        _refresh_hooks(r, seed_int + 7000)
        res = evaluator.evaluate(r)
        r["evaluation_scores"] = res["scores"]
        refined.append(r)

    if refined:
        stats["full_song_avg_post_repair"] = sum(c.get("evaluation_scores", {}).get("overall", 0) for c in refined) / len(refined)
        stats["identity_strength_avg"] = sum(compute_identity_strength(c) for c in refined) / len(refined)
        stats["structural_health_avg"] = sum(compute_structural_health(c) for c in refined) / len(refined)

    filtered = [c for c in refined if compute_structural_health(c) >= 3.5]
    if not filtered:
        filtered = refined
    hook_filtered = hook_final_filter(filtered)
    ranked = editorial_rank_candidates(hook_filtered)
    premium = select_premium_finalists(ranked, top_n=3)
    for p in premium:
        p_refined = premium_refine_finalist(p)
        _refresh_hooks(p_refined, seed_int + 8000)
        res = evaluator.evaluate(p_refined)
        p_refined["evaluation_scores"] = res["scores"]
        idx = next((i for i, c in enumerate(ranked) if c is p), None)
        if idx is not None:
            ranked[idx] = p_refined
    nine_plus = [c for c in ranked if is_nine_plus_candidate(c, song_population)]
    stats["nine_plus_count"] = len(nine_plus)
    pool = ranked[:6] if ranked else refined
    if pool:
        stats["standout_factor_avg"] = sum(c.get("evaluation_scores", {}).get("standout_factor", 5) for c in pool) / len(pool)
        stats["afterglow_avg"] = sum(c.get("evaluation_scores", {}).get("afterglow", 5) for c in pool) / len(pool)
        stats["quotable_hook_avg"] = sum(c.get("evaluation_scores", {}).get("quotable_hook", 5) for c in pool) / len(pool)
    finalists_ranked = rank_nine_plus_candidates(ranked[:6], song_population)
    finalists = finalists_ranked[:4] if finalists_ranked else ranked[:4]
    best = run_pairwise_tournament(finalists, is_hooks=False)
    if best:
        res = evaluator.evaluate(best)
        best["evaluation_scores"] = res["scores"]
        score_log.append(best.get("evaluation_scores", {}).get("overall", 0))
        stats["pairwise_winner_score"] = best.get("evaluation_scores", {}).get("overall", 0)

    if apply_repair_to_top and repairer and best:
        triggers = evaluator.evaluate(best).get("repair_triggers", [])
        if triggers:
            repaired = repairer.repair(best, triggers[:3], seed_int)
            if repaired:
                r_res = evaluator.evaluate(repaired)
                repaired["evaluation_scores"] = r_res["scores"]
                if r_res["scores"].get("overall", 0) > best.get("evaluation_scores", {}).get("overall", 0):
                    best = repaired
                    score_log[-1] = best.get("evaluation_scores", {}).get("overall", 0)

    best = best or song_population[0]
    best["_score_log"] = score_log
    best["_hook_first"] = True
    return best, score_log, stats


def run_population_search(
    generator: SongGenerator,
    evaluator: EvaluationAdapter,
    repairer: Optional[RepairEngine],
    style_profiles: List[str],
    vocal_target: str,
    structure_type: str,
    lyric_theme: str,
    title: str,
    seed: str,
    population_size: int = POPULATION_SIZE,
    elite_count: int = ELITE_COUNT,
    generations: int = GENERATIONS,
    mutation_rate: float = MUTATION_RATE,
    apply_repair_to_top: bool = True,
) -> Tuple[Dict[str, Any], List[float]]:
    """Run evolutionary search. Return best candidate and score log."""
    seed_int = int(seed) if seed.isdigit() else hash(seed) % 1000000
    random.seed(seed_int)

    population = []
    for i in range(population_size):
        s = str(seed_int + i * 10000)
        cand = generator.generate(
            style_profiles=style_profiles,
            vocal_target=vocal_target,
            structure_type=structure_type,
            lyric_theme=lyric_theme,
            title=title,
            seed=s,
        )
        result = evaluator.evaluate(cand)
        cand["evaluation_scores"] = result["scores"]
        cand["warnings"] = result.get("warnings", {})
        population.append(cand)

    score_log = []
    editorial_mode_start = max(2, generations - 2)
    for gen in range(generations - 1):
        use_search = gen < editorial_mode_start
        ranked = _rank_candidates(population, use_search=use_search, population=population)
        score_log.append(ranked[0].get("evaluation_scores", {}).get("overall", 0))
        elites = ranked[:elite_count]

        next_pop = list(elites)
        use_editorial = gen >= editorial_mode_start
        while len(next_pop) < population_size:
            mut_seed = seed_int + gen * 1000 + len(next_pop) * 100
            if random.random() < mutation_rate and elites:
                parent = random.choice(elites)
                if use_editorial:
                    _, pass_fn = random.choice(EDITORIAL_PASSES)
                    child = _editorial_pass(parent, pass_fn, mut_seed)
                else:
                    mut_type = random.choice(["melody", "lyrics", "harmony", "structure"])
                    if mut_type == "melody":
                        child = mutate_melody(parent, mut_seed)
                    elif mut_type == "lyrics":
                        child = mutate_lyrics(parent, mut_seed)
                    elif mut_type == "harmony":
                        child = mutate_harmony(parent, mut_seed)
                    else:
                        child = mutate_structure(parent, mut_seed)
            elif len(elites) >= 2:
                a, b = random.sample(elites, 2)
                child = crossover(a, b, seed_int + gen * 1000 + len(next_pop))
            else:
                parent = elites[0] if elites else population[0]
                child = deepcopy(parent)

            _refresh_hooks(child, seed_int + gen * 1000 + len(next_pop))
            result = evaluator.evaluate(child)
            child["evaluation_scores"] = result["scores"]
            child["warnings"] = result.get("warnings", {})
            next_pop.append(child)

        population = next_pop

    ranked = _rank_candidates(population, use_search=False, population=population)
    best = ranked[0]
    score_log.append(best.get("evaluation_scores", {}).get("overall", 0))

    best = reinforce_song_identity(best, seed=seed_int + 8000)
    _refresh_hooks(best, seed_int + 8000)
    r0 = evaluator.evaluate(best)
    best["evaluation_scores"] = r0["scores"]

    refinements = [best]
    for i, (_, pass_fn) in enumerate(EDITORIAL_PASSES):
        refined = pass_fn(best, seed=seed_int + 9000 + i)
        _refresh_hooks(refined, seed_int + 9000 + i)
        r_result = evaluator.evaluate(refined)
        refined["evaluation_scores"] = r_result["scores"]
        if _passes_hard_gates(refined):
            refinements.append(refined)
    by_ed = sorted(refinements, key=lambda c: (
        c.get("evaluation_scores", {}).get("identity_score", 0),
        c.get("evaluation_scores", {}).get("final_editorial_score", 0),
        c.get("evaluation_scores", {}).get("overall", 0),
    ), reverse=True)
    best = by_ed[0]
    score_log[-1] = best.get("evaluation_scores", {}).get("overall", 0)

    if apply_repair_to_top and repairer and ranked:
        result = evaluator.evaluate(best)
        triggers = result.get("repair_triggers", [])
        if triggers:
            repaired = repairer.repair(best, triggers[:3], seed_int)
            if repaired:
                r_result = evaluator.evaluate(repaired)
                repaired["evaluation_scores"] = r_result["scores"]
                if r_result["scores"].get("overall", 0) > best.get("evaluation_scores", {}).get("overall", 0):
                    best = repaired
                    score_log[-1] = best.get("evaluation_scores", {}).get("overall", 0)

    best["_score_log"] = score_log
    best["_population_generations"] = generations
    return best, score_log
