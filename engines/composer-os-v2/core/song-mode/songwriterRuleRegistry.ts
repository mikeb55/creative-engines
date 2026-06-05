/**
 * Songwriting rule registry (research-aligned ids; short labels only).
 */

import { getVoiceRuleBundle } from '../composer/voiceRuleBundles';
import {
  RIFF_GENERATOR_VRB_IDS,
  RIFF_VRB_SIGMA_CEILINGS,
  isRiffGeneratorVrbId,
  type RiffGeneratorVrbId,
} from '../riff-generator/riffVrbRegistry';
import type {
  AuthorRuleId,
  ClassicalSongRuleId,
  FoundationalRuleCategory,
  SongwriterRuleId,
  SongwritingEffectType,
  SongwritingRuleEntry,
  SongwritingRuleRegistryShape,
} from './songwritingResearchTypes';

function R(
  id: string,
  description: string,
  category: SongwritingRuleEntry['category'],
  effectType: SongwritingEffectType,
  priority: number,
  applicability: SongwritingRuleEntry['applicability']
): SongwritingRuleEntry {
  return { id, description, category, effectType, priority, applicability };
}

const songwriterRules: Partial<Record<SongwriterRuleId, SongwritingRuleEntry[]>> = {
  bacharach: [
    R(
      'bacharach.bb_harm_grammar',
      'BB_HARM_01–10 harmonic grammar receipts (bb:harm* tags in bacharachSlice)',
      'songwriter',
      'harmony',
      8,
      'global'
    ),
    R(
      'bacharach.bb_vl_grammar',
      'BB_VL_01–05 voice-leading / orchestration receipts (bb:vl* tags in bacharachSlice)',
      'songwriter',
      'harmony',
      8,
      'global'
    ),
    R(
      'bacharach.bb_rhythm_grammar',
      'BB_RHYTHM_01–05 metric / phrase / percussion receipts (bb:rhythm* tags in bacharachSlice)',
      'songwriter',
      'rhythm',
      8,
      'global'
    ),
    R(
      'bacharach.bb_form_grammar',
      'BB_FORM_01–05 macro-form / section receipts (bb:form* tags in bacharachSlice)',
      'songwriter',
      'form',
      8,
      'global'
    ),
    R(
      'bacharach.bb_orch_grammar',
      'BB_ORCH_01–05 studio orchestration receipts (bb:orch* tags in bacharachSlice)',
      'songwriter',
      'harmony',
      8,
      'global'
    ),
    R(
      'bacharach.bb_fp_fingerprint',
      'BB_FP_01–03 composite fingerprints when rhythm/harmonic/orch+VL bundles align (bb:fp* tags in bacharachSlice)',
      'songwriter',
      'hook',
      9,
      'global'
    ),
    R('bacharach.chromatic_mediant', 'Chromatic mediant moves (placeholder)', 'songwriter', 'harmony', 7, 'global'),
    R('bacharach.secondary_dominant', 'Secondary dominant colour (placeholder)', 'songwriter', 'harmony', 7, 'global'),
    R('bacharach.stepwise_bass', 'Stepwise bass motion (placeholder)', 'songwriter', 'harmony', 7, 'verse'),
  ],
  barry_harris: [
    R('barry_harris.sixth_diminished', 'Sixth–diminished vocabulary (placeholder)', 'songwriter', 'harmony', 8, 'global'),
    R('barry_harris.bebop_scale', 'Bebop scale targeting (placeholder)', 'songwriter', 'melody', 7, 'verse'),
    R('barry_harris.minor_six_tonic', 'Minor-six tonic colour (placeholder)', 'songwriter', 'harmony', 7, 'verse'),
  ],
  ecm_chamber: [
    R('ecm_chamber.modal_drift', 'Modal drift between centres (placeholder)', 'songwriter', 'harmony', 8, 'global'),
    R('ecm_chamber.wide_voicing', 'Wide chamber voicings (placeholder)', 'songwriter', 'harmony', 8, 'verse'),
    R('ecm_chamber.sparse_rhythm', 'Sparse rhythmic pacing (placeholder)', 'songwriter', 'rhythm', 7, 'global'),
    R('slonimsky.minor_third_cell', 'Slonimsky minor-third cell insertion (placeholder)', 'songwriter', 'melody', 7, 'verse'),
    R('slonimsky.whole_tone_segment', 'Slonimsky whole-tone segment drift (placeholder)', 'songwriter', 'melody', 7, 'global'),
    R('slonimsky.non_functional_logic', 'Slonimsky non-functional melodic logic (placeholder)', 'songwriter', 'harmony', 8, 'global'),
  ],
  stevie_wonder: [
    R('wonder.modal_mix', 'Modal mixture at pre-chorus/chorus', 'songwriter', 'harmony', 8, 'chorus'),
    R('wonder.tension_zone', 'Slow harmonic rhythm before chorus lift', 'songwriter', 'harmony', 7, 'pre_chorus'),
    R('wonder.groove_sync', 'Melodic rhythm aligned to groove', 'songwriter', 'rhythm', 8, 'global'),
    R('wonder.prechorus_required', 'Pre-chorus lift in Wonder mode', 'songwriter', 'form', 7, 'pre_chorus'),
    R('wonder.melisma', 'Melisma on emotional peaks', 'songwriter', 'melody', 6, 'chorus'),
  ],
  beatles: [
    R('beatles.compact_motif', 'Short memorable motifs', 'songwriter', 'hook', 8, 'global'),
    R('beatles.modal_interchange', 'bVII / bVI / borrowed color', 'songwriter', 'harmony', 7, 'verse'),
    R('beatles.title_peak', 'Title on melodic high point', 'songwriter', 'hook', 8, 'chorus'),
    R('beatles.surprise_chord', 'At least one harmonic surprise', 'songwriter', 'harmony', 6, 'form'),
    R('beatles.singable_range', 'Default ~octave vocal window', 'songwriter', 'melody', 7, 'global'),
    R('beatles.bt_aaba_form', 'AABA / sectional arc receipts (`bt:d1_aaba_form`)', 'songwriter', 'form', 8, 'form'),
    R('beatles.bt_flat_side_modal', 'Flat-side modal colour receipts (`bt:d2_flat_side_modal`)', 'songwriter', 'harmony', 8, 'verse'),
    R('beatles.bt_co_tonic_switch', 'Co-tonic centre pivots (`bt:d3_co_tonic_switch`)', 'songwriter', 'harmony', 8, 'bridge'),
    R('beatles.bt_chromatic_mediant', 'Chromatic mediant relation receipts (`bt:d4_chromatic_mediant`)', 'songwriter', 'harmony', 8, 'chorus'),
    R('beatles.bt_suite_form', 'Side-two suite-style linkage receipts (`bt:d5_suite_form`)', 'songwriter', 'form', 7, 'global'),
    R(
      'beatles.bt_harm_grammar',
      'Beatles major-key grammar BT_HARM receipts (`bt:harm01_*`–`bt:harm13_*` in `beatlesSlice.ts`)',
      'songwriter',
      'harmony',
      9,
      'global'
    ),
    R(
      'beatles.bt_vl_grammar',
      'Beatles voice-leading BT_VL receipts (`bt:vl01_*`–`bt:vl06_*`; surface + `beatlesSlice.ts`)',
      'songwriter',
      'melody',
      9,
      'global'
    ),
    R(
      'beatles.bt_mel_grammar',
      'Beatles melodic BT_MEL (`bt:mel01_*`–`bt:mel05_*`; `planMelodyBehaviour` + `leadMelodyPlanner.ts`)',
      'songwriter',
      'melody',
      9,
      'global'
    ),
    R(
      'beatles.bt_rhythm_grammar',
      'Beatles rhythm BT_RHYTHM (`bt:rhythm01_*`–`bt:rhythm04_*`; surface + `beatlesSlice.ts`)',
      'songwriter',
      'rhythm',
      9,
      'global'
    ),
    R(
      'beatles.bt_form_grammar',
      'Beatles macro-form BT_FORM (`bt:form01_*`–`bt:form07_*`; `songSectionPlanner.ts` + `beatlesSlice.ts` + surface)',
      'songwriter',
      'form',
      9,
      'global'
    ),
    R(
      'beatles.bt_fp_fingerprints',
      'Beatles BT_FP harmonic/melodic/formal/writer fingerprints (`bt:fp01_*`–`bt:fp04_*`; `beatlesSlice.ts` + Song Mode bundle)',
      'songwriter',
      'form',
      9,
      'global'
    ),
  ],
  fela_kuti: [
    R('fela.fk_static_vamp', 'Two-chord / one-chord vamp holds (`fk:d1_static_vamp`)', 'songwriter', 'harmony', 9, 'verse'),
    R('fela.fk_call_response', 'Call / response phrase layering (`fk:d2_call_response`)', 'songwriter', 'form', 8, 'chorus'),
    R('fela.fk_pentatonic_layer', 'Yoruba pentatonic melodic layer (`fk:d3_pentatonic_layer`)', 'songwriter', 'melody', 9, 'global'),
    R('fela.fk_parallel_horns', 'Parallel horn refrains (`fk:d4_parallel_horns`)', 'songwriter', 'harmony', 8, 'chorus'),
    R('fela.fk_polymetric_grid', 'Cross-rhythm / polymetric grid stress (`fk:d5_polymetric_grid`)', 'songwriter', 'rhythm', 9, 'global'),
    R('fela.no_functional_cadence', 'Avoid textbook V–I closures — vamp continuity', 'songwriter', 'harmony', 9, 'global'),
  ],
  greek_rebetiko: [
    R('gr.hasapiko_ground', 'Hasapiko / zeibekiko ground — dance-meter ostinato cells', 'songwriter', 'rhythm', 9, 'global'),
    R('gr.modal_minor_colour', 'Modal minor / raised-fourth colour vs tonic pedal', 'songwriter', 'harmony', 8, 'verse'),
    R('gr.percussion_forward', 'Percussion narrative leads phrase arcs (doumbek / frame)', 'songwriter', 'form', 7, 'global'),
    R('gr.melismatic_tail', 'Melismatic cadential tails on phrase endings', 'songwriter', 'melody', 7, 'chorus'),
    R('gr.avoid_brass_band_release', 'Avoid big-band cadential clichés — tavern continuity', 'songwriter', 'harmony', 8, 'global'),
  ],
  joni_mitchell: [
    R('joni.modal_bias', 'Modal bias — Dorian, Aeolian, Mixolydian fields', 'songwriter', 'harmony', 8, 'global'),
    R('joni.pedal_bass_preference', 'Pedal bass preference — stepwise or static bass', 'songwriter', 'harmony', 8, 'verse'),
    R('joni.avoid_dominant_resolution', 'Avoid strong V–I — weak / suspended cadence', 'songwriter', 'harmony', 9, 'global'),
    R('joni.suspended_arrivals', 'Suspended / add9 arrivals — hanging colour', 'songwriter', 'harmony', 8, 'chorus'),
    R('joni.phrase_irregularity', 'Phrase irregularity occasional — ±1 bar at transitions', 'songwriter', 'form', 7, 'form'),
    R('joni.no_ii_v_i', 'No rolling ii–V–I chains (pool + runtime guard)', 'songwriter', 'harmony', 9, 'global'),
    R('joni.shape_harmony', 'Shape-based voicings (add2/add4/sus)', 'songwriter', 'harmony', 8, 'verse'),
    R('joni.prosody_drive', 'Lyric prosody drives phrase edges', 'songwriter', 'lyric', 9, 'verse'),
    R('joni.partial_refrain', 'Partial refrains vs big chorus', 'songwriter', 'form', 7, 'chorus'),
  ],
  donald_fagen: [
    R('fagen.extended_harm', '7th/9th/13th + substitutions', 'songwriter', 'harmony', 8, 'verse'),
    R('fagen.behind_beat', 'Vocal phrasing behind beat', 'songwriter', 'rhythm', 7, 'global'),
    R('fagen.mid_register', 'Mid-range jazz contour', 'songwriter', 'melody', 7, 'verse'),
    R('fagen.turns', 'Harmonic side-steps in bridges', 'songwriter', 'harmony', 6, 'bridge'),
  ],
  bob_dylan: [
    R('dylan.strophic', 'Strophic / many verses', 'songwriter', 'form', 8, 'verse'),
    R('dylan.narrow_range', 'Narrow chant-like range', 'songwriter', 'melody', 7, 'verse'),
    R('dylan.lyric_primary', 'Lyric density over hook', 'songwriter', 'lyric', 9, 'verse'),
    R('dylan.simple_prog', 'Simple diatonic harmony', 'songwriter', 'harmony', 6, 'global'),
  ],
  brazilian: [
    R('br.bossa_samba_baiao', 'Bossa / samba / baião subdivision cells (placeholder)', 'songwriter', 'rhythm', 9, 'global'),
    R('br.clave_sensitivity', 'Clave-aware syncopation windows', 'songwriter', 'rhythm', 8, 'verse'),
    R('br.guitar_comp_forward', 'Guitar-led comp under perc narrative', 'songwriter', 'harmony', 7, 'global'),
  ],
  cuban_afro_cuban: [
    R('cu.clave_governs', 'Clave direction governs ensemble accents / montuno alignment', 'songwriter', 'rhythm', 9, 'global'),
    R('cu.tumbao_bell_layers', 'Tumbao vs cascara / bell orchestration windows', 'songwriter', 'rhythm', 8, 'verse'),
    R('cu.montuno_pivot', 'Montuno pivot harmony vs dance phrase lift', 'songwriter', 'harmony', 8, 'chorus'),
  ],
  bartok_bulgarian_aksak: [
    R('bg.sq_additive_vector', 'Bulgarian aksak subgroup_vector on fast micro-pulse (String Quartet rhythm engine)', 'songwriter', 'rhythm', 9, 'global'),
    R('bg.metric_melodic_layers', 'Metric vs melodic accent layers stay independent', 'songwriter', 'rhythm', 9, 'global'),
    R('bg.voice_roles_quartet', 'Metric declarer / offset support / cross-accent / cello rhythmic modes', 'songwriter', 'rhythm', 8, 'global'),
  ],
  free_proportional: [
    R('fp.time_field_primary', 'Free/proportional SQ rhythm: time-field spans + cue sync, not beat-cycle lattice', 'songwriter', 'rhythm', 9, 'global'),
    R('fp.coordination_levels', 'fixed_sync vs soft_window vs independent_local per section/event class', 'songwriter', 'rhythm', 8, 'global'),
    R('fp.composer_profiles', 'Dutilleux / Ligeti / Crumb / Lachenmann weighting hooks for gesture sequencing', 'songwriter', 'rhythm', 8, 'global'),
  ],
  baroque_dance: [
    R('bd.sq_dance_class', 'Baroque dance SQ rhythm: dance_class + tactus + pickup + cadence grammar (String Quartet rhythm engine)', 'songwriter', 'rhythm', 9, 'global'),
    R('bd.periodic_hierarchy', 'Binary phrase modules, bar-accent profiles, ground bass BD9', 'songwriter', 'rhythm', 8, 'global'),
    R('bd.modern_harmony_ok', 'Rhythmic identity stable under chromatic / non-functional harmony (Crumb sarabande model)', 'songwriter', 'rhythm', 8, 'global'),
  ],
  reich_phasing_grid: [
    R('rp.sq_phase_grid', 'Reich phasing SQ rhythm: even pulse grid + onset-vector displacement + stepped/continuous operators (String Quartet rhythm engine)', 'songwriter', 'rhythm', 9, 'global'),
    R('rp.pairs_reich_glass_vrb', 'Complements Reich/Glass SQ VRB — process vs additive wash differentiated', 'songwriter', 'rhythm', 8, 'global'),
    R('rp.module_b_dt', 'Different Trains model: speech-derived motives + ostinato layering without literal-only mechanical phase', 'songwriter', 'rhythm', 8, 'global'),
  ],
  viennese_waltz: [
    R('vw.sq_waltz_tactus', 'Viennese waltz SQ rhythm: 3/4 rotational tactus, ONE-two-three schwung, flowing 2–3 (String Quartet rhythm engine)', 'songwriter', 'rhythm', 9, 'global'),
    R('vw.diff_baroque_minuet', 'Contrasts Baroque minuet square court periodicity — operetta / late-Romantic ballroom topic', 'songwriter', 'rhythm', 8, 'global'),
    R('vw.pairing_note', 'Roadmap pairing: Shostakovich grotesque scherzo / ghost waltz adjacent contrast', 'songwriter', 'rhythm', 7, 'global'),
  ],
  jewish_klezmer: [
    R('kl.sq_klezmer_gaits', 'Jewish / klezmer SQ rhythm: six-gait library (KL1–KL6) + felt subdivision + ornament classes + modal coupling (String Quartet rhythm engine)', 'songwriter', 'rhythm', 9, 'global'),
    R('kl.shostakovich_pairing', 'Pairs with Shostakovich SQ VRB jewish_dance_rhythm receipts — variant preserves gait under irony', 'songwriter', 'rhythm', 8, 'global'),
    R('kl.diff_aksak_baroque', 'Unevenness from accent/ornament/triplet underlay — not aksak additive packets; not Baroque court symmetry', 'songwriter', 'rhythm', 7, 'global'),
  ],
  paul_simon: [
    R('simon.primary_axis', 'Tag melody/rhythm/harmony primary per song', 'songwriter', 'form', 8, 'global'),
    R('simon.section_contrast', 'Contrast at least one dimension V/C/B', 'songwriter', 'form', 8, 'form'),
    R('simon.prosody_stress', 'Speech stress vs accents', 'songwriter', 'lyric', 7, 'verse'),
    R('simon.folk_jazz_blend', 'Folk shapes + occasional colour', 'songwriter', 'harmony', 7, 'bridge'),
  ],
  jeff_tweedy: [
    R('tweedy.simple_form', 'Stable V/C with narrative lyric', 'songwriter', 'form', 7, 'global'),
    R('tweedy.limited_range', 'Limited leaps; conversational', 'songwriter', 'melody', 7, 'verse'),
    R('tweedy.behind_simple', 'Slightly behind-beat feel', 'songwriter', 'rhythm', 6, 'verse'),
  ],
  carole_king: [
    R('king.piano_pop', 'Piano-centric triads/7ths', 'songwriter', 'harmony', 7, 'chorus'),
    R('king.big_chorus', 'Strong repeated chorus hook', 'songwriter', 'hook', 9, 'chorus'),
    R('king.title_repeat', 'Title at chorus start/end', 'songwriter', 'hook', 8, 'chorus'),
    R('king.bridge_mod', 'Bridge mod or reharm', 'songwriter', 'harmony', 6, 'bridge'),
  ],
  smokey_robinson: [
    R('smokey.short_cells', 'Short hook cells + reharm', 'songwriter', 'hook', 8, 'chorus'),
    R('smokey.title_on_peak', 'Title on strong beats / peaks', 'songwriter', 'hook', 8, 'chorus'),
    R('smokey.backbeat', 'Melodic rhythm locked to backbeat', 'songwriter', 'rhythm', 7, 'chorus'),
    R('smokey.bv_echo', 'Backing echo motifs', 'songwriter', 'form', 6, 'chorus'),
  ],
  randy_newman: [
    R('newman.speech_melody', 'Narrow speech-like lines', 'songwriter', 'melody', 8, 'verse'),
    R('newman.rich_harm', 'Secondary dominants + chromatic bass', 'songwriter', 'harmony', 8, 'verse'),
    R('newman.narrative_turn', 'Harmonic shifts at narrative turns', 'songwriter', 'harmony', 7, 'bridge'),
  ],
  richard_thompson: [
    R('thompson.modal', 'Dorian/Mixolydian fields', 'songwriter', 'harmony', 8, 'verse'),
    R('thompson.guitar_cell', 'Melody aligned to guitar cells', 'songwriter', 'rhythm', 7, 'verse'),
    R('thompson.refrain_form', 'Verse/refrain narrative', 'songwriter', 'form', 7, 'verse'),
  ],
  max_martin: [
    R('martin.time_to_chorus', 'Early chorus / tight form', 'songwriter', 'form', 9, 'form'),
    R('martin.hook_cells', '1–3 note hook cells repeated', 'songwriter', 'hook', 9, 'chorus'),
    R('martin.diatonic_pop', 'I–V–vi–IV variants', 'songwriter', 'harmony', 8, 'chorus'),
    R('martin.pre_lift', 'Pre-chorus lift into chorus', 'songwriter', 'harmony', 8, 'pre_chorus'),
  ],
  brian_wilson: [
    R(
      'brian_wilson.bw_harm_grammar',
      'BW_HARM_01–10 Pet Sounds harmonic grammar receipts (bw:harm* tags in brianWilsonPetSoundsSlice)',
      'songwriter',
      'harmony',
      8,
      'global'
    ),
    R(
      'brian_wilson.bw_vl_grammar',
      'BW_VL_01–06 Pet Sounds voice-leading / texture receipts (bw:vl* tags in brianWilsonPetSoundsSlice)',
      'songwriter',
      'harmony',
      8,
      'global'
    ),
    R(
      'brian_wilson.bw_mel_grammar',
      'BW_MEL_01–05 Pet Sounds melodic receipts (bw:mel* tags in brianWilsonPetSoundsSlice)',
      'songwriter',
      'melody',
      8,
      'global'
    ),
    R(
      'brian_wilson.bw_rhythm_grammar',
      'BW_RHYTHM_01–04 Pet Sounds rhythm / ensemble receipts (bw:rhythm* tags in brianWilsonPetSoundsSlice)',
      'songwriter',
      'rhythm',
      8,
      'global'
    ),
    R(
      'brian_wilson.bw_orch_grammar',
      'BW_ORCH_01–05 Pet Sounds studio orchestration receipts (bw:orch* tags in brianWilsonPetSoundsSlice)',
      'songwriter',
      'form',
      8,
      'global'
    ),
    R(
      'brian_wilson.bw_fp_fingerprint',
      'BW_FP_01–03 composite fingerprints when harmonic/melodic/studio bundles align (bw:fp* tags in brianWilsonPetSoundsSlice)',
      'songwriter',
      'hook',
      9,
      'global'
    ),
    R('wilson.layered_vocals', 'Stacked harmony layers', 'songwriter', 'form', 8, 'chorus'),
    R('wilson.section_pivot', 'Section pivots via colour chords', 'songwriter', 'harmony', 8, 'form'),
    R('wilson.hook_return', 'Hook return with arrangement lift', 'songwriter', 'hook', 8, 'chorus'),
    R('wilson.modal_colour', 'Modal mixture in bridges', 'songwriter', 'harmony', 7, 'bridge'),
  ],
  paul_mccartney: [
    R('mccartney.melodic_peak', 'Melodic peaks on title/hook', 'songwriter', 'melody', 8, 'chorus'),
    R('mccartney.tight_verse', 'Verse economy → chorus release', 'songwriter', 'form', 8, 'verse'),
    R('mccartney.contrast_bridge', 'Bridge contrast or pivot', 'songwriter', 'form', 7, 'bridge'),
    R('mccartney.singable', 'Singable stepwise with leap at peak', 'songwriter', 'melody', 7, 'global'),
  ],
  jeff_lynne: [
    R('lynne.straight_eighth', 'Driving straight-eighth groove', 'songwriter', 'rhythm', 8, 'global'),
    R('lynne.layered_hook', 'Layered guitar/vocal hook', 'songwriter', 'hook', 8, 'chorus'),
    R('lynne.diatonic_lift', 'Diatonic lifts + stacked chords', 'songwriter', 'harmony', 7, 'chorus'),
    R('lynne.tight_form', 'Tight verse-chorus economy', 'songwriter', 'form', 8, 'form'),
  ],
  xtc: [
    R('xtc.harmonic_twist', 'Unexpected harmonic turns', 'songwriter', 'harmony', 8, 'verse'),
    R('xtc.art_pop_form', 'Art-pop section pivots', 'songwriter', 'form', 7, 'form'),
    R('xtc.rhythmic_push', 'Syncopated pushes vs backbeat', 'songwriter', 'rhythm', 7, 'chorus'),
    R('xtc.title_irony', 'Title/hook with lyrical irony', 'songwriter', 'lyric', 6, 'chorus'),
  ],
  kurt_weill: [
    R('weill.theatre_harm', 'Theatre harmony / cabaret colour', 'songwriter', 'harmony', 8, 'verse'),
    R('weill.speech_melody', 'Speech-song melodic contour', 'songwriter', 'melody', 8, 'verse'),
    R('weill.section_drama', 'Dramatic section contrasts', 'songwriter', 'form', 8, 'form'),
    R('weill.chromatic_bass', 'Chromatic bass motion', 'songwriter', 'harmony', 7, 'verse'),
  ],
  holland_dozier_holland: [
    R('hdh.motown_hook', 'Motown hook cell repetition', 'songwriter', 'hook', 9, 'chorus'),
    R('hdh.backbeat_lock', 'Melody locked to backbeat', 'songwriter', 'rhythm', 8, 'chorus'),
    R('hdh.iv_v', 'IV–V lifts into chorus', 'songwriter', 'harmony', 8, 'pre_chorus'),
    R('hdh.call_response', 'Call/response hook framing', 'songwriter', 'form', 7, 'chorus'),
  ],
  norman_whitfield: [
    R('whitfield.psychedelic_riff', 'Extended vamps + riff hooks', 'songwriter', 'hook', 8, 'verse'),
    R('whitfield.syncop_groove', 'Heavy syncop vs straight sections', 'songwriter', 'rhythm', 8, 'global'),
    R('whitfield.slow_burn', 'Slow harmonic rhythm builds', 'songwriter', 'harmony', 7, 'verse'),
    R('whitfield.density_stack', 'Dense instrumental stacks', 'songwriter', 'form', 7, 'chorus'),
  ],
  new_orleans_second_line: [
    R('nola.big_four_arrival', 'Big Four phrase arrivals — cadential lift vs march continuity', 'songwriter', 'rhythm', 9, 'global'),
    R('nola.second_line_backbeat', 'Second line snare / bass syncopation cells', 'songwriter', 'rhythm', 9, 'verse'),
    R('nola.brass_lift', 'Brass-band shout vs funeral hymn contrast', 'songwriter', 'form', 8, 'chorus'),
  ],
  bach: [
    R('bach.sequential', 'Sequential development of motifs', 'songwriter', 'melody', 8, 'global'),
    R('bach.voice_leading', 'Strong voice-leading between chords', 'songwriter', 'harmony', 8, 'verse'),
    R('bach.metric_drive', 'Metric drive + suspensions', 'songwriter', 'rhythm', 7, 'global'),
    R('bach.cycle_fifths', 'Circle-of-fifths motion slots', 'songwriter', 'harmony', 7, 'bridge'),
  ],
  beethoven: [
    R('beethoven.motivic', 'Motivic development across sections', 'songwriter', 'melody', 8, 'form'),
    R('beethoven.dramatic_contrast', 'Dramatic dynamic/harmonic contrast', 'songwriter', 'harmony', 8, 'form'),
    R('beethoven.metric_shift', 'Metric/hypermetric surprises', 'songwriter', 'rhythm', 7, 'verse'),
    R('beethoven.climax_arc', 'Climax arc toward recap', 'songwriter', 'form', 8, 'form'),
  ],
  dave_brubeck: [
    R(
      'brubeck.odd_meter_groove',
      'Odd-meter groove clarity — metric emphasis on subdivisions (placeholder)',
      'songwriter',
      'rhythm',
      9,
      'global'
    ),
    R(
      'brubeck.block_chord_pockets',
      'Block-chord piano pockets vs linear fills (placeholder)',
      'songwriter',
      'harmony',
      8,
      'verse'
    ),
    R(
      'brubeck.cool_school_colour',
      'Cool-school tertian colours vs dense altered stacks (placeholder)',
      'songwriter',
      'harmony',
      8,
      'global'
    ),
  ],
  debussy: [
    R('debussy.parallel_chords', 'Parallel chord streams / planing', 'songwriter', 'harmony', 8, 'verse'),
    R('debussy.whole_tone', 'Whole-tone / colour shifts', 'songwriter', 'harmony', 7, 'bridge'),
    R('debussy.rubato_phrase', 'Phrase-level rubato vs pulse', 'songwriter', 'rhythm', 7, 'global'),
    R('debussy.pentatonic', 'Pentatonic / mode colour', 'songwriter', 'melody', 7, 'verse'),
  ],
  stravinsky: [
    R('stravinsky.metric_cell', 'Metric cell displacement', 'songwriter', 'rhythm', 8, 'global'),
    R('stravinsky.polytonal', 'Polytonal / bitonal colour', 'songwriter', 'harmony', 8, 'verse'),
    R('stravinsky.primitive_hook', 'Primitive / ritual hook shapes', 'songwriter', 'hook', 7, 'chorus'),
    R('stravinsky.section_cut', 'Abrupt sectional cuts', 'songwriter', 'form', 8, 'form'),
  ],
  ravel: [
    R('ravel.orchestral_line', 'Orchestral line in pop frame', 'songwriter', 'melody', 8, 'verse'),
    R('ravel.pedal_colour', 'Pedal + modal colour', 'songwriter', 'harmony', 8, 'verse'),
    R('ravel.miniature_form', 'Miniature balanced phrases', 'songwriter', 'form', 7, 'global'),
    R('ravel.sparkle_register', 'High-register sparkle peaks', 'songwriter', 'melody', 7, 'chorus'),
  ],
  schubert: [
    R('schubert_song.lied_line', 'Lied-style melodic line', 'songwriter', 'melody', 8, 'verse'),
    R('schubert_song.mod_bridge', 'Modulation in bridge', 'songwriter', 'harmony', 7, 'bridge'),
    R('schubert_song.strophic_var', 'Strophic with variation', 'songwriter', 'form', 7, 'verse'),
    R('schubert_song.piano_comment', 'Piano commentary texture', 'songwriter', 'form', 6, 'verse'),
  ],
  mahler: [
    R('mahler.epic_arc', 'Epic multi-section arc', 'songwriter', 'form', 8, 'form'),
    R('mahler.chromatic_wander', 'Chromatic wandering lines', 'songwriter', 'harmony', 8, 'verse'),
    R('mahler.folk_intrude', 'Folk intrusion in art frame', 'songwriter', 'melody', 7, 'bridge'),
    R('mahler.climax_orchestra', 'Orchestral climax planning', 'songwriter', 'form', 8, 'chorus'),
  ],
  prokofiev: [
    R('prokofiev.toccata_drive', 'Toccata-like motor drive', 'songwriter', 'rhythm', 8, 'global'),
    R('prokofiev.sarcasm_turn', 'Sarcasm / irony turns', 'songwriter', 'harmony', 7, 'bridge'),
    R('prokofiev.neoclassical', 'Neoclassical clarity + bite', 'songwriter', 'melody', 7, 'verse'),
    R('prokofiev.percussive_hook', 'Percussive hook cells', 'songwriter', 'hook', 8, 'chorus'),
  ],
  shostakovich: [
    R('shosta.grotesque', 'Grotesque march / irony', 'songwriter', 'form', 8, 'verse'),
    R('shosta.quote_layer', 'Quotation / layer juxtaposition', 'songwriter', 'harmony', 7, 'bridge'),
    R('shosta.lament_line', 'Narrow lament contour', 'songwriter', 'melody', 8, 'verse'),
    R('shosta.strings_brass', 'Strings vs brass contrast', 'songwriter', 'form', 7, 'chorus'),
  ],
  messiaen: [
    R('messiaen.mode_rot', 'Mode rotation / limited transposition', 'songwriter', 'harmony', 9, 'global'),
    R('messiaen.additive_rhythm', 'Additive rhythmic groups', 'songwriter', 'rhythm', 8, 'verse'),
    R('messiaen.bird_call', 'Bird-call / nature motifs', 'songwriter', 'melody', 7, 'verse'),
    R('messiaen.static_colour', 'Static harmony colour fields', 'songwriter', 'harmony', 8, 'verse'),
  ],
  duke_ellington: [
    R('duke.jungle_riff', 'Jungle / growl riff colour', 'songwriter', 'harmony', 8, 'verse'),
    R('duke.mood_suite', 'Mood suite / extended form', 'songwriter', 'form', 7, 'form'),
    R('duke.brass_melody', 'Brass-led melodic hooks', 'songwriter', 'melody', 8, 'chorus'),
    R('duke.swing_elide', 'Swing elision across bars', 'songwriter', 'rhythm', 8, 'global'),
  ],
  billy_strayhorn: [
    R('strayhorn.lush_7', 'Lush 7th/9th voicings', 'songwriter', 'harmony', 8, 'verse'),
    R('strayhorn.late_night', 'Late-night ballad contour', 'songwriter', 'melody', 8, 'verse'),
    R('strayhorn.ironic_title', 'Ironic / oblique title hook', 'songwriter', 'hook', 7, 'chorus'),
    R('strayhorn.counter_line', 'Countermelody under lead', 'songwriter', 'form', 7, 'chorus'),
  ],
  james_brown: [
    R('jb.the_one', 'The One — downbeat anchor', 'songwriter', 'rhythm', 9, 'global'),
    R('jb.funk_cell', 'Funk cell vamps', 'songwriter', 'hook', 9, 'verse'),
    R('jb.call_minimal', 'Minimal call; maximum groove', 'songwriter', 'form', 8, 'verse'),
    R('jb.syncop_stack', 'Stacked syncop layers', 'songwriter', 'rhythm', 8, 'chorus'),
  ],
  prince: [
    R('prince.d1_minor_vamp', 'Minor vamp lock pockets (`pr:d1_minor_vamp`)', 'songwriter', 'harmony', 9, 'verse'),
    R('prince.d2_gospel_cadence', 'IV–V–I extended gospel cadence hits (`pr:d2_gospel_cadence`)', 'songwriter', 'harmony', 9, 'chorus'),
    R('prince.d3_chromatic_bass', 'Chromatic passing diminished connectors (`pr:d3_chromatic_bass`)', 'songwriter', 'harmony', 8, 'global'),
    R('prince.d4_stop_time', 'Phrase-boundary stop-time receipts (`pr:d4_stop_time`)', 'songwriter', 'rhythm', 8, 'global'),
    R('prince.d5_bridge_modulation', 'Bridge-only tritone substitutions (`pr:d5_bridge_modulation`)', 'songwriter', 'harmony', 9, 'bridge'),
  ],
  kendrick_lamar: [
    R('kdot.story_arc', 'Narrative arc over sections', 'songwriter', 'form', 9, 'form'),
    R('kdot.jazz_soul', 'Jazz/soul sample harmony', 'songwriter', 'harmony', 8, 'verse'),
    R('kdot.prosody_rap', 'Prosody-first rap phrasing', 'songwriter', 'lyric', 9, 'verse'),
    R('kdot.section_flip', 'Sudden section flips', 'songwriter', 'form', 8, 'bridge'),
  ],
  gil_evans: [
    R(
      'evans.voicing_language',
      'Birth of the Cool / Miles Ahead voicing — mid-register clusters, wide bass gap, m2/m9 clashes on top, non-tertian stack order, maj7(#11) / mi9 / altered dominant colours',
      'songwriter',
      'harmony',
      9,
      'global'
    ),
    R(
      'evans.modal_bass_independence',
      'Sketches-era modal bass counterpoint — Dorian/Aeolian/Lydian/Phrygian fields, bass 2nds/3rds off root, parallel modal planing, mixture at scene boundaries',
      'songwriter',
      'harmony',
      9,
      'verse'
    ),
    R(
      'evans.cloud_pedal_scenes',
      'Slow harmonic rhythm — long pedals, unresolved suspensions, cloud texture with melodic drift and percussion-side polyrhythm',
      'songwriter',
      'harmony',
      9,
      'form'
    ),
  ],
  thad_jones: [
    R('thad.brass_shout', 'Brass shout chorus hooks', 'songwriter', 'hook', 8, 'chorus'),
    R('thad.bop_changes', 'Bop changes + blues side', 'songwriter', 'harmony', 8, 'verse'),
    R('thad.section_lift', 'Section lifts via II–V', 'songwriter', 'harmony', 7, 'bridge'),
    R('thad.swing_line', 'Swing line in brass + rhythm', 'songwriter', 'rhythm', 8, 'global'),
  ],
  sammy_nestico: [
    R('nestico.chart_tight', 'Tight chart reading form', 'songwriter', 'form', 8, 'form'),
    R('nestico.basie_kick', 'Basie-style kick figures', 'songwriter', 'rhythm', 8, 'chorus'),
    R('nestico.sax_sol', 'Soli sections + shout', 'songwriter', 'melody', 7, 'verse'),
    R('nestico.diatonic_shout', 'Diatonic shout hooks', 'songwriter', 'hook', 8, 'chorus'),
  ],
  quincy_jones: [
    R('qj.film_arc', 'Film / soundtrack arc', 'songwriter', 'form', 8, 'form'),
    R('qj.rnb_lift', 'R&B lift + jazz harmony', 'songwriter', 'harmony', 8, 'chorus'),
    R('qj.groove_first', 'Groove-first arrangement', 'songwriter', 'rhythm', 8, 'global'),
    R('qj.horn_pad', 'Horn pads under vocal hook', 'songwriter', 'hook', 7, 'chorus'),
  ],
  bob_brookmeyer: [
    R('brook.counterpoint', 'Linear counterpoint in big band', 'songwriter', 'melody', 8, 'verse'),
    R('brook.valve_cluster', 'Valve cluster colour', 'songwriter', 'harmony', 8, 'verse'),
    R('brook.odd_meter', 'Odd-meter phrase pivots', 'songwriter', 'rhythm', 8, 'form'),
    R('brook.west_coast', 'West Coast cool voicings', 'songwriter', 'harmony', 7, 'bridge'),
  ],
  bill_holman: [
    R('holman.chart_first', 'Chart-first linear lines generate harmony', 'songwriter', 'melody', 9, 'global'),
    R('holman.sax_soli', 'Five-voice sax soli as primary texture', 'songwriter', 'form', 9, 'verse'),
    R('holman.voice_leading', 'Classical voice-leading gate on all soli', 'songwriter', 'harmony', 8, 'global'),
    R('holman.countermelody', 'Independent singable counter-lines', 'songwriter', 'melody', 8, 'chorus'),
  ],
  carla_bley: [
    R('bley.formal_irony', 'Legible style-topic introduced then reframed by understatement or displacement', 'songwriter', 'form', 9, 'global'),
    R('bley.deadpan_presentation', 'Dynamic rhetoric and climax inflation kept lower than material promises', 'songwriter', 'form', 9, 'verse'),
    R('bley.cadence_deflection', 'Functional cadence sidestepped with dry wrong-note elegance', 'songwriter', 'harmony', 8, 'chorus'),
    R('bley.climax_deflation', 'Major build gestures undercut within 1–4 bars', 'songwriter', 'form', 8, 'bridge'),
  ],
  maria_schneider: [
    R(
      'schneider.voicing_language',
      'Mixed tertian/quartal extensions (9/11/13 + inner 2nds/4ths); non-root tops on 9/#11/13; stepwise inner lines + maximum common tones; free 5th/3rd omissions; hanging long chords with subtle morph; 8–12 note tutti via register/timbre not block brass; cadences rare, landing on rich non-triadic sonorities',
      'songwriter',
      'harmony',
      9,
      'global'
    ),
    R(
      'schneider.modal_nature_arc',
      'Pastoral palette Dorian/Aeolian/Lydian/Mixolydian vs darker chromatic/altered Data Lords palette; gradual modal degree morph + common-tone pivots (9→3, #11→5); organic density/dissonance waves; interval-seeded 3-pitch cells over root-position thinking',
      'songwriter',
      'harmony',
      9,
      'verse'
    ),
    R(
      'schneider.orchestration_rhythm',
      'Cross-section voicing (flugel/mutes/clarinets/flutes/trombones); timbral morph same pitches; flugel+clarinet/flute warmth, accordion+woodwinds+muted brass beds; saxes as inner weave; Brazilian groove under floating harmony; harmonic rhythm vs narrative motion; long pedals as ground',
      'songwriter',
      'harmony',
      9,
      'form'
    ),
  ],
  kenny_wheeler: [
    R(
      'wheeler.polyaxial_harmony',
      'Upper sonority path (maj triads, sus, 6/9, maj7/#11) + independent bass path (semitone/M3 motion) — not root-stack tertian',
      'songwriter',
      'harmony',
      9,
      'global'
    ),
    R(
      'wheeler.tension_carry',
      'Tension-bearing sonorities carry forward; avoid functional V→I and plain tonic triad cadences',
      'songwriter',
      'harmony',
      9,
      'verse'
    ),
    R(
      'wheeler.lyric_melody',
      'Wide P4/P5/m6/M6/8ve leaps with contrary stepwise repair; melody floats above polyaxial gap on color tones',
      'songwriter',
      'melody',
      8,
      'form'
    ),
  ],
  john_surman: [
    R(
      'surman.folk_modal_center',
      'Dorian/Mixolydian/pentatonic as primary harmonic material — modal center sustained 8–16 bars; no jazz altered dominants',
      'songwriter',
      'harmony',
      9,
      'global'
    ),
    R(
      'surman.minimalist_ostinato',
      'Rhythmic and melodic ostinato with gradual 8–16 bar evolution — organic repetition not mechanical process',
      'songwriter',
      'rhythm',
      9,
      'verse'
    ),
    R(
      'surman.dark_reed_register',
      'Melodic weight in baritone sax / bass clarinet register — long introspective phrases; not bright Nordic sax archetype',
      'songwriter',
      'melody',
      8,
      'form'
    ),
    R(
      'surman.structural_silence',
      'Rests and sustained decay as compositional material — low density; phrases breathe before next entry',
      'songwriter',
      'form',
      8,
      'bridge'
    ),
  ],
  ralph_towner: [
    R(
      'towner.guitar_born_voicing',
      'Harmony from fingerstyle guitar voicing — maj9/add9/6-9/sus2/slash; open strings ring across changes; classical spacing',
      'songwriter',
      'harmony',
      9,
      'global'
    ),
    R(
      'towner.melody_from_voicing',
      'Melody derived from arpeggio or chord shape — finger-composed contour inseparable from resonance; not separate lead line',
      'songwriter',
      'melody',
      9,
      'verse'
    ),
    R(
      'towner.resonance_architecture',
      'Common tones preserved; overtone decay structural; silence after key events completes the phrase',
      'songwriter',
      'form',
      8,
      'bridge'
    ),
    R(
      'towner.classical_counterpoint',
      'Independent bass against upper melody; arpeggiation as linear composition; counterpoint by register',
      'songwriter',
      'harmony',
      8,
      'form'
    ),
  ],
  verlaine: [
    R(
      'verlaine.modal_field_persistence',
      'Harmonic center holds 4–16 bars — change via bass displacement under static upper shape; penalize frequent root movement',
      'songwriter',
      'harmony',
      9,
      'global'
    ),
    R(
      'verlaine.suspended_surface',
      'Sus2/sus4/add9/add4/6-9/slash/dyad drones dominate — reject altered-dominant jazz-lush grips',
      'songwriter',
      'harmony',
      9,
      'verse'
    ),
    R(
      'verlaine.bass_displacement',
      'Guitar grip root and bass root differ — C bass + B guitar reinterpretation under static upper shape',
      'songwriter',
      'harmony',
      8,
      'form'
    ),
    R(
      'verlaine.supra_chord_melody',
      'Melody targets degrees 2/4/6/9 over field — chord-defining tones delayed; melody floats and intermittently confirms',
      'songwriter',
      'melody',
      9,
      'verse'
    ),
    R(
      'verlaine.progression_avoidance',
      'Penalize I–V–vi–IV, blues closure, ii–V–I — reward modal loops and return-to-riff closure over V–I',
      'songwriter',
      'form',
      8,
      'bridge'
    ),
  ],
  jan_garbarek: [
    R(
      'garbarek.modal_field',
      'Harmonic environment is a modal field not a progression — Dorian/Aeolian/Mixolydian centers held for extended spans',
      'songwriter',
      'harmony',
      9,
      'global'
    ),
    R(
      'garbarek.drone_architecture',
      'Bass and lower voices sustain pedal tones — walking bass is a hard fail; lyrical sustaining bass',
      'songwriter',
      'harmony',
      9,
      'verse'
    ),
    R(
      'garbarek.ritual_melody',
      'Melody as chant/call over stable modal field — arch/descent or circular folk nucleus; phrase-breath silence structural',
      'songwriter',
      'melody',
      8,
      'form'
    ),
  ],
  eberhard_weber: [
    R(
      'weber.pedal_field',
      'Bass-led harmonic field — one pedal axis 4–12 bars with upper color clusters refreshing every 2–4 bars',
      'songwriter',
      'harmony',
      9,
      'global'
    ),
    R(
      'weber.bass_foreground',
      'Bass is compositional foreground — chord identity from bass + upper cluster, not root-position stacks',
      'songwriter',
      'harmony',
      9,
      'verse'
    ),
    R(
      'weber.revoicing_release',
      'Tension released by register/spacing/timbre change — not dominant-tonic resolution',
      'songwriter',
      'harmony',
      8,
      'chorus'
    ),
    R(
      'weber.arching_melody',
      'Long melodic arcs beyond 4 bars — wide calm intervals P4/P5/M6/8ve, not brittle Wheeler leap chains',
      'songwriter',
      'melody',
      8,
      'form'
    ),
  ],
  claus_ogerman: [
    R(
      'ogerman.continuum_harmony',
      'Orchestral continuum — harmony, inner-voice counterpoint, and string color generated as one system',
      'songwriter',
      'harmony',
      9,
      'global'
    ),
    R(
      'ogerman.cyclic_cell',
      '3-chord cyclic cells generate large harmonic spans — return to cell rather than V–I closure',
      'songwriter',
      'harmony',
      9,
      'form'
    ),
    R(
      'ogerman.inner_counterpoint',
      'Two or more inner lines move by m2/M2/m3 with common-tone retention across changes',
      'songwriter',
      'harmony',
      8,
      'verse'
    ),
    R(
      'ogerman.texture_resolution',
      'Release tension by registral descent, density thinning, or cell return — not functional cadence',
      'songwriter',
      'form',
      8,
      'chorus'
    ),
  ],
  clare_fischer: [
    R('fisch.poly_plan', 'Poly-planar voicings', 'songwriter', 'harmony', 9, 'verse'),
    R('fisch.latino_clave', 'Latin clave + jazz changes', 'songwriter', 'rhythm', 8, 'global'),
    R('fisch.dense_mid', 'Dense mid-register clusters', 'songwriter', 'harmony', 8, 'chorus'),
    R('fisch.vocal_harm', 'Vocal harmony orchestration', 'songwriter', 'melody', 7, 'chorus'),
  ],
  manny_albam: [
    R('albam.studio_chart', 'Studio big-band clarity', 'songwriter', 'form', 7, 'form'),
    R('albam.trombone_row', 'Trombone section hooks', 'songwriter', 'hook', 7, 'chorus'),
    R('albam.swing_even', 'Even eighth swing charts', 'songwriter', 'rhythm', 8, 'global'),
    R('albam.bridge_mod', 'Bridge reharm lift', 'songwriter', 'harmony', 7, 'bridge'),
  ],
  oliver_nelson: [
    R('on.stolen_moments', 'Ballad contour + blues colour', 'songwriter', 'melody', 8, 'verse'),
    R('on.stax_bridge', 'Stax / soul bridge contrast', 'songwriter', 'harmony', 7, 'bridge'),
    R('on.sax_unison', 'Sax unison shout', 'songwriter', 'hook', 8, 'chorus'),
    R('on.form_story', 'Story form through sections', 'songwriter', 'form', 8, 'form'),
  ],
  gerald_wilson: [
    R('gw.la_bigband', 'LA big-band swagger', 'songwriter', 'rhythm', 8, 'global'),
    R('gw.blues_side', 'Blues side-slips', 'songwriter', 'harmony', 8, 'verse'),
    R('gw.section_soli', 'Section soli trade', 'songwriter', 'form', 7, 'verse'),
    R('gw.shout_chorus', 'Shout chorus peaks', 'songwriter', 'hook', 8, 'chorus'),
  ],
  neal_hefti: [
    R('hefti.tv_bite', 'TV theme bite hooks', 'songwriter', 'hook', 9, 'chorus'),
    R('hefti.bright_brass', 'Bright brass fanfares', 'songwriter', 'melody', 8, 'chorus'),
    R('hefti.swing_tv', 'Swing pocket for broadcast', 'songwriter', 'rhythm', 8, 'global'),
    R('hefti.tight_turn', 'Tight turnarounds', 'songwriter', 'harmony', 7, 'verse'),
  ],
  don_sebesky: [
    R('seb.fusion_stack', 'Fusion horn stacks', 'songwriter', 'harmony', 8, 'chorus'),
    R('seb.string_pad', 'String pad + brass', 'songwriter', 'form', 8, 'verse'),
    R('seb.dramatic_mod', 'Dramatic mod lifts', 'songwriter', 'harmony', 8, 'bridge'),
    R('seb.groove_orchestra', 'Groove + orchestral weight', 'songwriter', 'rhythm', 8, 'global'),
  ],
  johnny_mandel: [
    R('jmd.melody_extensions', 'Melody lands on 3rd/6th/7th/9th at strong points', 'songwriter', 'melody', 9, 'global'),
    R('jmd.inner_warmth', 'Semitone inner motion + common tones at chord changes', 'songwriter', 'harmony', 9, 'verse'),
    R('jmd.borrowed_iv', 'Borrowed iv-minor warmth inflection in major', 'songwriter', 'harmony', 8, 'bridge'),
    R('jmd.softened_cadence', 'Resolve on 6/9 or maj9 tonic — not plain triad', 'songwriter', 'harmony', 8, 'chorus'),
    R('jmd.orchestra_frame', 'Orchestra frames soloist; selective countermelodies', 'songwriter', 'form', 8, 'global'),
    R('jmd.hollywood_pacing', 'Scene-aware transitions and softened sectional entrances', 'songwriter', 'form', 7, 'global'),
  ],
  radiohead: [
    R('radiohead.modal_colour', 'Modal harmony + colour shifts', 'songwriter', 'harmony', 7, 'verse'),
    R('radiohead.irregular_form', 'Irregular phrase / form motion', 'songwriter', 'form', 7, 'form'),
    R('radiohead.sync_anchor', 'Syncopated melodic anchors', 'songwriter', 'rhythm', 7, 'global'),
    R('radiohead.vl_parallel_ok', 'RH_VL_01 parallel fifths/octaves expressive', 'songwriter', 'harmony', 8, 'global'),
    R('radiohead.vl_chromatic_inner', 'RH_VL_02 chromatic inner voices / mediants', 'songwriter', 'harmony', 8, 'verse'),
    R('radiohead.vl_pedal_upper', 'RH_VL_03 static bass pedal upper harmony shift', 'songwriter', 'harmony', 8, 'verse'),
    R('radiohead.vl_strings_extended', 'RH_VL_04–05 Greenwood strings extended techniques + registers', 'songwriter', 'melody', 8, 'chorus'),
    R('radiohead.vl_bass_counter_melody', 'RH_VL_06 Colin bass dual melodic layer', 'songwriter', 'melody', 8, 'global'),
    R('radiohead.mel_semitone_led', 'RH_MEL_01 semitone-led melody + leap peaks', 'songwriter', 'melody', 8, 'verse'),
    R('radiohead.mel_narrow_centre', 'RH_MEL_02 obsessive pitch-centre orbit', 'songwriter', 'melody', 8, 'verse'),
    R('radiohead.mel_outside_modal', 'RH_MEL_03 deliberate chromatic clash vs modal harmony', 'songwriter', 'melody', 8, 'chorus'),
    R('radiohead.mel_falsetto_break', 'RH_MEL_04 falsetto break phrase boundary', 'songwriter', 'melody', 8, 'global'),
    R('radiohead.mel_acoustic_electronic', 'RH_MEL_05 acoustic vs electronic melodic mode', 'songwriter', 'melody', 8, 'global'),
    R('radiohead.rhythm_early_backbeat', 'RH_RHYTHM_01 early period standard backbeat / suppress odd meters', 'songwriter', 'rhythm', 8, 'global'),
    R('radiohead.rhythm_odd_meters', 'RH_RHYTHM_02 middle/late asymmetric meters', 'songwriter', 'rhythm', 8, 'verse'),
    R('radiohead.rhythm_meter_mutation', 'RH_RHYTHM_03 meter change within song / bar as unit', 'songwriter', 'rhythm', 8, 'form'),
    R('radiohead.rhythm_polyrhythm', 'RH_RHYTHM_04 guitar polyrhythm vs drums', 'songwriter', 'rhythm', 8, 'global'),
    R('radiohead.rhythm_ostinato_layer', 'RH_RHYTHM_05 electronic ostinato independent layer', 'songwriter', 'rhythm', 8, 'chorus'),
    R('radiohead.rhythm_bass_syncopation', 'RH_RHYTHM_06 bass offbeat vs melody interlock', 'songwriter', 'rhythm', 8, 'global'),
    R('radiohead.orch_period_palette', 'RH_ORCH_01 period instrumentation gate (core / +electronics / strings+electronics)', 'songwriter', 'harmony', 8, 'global'),
    R('radiohead.orch_strings_percussion', 'RH_ORCH_02 strings as percussion col legno', 'songwriter', 'harmony', 8, 'chorus'),
    R('radiohead.orch_layering', 'RH_ORCH_03 electronic acoustic structural layering', 'songwriter', 'harmony', 8, 'verse'),
    R('radiohead.orch_killswitch', 'RH_ORCH_04 killswitch guitar stutter climax', 'songwriter', 'melody', 8, 'chorus'),
    R('radiohead.orch_microtonal', 'RH_ORCH_05 optional microtonal guitar flag', 'songwriter', 'melody', 8, 'global'),
    R('radiohead.fp_harmonic', 'RH_FP_01 full harmonic fingerprint when four components align', 'songwriter', 'harmony', 9, 'global'),
    R('radiohead.fp_rhythmic', 'RH_FP_02 full rhythmic fingerprint when four components align', 'songwriter', 'rhythm', 9, 'global'),
    R('radiohead.fp_orchestral', 'RH_FP_03 full orchestral fingerprint when five components align', 'songwriter', 'harmony', 9, 'chorus'),
  ],
  blur: [
    R('blur.brit_hook', 'Brit-pop hook emphasis', 'songwriter', 'hook', 8, 'chorus'),
    R('blur.section_punch', 'Sectional punches', 'songwriter', 'form', 7, 'form'),
    R('blur.diatonic_bite', 'Diatonic harmony with bite', 'songwriter', 'harmony', 7, 'verse'),
  ],
  pavement: [
    R('pavement.loose_cells', 'Loose melodic cells', 'songwriter', 'melody', 7, 'verse'),
    R('pavement.indie_form', 'Non-linear indie form', 'songwriter', 'form', 6, 'global'),
    R('pavement.dry_phrase', 'Dry vocal phrasing', 'songwriter', 'lyric', 7, 'verse'),
  ],
  sonic_youth: [
    R('sy.noise_space', 'Noise vs space contrast', 'songwriter', 'form', 8, 'form'),
    R('sy.angular_riff', 'Angular guitar riff logic', 'songwriter', 'melody', 7, 'verse'),
    R('sy.alt_tuning', 'Alternate tuning colour', 'songwriter', 'harmony', 7, 'global'),
  ],
  arcade_fire: [
    R('af.anthem_hook', 'Anthemic chorus lift', 'songwriter', 'hook', 8, 'chorus'),
    R('af.dynamics_arc', 'Dynamic section arcs', 'songwriter', 'form', 8, 'form'),
    R('af.repetition_build', 'Repetition builds tension', 'songwriter', 'hook', 7, 'chorus'),
  ],
  wayne_shorter: [
    R(
      'shorter.blue_note_period',
      'Blue Note period (Speak No Evil, Juju, Witch Hunt): non-functional neighbour and passing chords as maj7/min7/sus with roots moving by step or third around an implicit tonal centre; freely omit 3rd or 5th; prefer 9/11/13 in upper voices; wrong bass on extensions or non-root scale degrees (minor third or tritone from root); chromatic mediant shifts without functional preparation; Footprints-style successive upper/lower embellishing chords around an axis; motif-derived chord sequences where a 2–3 note melodic cell defines root-motion intervals.',
      'songwriter',
      'harmony',
      9,
      'global'
    ),
    R(
      'shorter.classic_quartet_period',
      'Classic quartet (Nefertiti, E.S.P., Miyako, Infant Eyes): harmonic plateaus (2–8 bars) for extended motivic work; plateaus relate by non-functional thirds, tritones, or seconds — not dominant–tonic pairs; sus chords as stable sonorities (sus4 with 9 and 13, no obligatory 4–3); melody-orbit harmony — for focal melodic pitches choose chord families where that pitch is 3rd, 5th, 7th, 9th, or 11th; asymmetric phrases with 1–2 beat breathing spaces; anti-periodic form with displaced returns; through-composed ballad arcs with fragment-only repetition.',
      'songwriter',
      'harmony',
      9,
      'global'
    ),
    R(
      'shorter.late_period',
      'Late period (21st-century quartet, Emanon): long plateaus from texture, axis pitch, pedal, and registral bands; pandiatonic non-functional chord fields with parallel or near-parallel cluster motion; open form — sections chained by texture rules rather than fixed chorus; orchestral colour — strings/ensemble swirls, pedals, planed voicings under motivic lead; broad pandiatonic colour shifts (Copland / Vaughan Williams resonance).',
      'songwriter',
      'harmony',
      9,
      'global'
    ),
    R(
      'wayne_shorter.ws_harm_grammar',
      'WS_HARM_* harmonic grammar receipts (`wayneShorterHarmonicGrammarReceipts`) — lateral roots, mediant brass proxy, axis bass, quartal/sus, ws:wedge wedge, neighbour devices (`applyWayneShorterHarmonicGrammarReceipts`).',
      'songwriter',
      'harmony',
      9,
      'global'
    ),
    R(
      'wayne_shorter.ws_mel_grammar',
      'WS_MEL_* melodic grammar receipts (`wayneShorterMelodicGrammarReceipts`) — hook-first cells, wide-leap d3 proxy, floating phrase toes from device bar placement (`applyWayneShorterMelodicGrammarReceipts`).',
      'songwriter',
      'melody',
      8,
      'global'
    ),
    R(
      'wayne_shorter.ws_rhythm_grammar',
      'WS_RHYTHM_* rhythm grammar receipts (`wayneShorterRhythmGrammarReceipts`) — metric float, ensemble independence, structural space / plateau (`applyWayneShorterRhythmGrammarReceipts`).',
      'songwriter',
      'rhythm',
      8,
      'global'
    ),
    R(
      'wayne_shorter.ws_form_grammar',
      'WS_FORM_* form/orchestration grammar receipts (`wayneShorterFormGrammarReceipts`) — through-composed seams, role-swap diversity (`applyWayneShorterFormGrammarReceipts`).',
      'songwriter',
      'form',
      8,
      'global'
    ),
    R(
      'wayne_shorter.ws_fp_fingerprint',
      'WS_FP_* composite fingerprint gate firings (`wayneShorterFingerprintReceipts`) when layered grammar receipts satisfy WS_FP_01–03 AND rules (`applyWayneShorterFingerprintReceipts`).',
      'songwriter',
      'form',
      9,
      'global'
    ),
  ],
  jim_hall: [
    R(
      'hall.shell_guide_tone',
      'Shell + one economy — guide tones present, root implied by bass, fifth omitted unless altered (`jh:shell_economy`)',
      'songwriter',
      'harmony',
      9,
      'global'
    ),
    R(
      'hall.inner_chromatic',
      'Inner chromatic strand — one mid voice moves by semitone per bar while outer lines favour steps/thirds (`jh:inner:chromatic`)',
      'songwriter',
      'harmony',
      8,
      'verse'
    ),
    R(
      'hall.duo_counter',
      'Duo counterpoint — bass / inner line / melody treated as independent sparse strands (`contrapuntalMode`)',
      'songwriter',
      'melody',
      8,
      'global'
    ),
  ],
  pat_metheny: [
    R(
      'metheny.ecm_early_period',
      'ECM early (Bright Size Life, Phase Dance): modal spacious harmony — simpler diatonic fields; harmonic rhythm very slow (often one colour per 2–4 bars); palette maj7 / min7 / add9 / sus2–sus4 with 9/13 as stable colours not “tensions”; Lydian default on major — maj7(#11) preferred over plain maj7; avoid dominant chains / strong V–I — roots move by step or third; Phase Dance model: modal centre over pedal with colour shifts via add9/add11/sus rather than functional progression; cadences float to IV, luminous add9 landings, or vamp fade — not textbook resolution; phrase space via rests and long sustains; melodic phrasing breathes like a singer.',
      'songwriter',
      'harmony',
      9,
      'global'
    ),
    R(
      'metheny.classic_pmg_period',
      'Classic PMG (First Circle, Letter From Home, Still Life, The Way Up): extended diatonic / mixed-modal progressions with predominantly stepwise or third-wise roots — bIImaj7(#11), bVImaj7 as colour Lydian/Dorian overlays on unexpected chord types; sus chords as stable plateaus not pre-dominants; Brazilian bossa/samba/baião rhythmic inflection under lush major/add9 motion; odd meters (9/8, 22/8, 15/8) with melody crossing barlines so flow dominates meter; episodic form — sections linked by motives + shared harmonic language with recurring themes reharmonized; large-scale tension/release arches via registral and textural climaxes.',
      'songwriter',
      'harmony',
      9,
      'global'
    ),
    R(
      'metheny.orchestral_period',
      'Orchestral (Secret Story, Orchestrion, Road to the Sun): expanded ensemble — extended major/modal harmony persists; layered ostinati in conflicting meters building long-span rhythmic fields; stratified orchestration: low voices hold roots/fifths, mid-register colours 3/7/9, high strands #11/13/melody; open-string guitar geometry → orchestral parallel: harmonics, sustained 9/#11 in strings, parallel triads over static bass (constant structures); Orchestrion-like multiple tight loops in separate registers; through-composed suite recurrence with solo episodes condensing the piece’s harmonic DNA; Americana / landscape melody — simple pentatonic or hymn-like cells inside sophisticated modal harmony.',
      'songwriter',
      'harmony',
      9,
      'global'
    ),
  ],
  bill_evans: [
    R('evans.singing_line', 'Singing melodic line over rich harmony (placeholder)', 'songwriter', 'melody', 8, 'verse'),
    R('evans.rootless_colour', 'Rootless / shell voicing colour (placeholder)', 'songwriter', 'harmony', 8, 'global'),
    R('evans.ballad_arc', 'Ballad narrative arc; bridge lift (placeholder)', 'songwriter', 'form', 7, 'form'),
  ],
  andrew_hill: [
    R(
      'hill.interval_cells',
      'Interval-cell / tritone harmonic field motion (slice d1 `ah:tritone_root` — angular root displacement on non-dominant chords)',
      'songwriter',
      'melody',
      8,
      'global'
    ),
    R(
      'hill.asymmetric_phrase',
      'Asymmetric phrase grid vs ostinato / pedal spans (slice d4 `ah:pedal_center` — 2–4 bar bass-axis locks)',
      'songwriter',
      'form',
      8,
      'form'
    ),
    R(
      'hill.ambiguous_field',
      'Ambiguous tonal fields — sus/cluster stripping, dominant suppression, non-functional m7/m11 (slice d2/d3/d5 `ah:sus_cluster`, `ah:dom_suppress`, `ah:nonfunctional_m7`)',
      'songwriter',
      'harmony',
      8,
      'verse'
    ),
  ],
  charlie_parker: [
    R(
      'parker.ii_v_clarify',
      'ii–V spelling clarity — clean Xm7 + dominant colour (`cp:ii_v_clarify`)',
      'songwriter',
      'harmony',
      9,
      'global'
    ),
    R(
      'parker.tritone_sub',
      'Isolated dominant tritone substitution (`cp:tritone_sub`)',
      'songwriter',
      'harmony',
      9,
      'verse'
    ),
    R(
      'parker.turnaround_compress',
      'Turnaround tail compression — bVII7 / plain ii (`cp:turnaround_compress`)',
      'songwriter',
      'harmony',
      8,
      'form'
    ),
    R(
      'parker.bebop_enrich',
      'maj7(#11) / m9 bebop extensions (`cp:bebop_enrich`)',
      'songwriter',
      'harmony',
      8,
      'global'
    ),
    R(
      'parker.bird_enclosure',
      'Leading-tone slash approach into tonic (`cp:bird_enclosure`)',
      'songwriter',
      'harmony',
      8,
      'chorus'
    ),
  ],
  angelo_badalamenti: [
    R('bad.hypnotic_loop', 'Hypnotic modal loop / chromatic inner lines (harmonic voice tags)', 'songwriter', 'harmony', 8, 'global'),
    R('bad.minor_major_colour', 'Minor–major 7 dream-jazz surfaces (harmonic voice tags)', 'songwriter', 'harmony', 8, 'verse'),
    R('bad.noir_ballad_pocket', 'Cool jazz ballad pocket behind the beat (harmonic voice tags)', 'songwriter', 'rhythm', 7, 'global'),
  ],
  bernard_herrmann: [
    R('bh.cluster_strings', 'Parallel cluster string voicings (harmonic voice tags)', 'songwriter', 'harmony', 9, 'global'),
    R('bh.diminished_axis', 'Diminished / chromatic sequence vocabulary (harmonic voice tags)', 'songwriter', 'harmony', 9, 'verse'),
    R('bh.motor_ostinato', 'Motor ostinato anxiety grid (harmonic voice tags)', 'songwriter', 'rhythm', 8, 'global'),
  ],
  ennio_morricone: [
    R('mo.modal_epic', 'Modal pastoral / cadential avoidance (harmonic voice tags)', 'songwriter', 'harmony', 8, 'global'),
    R('mo.parallel_planing', 'Parallel planing / open fifth pads (harmonic voice tags)', 'songwriter', 'harmony', 8, 'verse'),
    R('mo.pedal_narrative', 'Pedal-tone narrative arcs (harmonic voice tags)', 'songwriter', 'form', 8, 'form'),
  ],
  john_williams: [
    R('jw.heroic_brass', 'Triadic brass cadential vocabulary (harmonic voice tags)', 'songwriter', 'harmony', 8, 'global'),
    R('jw.lydian_colour', 'Lydian / modal brightening (harmonic voice tags)', 'songwriter', 'harmony', 8, 'verse'),
    R('jw.leitmotif_return', 'Leitmotif anchor returns (harmonic voice tags)', 'songwriter', 'form', 8, 'chorus'),
  ],
  nino_rota: [
    R('nr.waltz_glue', 'Waltz harmonic framing (harmonic voice tags)', 'songwriter', 'harmony', 8, 'global'),
    R('nr.carnival_band', 'Bright diatonic parallel motion (harmonic voice tags)', 'songwriter', 'harmony', 8, 'verse'),
    R('nr.cantilena', 'Melancholy cantilena minor colour (harmonic voice tags)', 'songwriter', 'melody', 8, 'global'),
  ],
  jerry_goldsmith: [
    R('jg.polytonal_action', 'Polytonal action stacks (harmonic voice tags)', 'songwriter', 'harmony', 9, 'global'),
    R('jg.quartal_suspense', 'Quartal / symmetric suspense (harmonic voice tags)', 'songwriter', 'harmony', 9, 'verse'),
    R('jg.rhythm_ostinato', 'Mixed-meter ostinato drive (harmonic voice tags)', 'songwriter', 'rhythm', 8, 'global'),
  ],
  lalo_schifrin: [
    R(
      'schifrin.groove_engine',
      'Groove-native motor energy — percussion grid + brass attack + odd-meter riff accents (`ls:*`)',
      'songwriter',
      'rhythm',
      9,
      'global'
    ),
    R(
      'schifrin.modal_vamp',
      'Modal altered vamps locked to percussion grid — no classical cadential closure',
      'songwriter',
      'harmony',
      9,
      'global'
    ),
    R(
      'schifrin.motivic_cell',
      '1–2 bar motivic cells sequenced and re-accented — not extended romantic melody',
      'songwriter',
      'melody',
      8,
      'verse'
    ),
  ],
  john_barry: [
    R('jbr.thematic_monolith', 'One theme supplies harmonic identity across large sections', 'songwriter', 'form', 9, 'global'),
    R('jbr.bond_palette', 'min(maj7)/min6/Bond chord palette + 2-chord ostinato', 'songwriter', 'harmony', 9, 'verse'),
    R('jbr.block_brass', 'Block brass declaration — weight and glare not counterpoint', 'songwriter', 'melody', 9, 'chorus'),
    R('jbr.string_mass', 'String emotional mass — sustained planes and octave doubling', 'songwriter', 'melody', 8, 'verse'),
    R('jbr.melodic_nobility', 'Long declarative arcs with Bond 3–4 note brass cells', 'songwriter', 'melody', 8, 'global'),
    R('jbr.climax_accumulation', 'Climax by repetition + bloom + register expansion', 'songwriter', 'form', 8, 'bridge'),
  ],
  philip_glass: [
    R('pg.additive_cell', 'Additive pattern extension (harmonic voice tags)', 'songwriter', 'harmony', 8, 'global'),
    R('pg.pedal_field', 'Static pedal under shifting harmony (harmonic voice tags)', 'songwriter', 'harmony', 8, 'verse'),
    R('pg.modal_loop', 'Modal loop stasis (harmonic voice tags)', 'songwriter', 'form', 7, 'global'),
  ],
  steve_reich: [
    R(
      'reich.pitch_field',
      'Pitch-field process — harmony from phasing/additive drift inside one diatonic field (`sr:phase_hold`, `sr:field_anchor`)',
      'songwriter',
      'harmony',
      9,
      'global'
    ),
    R(
      'reich.static_rhythm',
      'Dense pulse grid over extremely slow harmonic rhythm (`steveReichPulseGridDensity`)',
      'songwriter',
      'rhythm',
      9,
      'global'
    ),
    R(
      'reich.quartal_emerge',
      'Quartal/sus sonorities from field grammar — not functional cadences (`maybeQuartalSusColour`)',
      'songwriter',
      'harmony',
      8,
      'verse'
    ),
  ],
  fripp_king_crimson: [
    R(
      'fk.asymmetric_cycle',
      'Additive asymmetric pulse cycles — Fripp/KC presets (`asymmetricPresets`) + optional polymeter LCM receipt (`frippPolymeterGrid`)',
      'songwriter',
      'rhythm',
      9,
      'global'
    ),
    R(
      'fk.third_cycle_roots',
      'Major/minor third root cycles — quartal/sus surfaces; de-prioritise functional V→I (`frippKingCrimsonSlice`)',
      'songwriter',
      'harmony',
      9,
      'global'
    ),
    R(
      'fk.symmetric_collections',
      'Whole-tone / octatonic pitch-field bias with bass-root anchoring',
      'songwriter',
      'harmony',
      8,
      'verse'
    ),
  ],
  hans_zimmer: [
    R('hz.epic_ostinato', 'Low-register ostinato engine (harmonic voice tags)', 'songwriter', 'harmony', 8, 'global'),
    R('hz.hybrid_stack', 'Layered orchestral pad vocabulary (harmonic voice tags)', 'songwriter', 'harmony', 8, 'chorus'),
    R('hz.mediant_drift', 'Mediantic lateral shifts (harmonic voice tags)', 'songwriter', 'harmony', 8, 'verse'),
  ],
  quincy_jones_film: [
    R('qjf.film_groove', 'Film soundtrack groove-first jazz arranging (harmonic voice tags)', 'songwriter', 'rhythm', 8, 'global'),
    R('qjf.turnaround_language', 'Turnaround / extended dominant film vocabulary (harmonic voice tags)', 'songwriter', 'harmony', 8, 'global'),
    R('qjf.big_band_spread', 'Big-band spread voicings (harmonic voice tags)', 'songwriter', 'harmony', 8, 'chorus'),
  ],
  john_coltrane: [
    R(
      'coltrane.era_changes',
      'Classic changes period — augmented triad tonal centres, rapid ii–V modulatory cycles, maj7(#11) / altered dominants; cadences defer to next cycle centre',
      'songwriter',
      'harmony',
      9,
      'global'
    ),
    R(
      'coltrane.era_modal',
      'Modal period — Dorian/Lydian pedals, quartal Tyner voicings, 9/11/13 emphasis, pentatonic superimposition',
      'songwriter',
      'harmony',
      9,
      'verse'
    ),
    R(
      'coltrane.era_free',
      'Late free period — cluster / symmetric collections over pedal, registral texture over functional harmony',
      'songwriter',
      'harmony',
      9,
      'form'
    ),
  ],
  frank_zappa: [
    R(
      'zappa.polytonal_superimposition',
      'Polytonal superimposition — layered centres / upper-structure clash (placeholder)',
      'songwriter',
      'harmony',
      9,
      'global'
    ),
    R(
      'zappa.metric_displacement',
      'Metric displacement — melody vs underlying meter (placeholder)',
      'songwriter',
      'melody',
      8,
      'global'
    ),
    R(
      'zappa.xenochrony_pitch_offset',
      'Xenochrony pitch offset — composite timeline vocabulary (placeholder)',
      'songwriter',
      'melody',
      7,
      'verse'
    ),
    R(
      'zappa.through_composed_form',
      'Through-composed form — weak sectional repetition grids (placeholder)',
      'songwriter',
      'form',
      9,
      'global'
    ),
    R(
      'zappa.style_juxtaposition',
      'Style juxtaposition — abrupt sectional vocabulary shifts (placeholder)',
      'songwriter',
      'harmony',
      8,
      'chorus'
    ),
    R(
      'zappa.angular_interval_preference',
      'Angular interval preference — wide leaps + chromatic cells (placeholder)',
      'songwriter',
      'melody',
      8,
      'global'
    ),
    R(
      'zappa.no_clean_cadential_resolution',
      'No clean cadential resolution — avoid textbook tonic closures (placeholder)',
      'songwriter',
      'harmony',
      7,
      'global'
    ),
  ],
  antonio_carlos_jobim: [
    R('jobim.bossa_extensions', 'Brazilian extended tonic / altered dominant colours (placeholder)', 'songwriter', 'harmony', 9, 'global'),
    R('jobim.descending_bass', 'Descending bass-line grammar (placeholder)', 'songwriter', 'harmony', 8, 'verse'),
    R('jobim.line_led_resolution', 'Voice-led cadences vs textbook ii–V packs (placeholder)', 'songwriter', 'harmony', 9, 'chorus'),
    R('jobim.soft_terminal', 'Terminal 6/9 / maj6 resting colours over blunt maj7 (placeholder)', 'songwriter', 'harmony', 8, 'form'),
  ],
  herbie_hancock: [
    R('hancock.sus_field', 'Suspended tonic/dominant ambiguity fields (placeholder)', 'songwriter', 'harmony', 9, 'global'),
    R('hancock.altered_dom', 'Altered dominant colour regions vs literal V7 (placeholder)', 'songwriter', 'harmony', 9, 'verse'),
    R('hancock.pedal_upper', 'Pedal bass / upper-structure slash colours (placeholder)', 'songwriter', 'harmony', 8, 'verse'),
    R('hancock.form_reroute', 'Formal return blur vs orthodox turnaround (placeholder)', 'songwriter', 'harmony', 8, 'form'),
  ],
  henry_threadgill: [
    R(
      'threadgill.interval_system_harmony',
      'Harmony from interval sets — not chord-scale rows: three-note seed cell generates a closed family of six voicings; all voices move only with intervals from the active pool; no ii–V–I, no functional grammar, no chord–scale mapping; sparse three-note cells across registral bands; favour dissonant steps (m2, M2, m3, tritone, m7); reserve unisons/octaves/P5 for cadential convergence; rotate through the six-cell family sequentially.',
      'songwriter',
      'harmony',
      9,
      'global'
    ),
    R(
      'threadgill.orchestration_system',
      'Orchestration-as-system: unique registral band + role per strand — low anchor (tuba/bass) moves melodically via interval sets; mid guitars/saxes articulate hockets and splits; high horns/violin sustain intervals and mosaic counterpoint; avoid homogeneous blocks; hockets stagger attacks; concurrent duets with independent streams; tutti unisons/octaves only as structural pillars; blues/march seeds fragmented and interval-transformed across instruments.',
      'songwriter',
      'harmony',
      9,
      'form'
    ),
    R(
      'threadgill.anti_metric_rhythm',
      'Anti-metric rhythm: drums avoid locking accents to bar 1 of melodic strata; polyrhythmic loops of mismatched lengths (e.g. five-beat drum cycle over 4/4 material; seven-beat loop over 3/4); independent metric streams per layer; rare probabilistic locks only at formal seams; no conventional swing ride ↔ horn accent coupling; march/second-line idioms fragmented via displacement, hocket, and metric independence.',
      'songwriter',
      'rhythm',
      9,
      'global'
    ),
  ],
  count_basie: [
    R(
      'basie.functional_blues',
      'Functional swing blues — I7/IV7 vocabulary, #IVdim passing, ii–V side-slips, dominant 9/13 colour without plain 11th extensions (`cb:*`).',
      'songwriter',
      'harmony',
      9,
      'global'
    ),
    R(
      'basie.riff_head',
      'Riff-first head — 1–2 bar brass/rhythm motives rotated through sections; sparse backgrounds behind solo.',
      'songwriter',
      'form',
      9,
      'verse'
    ),
    R(
      'basie.sparse_comp',
      'Piano / guitar comp stays thin — stabs and offbeat hits; reactive density follows horn lead.',
      'songwriter',
      'rhythm',
      8,
      'global'
    ),
    R(
      'basie.shout_homophony',
      'Shout chorus: tutti homophony reusing head riff material + staged dynamics (sections drop at cadence).',
      'songwriter',
      'form',
      9,
      'chorus'
    ),
    R(
      'basie.basie_button',
      'Basie Button ending grammar — ii–dim–I6/9 tail with static upper voices (encoded on tag bars).',
      'songwriter',
      'harmony',
      8,
      'chorus'
    ),
  ],
  charles_mingus: [
    R(
      'mingus.blues_gospel_harmony',
      'Blues as architecture — variable-length blues blocks (10/12/14/16) with motives persisting across irregular bar counts via gesture; core gospel/blues harmony (I7, IV7, bVI7, V7/IV, VI7), secondary dominants, plagal IV–I; dominant colours with b9/#9, tritone subs, upper-structure tensions; Ellington wrong-quality-over-root moves; dense mid-register horn stacks (2nds/7ths); cadences as collective ensemble arrivals / shout chords / unison gestures — not tidy V–I; allow functional ii–V, chromatic neighbours, and mode switches per section.',
      'songwriter',
      'harmony',
      9,
      'global'
    ),
    R(
      'mingus.chromatic_bass_counterpoint',
      'Bass as primary melodic driver — generate chromatic/contrapuntal bass first and derive harmony above it; walks between structural tones, blues walk-ups, pedals with rubato, ostinati with chromatic fills; 2–3 simultaneous independent lines; inner voices melodically free with chord/blues tones on strong beats and chromatic passing on weak; brass/reeds in call–response with registral/timbral contrast; thirds/sixths for grounding, seconds/sevenths at peaks, fourths/fifths in shout/hymn passages.',
      'songwriter',
      'harmony',
      9,
      'verse'
    ),
    R(
      'mingus.suite_form_collective',
      'Episodic suite form free_intro → extended_blues → collective_pedal → gospel_shout → elegy_coda — not head–solo–head; collective improvisation with multiple agents on 2–3 note motives, distinct pitch pools and rhythms, locking only at hits/unison riffs; gospel shout climax with homophonic brass density and call–response; rotary/displaced accents and 3+3+2 cells over 4/4; drums avoid downbeat lock in free strata; programmatic intensity arc; every eight bars optional 1-bar unison blues riff recentre before returning to collective texture.',
      'songwriter',
      'form',
      9,
      'global'
    ),
  ],
  stephen_sondheim: [
    R('sondheim.dissonant_tonality', 'Chromatic surface over retained tonal centre (placeholder)', 'songwriter', 'harmony', 9, 'global'),
    R('sondheim.added_note_tertian', 'Non-resolving 2nds/4ths/6ths on tertian harmony (placeholder)', 'songwriter', 'harmony', 9, 'verse'),
    R('sondheim.pedal_stratify', 'Pedal bass vs shifting upper voices (placeholder)', 'songwriter', 'harmony', 8, 'verse'),
    R('sondheim.dramatic_dominant', 'Dominant as trigger — delayed / weighted closure (placeholder)', 'songwriter', 'harmony', 9, 'chorus'),
  ],
  kate_bush: [
    R('kate.chromatic_mediant', 'Chromatic mediant / shared-tone colour moves (placeholder)', 'songwriter', 'harmony', 9, 'global'),
    R('kate.modal_pedal', 'Pedal / drone with shifting upper harmony (placeholder)', 'songwriter', 'harmony', 9, 'verse'),
    R('kate.add_sus_texture', 'Add2/add9/sus prolongations vs dense jazz tertian stacks (placeholder)', 'songwriter', 'harmony', 9, 'verse'),
    R('kate.soft_dominant', 'Sus / modal dominant — rare structural V–I (placeholder)', 'songwriter', 'harmony', 8, 'chorus'),
  ],
  thelonious_monk: [
    R('monk.b9_dominant', '7b9 / altered dominant as primary V colour (placeholder)', 'songwriter', 'harmony', 9, 'global'),
    R('monk.tritone_region', 'Tritone sub / deferred cadence vs smooth V–I (placeholder)', 'songwriter', 'harmony', 9, 'chorus'),
    R('monk.strip_lush', 'Strip maj9/13 lush stacks — angular tertian only (placeholder)', 'songwriter', 'harmony', 9, 'verse'),
    R('monk.semitone_motion', 'Semitone / whole-step root motion bias vs circle-of-fifths default (placeholder)', 'songwriter', 'harmony', 8, 'verse'),
  ],
  cole_porter: [
    R('cp.chromatic_descent', 'Pre-cadential chromatic descending bass (`cp:chrom_descent`)', 'songwriter', 'harmony', 9, 'global'),
    R('cp.diatonic_density', 'Secondary dominant / passing chord density (`cp:diatonic_density`)', 'songwriter', 'harmony', 8, 'verse'),
    R('cp.bvi_color', 'bVI colour before cadence (`cp:bvi_color`)', 'songwriter', 'harmony', 7, 'chorus'),
    R('cp.beguine_feel', 'Beguine-aligned eighth-syncopation bass pocket (`cp:beguine`)', 'songwriter', 'rhythm', 7, 'global'),
    R('cp.vrb_bundle', 'Cole Porter VRB (`CP_*` ≥30 fingerprint receipts; chromatic bass + mixture + speech-elegant melody)', 'songwriter', 'harmony', 9, 'global'),
  ],
  miles_davis: [
    R('md.modal_center', 'Modal centre spans — Dorian / Mixolydian field locks (`md:modal_center`)', 'songwriter', 'harmony', 9, 'global'),
    R('md.space_silence', 'Breath space vs fill — cool phrasing bias (`md:cool_phrase`)', 'songwriter', 'rhythm', 9, 'global'),
    R('md.time_no_changes', 'Suspended / ambiguous harmony regions (`md:time_no_changes`)', 'songwriter', 'harmony', 8, 'form'),
    R('md.cool_phrasing', 'Mid-register sparse melodic pacing (`md:cool_phrase`)', 'songwriter', 'melody', 8, 'verse'),
  ],
  mccoy_tyner: [
    R('mt.quartal_colour', 'Bare tertians → m11/sus4 quartal palette (`mt:quartal_colour`)', 'songwriter', 'harmony', 9, 'global'),
    R('mt.pentatonic_cluster', 'Pentatonic sus9 / 6/9 clusters (`mt:pentatonic_cluster`)', 'songwriter', 'harmony', 9, 'verse'),
    R('mt.modal_minor_pedal', 'Modal minor m11 pedal fields (`mt:modal_minor_pedal`)', 'songwriter', 'harmony', 8, 'global'),
    R('mt.iv_quartal', 'IV-rooted quartal stacks over minor tonality (`mt:iv_quartal`)', 'songwriter', 'harmony', 9, 'chorus'),
    R('mt.dominant_sus', 'Plain dominants → 9sus4 / 13sus4 comping colour (`mt:dominant_sus`)', 'songwriter', 'harmony', 7, 'bridge'),
  ],
  bartok: [
    R('bk.axis_substitution', 'Minor-third / symmetric axis substitution vs functional ii–V (`bk:axis_substitution`)', 'songwriter', 'harmony', 9, 'global'),
    R('bk.golden_section', 'Golden-section climax bar colour (`bk:golden_section_climax`)', 'songwriter', 'form', 8, 'form'),
    R('bk.bulgarian_rhythm', 'Additive accent receipts (`bk:bulgarian_rhythm`)', 'songwriter', 'rhythm', 8, 'global'),
    R('bk.interval_cell', 'Interval-cell transposition (`bk:interval_cell_transform`)', 'songwriter', 'harmony', 8, 'verse'),
    R('bk.arch_mirror', 'Arch-form mirrored swap (`bk:arch_form_mirror`)', 'songwriter', 'form', 7, 'bridge'),
  ],
  berg: [
    R('ab.row_module', 'Row segment tags triadic-tonal / whole-tone / chromatic-link (`ab:row_module`)', 'songwriter', 'harmony', 9, 'global'),
    R('ab.hexachord_pr', 'Hexachord halves + P/R/I/RI preference (`ab:hexachord`)', 'songwriter', 'harmony', 9, 'global'),
    R('ab.trichord_motif', 'Shared trichord index across derived rows (`ab:trichord_motif`)', 'songwriter', 'melody', 8, 'verse'),
    R('ab.climax_density', 'Climax funnel 0.6–0.7 via density + ic1/ic6 emphasis (`ab:climax`)', 'songwriter', 'form', 8, 'form'),
    R('ab.structural_silence', 'Silence / fermata punctuation tags (`ab:silence`)', 'songwriter', 'form', 7, 'global'),
  ],
  gershwin: [
    R('gg.aaba_form', 'AABA / rhapsody section anchors (`gg:d1_aaba_form`)', 'songwriter', 'form', 8, 'form'),
    R('gg.blue_note_color', 'Blue-note harmonic tint on cadential colours (`gg:d2_blue_note_color`)', 'songwriter', 'harmony', 8, 'global'),
    R('gg.syncopated_anticipation', 'Secondary dominant anticipation (`gg:d3_syncopated_anticipation`)', 'songwriter', 'harmony', 8, 'verse'),
    R('gg.chromatic_passing', 'Diminished passing connectors (`gg:d4_chromatic_passing`)', 'songwriter', 'harmony', 8, 'global'),
    R('gg.minor_third_modulation', 'Brief minor-third axis shift (`gg:d5_minor_third_modulation`)', 'songwriter', 'harmony', 7, 'bridge'),
    R('gg.vrb_bundle', 'George Gershwin VRB (`GG_*` ≥30 fingerprint receipts; functional jazz + AABA/rhapsody)', 'songwriter', 'harmony', 9, 'global'),
  ],
  arvo_part: [
    R('ap.tintinnabuli_voice', 'T-voice mapped from M-voice against triad tones (`ap:d1_tintinnabuli_voice`)', 'songwriter', 'harmony', 9, 'global'),
    R('ap.silence_as_structure', 'Held harmony / harmonic rest bars (`ap:d2_silence_as_structure`)', 'songwriter', 'harmony', 8, 'verse'),
    R('ap.additive_rhythm', 'Additive pulse scaffolding (`ap:d3_additive_rhythm`)', 'songwriter', 'rhythm', 8, 'global'),
    R('ap.register_arch', 'Golden-section register climax hint (`ap:d4_register_arch`)', 'songwriter', 'form', 7, 'form'),
    R('ap.triadic_transformation', 'Uniform triadic transforms / parallel pairs (`ap:d5_triadic_transformation`)', 'songwriter', 'harmony', 8, 'global'),
    R('ap.sq_vrb_bundle', 'Arvo Pärt tintinnabuli SQ VRB (`AP_*` fingerprint receipts; M+T dual voice)', 'songwriter', 'harmony', 9, 'global'),
  ],
  satie: [
    R('sat.static_field', 'Harmonic prolongation / frozen field bars (`es:d1_static_field`)', 'songwriter', 'harmony', 9, 'global'),
    R('sat.parallel_planning', 'Uniform chromatic parallel planning windows (`es:d2_parallel_planning`)', 'songwriter', 'harmony', 9, 'verse'),
    R('sat.cell_repetition', 'Two-bar harmonic cell echo (`es:d3_cell_repetition`)', 'songwriter', 'form', 8, 'verse'),
    R('sat.texture_form', 'Sparse texture form hinge receipts (`es:d4_texture_form`)', 'songwriter', 'form', 7, 'form'),
    R('sat.modal_collection', 'White-collection modal pitch receipts (`es:d5_modal_collection`)', 'songwriter', 'harmony', 8, 'global'),
    R('es.sq_vrb_bundle', 'Erik Satie VRB bundle (`ES_*` ≥30 fingerprint receipts; Gymnopédies / Gnossiennes / furniture / Parade / Socrate)', 'songwriter', 'harmony', 9, 'global'),
  ],
  /** SQ VRB family — registry stubs; deep grammar in `voiceRuleBundles.ts`. */
  beethoven_late: [
    R('bv.sq_vrb_bundle', 'Beethoven late SQ VRB bundle (`BV_*` ≥30 fingerprint receipts)', 'songwriter', 'harmony', 9, 'global'),
  ],
  turtle_island: [
    R('ti.sq_vrb_bundle', 'Turtle Island Quartet SQ VRB bundle (`TI_*` 88 fingerprint receipts; SQ-jazz bridge)', 'songwriter', 'harmony', 9, 'global'),
  ],
  reich_glass: [
    R('rg.sq_vrb_bundle', 'Reich/Glass minimalist SQ VRB bundle (`RG_*` 89 fingerprint receipts; phase + additive process)', 'songwriter', 'harmony', 9, 'global'),
  ],
  lachenmann: [
    R('lc.sq_vrb_bundle', 'Lachenmann SQ VRB bundle (`LC_*` 84 fingerprint receipts; musique concrète instrumentale)', 'songwriter', 'harmony', 9, 'global'),
  ],
  ligeti: [
    R('lg.sq_vrb_bundle', 'Ligeti SQ VRB bundle (`LG_*` 70 fingerprint receipts; micropolyphony / texture-as-harmony; SQ1 G4 cell + SQ2 five-movement)', 'songwriter', 'harmony', 9, 'global'),
  ],
  crumb_black_angels: [
    R('cb.sq_vrb_bundle', 'Crumb (Black Angels) SQ VRB bundle (`CB_*` 72 fingerprint receipts; ritual / symbolic; 13 images × 3 parts; numerology 7/13; quotations + symbolic technique states)', 'songwriter', 'harmony', 9, 'global'),
  ],
  dutilleux: [
    R('dx.sq_vrb_bundle', 'Dutilleux SQ VRB bundle (`DX_*` 83 fingerprint receipts; French modernist memory-form; focal hexachord HC0; memory parenthèses; gradual growth)', 'songwriter', 'harmony', 9, 'global'),
  ],
  ornette_coleman: [
    R('oc.harmolodic_vrb', 'Ornette Coleman harmolodic VRB (`OC_*` fingerprint receipts; pitch field + pulse; democratic lines)', 'songwriter', 'harmony', 9, 'global'),
  ],
};

/** Phase E — riff VRB rule families (additive; σ receipt + cloned family rules). */
function wireRiffVrbSongwriterRules(): void {
  const rules = songwriterRules as Record<string, SongwritingRuleEntry[]>;
  const jb = songwriterRules.james_brown ?? [];
  const prince = songwriterRules.prince ?? [];
  const metheny = songwriterRules.pat_metheny ?? [];
  const fripp = songwriterRules.fripp_king_crimson ?? [];
  rules.nile_rodgers = [
    R('riff.nile_rodgers.sigma', 'Riff VRB σ22 — funk pocket (reuses james_brown rule family)', 'songwriter', 'rhythm', 8, 'global'),
    ...jb,
  ];
  rules.larry_carlton = [
    R('riff.larry_carlton.sigma', 'Riff VRB σ24 — fusion-funk guitar (reuses james_brown rule family)', 'songwriter', 'rhythm', 8, 'global'),
    ...jb,
  ];
  rules.sly_stone = [
    R('riff.sly_stone.sigma', 'Riff VRB σ24 — Sly call-response (reuses james_brown rule family)', 'songwriter', 'rhythm', 8, 'global'),
    ...jb,
  ];
  rules.iommi = [
    R('riff.iommi.sigma', 'Riff VRB σ26 — rock riff cells (reuses prince rule family)', 'songwriter', 'rhythm', 8, 'global'),
    ...prince,
  ];
  rules.wes_montgomery = [
    R(
      'riff.wes_montgomery.sigma',
      'Riff VRB σ25 — octave jazz line + bebop-blues riff cells (reuses pat_metheny rule family)',
      'songwriter',
      'melody',
      8,
      'global'
    ),
    ...metheny,
  ];
  rules.joe_pass = [
    R(
      'riff.joe_pass.sigma',
      'Riff VRB σ24 — fingerstyle chord-melody + chromatic bebop line (reuses pat_metheny rule family)',
      'songwriter',
      'melody',
      8,
      'global'
    ),
    ...metheny,
  ];
  rules.allan_holdsworth = [
    R(
      'holdsworth.scale_membership',
      'Scale-family membership drives voicing and melody — interval subsets not root grammar',
      'songwriter',
      'harmony',
      9,
      'global'
    ),
    R(
      'holdsworth.interval_subset',
      'maj7#11 / maj9 / min9 / m(maj7) / alt subsets — reject plain triads',
      'songwriter',
      'harmony',
      9,
      'verse'
    ),
    R(
      'holdsworth.scale_persistence',
      'Hold one pitch collection 4–12 bars — chromatic recolor within family',
      'songwriter',
      'harmony',
      9,
      'global'
    ),
    R(
      'holdsworth.chromatic_vl',
      'Chromatic voice-leading with delayed resolution within scale pool',
      'songwriter',
      'melody',
      8,
      'global'
    ),
    R(
      'holdsworth.functional_avoidance',
      'Penalize ii–V–I, plain dom7, blues turnaround — non-functional subset loops',
      'songwriter',
      'form',
      9,
      'global'
    ),
    R(
      'holdsworth.integrated_line',
      'Line and chord from same pitch collection — integrated scale system',
      'songwriter',
      'melody',
      8,
      'global'
    ),
  ];
  rules.jack_white = [
    R(
      'jwhite.tonic_persistence',
      'Open-string or octave floor recurrent across riff events — tonal center always audible',
      'songwriter',
      'harmony',
      9,
      'global'
    ),
    R(
      'jwhite.drone_riff_fusion',
      'Drone and riff simultaneous or alternating; slide articulates harmonic area not decoration',
      'songwriter',
      'harmony',
      9,
      'verse'
    ),
    R(
      'jwhite.harmony_by_implication',
      'Dyads and fifths default; third omission permitted; riff implies harmony',
      'songwriter',
      'harmony',
      9,
      'global'
    ),
    R(
      'jwhite.riff_cell_economy',
      '1–2 bar cells repeated before varied — register/rhythm/slide not new harmony',
      'songwriter',
      'form',
      9,
      'global'
    ),
    R(
      'jwhite.controlled_incompleteness',
      'Unresolved thirds and phrase truncation valid; tonal anchor must remain clear',
      'songwriter',
      'melody',
      8,
      'global'
    ),
  ];
  rules.marr = [
    R(
      'marr.melodic_rhythm',
      'Top-note of rhythm pattern forms melodic contour — rhythm and melody integrated not accompaniment plus lead',
      'songwriter',
      'melody',
      9,
      'global'
    ),
    R(
      'marr.partial_voicing',
      '2–5 note voicings; root omission permitted; open strings sustained against fretted shapes',
      'songwriter',
      'harmony',
      9,
      'verse'
    ),
    R(
      'marr.add_note_surface',
      'add9/sus2/sus4/maj7/6/6-9 modal ambiguity; avoid plain triads as default surface',
      'songwriter',
      'harmony',
      9,
      'global'
    ),
    R(
      'marr.pendulum_subdivision',
      '16th-note hand motion continuous through rests; syncopation from selective contact',
      'songwriter',
      'rhythm',
      8,
      'global'
    ),
    R(
      'marr.suspended_arrival',
      'Resolve to open-string pedal or familiar top-note target — suppress dominant-tonic closure',
      'songwriter',
      'form',
      8,
      'bridge'
    ),
  ];
  rules.scott_henderson = [
    R(
      'riff.scott_henderson.sigma',
      'Riff VRB σ24 — angular fusion riff + blues-chromatic blaze (reuses pat_metheny rule family)',
      'songwriter',
      'melody',
      8,
      'global'
    ),
    ...metheny,
  ];
  rules.david_gilmour = [
    R('riff.david_gilmour.sigma', 'Riff VRB σ26 — lyrical rock (reuses prince rule family)', 'songwriter', 'melody', 8, 'global'),
    ...prince,
  ];
  rules.hendrix = [
    R('riff.hendrix.sigma', 'Riff VRB σ28 — blues-rock (reuses prince rule family)', 'songwriter', 'harmony', 8, 'global'),
    ...prince,
  ];
  rules.eddie_van_halen = [
    R('riff.eddie_van_halen.sigma', 'Riff VRB σ26 — EVH rock lead (reuses prince rule family)', 'songwriter', 'melody', 8, 'global'),
    ...prince,
  ];
  rules.led_zeppelin = [
    R('riff.led_zeppelin.sigma', 'Riff VRB σ27 — Zeppelin modes (reuses prince rule family)', 'songwriter', 'harmony', 8, 'global'),
    ...prince,
  ];
  rules.weather_report = [
    R('riff.weather_report.sigma', 'Riff VRB σ30 — fusion groove (reuses pat_metheny rule family)', 'songwriter', 'harmony', 8, 'global'),
    ...metheny,
  ];
  rules.mahavishnu = [
    R('riff.mahavishnu.sigma', 'Riff VRB σ32 — odd-meter fusion (reuses pat_metheny rule family)', 'songwriter', 'harmony', 9, 'global'),
    ...metheny,
  ];
  rules.morello = [
    R('riff.morello.sigma', 'Riff VRB σ25 — kill-switch cells (reuses fripp_king_crimson rule family)', 'songwriter', 'rhythm', 8, 'global'),
    ...fripp,
  ];
  rules.fripp = [
    R('riff.fripp.sigma', 'Riff VRB σ27 — Fripp process (reuses fripp_king_crimson rule family)', 'songwriter', 'rhythm', 8, 'global'),
    ...fripp,
  ];
}
wireRiffVrbSongwriterRules();

const authorRules: Record<AuthorRuleId, SongwritingRuleEntry[]> = {
  jimmy_webb: [
    R('webb.motif_reuse', 'Motif reuse across sections', 'author', 'hook', 8, 'form'),
    R('webb.late_climax', 'Climax in later third', 'author', 'form', 8, 'form'),
    R('webb.form_map', 'Form map before detail', 'author', 'form', 7, 'global'),
    R('webb.bridge_mod_plan', 'Planned modulations in bridge', 'author', 'harmony', 7, 'bridge'),
  ],
  pat_pattison: [
    R('pattison.stable_map', 'Stable vs unstable lyric/music map', 'author', 'lyric', 9, 'global'),
    R('pattison.stress_beats', 'Stressed syllables on strong beats', 'author', 'lyric', 8, 'chorus'),
    R('pattison.prechorus_instability', 'Pre-chorus instability → chorus resolution', 'author', 'form', 8, 'pre_chorus'),
  ],
  jack_perricone: [
    R('perricone.motif_abc', 'Motif types A/B/C quotas', 'author', 'melody', 8, 'form'),
    R('perricone.t_pd_d', 'Tonic / PD / D classification', 'author', 'harmony', 8, 'global'),
    R('perricone.phrase_pairs', 'Antecedent/consequent pairs', 'author', 'melody', 7, 'verse'),
  ],
};

const classicalSongRules: Record<ClassicalSongRuleId, SongwritingRuleEntry[]> = {
  schubert: [
    R('schubert.syllabic', 'Syllabic clarity mapping', 'classical', 'lyric', 8, 'verse'),
    R('schubert.mod_words', 'Modulation at narrative words', 'classical', 'harmony', 7, 'bridge'),
    R('schubert.contour_text', 'Contour mirrors text', 'classical', 'melody', 7, 'global'),
  ],
  schumann: [
    R('schumann.psych_shift', 'Sudden harmonic psychology shifts', 'classical', 'harmony', 7, 'bridge'),
    R('schumann.motif_cycles', 'Motifs link song cycles', 'classical', 'form', 6, 'form'),
  ],
  faure: [
    R('faure.smooth_mod', 'Smooth modal colour; gentle chromaticism', 'classical', 'harmony', 7, 'verse'),
    R('faure.legato_line', 'Legato small-interval lines', 'classical', 'melody', 7, 'global'),
  ],
};

const foundationalRules: Record<FoundationalRuleCategory, SongwritingRuleEntry[]> = {
  hook: [
    R('found.hook_object', 'Primary hook object per song', 'foundational', 'hook', 9, 'chorus'),
    R('found.hook_repeat', 'Hook repeats at structural points', 'foundational', 'hook', 8, 'form'),
    R('found.hook_fatigue', 'Limit back-to-back repeats', 'foundational', 'hook', 5, 'form'),
  ],
  melody: [
    R('found.motif_variation', 'Motifs + variation rules', 'foundational', 'melody', 8, 'global'),
    R('found.stepwise', 'Mostly stepwise; leaps for peaks', 'foundational', 'melody', 8, 'chorus'),
    R('found.range_style', 'Range budget by style', 'foundational', 'melody', 6, 'global'),
  ],
  harmony: [
    R('found.section_tag', 'Tag functional vs modal sections', 'foundational', 'harmony', 7, 'form'),
    R('found.harm_rhythm', 'Harmonic rhythm per section', 'foundational', 'harmony', 7, 'verse'),
    R('found.surprise_slot', 'Borrowed / colour slots', 'foundational', 'harmony', 6, 'form'),
  ],
  lyric_prosody: [
    R('found.stress_align', 'Stress vs strong beats', 'foundational', 'lyric', 8, 'chorus'),
    R('found.line_length', 'Line length vs phrase length', 'foundational', 'lyric', 7, 'verse'),
    R('found.emotional_peaks', 'Peaks on emotional words', 'foundational', 'lyric', 7, 'chorus'),
  ],
};

export const SONGWRITER_RULE_REGISTRY: SongwritingRuleRegistryShape = {
  songwriterRules: songwriterRules as Record<SongwriterRuleId, SongwritingRuleEntry[]>,
  authorRules,
  classicalSongRules,
  foundationalRules,
};

/** Riff-generator VRB σ ceiling (stub bundle); undefined when not on riff registry. */
export function riffVrbSigmaCeiling(vrbId: string): number | undefined {
  if (!isRiffGeneratorVrbId(vrbId)) return undefined;
  const fromRegistry = RIFF_VRB_SIGMA_CEILINGS[vrbId];
  if (fromRegistry != null) return fromRegistry;
  const bundleSigma = getVoiceRuleBundle(vrbId).sigma;
  return typeof bundleSigma === 'number' ? bundleSigma : undefined;
}

export function riffVrbSigmaCeilingUnchanged(): boolean {
  for (const id of RIFF_GENERATOR_VRB_IDS) {
    const expected = RIFF_VRB_SIGMA_CEILINGS[id as RiffGeneratorVrbId];
    if (expected == null) continue;
    if (riffVrbSigmaCeiling(id) !== expected) return false;
  }
  return true;
}

export function allRegistryRuleIds(): string[] {
  const ids: string[] = [];
  for (const g of Object.values(songwriterRules)) for (const r of g) ids.push(r.id);
  for (const g of Object.values(authorRules)) for (const r of g) ids.push(r.id);
  for (const g of Object.values(classicalSongRules)) for (const r of g) ids.push(r.id);
  for (const g of Object.values(foundationalRules)) for (const r of g) ids.push(r.id);
  return ids;
}
