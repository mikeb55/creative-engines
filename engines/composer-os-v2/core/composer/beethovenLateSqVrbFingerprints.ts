/**
 * Beethoven late string quartets — SQ VRB backbone (Op. 127, 130, 131, 132, 135; Grosse Fuge Op. 133).
 * Reference vocabulary: BV_* receipts encode harmonic graph, texture, rhythm, form, and differentiators.
 */

export const BEETHOVEN_LATE_SQ_VRF_FINGERPRINT_RECEIPTS = [
  'BV_POLICY_01 — voiceId=beethoven_late: backbone entry for SQ VRB family; late-quartet arc (sonata + variation + fugue + attacca).',
  'BV_POLICY_02 — harmonicRhythm: min 0 / max 8 bars per symbol; mid-bar harmonic changes allowed.',
  'BV_POLICY_03 — bassPolicy.role=structural-bass: pedal points + cadential fifth motion as primary bass grammar.',
  'BV_POLICY_04 — melodicPolicy: cell-based contour; preferredIntervalSets [1,2,3,5] semitone steps and small leaps.',
  'BV_POLICY_05 — dim7EnharmonicModulationEnabled=true: fully-diminished pivots and enharmonic re-spellings are first-class moves.',
  'BV_POLICY_06 — speciesVoiceLeadingBias=high: learned counterpoint / species-derived voice-leading priority over mass texture.',

  'BV_HARM_GRAPH_01 — allow_transition(centre_key->local_key): local in {III, VI, bVI} => modulation_type=mediant; pivot_chord_class in {dim7}; pivot_pc_set subset of dim7 or V7 of either key.',
  'BV_HARM_GRAPH_02 — allow_transition: local_key=bVII => modulation_type=flat_side; pivot in {dim7, Aug6}.',
  'BV_HARM_GRAPH_03 — allow_transition: local in {bII, bVI} flat_side => pivot_chord_class in {dim7, N6}.',
  'BV_HARM_GRAPH_04 — warp_move: pivot_pc_set={0,3,6,9} (dim7); new_centre in pivot_pc_set; mark_section_tag=grosse_fuge_mode.',

  'BV_LOCAL_GLOBAL_01 — local_key may differ from centre_key for full subsection spans; require return_to(centre_key) by end_of(movement).',
  'BV_LOCAL_GLOBAL_02 — section_role in {development, episode}: enforce local_key hits {III, VI, bIII, bVII, bII} at least once.',

  'BV_DEFER_CAD_01 — section_type=internal: cadence_target_key in {III, VI}; forbid tonic_arrival_on(centre_key).',
  'BV_DEFER_CAD_02 — section_type=terminal: cadence_target_key=centre_key; cadence requires dominant_field or subdominant_field preceding.',

  'BV_DOM_FIELD_01 — dominant_field: consecutive_span >= 2 bars; chord_class in {V7, Ger+6, Fr+6, It+6, vii°7}.',
  'BV_DOM_FIELD_02 — dominant_field bass_pc in {5th of centre_key, chromatic approach to 5th, tonic pedal}; tonic_arrival within <=4 bars as I, I6, or Iadd6.',

  'BV_SUBDOM_01 — subdominant_field: chord_class in {IV, iiø7, N6}; >=1 chord carries b2 of centre_key.',
  'BV_SUBDOM_02 — after subdominant_field next zone must be dominant_field or tonic_arrival.',

  'BV_AUG6_01 — Aug6: outer voices form augmented sixth resolving outward to octave on dominant.',
  'BV_AUG6_02 — Aug6 must contain b6 and #4 relative to local key; allowed as pivot when resolution_target_key != local_key (enharmonic).',

  'BV_N6_01 — Neapolitan: N6 = bII in first inversion (bass = b4 of local key).',
  'BV_N6_02 — N6 allowed only when section_tag in {slow_movement, transition}; resolve toward V or modal_tonic.',

  'BV_DIM7_PIV_01 — dim7 functions as vii° of four potential keys (roots a minor third apart).',
  'BV_DIM7_PIV_02 — in modulation steps choose target_key; next chord supports vii° of target_key; mark modulation_type in {mediant, warp}.',

  'BV_AUG_TONIC_01 — augmented tonic I+ allowed when context_tag in {expressive_peak, question_gesture}.',
  'BV_AUG_TONIC_02 — I+ resolves via stepwise inner-voice correction OR enharmonic pivot to remote key.',

  'BV_MODE_PAR_01 — parallel_mode_switch at section beginnings and expressive peaks.',
  'BV_MODE_PAR_02 — cadence into parallel minor/major = structural release when tonic_pc retained.',

  'BV_MODE_MODAL_01 — Lydian on A mandatory in Heiliger_Dankgesang_mode (Op. 132 slow).',
  'BV_MODE_MODAL_02 — Phrygian-adjacent: b2 over tonic as colour; both modal colours only in slow_movement or inward_state.',

  'BV_CHROM_DEG_01 — allow b3, b6, b7 in major (raised equivalents in minor) only when function in {pre_dominant, expressive_peak, question_gesture}.',
  'BV_CHROM_DEG_02 — in pre_dominant chromatic degrees must resolve to V or N6; in expressive/question resolution may defer.',

  'BV_LONG_KEY_01 — before final recap/coda visited_keys must include >=N nodes from {III, VI, bIII, bVII relative to centre_key}.',
  'BV_LONG_KEY_02 — final movement section must re-centre on centre_key.',

  'BV_TEXTURE_01 — fugue: each voice presents subject or answer >=1x; intervals preserved or inverted; aug/dim by integer factor; stretto allowed.',
  'BV_TEXTURE_02 — chorale: shared rhythm (max offset <= one subdivision); spacing within 2 octaves; steps + suspensions preferred.',
  'BV_TEXTURE_03 — melody_accomp: one lead_voice; others homorhythmic support or light counterpoint.',
  'BV_TEXTURE_04 — variation: harmonic/bass grid fixed; surface via ornamentation, rhythm, register.',
  'BV_TEXTURE_05 — recitative: one voice irregular declamatory rhythm + rests; others sustained pp-mp background.',

  'BV_INNER_01 — per harmony change >=1 inner voice (V2 or Va) moves by step (+/-1 or 2 semitones).',
  'BV_INNER_02 — step_motion_ratio(inner) >= 0.7; prefer ic1/ic2 in chromatic connections.',

  'BV_CAD_VL_01 — at cadence/climax: outer voices contrary motion; prefer stepwise.',
  'BV_CAD_VL_02 — >=1 voice pair suspension chains 4-3, 7-6, 9-8 aligned with tonic_arrival or important local_key.',

  'BV_REG_01 — register norms: V1 high_band; V2 mid_high; Va mid_low; Vc low_band.',
  'BV_REG_02 — expressive_violation: cello theme in tenor/alto range OR violins above high_band for spiritual/climactic accent only at section_boundary or expressive_peak.',

  'BV_UNISON_01 — unison_event: all four voices same pc (octaves ok); duration <= 2 bars.',
  'BV_UNISON_02 — unison only if structural_peak OR section_boundary OR motto_articulation; after unison texture must expand (no static unison blocks).',

  'BV_INVERT_CP_01 — invertible_counterpoint: inversion_interval_vector = negate(subject_interval_vector).',
  'BV_INVERT_CP_02 — texture_state=fugue: each voice presents subject and inversion across full fugue span; answers at 5th or others.',
  'BV_INVERT_CP_03 — avoid parallel 8ves/5ths on consecutive strong beats except when grosse_fuge_mode; voice permutation via counterpoint_matrix allowed.',

  'BV_RHY_LATE_01 — meter=3/4 + metric_feel: hemiola [2+2+2] eighths across bar pairs permitted.',
  'BV_RHY_LATE_02 — meter=4/4 hemiola: eighth grouping [3+3+2] or [2+2+3+3].',
  'BV_RHY_LATE_03 — cross_rhythm: >=2 voices different subdivisions (2 vs 3).',
  'BV_RHY_LATE_04 — sforzandi on weak subdivisions in fugue sections.',

  'BV_PHRASE_01 — phrase_start_offset != 0 allowed (beat 2 or 3 entries).',
  'BV_PHRASE_02 — phrase_length_bars not constrained to multiples of 4; explicitly allow 3, 5, 7; boundaries align with harmonic/textural events.',

  'BV_GROSSE_01 — grosse_fuge_mode: rhythmic_density >= high_threshold; >=1 active cross_rhythm layer always; tuplets (3,5,7) frequent.',
  'BV_GROSSE_02 — grosse_fuge_mode: sforzandi off-beats >=1 voice per phrase; voice_leading constraints relaxed for intentional clashes.',

  'BV_MOTIVE_01 — motive_transform_engine: source {interval_string, rhythm_pattern}; transforms {Tn, In, Aug, Dim, Trunc, Ext, Seq}; all derived reachable.',
  'BV_MOTIVE_02 — 1-3 core cells per movement; derived_motifs account for high share of thematic material.',

  'BV_MUSS_01 — Must_Es_Sein_pair (Op. 135): question_motif slower upward m2/M2 grave; answer_motif same/closely related intervals faster ascent resolute.',
  'BV_MUSS_02 — finale alternation question->answer >=N times; final answer in tonic resolved rhythmically and harmonically.',

  'BV_CYCLE_01 — cycle_motive_set appears in >=2 movements when work uses cyclic binding.',
  'BV_CYCLE_02 — attacca_flag (Op. 131 model): suppress full PAC at movement endings; next movement opens shared motive or shared harmony (common-tone/pedal).',

  'BV_TEX_TRANS_01 — fugue->chorale: reduced rhythmic independence + sustained homophonic chords.',
  'BV_TEX_TRANS_02 — chorale->variation: figuration in >=1 voice over fixed harmonic grid.',
  'BV_TEX_TRANS_03 — any->recitative: one voice declamatory irregular; others pp-mp sustained reduction.',
  'BV_TEX_TRANS_04 — any->unison_event: motto articulation, major cadence, or climax trigger.',

  'BV_DYN_01 — >=1 global_peak (ff-fff) per large-scale form except explicitly inward final movements.',
  'BV_DYN_02 — long crescendi/decrescendi >=4 bars may span form; inward_state: dynamics predominantly p/pp; rare f/ff climaxes only.',

  'BV_HEILIG_01 — Heiliger_Dankgesang_mode (Op. 132 slow): pitch A Lydian (raised 4th / D# Eb colour); texture_state=chorale.',
  'BV_HEILIG_02 — long values minimal syncopation plentiful suspensions; structural trills as pillars; arco only — no col_legno/Bartok pizz/sul_pont as structure; alternates A-major dance episodes.',

  'BV_TRILL_01 — trill_structural: slow movements and fugues require long trills at structural peaks or important transitions; trill supported by dominant_field, N6, or high-dissonance sonority.',

  'BV_SILENCE_01 — structural silence: at section boundaries or after climaxes — general rest all voices >=1 beat OR near-silence one sustained voice.',
  'BV_SILENCE_02 — strategic_pause coincides with texture_state change and/or local_key change.',

  'BV_REG_EXT_01 — register_extremes: newly reached highest/lowest pitch = structural event; combine with dynamic_peak or unison_event; minimum spacing in form between extremes.',

  'BV_INWARD_01 — inward_state: limit modulation_count; forbid aggressive syncopation and grosse_fuge_mode; melody stepwise + suspensions + simple rhythm; dynamic ceiling <= f (rare exceptions).',

  'BV_WORK_01 — Op. 127 preset: 4 movements; movement2=variation_form with inward_state=true.',
  'BV_WORK_02 — Op. 130 + Op. 133: 6-movement frame; finale_mode ties grosse_fuge_mode vocabulary.',
  'BV_WORK_03 — Op. 131: 7 movements; attacca_chain=true; cycle_motive_set enforced across chain.',
  'BV_WORK_04 — Op. 132: 5 movements; central_slow_keystone=true; movement3=Heiliger_Dankgesang_mode.',
  'BV_WORK_05 — Op. 135: 4 movements; finale_motto=Must_Es_Sein_pair.',

  'BV_RECAP_01 — recap must reuse thematic interval patterns (motif ids); allow altered register/texture_state/mode; may compress; forbid strict copy-paste.',

  'BV_VAR_01 — variation_form_rules: harmonic_grid fixed; axes ornament density, rhythm, register, counterpoint density, remote excursions; final variation reasserts centre_key + grid.',

  'BV_MOV_CONN_01 — movement_connections: attacca_chain suppresses full PAC; motivic_link_required adjacent movements share >=1 motive_id with transform.',

  'BV_VS_HAYDN_01 — vs Haydn/Mozart: extended mediant+flat-side graph; higher dynamic_range; more fugue/chorale; unisons + register extremes; chromaticism/texture contrast above classical baseline.',
  'BV_VS_SCHUBERT_01 — vs Schubert: terse cell motives not long vocal melodies; abrupt modulations not smooth mediant chains; overt fugal writing; no long lyrical cantabile as primary mode.',
  'BV_VS_BARTOK_01 — vs Bartok: no axis system; no Bulgarian/aksak meters; no ic1 saturation; tonal hierarchy + species voice-leading; strict/learned counterpoint not texture-as-mass.',
  'BV_VS_BRAHMS_01 — vs Brahms: tolerate bare textures (unisons, two exposed voices); more radical enharmonic excursions + violent dynamic extremes vs Brahms dense inner smooth sequences.',
] as const;
