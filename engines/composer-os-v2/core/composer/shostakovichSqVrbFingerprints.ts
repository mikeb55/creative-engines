/**
 * Dmitri Shostakovich — SQ VRB narrative / dystopian-modern entry.
 * Reference vocabulary: SH_* receipts encode pitch / mode-mixture,
 * the DSCH motive system, obsessive cell + ostinato grammar,
 * grotesque-scherzo + tragic-slow-movement texture states, narrative-
 * episodic form, and differentiators vs Beethoven / Bartók / Reich-Glass
 * / Ravel. Anchored in SQ 3, 5, 7, 8, 10 with full-cycle scope.
 */

export const SHOSTAKOVICH_SQ_VRF_FINGERPRINT_RECEIPTS = [
  'SH_POLICY_01 — voiceId=shostakovich: SQ VRB narrative / dystopian-modern entry; DSCH-aware; obsessive-cell + ostinato grammar; period sub-profile ∈ {early, middle, late}.',
  'SH_POLICY_02 — harmonicRhythm: min 0 / max 16 bars per chord; harmonic stasis (pedal / ostinato) is a primary expressive device.',
  'SH_POLICY_03 — bassPolicy.role=ostinato-or-pedal: Vc supplies repeated bass pattern or sustained pedal pc; walking-bass / functional V→I motion is rare.',
  'SH_POLICY_04 — melodicPolicy.contour=stepwise-with-leaps; preferredIntervalSets [1,2,3,6,8]; large leaps (≥6th) allowed only when flagged expressive_leap near local high/low points.',
  'SH_POLICY_05 — rhythmPolicy.antiMetric=false: regular duple/triple meters; metric tricks are internal (accent displacement, hemiola, 2+2+3 inside 4/4) not Bulgarian/aksak.',
  'SH_POLICY_06 — DSCHMotifEnabled=true: D-E♭-C-B (interval vector [ic1, ic3, ic1]) is a first-class motive carrier for theme, accompaniment, bass ostinato, fugue subject.',
  'SH_POLICY_07 — quotationEventsEnabled=true: pre-existing interval patterns may be inserted over new harmony as thematic pillars (own symphonies, opera, songs).',
  'SH_POLICY_08 — tragicSlowMovementProfile=true: slow tempo + ground_bass + DSCH-related intervals + sparse texture + pp/ppp morendo ending is a stock movement type.',

  'SH_PITCH_01 — Default pitch state: diatonic(centre_key) per movement; chromatic passing tones / neighbour notes allowed in any voice; structurally accented notes (downbeats, long values) constrained to diatonic or mixture degrees unless flagged expressive_chromatic_apex.',
  'SH_PITCH_02 — mode_tag ∈ {phrygian_colour, dorian_colour, aeolian_colour, jewish_harmonic_minor} per phrase; phrygian_colour requires ♭2 on expressive/cadential positions and supports iv–i and ♭II–V–i cadences.',
  'SH_PITCH_03 — dorian_colour: natural 6 in minor; folk/dance contexts; not a structural set logic.',
  'SH_PITCH_04 — jewish_harmonic_minor: repeated ic1, augmented-2 leap, harmonic minor with raised 4; enforced in jewish_theme labelled passages.',
  'SH_PITCH_05 — octatonic_subset: allowed ≤4–8 bars in motoric / grotesque sections only; must be framed by functional key areas.',
  'SH_PITCH_06 — chromatic saturation is voice-leading driven, not set-structural; allowed at climaxes only; underlying harmony remains tonal.',

  'SH_CENTRE_01 — centre_key enforced by (a) most frequent bass pc, (b) movement-final chord root, (c) recurrence of home triad at structurally marked places.',
  'SH_CENTRE_02 — Closures: V→vi, V→III, and plagal (iv→i) cadences are valid; classical V–I is not required.',
  'SH_CENTRE_03 — modulation_graph: tonic → {relative major/minor, mediant, submediant, dominant minor/major, Neapolitan region}; forbid constant remote-key cycling; require final re-centring on centre_key.',

  'SH_CHORD_01 — Default verticals: {I, ii, IV, V, vi, vii°} plus mixture; triad_plus_extensions requires one triad + optional add {2,4,6}.',
  'SH_CHORD_02 — cluster chords (≥3 adjacent scale degrees, close spacing) allowed only in high-tension zones; never as default sonority.',
  'SH_CHORD_03 — Modal harmonies: iv and ♭II as pre-dominants; cadence patterns ♭II–V–i and iv–i in minor.',
  'SH_CHORD_04 — Plain triads voiced thinly: e.g. Vc=root, Va=5, V2=♭3, V1=doubled or DSCH overlay; dissonance comes from context / spacing / line, not exotic chord species.',

  'SH_DSCH_01 — DSCH = {D, E♭, C, B} with interval vector [ic1, ic3, ic1] (two minor seconds + minor third).',
  'SH_DSCH_02 — DSCH-saturated works (SQ 7, SQ 8): require explicit DSCH or DS/SC subsets in each movement and prominent registers; ≥100 DSCH appearances across SQ 8.',
  'SH_DSCH_03 — Interval-profile constraint: high local frequency of ic1 and ic3 even where DSCH is not stated literally.',
  'SH_DSCH_04 — Structural points (movement openings, climaxes, endings) must reference DSCH literally or via its interval signature.',
  'SH_DSCH_05 — DSCH transforms Tn, In, retrograde, augmentation all valid; preserve interval identity (m2 + m2 + m3).',
  'SH_DSCH_06 — DSCH may appear as theme, accompaniment figure, harmonic scaffold, fugue subject, or bass ostinato — all are first-class deployments.',
  'SH_DSCH_07 — SQ 8 model: DSCH simultaneously in theme + counter-theme + accompaniment + bass within the same movement.',

  'SH_MIXTURE_01 — Frequent mode_state flips with tonic_pc held constant; ironic effect encoded as major triad over gloomy context or minor triad over dance.',
  'SH_MIXTURE_02 — Parallel major/minor shifts are a primary expressive device — used at structural seams (movement endings, recap arrivals, climaxes).',

  'SH_HARM_RHYTHM_01 — tension_profile per movement: diatonic → mixture/chromatic → diatonic; aligned with emotional arc.',
  'SH_HARM_RHYTHM_02 — Harmonic stasis triggers: passacaglia bass, obsessive_ostinato, sustained dominant without resolution; upper voices intensify over fixed harmony.',
  'SH_HARM_RHYTHM_03 — Fast harmonic rhythm in scherzo / grotesque sections; very slow in lament / tragic slow movements.',

  'SH_MOTIVE_01 — DSCH primary transforms: transposition, inversion, sequence, augmentation/diminution, registral displacement; less contrapuntal derivation than Beethoven — heavy literal/near-literal repetition in varied contexts.',
  'SH_MOTIVE_02 — Obsessive cell: 3–5 note cell per movement/quartet; development via exact repetition in new context, sequence, texture/register change, or voice-accumulation without harmonic change.',
  'SH_MOTIVE_03 — Obsessive cells must account for ≥60% of thematic material per movement when used.',
  'SH_MOTIVE_04 — Quotation events: insert pre-existing interval pattern over new harmony as thematic pillar; SQ 8 cites own symphonies, piano trio, opera (Lady Macbeth), and revolutionary songs as distinct motif_id rows.',
  'SH_MOTIVE_05 — Quotation triggers: autobiographical crisis points, ironic juxtaposition, narrative "memory" moments — not free decoration.',
  'SH_MOTIVE_06 — Thematic return: recap required but transformed (transposed, texturally altered, compressed, or harmonically darkened); shortened / fragmentary recaps allowed; classical restoration forbidden.',
  'SH_MOTIVE_07 — Recap must preserve thematic interval pattern; orchestration / register / mode / density may change freely.',

  'SH_RHY_MARCH_01 — march_cell: duple/quadruple meter; quarter/eighth patterns on strong beats; e.g. [♩ ♩ ♩ ♩] or [♩. ♪] cells; limited pitch span; many repeated notes; often unison/octave.',
  'SH_RHY_OSTINATO_01 — obsessive_ostinato: short rhythmic figure (1–2 beats) repeated ≥4 times; inner voice or bass; single repeated note or 2–3 note riff; carries dread / mechanical / ironic states.',
  'SH_RHY_OSTINATO_02 — obsessive_ostinato break triggers: new section, dynamic peak, or silence event; do not break mid-pattern.',
  'SH_RHY_SCHERZO_01 — grotesque_scherzo_rhythm: 3/4 "ghost waltz" OR fast cut-time with wrong accents, dissonant grace-notes, metric slip.',
  'SH_RHY_SCHERZO_02 — jewish_dance_rhythm: weak-beat emphasis, repeated emphatic syncopations, augmented-2 melodic patterns; bittersweet / sardonic register.',
  'SH_RHY_METER_01 — metric_ambiguity: phrase_start_offset ≠ 0; accent maps contradicting time signature (e.g. 2+2+3 in 4/4).',
  'SH_RHY_METER_02 — cross-rhythm blocks: 3 vs 2 (especially in scherzo / battle music); irregular meters (5/4, 7/8) allowed only in late-period sub-profile.',
  'SH_RHY_PAUSE_01 — strategic_pause: multi-beat rests or isolated chords separated by silence; "knock on the door" model (SQ 8/IV) — brief chord, full rest, repeat.',
  'SH_RHY_PAUSE_02 — strategic_pause required at sectional boundaries and after climaxes in tragic_slow_movement.',

  'SH_VL_REGISTER_01 — Default registers: V1 high, V2 upper-mid, Va mid-low, Vc low; expressive_violation=true at climaxes, autobiographical cry points, DSCH statements.',
  'SH_VL_REGISTER_02 — expressive_violation: high cello solo carrying DSCH or lament theme; extreme high V1/V2 scream/outcry; compressed inner parts creating claustrophobic clusters.',
  'SH_VL_LINE_01 — Within-line motion: stepwise and thirds preferred; leaps ≥6th flagged expressive_leap.',
  'SH_VL_INNER_01 — Inner voices V2/Va: high proportion off-beat or sustained dissonances resolving by step; frequent contrary motion vs V1/Vc at cadences; doubled 3rds / leading tones for thick sonority.',
  'SH_VL_INNER_02 — Chromatic contrary inner lines may source the harmony; dissonant appoggiaturas one step from chord tones in inner voices.',

  'SH_UNISON_01 — unison_event: all voices in unison/octave at section starts, big outbursts, DSCH motto statements, march themes; full theme in unison/octaves and inner voices fill in after.',
  'SH_UNISON_02 — unison_mass models: brutal march, satirical scherzo riff, DSCH climax; never used as default texture.',

  'SH_FUGATO_01 — texture_state=fugato: subject in each voice with small interval/time variation; counter-subject optional; parallels relaxed on off-beats; strict species rules NOT required (pseudo-fugal).',
  'SH_FUGATO_02 — Loose canons at unison or octave; stretto-like entries of DSCH; SQ 15 sustains fugal writing across multiple movements.',

  'SH_TEX_TWO_VOICE_01 — Bare two-voice texture (V1 + Vc with V2/Va silent): isolation / vulnerability / autobiographical intimacy; allow extended passages (≥4 bars) in slow movements and introspective sections.',
  'SH_TEX_PIZZ_01 — Pizzicato function: comedic / mechanical / sinister-comedy / satirical punctuation; structural pizz bass under arco melody in lament passages — not extended-technique noise grammar.',

  'SH_TEX_MELACC_01 — texture_state=melody_accomp (most common): clear melody in one voice; homorhythmic harmony or ostinato in others; lead voice may shift per section.',
  'SH_TEX_CHORALE_01 — texture_state=chorale_state: all voices share rhythm; strict 4-part spacing; many suspensions; tragic or monumental sections; slow tempo.',
  'SH_TEX_PASSACAGLIA_01 — texture_state=passacaglia_bass: fixed pattern in Vc/Va repeated ≥6 times; upper voices vary harmony/melody; minor mode typically; slow tempo (SQ 3/V, SQ 10).',

  'SH_ACCOMP_01 — accomp library repeated_low_tonic: single repeated note or octave in Vc — dread.',
  'SH_ACCOMP_02 — accomp library pulsing_fifths: open 5th repeated on every beat or off-beat — emptiness / mechanical.',
  'SH_ACCOMP_03 — accomp library syncopated_stab: off-beat chord hit in inner voices — ironic / mechanical.',
  'SH_ACCOMP_04 — accomp library walking_minor_line: stepwise walking bass in minor — lament.',
  'SH_ACCOMP_05 — accomp library obsessive_eighth_pulse: continuous eighth notes in inner voice — moto perpetuo dread.',

  'SH_MEL_MARCH_01 — march_theme: duple/quadruple, repeated notes, strong beats, homophonic; heroic OR grotesque depending on mode + inner voices.',
  'SH_MEL_MARCH_02 — ironic_layering: diatonic simple top line over chromatic dissonant inner voices; minor/ambiguous harmony under nominally major theme.',
  'SH_MEL_LAMENT_01 — lament_theme: descending scalar fragments, long notes, pp–mf, rich suspensions; dark registers; Phrygian/Aeolian colour; ic1 prominent; often in high cello or low violin.',
  'SH_MEL_SCHERZO_01 — grotesque_scherzo melody: 3/4 ghost waltz or fast cut-time, wrong accents, grace-notes; Jewish/circus-like; harmonic minor or Mixolydian; off-beat sfz.',
  'SH_MEL_JEWISH_01 — jewish_theme: ic1 repetition, augmented-2 leaps, harmonic minor with raised 4, bouncy/asymmetric rhythmic pattern, off-beat emphasis; bittersweet/sardonic register.',
  'SH_MEL_SLOW_01 — tragic_slow_movement=true: slow tempo + ground_bass + frequent suspensions + DSCH-embedded intervals; sparse texture expanding to dissonant peaks then retreating; ending pp/ppp morendo with unresolved inner voices and DSCH fade.',

  'SH_FORM_OPEN_01 — opening_profile=slow_autobiographical_motto: quiet introspective DSCH fugato, pp, in medias res emotional weight from bar 1 (SQ 8/I model).',
  'SH_FORM_OPEN_02 — opening_profile=stark_unison: bare unison/octave in minor, no introduction.',
  'SH_FORM_OPEN_03 — opening_profile=sardonic_scherzo: biting rhythm, off-beat accents, immediate.',
  'SH_FORM_CLOSE_01 — ending_profile=pp_morendo: DSCH or main motive reappears and fades; unresolved inner-voice tensions; no heroic major resolution.',
  'SH_FORM_CLOSE_02 — ending_profile=circular_return: ending material = opening material transformed (SQ 8 spine).',
  'SH_FORM_CLOSE_03 — ending_profile=grim_assertion: fff unison but bleak — no triumph.',

  'SH_WORK_SQ3_01 — SQ 3 (F, five movements): first movement sonata-like, last movement passacaglia; cyclic thematic links; DSCH seeds present but not saturating.',
  'SH_WORK_SQ5_01 — SQ 5 (B♭, three movements played without break): attacca_chain=true; cyclic thematic links throughout.',
  'SH_WORK_SQ7_01 — SQ 7 (F♯, three compact movements): DSCH permeates; fugal writing prominent; DSCH as fugue subject.',
  'SH_WORK_SQ8_01 — SQ 8 (C minor, five movements attacca): DSCH saturated (≥100 appearances across movements); quotation events per movement; opening=slow_autobiographical_motto; movement pattern Largo–Allegro molto–Allegretto–Largo–Largo; ending pp morendo circular_return; "knock on door" silence events in IV.',
  'SH_WORK_SQ10_01 — SQ 10 (A♭, four movements): large passacaglia movement as formal centrepiece; complex_multi_movement form with cyclic motive recurrence.',

  'SH_PERIOD_EARLY_01 — early period (SQ 1–4): more conventional forms; less DSCH saturation; folk/Jewish themes prominent.',
  'SH_PERIOD_MIDDLE_01 — middle period (SQ 5–10): peak DSCH saturation; autobiographical coding intense; passacaglia and attacca_chain common.',
  'SH_PERIOD_LATE_01 — late period (SQ 11–15): sparser textures; more counterpoint; SQ 15 all-Adagio movements; closer to private utterance.',

  'SH_VS_BEETHOVEN_01 — vs Beethoven: down-weight complex sonata recaps and far-flung key graphs; up-weight narrative blocks, ostinati, obsessive cell repetition.',
  'SH_VS_BEETHOVEN_02 — vs Beethoven: forbid warp modulations and Grosse-Fuge-level rhythmic complexity; recap = darkened/distorted, not restored/resolved.',
  'SH_VS_BARTOK_01 — vs Bartók: forbid systematic axis substitution and long additive meters; modal colour = surface inflection not structural set logic.',
  'SH_VS_BARTOK_02 — vs Bartók: no Bulgarian/aksak meters — regular duple/triple with internal metric tricks only; folk = Russian/Jewish surface not deep pitch-set generator.',
  'SH_VS_REICH_GLASS_01 — vs Reich/Glass: ostinato function is narrative/ironic/dystopian, not process/pattern; repetition encodes emotional state, not audible process.',
  'SH_VS_REICH_GLASS_02 — vs Reich/Glass: harmony can change within an ostinato section (frozen rhythm with moving chords above); form is driven by narrative arc not process accumulation.',
  'SH_VS_RAVEL_01 — vs Ravel: no colour chords, planing, or delicate modal shimmer; plain triads + harsh dissonance + rhythmic rhetoric.',
  'SH_VS_RAVEL_02 — vs Ravel: emotional directness over colouristic refinement; no cyclic-theme elegance — instead DSCH obsession and quotation.',
] as const;
