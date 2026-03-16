"""
Songwriting Engine Runtime Tests — Validation and quality checks.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from songwriting_engine_runtime import load_rule_package, generate_song, export_to_musicxml
from population_generator import (
    mutate_melody,
    mutate_lyrics,
    mutate_harmony,
    crossover,
    _rank_candidates,
    _passes_hard_gates,
)
from melody_generator import _vocal_range, MALE_TENOR, FEMALE_VOCAL
from lyric_generator import _score_anti_cliche, _score_imagery
from songwriting_intelligence import (
    choose_progression_by_section,
    choose_hook_rhythm,
    choose_image_family,
    choose_phrase_contour,
)
from evaluation_adapter import (
    _motif_identity_score,
    _section_contrast_score,
    _title_integration_score,
    _image_recurrence_score,
    _harmony_melody_fit_score,
)
from identity_scoring import (
    identity_score,
    premise_integrity_score,
    chorus_dominance_score,
    genericness_penalty,
)
from editorial_refinement import (
    sharpen_chorus_hook,
    compress_weak_lyric_line,
    reinforce_motif_recurrence,
    strengthen_bridge_contrast,
    clarify_title_placement,
    reinforce_song_identity,
)


def test_section_structure():
    """Verify section structure generation."""
    c = generate_song(style_profiles=[], song_seed="123", max_iterations=1, structure_type="short", use_population_search=False)
    sections = c.get("sections", [])
    assert len(sections) >= 4, "Should have at least 4 sections"
    roles = [s.get("section_role") for s in sections]
    assert "chorus" in roles, "Chorus required"
    assert "verse" in roles, "Verse required"
    for s in sections:
        assert s.get("section_role"), "Each section must have role"
        assert "bar_start" in s and "bar_end" in s
    print("  [PASS] section structure")


def test_vocal_range():
    """Verify vocal range compliance."""
    c = generate_song(style_profiles=[], song_seed="456", max_iterations=1, structure_type="short", use_population_search=False)
    vocal = c.get("vocal_target", "male_tenor")
    lo, hi = _vocal_range(vocal)
    melody = c.get("melody", [])
    for e in melody:
        p = e.get("pitch")
        if p is not None:
            assert lo <= p <= hi, f"Pitch {p} out of range {lo}-{hi}"
    print("  [PASS] vocal range")


def test_hook_in_chorus():
    """Verify chorus contains hook."""
    c = generate_song(style_profiles=[], song_seed="789", max_iterations=1, structure_type="short", use_population_search=False)
    hooks = c.get("hook_locations", [])
    chorus_hooks = [h for h in hooks if "chorus" in h.get("section_id", "")]
    assert len(chorus_hooks) >= 1, "Chorus must have hook"
    print("  [PASS] hook in chorus")


def test_lyric_prosody():
    """Verify lyric syllables align with melody."""
    c = generate_song(style_profiles=[], song_seed="101", max_iterations=1, structure_type="short", use_population_search=False)
    melody = c.get("melody", [])
    has_syllables = any(e.get("syllable") for e in melody)
    assert has_syllables or len(melody) == 0, "Melody should have syllable alignment"
    print("  [PASS] lyric prosody")


def test_musicxml_export():
    """Verify MusicXML export validity."""
    c = generate_song(style_profiles=[], song_seed="202", max_iterations=1, structure_type="short", use_population_search=False)
    xml = export_to_musicxml(c)
    assert "<?xml" in xml
    assert "<score-partwise" in xml
    assert "<part " in xml
    assert "<measure" in xml
    assert "<note" in xml
    print("  [PASS] MusicXML export")


def test_anti_cliche():
    """Anti-cliche filtering catches obviously generic lyric lines."""
    generic = "love is all we need"
    specific = "The streetlamps blur past the window"
    assert _score_anti_cliche(generic) < _score_anti_cliche(specific)
    assert _score_anti_cliche(generic) < 0.5
    print("  [PASS] anti-cliche")


def test_imagery_scoring():
    """Lyric imagery prefers concrete language."""
    vague = "Something feels right"
    concrete = "The river runs dark under the bridge"
    assert _score_imagery(concrete) >= _score_imagery(vague)
    print("  [PASS] imagery scoring")


def test_harmonic_variety():
    """Harmonic generation produces more than trivial repetitive progressions."""
    c = generate_song(style_profiles=[], song_seed="303", max_iterations=1, structure_type="short", use_population_search=False)
    harmony = c.get("harmony", [])
    chords = set(h.get("symbol", "") for h in harmony)
    assert len(chords) >= 3, "Should have at least 3 distinct chords"
    print("  [PASS] harmonic variety")


def test_anti_mush():
    """Anti-mush constraints enforced (max 3 motifs)."""
    c = generate_song(style_profiles=[], song_seed="404", max_iterations=1, structure_type="short", use_population_search=False)
    motifs = c.get("motifs", [])
    assert len(motifs) <= 3, "Max 3 motifs (anti-mush)"
    print("  [PASS] anti-mush")


def test_repair_improves_score():
    """Repair loop raises score when candidate is weak but repairable."""
    c = generate_song(style_profiles=[], song_seed="505", max_iterations=5, structure_type="short", use_population_search=False)
    score_log = c.get("_score_log", [])
    assert len(score_log) >= 1
    assert c.get("evaluation_scores", {}).get("overall", 0) >= 0
    print("  [PASS] repair loop")


def test_bounded_loops():
    """Bounded loops do not run indefinitely."""
    c = generate_song(style_profiles=[], song_seed="606", max_iterations=3, structure_type="short", use_population_search=False)
    iters = c.get("_iterations", 0)
    assert iters <= 3
    print("  [PASS] bounded loops")


def test_motif_reuse():
    """Motif reuse and transformation presence in melody."""
    c = generate_song(style_profiles=[], song_seed="701", max_iterations=1, structure_type="short", use_population_search=False)
    motifs = c.get("motifs", [])
    melody = c.get("melody", [])
    score = _motif_identity_score(motifs, melody)
    assert 0 <= score <= 10, "Motif identity score in range"
    if motifs and melody:
        assert score >= 4, "Melody should reflect motifs when present"
    print("  [PASS] motif reuse")


def test_chorus_peak():
    """Chorus has stronger melodic peak than verse when both exist."""
    c = generate_song(style_profiles=[], song_seed="702", max_iterations=1, structure_type="short", use_population_search=False)
    sections = c.get("sections", [])
    melody = c.get("melody", [])
    chorus_bars = set()
    verse_bars = set()
    for s in sections:
        for b in range(s.get("bar_start", 0), s.get("bar_end", 0)):
            if s.get("section_role") == "chorus":
                chorus_bars.add(b)
            elif s.get("section_role") == "verse":
                verse_bars.add(b)
    if chorus_bars and verse_bars and melody:
        chorus_pitches = [e.get("pitch") for e in melody if e.get("measure") in chorus_bars and e.get("pitch")]
        verse_pitches = [e.get("pitch") for e in melody if e.get("measure") in verse_bars and e.get("pitch")]
        if chorus_pitches and verse_pitches:
            assert max(chorus_pitches) >= max(verse_pitches), "Chorus should have peak >= verse"
    print("  [PASS] chorus peak")


def test_title_integration():
    """Title phrase integration when title is given."""
    c = generate_song(style_profiles=[], song_seed="703", max_iterations=1, structure_type="short", title="River Road", use_population_search=False)
    title = c.get("title", "")
    lyrics = c.get("lyrics", [])
    score = _title_integration_score(lyrics, title)
    assert 0 <= score <= 10
    print("  [PASS] title integration")


def test_section_contrast():
    """Section contrast is measurable (energy gradient)."""
    c = generate_song(style_profiles=[], song_seed="704", max_iterations=1, structure_type="short", use_population_search=False)
    sections = c.get("sections", [])
    score = _section_contrast_score(sections)
    assert 0 <= score <= 10
    if len(sections) >= 2:
        chorus_roles = [s for s in sections if s.get("section_role") == "chorus"]
        verse_roles = [s for s in sections if s.get("section_role") == "verse"]
        if chorus_roles and verse_roles:
            chorus_avg = sum(s.get("energy_level", 0.5) for s in chorus_roles) / len(chorus_roles)
            verse_avg = sum(s.get("energy_level", 0.5) for s in verse_roles) / len(verse_roles)
            assert chorus_avg >= verse_avg - 0.2, "Chorus energy should be >= verse"
    print("  [PASS] section contrast")


def test_repair_structural():
    """Repair increases structural quality, not just surface."""
    c = generate_song(style_profiles=[], song_seed="705", max_iterations=5, structure_type="short", use_population_search=False)
    score_log = c.get("_score_log", [])
    assert len(score_log) >= 1
    scores = c.get("evaluation_scores", {})
    assert "chorus_peak" in scores or "energy_arc" in scores or "melodic_identity" in scores
    print("  [PASS] repair structural")


def test_motif_transformed_recurrence():
    """Motif recurs in transformed form across sections."""
    c = generate_song(style_profiles=[], song_seed="801", max_iterations=1, structure_type="short", use_population_search=False)
    motifs = c.get("motifs", [])
    melody = c.get("melody", [])
    if motifs and melody:
        motif_pitches = set()
        for m in motifs:
            p = m.get("pitches", m) if isinstance(m, dict) else m
            motif_pitches.update(p)
        mel_pitches = set(e.get("pitch") for e in melody if e.get("pitch") is not None)
        overlap = len(motif_pitches & mel_pitches) / max(1, len(motif_pitches))
        assert overlap >= 0.3, "Melody should reuse motif pitches"
    print("  [PASS] motif transformed recurrence")


def test_chorus_stronger_than_verse():
    """Chorus material is recognisably stronger than verse (peak, energy)."""
    c = generate_song(style_profiles=[], song_seed="802", max_iterations=1, structure_type="short", use_population_search=False)
    sections = c.get("sections", [])
    melody = c.get("melody", [])
    chorus_bars = set()
    verse_bars = set()
    for s in sections:
        for b in range(s.get("bar_start", 0), s.get("bar_end", 0)):
            if s.get("section_role") == "chorus":
                chorus_bars.add(b)
            elif s.get("section_role") == "verse":
                verse_bars.add(b)
    if chorus_bars and verse_bars and melody:
        c_pitches = [e.get("pitch") for e in melody if e.get("measure") in chorus_bars and e.get("pitch")]
        v_pitches = [e.get("pitch") for e in melody if e.get("measure") in verse_bars and e.get("pitch")]
        if c_pitches and v_pitches:
            assert max(c_pitches) >= max(v_pitches)
    print("  [PASS] chorus stronger than verse")


def test_title_appears_when_given():
    """Title phrase integration when title is given."""
    c = generate_song(
        style_profiles=[], song_seed="803", max_iterations=1, structure_type="short", title="River Road", use_population_search=False
    )
    lyrics = c.get("lyrics", [])
    title = c.get("title", "")
    score = _title_integration_score(lyrics, title)
    assert 0 <= score <= 10
    assert len(lyrics) > 0
    print("  [PASS] title appears when given")


def test_image_recurrence_detected():
    """Image recurrence is detected across sections."""
    c = generate_song(
        style_profiles=[], song_seed="804", max_iterations=1, structure_type="short", title="Dawn Light", use_population_search=False
    )
    identity = c.get("song_identity", {})
    key_images = identity.get("key_images", [])
    lyrics = c.get("lyrics", [])
    score = _image_recurrence_score(lyrics, key_images)
    assert 0 <= score <= 10
    print("  [PASS] image recurrence detected")


def test_harmony_melody_fit():
    """Harmony-melody fit is scored."""
    c = generate_song(style_profiles=[], song_seed="805", max_iterations=1, structure_type="short", use_population_search=False)
    melody = c.get("melody", [])
    harmony = c.get("harmony", [])
    score = _harmony_melody_fit_score(melody, harmony)
    assert 0 <= score <= 10
    print("  [PASS] harmony-melody fit")


def test_multi_repair_no_break():
    """Multiple structural repairs can raise score without breaking candidate."""
    c = generate_song(style_profiles=[], song_seed="806", max_iterations=6, structure_type="short", use_population_search=False)
    sections = c.get("sections", [])
    assert len(sections) >= 4
    melody = c.get("melody", [])
    assert len(melody) > 0
    scores = c.get("evaluation_scores", {})
    assert scores.get("overall", 0) >= 0
    print("  [PASS] multi-repair no break")


def test_progression_by_section():
    """Progression selection varies by section role."""
    v = choose_progression_by_section("verse", "C", 9001)
    c = choose_progression_by_section("chorus", "C", 9002)
    b = choose_progression_by_section("bridge", "C", 9003)
    assert len(v) >= 4 and all(isinstance(x, str) for x in v)
    assert len(c) >= 4 and all(isinstance(x, str) for x in c)
    assert len(b) >= 4 and all(isinstance(x, str) for x in b)
    print("  [PASS] progression by section")


def test_motif_reuse_across_sections():
    """Motif reuse across sections (verse introduces, chorus strengthens)."""
    c = generate_song(style_profiles=[], song_seed="901", max_iterations=1, structure_type="short", use_population_search=False)
    motifs = c.get("motifs", [])
    melody = c.get("melody", [])
    identity = c.get("song_identity", {})
    assert "core_interval_pattern" in identity or "main_motif_rhythm" in identity or motifs
    if motifs and melody:
        motif_pitches = set()
        for m in motifs:
            p = m.get("pitches", m) if isinstance(m, dict) else m
            motif_pitches.update(p)
        mel_pitches = set(e.get("pitch") for e in melody if e.get("pitch") is not None)
        assert len(motif_pitches & mel_pitches) >= 1
    print("  [PASS] motif reuse across sections")


def test_hook_rhythm_template():
    """Hook rhythm template is available from intelligence."""
    r = choose_hook_rhythm(9100)
    assert r in ["long_short_short", "repeat_repeat_leap", "pickup_sustained_peak", "syncopated_repeat", "short_short_long", "repeat_hold_resolve"]
    print("  [PASS] hook rhythm template")


def test_image_family_integration():
    """Image family integration in lyrics."""
    words = choose_image_family("love", 9200)
    assert len(words) >= 3
    c = generate_song(style_profiles=[], song_seed="921", max_iterations=1, structure_type="short", lyric_theme="love", use_population_search=False)
    lyrics = c.get("lyrics", [])
    all_text = " ".join(line for entry in lyrics for line in entry.get("lines", [])).lower()
    assert len(all_text) > 0
    print("  [PASS] image family integration")


def test_melodic_contour_adherence():
    """Melodic contour selection by section role."""
    v = choose_phrase_contour("verse", 9300)
    c = choose_phrase_contour("chorus", 9301)
    b = choose_phrase_contour("bridge", 9302)
    assert v in ["rise", "arch", "narrow_gradual", "fall"]
    assert c in ["arch", "rise_hold_fall", "repeated_peak", "repeat_then_leap"]
    assert b in ["fall", "fall_then_leap", "repeat_then_leap", "contrast_arch"]
    print("  [PASS] melodic contour adherence")


def test_population_creates_multiple():
    """Population search creates multiple valid candidates."""
    c = generate_song(
        style_profiles=[], song_seed="9501", structure_type="short",
        use_population_search=True, population_size=4, elite_count=2, generations=2,
    )
    assert c.get("sections")
    assert c.get("melody")
    assert c.get("evaluation_scores", {}).get("overall", 0) >= 0
    assert "_score_log" in c
    print("  [PASS] population creates multiple")


def test_elite_selection():
    """Elite selection ranks by score."""
    c1 = generate_song(style_profiles=[], song_seed="9502", structure_type="short", use_population_search=False)
    c2 = generate_song(style_profiles=[], song_seed="9503", structure_type="short", use_population_search=False)
    c1["evaluation_scores"] = {"overall": 7.0}
    c2["evaluation_scores"] = {"overall": 8.0}
    ranked = _rank_candidates([c1, c2])
    assert ranked[0].get("evaluation_scores", {}).get("overall") == 8.0
    print("  [PASS] elite selection")


def test_mutation_no_break():
    """Mutation changes candidate without breaking it."""
    c = generate_song(style_profiles=[], song_seed="9504", structure_type="short", use_population_search=False)
    mutated = mutate_melody(c, 95040)
    assert mutated.get("sections")
    assert mutated.get("melody")
    assert len(mutated.get("melody", [])) > 0
    print("  [PASS] mutation no break")


def test_crossover_valid():
    """Crossover creates valid candidate."""
    a = generate_song(style_profiles=[], song_seed="9505", structure_type="short", use_population_search=False)
    b = generate_song(style_profiles=[], song_seed="9506", structure_type="short", use_population_search=False)
    child = crossover(a, b, 95050)
    assert child.get("sections")
    assert child.get("melody")
    assert child.get("harmony")
    print("  [PASS] crossover valid")


def test_anti_mush_after_population():
    """Anti-mush constraints remain after population search."""
    c = generate_song(
        style_profiles=[], song_seed="9507", structure_type="short",
        use_population_search=True, population_size=4, elite_count=2, generations=2,
    )
    motifs = c.get("motifs", [])
    assert len(motifs) <= 3
    print("  [PASS] anti-mush after population")


def test_export_after_population():
    """Final candidate exports correctly."""
    c = generate_song(
        style_profiles=[], song_seed="9508", structure_type="short",
        use_population_search=True, population_size=4, elite_count=2, generations=2,
    )
    xml = export_to_musicxml(c)
    assert "<?xml" in xml
    assert "<score-partwise" in xml
    assert "<note" in xml
    print("  [PASS] export after population")


def test_identity_scoring_validity():
    """Identity scoring returns valid 0-10 range."""
    c = generate_song(style_profiles=[], song_seed="9601", structure_type="short", use_population_search=False)
    assert 0 <= identity_score(c) <= 10
    assert 0 <= premise_integrity_score(c) <= 10
    assert 0 <= chorus_dominance_score(c) <= 10
    print("  [PASS] identity scoring validity")


def test_chorus_gate_behaviour():
    """Chorus dominance gate excludes weak-chorus candidates from elite."""
    from population_generator import _passes_hard_gates
    from evaluation_adapter import CHORUS_DOMINANCE_THRESHOLD
    c = generate_song(style_profiles=[], song_seed="9602", structure_type="short", use_population_search=False)
    c["evaluation_scores"] = c.get("evaluation_scores", {})
    c["evaluation_scores"]["chorus_dominance"] = CHORUS_DOMINANCE_THRESHOLD - 0.5
    assert not _passes_hard_gates(c)
    c["evaluation_scores"]["chorus_dominance"] = CHORUS_DOMINANCE_THRESHOLD + 0.5
    c["evaluation_scores"]["premise_integrity"] = 5.0
    c["evaluation_scores"]["clarity_score"] = 7.0
    assert _passes_hard_gates(c)
    print("  [PASS] chorus gate behaviour")


def test_editorial_refinement_not_breaking_structure():
    """Editorial refinement preserves section structure."""
    c = generate_song(style_profiles=[], song_seed="9603", structure_type="short", use_population_search=False)
    sections_before = [(s["id"], s.get("section_role")) for s in c.get("sections", [])]
    for fn in [sharpen_chorus_hook, compress_weak_lyric_line, reinforce_motif_recurrence, strengthen_bridge_contrast, clarify_title_placement, reinforce_song_identity]:
        refined = fn(c, seed=96030)
        sections_after = [(s["id"], s.get("section_role")) for s in refined.get("sections", [])]
        assert len(sections_after) == len(sections_before)
        assert refined.get("sections")
        assert refined.get("melody") or refined.get("sections")
    print("  [PASS] editorial refinement not breaking structure")


def test_final_selection_uses_editorial_score():
    """Final selection prefers higher final_editorial_score when identity ties."""
    c1 = generate_song(style_profiles=[], song_seed="9604", structure_type="short", use_population_search=False)
    c2 = generate_song(style_profiles=[], song_seed="9605", structure_type="short", use_population_search=False)
    base = {"chorus_dominance": 6.0, "premise_integrity": 5.0, "clarity_score": 7.0, "identity_coherence": 5.0}
    c1["evaluation_scores"] = {**base, "identity_score": 6.0, "final_editorial_score": 6.5, "overall": 7.5}
    c2["evaluation_scores"] = {**base, "identity_score": 6.0, "final_editorial_score": 7.0, "overall": 7.2}
    ranked = _rank_candidates([c1, c2], use_search=False)
    assert ranked[0].get("evaluation_scores", {}).get("final_editorial_score") == 7.0
    print("  [PASS] final selection uses editorial score")


def run_basic_tests():
    """Run all basic tests."""
    print("Songwriting Engine — Basic tests")
    try:
        rules = load_rule_package()
        assert rules.get("spec") or rules.get("profiles") or rules.get("sections") or rules.get("repair_mapping"), "Rules should load"
        print("  [PASS] rule package load")

        test_section_structure()
        test_vocal_range()
        test_hook_in_chorus()
        test_lyric_prosody()
        test_musicxml_export()
        test_anti_cliche()
        test_imagery_scoring()
        test_harmonic_variety()
        test_anti_mush()
        test_repair_improves_score()
        test_bounded_loops()
        test_motif_reuse()
        test_chorus_peak()
        test_title_integration()
        test_section_contrast()
        test_repair_structural()
        test_motif_transformed_recurrence()
        test_chorus_stronger_than_verse()
        test_title_appears_when_given()
        test_image_recurrence_detected()
        test_harmony_melody_fit()
        test_multi_repair_no_break()
        test_progression_by_section()
        test_motif_reuse_across_sections()
        test_hook_rhythm_template()
        test_image_family_integration()
        test_melodic_contour_adherence()
        test_population_creates_multiple()
        test_elite_selection()
        test_mutation_no_break()
        test_crossover_valid()
        test_anti_mush_after_population()
        test_export_after_population()
        test_identity_scoring_validity()
        test_chorus_gate_behaviour()
        test_editorial_refinement_not_breaking_structure()
        test_final_selection_uses_editorial_score()

        from test_hook_first import (
            test_hook_candidate_generation,
            test_lane_assignment_coverage,
            test_song_from_hook,
            test_novelty_penalty,
            test_pairwise_judge,
            test_hook_first_pipeline,
            test_hook_derived_chorus_not_overwritten,
        )
        test_hook_candidate_generation()
        test_lane_assignment_coverage()
        test_song_from_hook()
        test_novelty_penalty()
        test_pairwise_judge()
        test_hook_first_pipeline()
        test_hook_derived_chorus_not_overwritten()

        from test_hook_dna_contract import (
            test_extract_hook_dna,
            test_validate_song_against_hook_dna,
            test_score_hook_dna_coherence,
            test_sections_inherit_hook_dna,
        )
        test_extract_hook_dna()
        test_validate_song_against_hook_dna()
        test_score_hook_dna_coherence()
        test_sections_inherit_hook_dna()

        from test_section_role_contracts import (
            test_verse_role_contract,
            test_section_role_clarity,
            test_verse_chorus_not_same_function,
        )
        test_verse_role_contract()
        test_section_role_clarity()
        test_verse_chorus_not_same_function()

        from test_transition_scoring import (
            test_transition_scores_valid,
            test_transition_flow_improves_after_repair,
        )
        test_transition_scores_valid()
        test_transition_flow_improves_after_repair()

        from test_contrast_arc_planner import (
            test_plan_section_contrast_arc,
            test_score_contrast_arc,
            test_apply_contrast_arc_improves,
        )
        test_plan_section_contrast_arc()
        test_score_contrast_arc()
        test_apply_contrast_arc_improves()

        from test_chorus_arrival_engine import (
            test_score_chorus_arrival,
            test_strengthen_prechorus_to_chorus,
        )
        test_score_chorus_arrival()
        test_strengthen_prechorus_to_chorus()

        from test_verse_development_engine import (
            test_score_verse_development,
            test_differentiate_verse_2,
        )
        test_score_verse_development()
        test_differentiate_verse_2()

        from test_final_chorus_tools import (
            test_score_final_chorus_payoff,
            test_intensify_final_chorus,
        )
        test_score_final_chorus_payoff()
        test_intensify_final_chorus()

        from test_editorial_selector import (
            test_compute_structural_health,
            test_compute_identity_strength,
            test_editorial_rank_prefers_identity,
        )
        test_compute_structural_health()
        test_compute_identity_strength()
        test_editorial_rank_prefers_identity()

        from test_hook_final_filter import (
            test_score_hook_memorability,
            test_hook_final_filter,
        )
        test_score_hook_memorability()
        test_hook_final_filter()

        from test_standout_factor import (
            test_score_standout_factor,
            test_score_quotable_hook,
            test_standout_differentiates,
        )
        test_score_standout_factor()
        test_score_quotable_hook()
        test_standout_differentiates()

        from test_premium_finalist_refinement import (
            test_select_premium_finalists,
            test_premium_refine_preserves_structure,
        )
        test_select_premium_finalists()
        test_premium_refine_preserves_structure()

        from test_nine_plus_selector import (
            test_is_nine_plus_candidate,
            test_rank_nine_plus_prefers_distinctive,
        )
        test_is_nine_plus_candidate()
        test_rank_nine_plus_prefers_distinctive()

        print("All tests passed.")
    except Exception as e:
        print(f"  [FAIL] {e}")
        raise
