/**
 * György Ligeti — SQ VRB micropolyphony / texture-as-harmony entry.
 *
 * Two sub-profiles:
 *   • SQ1 (1953/54) — Bartók-adjacent: G4 germinal cell ({0,1,2,3} =
 *     Forte 4-1), 12–17 continuous sections, motivic rhythm, focal_pc
 *     centricity without functional cadence.
 *   • SQ2 (1968) — micropolyphony, chromatic_dense pc-field, five
 *     movements (nervoso / sostenuto / meccanismo / furioso /
 *     delicatezza), texture/timbre as primary form-bearer.
 *
 * Reference vocabulary only — `LG_*` receipts encode the cross-piece
 * grammar (G4 cell, micropolyphony lifecycle, pc-field states,
 * tension-metric curves, technique sets per movement, formal habits,
 * and differentiators vs Bartók / Dutilleux / Lachenmann / Reich-Glass).
 */

export const LIGETI_SQ_VRB_FINGERPRINT_RECEIPTS = [
  // ---- policy receipts (1–10) ----
  'LG_POLICY_01 — voiceId=ligeti: SQ VRB micropolyphony / texture-as-harmony entry; SQ1 motivic-Bartókian (G4 cell), SQ2 textural (chromatic_dense fields).',
  'LG_POLICY_02 — harmonicRhythm: field-based not chord-based; minChordDurationBars=0 / maxChordDurationBars=4 used only as a duration cap on slow field transitions (0–4 bars), not as chord-symbol grammar.',
  'LG_POLICY_03 — bassPolicy.role=embedded-voice: Vc participates as one micro-voice in the stratified texture; no functional structural bass; cadential bass motion forbidden.',
  'LG_POLICY_04 — melodicPolicy.contour=neighbor-motion: between successive notes |interval| ≤ 2 semitones with probability ≥ 0.85 inside micropolyphony_mode; preferredIntervalSets [1,2].',
  'LG_POLICY_05 — formPolicy.narrativeArc: SQ1 → continuous-sections (12–17 segments, smooth G4 cell continuity); SQ2 → five-movement (nervoso / sostenuto / meccanismo / furioso / delicatezza).',
  'LG_POLICY_06 — rhythmPolicy.antiMetric=true: in SQ2 movements I / III / V perceived stable beat suppressed; III alone retains mechanical precision; meter is alignment, not groove.',
  'LG_POLICY_07 — micropolyphonyMode=true: phase-independent voices with continuous quasi-stepwise motion; 4–8 micro-voices in dense sections; canonic substrate allowed, audibility not required.',
  'LG_POLICY_08 — g4GerminalSetEnabled=true (SQ1 priority): germinal pc-set G4={0,1,2,3} (Forte 4-1) drives motives and verticals; subsets/permutations omnipresent across all primary events.',
  'LG_POLICY_09 — tensionMetricCurvesRequired=true: tension_metric = f(cluster_width, pc_count, ic1_density); each section/movement carries an explicit rise/release arc.',
  'LG_POLICY_10 — textureAsHarmonyEnabled=true: in micropolyphony_mode discrete chord changes are forbidden; only slow evolution of pc_field_state + register; no "chord progression".',

  // ---- G4 germinal set + SQ1 harmonic language (11–17) ----
  'LG_HARM_G4_01 — Germinal set G4 = {0,1,2,3} (Forte 4-1, prime form); core interval pattern whole-tone / semitone / whole-tone; canonical reference pattern e.g. B–C#–D–E in any transposition.',
  'LG_HARM_G4_02 — All primary motives and verticals must frequently contain subsets or permutations of G4; counts trackable across receipts (motivic_g4_density ≥ 0.5 in SQ1 sections).',
  'LG_HARM_G4_03 — Local sections may carry mode_tag (e.g. D_Dorian_profile) for melodic lines, but key pitch events must lie within G4-derived pc-sets and their complements.',
  'LG_HARM_G4_04 — Allowed vertical set-class list (SQ1 + SQ2 micropolyphony): Forte 3-1, 4-1, 4-9 and their supersets; vertical slices must be members of this list.',
  'LG_HARM_G4_05 — Language register: not tonal, not radically atonal; Bartók-adjacent motivic/interval language with chromatic inflection — never functional voice-leading.',
  'LG_HARM_G4_06 — SQ1 centricity: per-section focal_pc allowed; enforced by occurrence count, total duration, and outer-voice registral peaks; no dominant-tonic cadence permitted.',
  'LG_HARM_G4_07 — Cross-piece motivic continuity: G4 cell behaves as a unifying interval signature even where surface texture / technique changes; section boundaries do NOT break the cell.',

  // ---- SQ2 pc-field states + centricity (18–24) ----
  'LG_FIELD_01 — pc_field_state=chromatic_dense (SQ2 default): union of active voices contains ≥ 9 distinct pcs in any 1–2 beat window.',
  'LG_FIELD_02 — pc_field_state=cluster_narrow: pcs consecutive mod 12 over ≤ 4 semitones; spacing between adjacent voices ≤ whole tone; dense vertical packing.',
  'LG_FIELD_03 — pc_field_state=constellation: same pc-set as cluster but spacing between some adjacent voices ≥ a 10th; cluster horizontally evoked by slow glissandi between extreme points.',
  'LG_FIELD_04 — pc_field_state=sparse_filtered: ≤ 4 distinct pcs sustained; used in Mvt II (Sostenuto) and Mvt V dissolution; harmonics_only / flautando context.',
  'LG_FIELD_05 — Forbid tonal or modal skeletons in SQ2; harmonic state = field defined by pc saturation and textural rules only (no functional pivots, no key labels).',
  'LG_FIELD_06 — SQ2 centricity: focal_interval or focal_pc_class per movement only; directionality encoded as changes in density, register, intervallic focus (never as cadential resolution).',
  'LG_FIELD_07 — Inside micropolyphony_mode each line must be restricted to neighbor-tone motion (ic1/ic2); local verticals must contain multiple ic1 + ic2 between adjacent voices.',

  // ---- tension metric (25–28) ----
  'LG_TENSION_01 — tension_metric = f(cluster_width, pc_count, ic1_density); a scalar continuous quantity per beat / per gesture used to drive form decisions.',
  'LG_TENSION_02 — Accumulation rules: increasing cluster density, decreasing voice spacing, more frequent ic1 overlaps; tension rises monotonically across a build span.',
  'LG_TENSION_03 — Release rules: registral separation, reduction of active voices, thinning pc-set to consonant intervals (5ths, 4ths); tension drops monotonically across a release span.',
  'LG_TENSION_04 — Formal tension curves required: SQ2 Mvt I and Mvt V = long tension rise then brief release; Mvt IV = sustained max plateau; Mvt II / Mvt III = low band with localised spikes.',

  // ---- micropolyphony lifecycle (29–35) ----
  'LG_MICRO_01 — micropolyphony_mode per voice: allowed intervals ±1, ±2 semitones except rare register resets (hidden_leap); rhythm continuous or quasi-continuous; max gap length small.',
  'LG_MICRO_02 — Phase independence between voices enforced; each instrument carries 1–2 micro-voices in dense sections; global micro-voice count 4–8.',
  'LG_MICRO_03 — Underlying canonic structure allowed but not required to be audible; maintain slight rhythmic and pitch offsets between voices so individual lines cannot be tracked.',
  'LG_MICRO_04 — Lifecycle Stage 1 (Beginning): 1–2 voices, limited register, small pc-set; each successive event adds voices and widens register / pc span.',
  'LG_MICRO_05 — Lifecycle Stage 2 (Development): monotonic non-decreasing pc_count and active_voice_count; closer spacing; increased rhythmic density; small pitch offsets create the cluster.',
  'LG_MICRO_06 — Lifecycle Stage 3 (Dissolution): after density_peak enforce decrease in density and ic1, increase in rests or sustained tones; eventually return to solo/duo lines or silence; "halo" of high harmonics often remains.',
  'LG_MICRO_07 — texture_as_harmony enforced inside micropolyphony_mode: no discrete chord changes; only slow pc_field_state evolution + register migration; chord-symbol output suppressed.',

  // ---- voice leading + registral layout (36–41) ----
  'LG_VL_01 — Register norms (defaults): V1 high · V2 upper-mid · Va mid/low-mid · Vc low. High overlap permitted only inside micropolyphony_mode where stratification is "smudged".',
  'LG_VL_02 — texture_role per voice ∈ {embedded, emergent}; transitions between roles must be gradual — register or dynamic difference grows then shrinks (no abrupt swap).',
  'LG_VL_03 — Individual line VL in micropolyphony_mode: between successive notes |interval| ≤ 2 semitones with probability ≥ 0.85; failures cost a receipt-level violation.',
  'LG_VL_04 — Register reset leaps = hidden_leap: permitted only at low dynamic; infrequent (≤ 1 per phrase); no large expressive leaps inside micropolyphonic lines.',
  'LG_VL_05 — Voice emergence to surface = raise dynamic AND move registrally away from neighbours AND reduce rhythmic density (all three simultaneously); reverse all three to sink.',
  'LG_VL_06 — register_extreme_event: a new highest or lowest pitch marks a section boundary or climax; track and label such events explicitly in the score-model.',

  // ---- rhythm / motif behaviour (42–47) ----
  'LG_RHY_01 — SQ1 rhythmic profile: Bartók-like — additive groupings (2+3, 3+2, 3+3+2), recognisable ostinati, strong accents, identifiable rhythmic cells with explicit interval + rhythm.',
  'LG_RHY_02 — SQ1 motivic transforms permitted: Tn, In, Aug, Dim, Trunc on motivic cells; pulse_state=steady within sections; tempo changes drive sectional form.',
  'LG_RHY_03 — SQ2 pulse_state per section ∈ {steady, flexible, suspended}; Movements I / III / V → flexible or suspended; Movements II / IV → defined pulse or mechanical precision.',
  'LG_RHY_04 — In suspended sections perceived speed = event density and gesture rate; no stable beat; no metric backbone audible.',
  'LG_RHY_05 — Large-scale tempo_curve per movement is a primary structural force: Mvt I sustained accelerating arc (Allegro nervoso); enforce via progressive shortening of note values or monotonic event-density rise across multi-bar spans.',
  'LG_RHY_06 — Motivic identity in SQ2 = textural profile (not singable theme): motif_profile ∈ {nervoso_tremolo, gliss_cluster, flautando_halo, col_legno_tap, sighing_semitone_cell}; recurrence tracked on profile (interval_type, articulation, register) not exact pitches.',

  // ---- texture / timbre by movement (48–54) ----
  'LG_TEX_01 — Mvt I (Allegro nervoso): texture_state=micropolyphonic_mass dominant; technique_set {tremolo, normal arco, occasional sul pont}; pc_field_state=chromatic_dense; opening profile hushed_micropolyphonic.',
  'LG_TEX_02 — Mvt II (Sostenuto, molto calmo): texture_state=polyphonic_clear (timbral); technique_set=harmonics_only / sul tasto / sul pont; pulse_state=suspended; pc_field_state=sparse_filtered; no normal open-string sound.',
  'LG_TEX_03 — Mvt III (Come un meccanismo): texture_state=mechanical_polyphony; technique_set {col legno battuto, precise bowing}; pulse_state=steady (mechanistic); tempo_curve=flat (metronomic).',
  'LG_TEX_04 — Mvt IV (Prestissimo furioso): texture_state=violent_mass; technique_set {snap pizzicato, col legno, extreme dynamics}; tension_metric=maximum plateau; pulse_state=flexible.',
  'LG_TEX_05 — Mvt V (Allegro con delicatezza): texture_state=dissolving_micropolyphony; technique_set {flautando, harmonics, delicate arco}; tempo_curve=decelerating; closing profile = decreasing density + low dynamic + high harmonic / low open-string resonance; no functional cadence.',
  'LG_TEX_06 — Texture transitions must adjust ≥ 2 of {voice_count, rhythmic_density, articulation, register_spacing}; large changes preferred over constant flicker.',
  'LG_TEX_07 — silence_windows (≥ 1 voice entirely silent) required at sectional boundaries; full rests required after highest density peaks; nocturnal gaps especially in SQ1 between contrasting sections.',

  // ---- formal habits (55–60) ----
  'LG_FORM_01 — SQ1 form_schema=continuous_sections: 12–17 short sections tagged ∈ {nocturne, scherzo, waltz, presto, dance, recitative, lento}; smooth motivic continuity (G4 cell) across all boundaries.',
  'LG_FORM_02 — SQ1 section boundaries driven by tempo / texture / technique change — NOT by harmonic cadence; cadences are explicitly forbidden as section markers.',
  'LG_FORM_03 — SQ1 opening profiles: motivic_Bartókian (clear motif + recognisable rhythm + clear meter) OR hushed_micropolyphonic (frenetic quiet tremolo, already mass texture).',
  'LG_FORM_04 — SQ2 five-movement profile encoded as a sequence of texture_state + technique_set + pulse_state + tempo_curve tuples (see LG_TEX_01–05); no recap of thematic material between movements.',
  'LG_FORM_05 — contrast_profile per movement: require ≥ 1 max_density region AND ≥ 1 max_sparsity region; densities tracked via tension_metric and active_voice_count.',
  'LG_FORM_06 — Silence is an active ingredient, not an absence: a silence window or fermata equivalent counts as a structural event with its own slot in the form map.',

  // ---- differentiators (61–66) ----
  'LG_DIFF_BARTOK_01 — vs Bartók (SQ1): keep Bartók-like rhythm and sectioning but enforce omnipresence of G4 interval pattern; permit more non-functional chromatic webs; less folk-modal centricity.',
  'LG_DIFF_BARTOK_02 — vs Bartók (SQ2): no axis system, no Bulgarian rhythms; texture replaces motivic development as primary logic; recap forbidden.',
  'LG_DIFF_DUTILLEUX_01 — vs Dutilleux: no fixed focal hexachord (HC0); no memory parenthèses structure; Ligeti uses field_state + interval constraints rather than fixed pc-set; no progressive growth stages — tension_metric arcs instead.',
  'LG_DIFF_LACHENMANN_01 — vs Lachenmann: extended techniques are a coloristic set; pitched identity is retained; no unpitched/noise states as primary structure; col legno and sul pont serve timbre, not phoneme.',
  'LG_DIFF_REICH_GLASS_01 — vs Reich/Glass: forbid long exact repetitions and simple ostinati; any short pattern must mutate quickly (pitch, rhythm, register); phasing is not periodic; no audible process loop; no diatonic / modal groove fields — fields are chromatic.',
  'LG_DIFF_REICH_GLASS_02 — vs Reich/Glass: pulse_state=steady appears only in Mvt III (mechanistic); elsewhere flexible / suspended dominate, contrasting the minimalist steady-pulse default.',

  // ---- profile + works (67–70) ----
  'LG_PROFILE_01 — ligetiProfile=sq1: continuous-sections form, motivic G4 cell foreground, additive rhythms, focal_pc centricity; reference work SQ No. 1 "Métamorphoses nocturnes" (1953/54).',
  'LG_PROFILE_02 — ligetiProfile=sq2: five-movement form, micropolyphony default in I / V, suspended pulse in II, mechanical pulse in III, violent mass in IV; reference work SQ No. 2 (1968).',
  'LG_WORKS_01 — SQ1 reference anchors: opening Andante sostenuto, Vivace capriccioso, Tempo di Valse interlude, Subito prestissimo, closing Andante; preserved as section_tag library for SQ1 generation.',
  'LG_WORKS_02 — SQ2 reference anchors: I Allegro nervoso · II Sostenuto, molto calmo · III Come un meccanismo di precisione · IV Presto furioso · V Allegro con delicatezza; preserved as movement-profile template for SQ2 generation.',
] as const;

export type LigetiSqVrbFingerprintReceipt = (typeof LIGETI_SQ_VRB_FINGERPRINT_RECEIPTS)[number];
