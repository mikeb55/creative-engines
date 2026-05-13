/**
 * Turtle Island Quartet — SQ VRB jazz-bridge entry.
 * Reference vocabulary: TI_* receipts encode chord-scale voicings, guide-tone
 * voice leading, groove libraries (swing/Latin/funk/ballad), percussive
 * string techniques (chop / slide / hickety / pizz comping), improv slots,
 * and head-solos-head formal grammar.
 */

export const TURTLE_ISLAND_SQ_VRF_FINGERPRINT_RECEIPTS = [
  'TI_POLICY_01 — voiceId=turtle_island: SQ VRB jazz-to-quartet bridge; head-solos-head spine; swing_feel + groove libraries as core not colour.',
  'TI_POLICY_02 — harmonicRhythm: min 0.5 / max 4 bars per symbol; ballad 2-4 beats/chord, bebop 2 chords/bar, modal vamp 1-2 chords across long durations.',
  'TI_POLICY_03 — bassPolicy.role=walking-bass: pizz quarter-note pulse with chord tones + diatonic + chromatic approaches; pedal/arco_melodic modes available per section.',
  'TI_POLICY_04 — melodicPolicy: chord-scale contour; preferredIntervalSets [1,2,3,5,7]; chromatic approach tones allowed only on weak beats.',
  'TI_POLICY_05 — swingFeel=true: straight 8ths notated, performed [long,short] 2:1; accent backbeats (2+4); ghost notes lead into strong beats.',
  'TI_POLICY_06 — guideToneVoiceLeading=enforced: 3rds/7ths never absent from chord aggregate; adjacent chords share ≥1 common guide-tone or move ±1-2 semitones.',
  'TI_POLICY_07 — improvSlots=enabled: per-section choice of fixed_passage | guided_improv | open_improv with chord/register/role constraints.',
  'TI_POLICY_08 — rhythmPolicy.antiMetric=false: swing/Latin/funk pulse remains steady; displacement is local event not structural disruption.',

  'TI_VOICING_01 — Four-voice mapping: Vc=root (or 3rd/5th in inversions); Va=3rd or 7th (guide tone); V2=7th or 3rd or 5th; V1=9/11/13 or melodic extension.',
  'TI_VOICING_02 — Drop-2 alternative: V2 written an octave lower to avoid high stacks; preferred when V1 sits above the staff for >2 bars.',
  'TI_VOICING_03 — 5th commonly omitted; non-trivial voicings (label ≠ pure triad) require ≥1 extension from {9, 11, 13, ♯11, ♭9, ♯9, ♭13}.',
  'TI_VOICING_04 — maj7 archetype: Vc=root, Va=3, V2=7, V1=9 or 13; Lydian voicings raise the 11 to ♯11 in V1.',
  'TI_VOICING_05 — min7 archetype: Vc=root, Va=♭3, V2=♭7, V1=9 or 11; 5th omitted.',
  'TI_VOICING_06 — dom7 archetype: Vc=root or 5, Va=3, V2=♭7, V1 ∈ {♭9, ♯9, ♯11, 13}; choose tension by chord-scale (Mixolydian/Lydian-dom/altered).',
  'TI_VOICING_07 — half-dim archetype: Vc=root, Va=♭5, V2=♭3, V1=♭7 or 9.',
  'TI_VOICING_08 — sus (7sus4): Vc=root, Va=4, V2=♭7, V1=9 or 13; inner line resolves 4→3 as voice-leading event when sus → unsuspended.',
  'TI_VOICING_09 — alt archetype: diminished-type cluster (3, ♭9, ♯9, ♭13) in upper strings over root or tritone in cello.',

  'TI_CHORDSCALE_01 — maj7 → Ionian or Lydian; ♯4 characteristic on Lydian voicings.',
  'TI_CHORDSCALE_02 — min7 → Dorian or natural minor; Dorian emphasises 6 with no leading-tone pull.',
  'TI_CHORDSCALE_03 — dom7 → Mixolydian | Lydian dominant (♯4,♭7) | altered (♭9,♯9,♭13).',
  'TI_CHORDSCALE_04 — half-dim → Locrian or Locrian ♮2.',
  'TI_CHORDSCALE_05 — altered → whole-tone or diminished (HW) over dominants resolving by 5th.',
  'TI_CHORDSCALE_06 — Strong-beat constraint: scalar notes on beats 1/3 restricted to current chord-scale; chromatic approach tones only on weak beats.',

  'TI_IIVI_01 — ii (Dm9 in C): Vc=D, Va=F, V2=C, V1=E or A; guide-tones C(7) and F(3) lead next chord.',
  'TI_IIVI_02 — V (G13 or G7alt): Vc=G, Va=B or F, V2=F or A, V1=tensions; B(3) and F(♭7) resolve down by semitone into target.',
  'TI_IIVI_03 — I (Cmaj9): Vc=C, Va=E, V2=B, V1=D or G; guide-tone chain 7(ii)→3(V)→7(I) = C→B→B.',
  'TI_IIVI_04 — Voice-leading constraint: ∃ inner voice with guide-tone interval ∈ {±1, ±2 semitones}; 3rds/7ths must persist in aggregate across A→B.',

  'TI_TRITONE_SUB_01 — V_sub root a tritone from V; 3rd/7th of V invert (3→7, 7→3) in V_sub; cello may spell substitute root.',
  'TI_TRITONE_SUB_02 — Over substitute V, ≥1 line emphasises altered tensions (♭9/♯9/♯11/♭13) of the substitute root.',

  'TI_PEDAL_01 — pedal_section: Vc pitch class fixed (root or alternating root/5th) for N≥2 bars; chord symbols change above; upper voices follow chord-scale of the moving harmony.',
  'TI_PEDAL_02 — During pedal_section bass walking is paused; cello may double-stop with 5th or 10th for body resonance.',

  'TI_ROLE_01 — Default role assignment: Vc=bass, Va=comp, V2=comp or counter, V1=lead; roles rotate at form boundaries (new solo / new chorus).',
  'TI_ROLE_02 — Exception: ballad solos may set role(Vc)=melodic_arco with upper voices taking comp; bass duty migrates to a pizz inner voice or implied root motion.',
  'TI_ROLE_03 — Inner voices (V2/Va): step_motion_ratio ≥ 0.7; approach notes ½ or 1 step from next chord tone; enclosure figures (above-below / below-above) allowed.',
  'TI_ROLE_04 — Contrary motion between V1 and Vc encouraged at phrase cadences and shout-section arrivals.',

  'TI_BASS_01 — walking mode: pizzicato quarter-notes; chord tones + diatonic + chromatic approaches; jumps ≤ octave; occasional slides and ghosted notes for swing inflection.',
  'TI_BASS_02 — pedal mode: repeated rhythmic figure on root/5th; mimics bass + drums; may add ghost slap on beat 4.',
  'TI_BASS_03 — arco_melodic mode: cello carries melody (typically ballad); upper voices take comp roles; walking pulse handled by Va or V2 pizz.',

  'TI_IMPROV_01 — fixed_passage: all pitches specified (heads, key backgrounds, shout choruses).',
  'TI_IMPROV_02 — guided_improv: chord symbol + register range + role constraint; free note choice within chord-scale and rhythmic cell library.',
  'TI_IMPROV_03 — open_improv: looser constraints; harmonic form maintained; soloist can substitute chord-scales within style_tag.',

  'TI_GROOVE_SWING_01 — swing_groove_state: Vc walks (pizz, continuous quarter pulse); Va/V2 deliver swing_comp_pattern (e.g. "& of 1, & of 2, 4") with off-beat chop hits; V1 leads melody or joins unison riff at shout.',
  'TI_GROOVE_SWING_02 — swing_groove_state: ≥1 inner voice with off-beat hits must always be present; bowing_style ∈ {light_detache, soft_spiccato}; ghost_note on lead-ins to strong beats.',
  'TI_GROOVE_LATIN_01 — latin_groove_state: 3-2 or 2-3 son clave pattern in Va or V2; tumbao-style bass in Vc; montuno comp in inner strings; V1 melody or improv over clave.',
  'TI_GROOVE_FUNK_01 — funk_groove_state: 16th-note grid; hits on 1e+a / 2e+a; choppy comp figures; accented backbeat; bass_mode=walking with optional 16th subdivision.',
  'TI_GROOVE_BALLAD_01 — ballad_groove_state: arco bass; sustained voicings; legato V1 with portamento + swells; rare percussive events; rubato-adjacent expression triplets.',

  'TI_CALL_RESPONSE_01 — call_response_pair: motif in V1 answered in an inner voice within N≤4 beats; match rhythm pattern; allow pitch/rhythm variant (transposition, augmentation, fragmentation).',
  'TI_UNISON_RIFF_01 — unison_riff at climactic shout points: all voices share rhythmic content in unison or close harmony (≤ minor 3rd spacing).',
  'TI_DISPLACEMENT_01 — displacement_event: motif start shifted 1 subdivision in ≥1 voice to create metric tension; resolve within the next 2 bars.',

  'TI_CELL_BEBOP_01 — bebop cells: syncopated 8th-note lines with enclosure triplet cells; off-beat accents; staccato; quick slurs across guide tones.',
  'TI_CELL_BALLAD_01 — ballad cells: long values; rubato-adjacent; expressive triplets; portamento between target notes.',
  'TI_CELL_LATIN_01 — Latin cells: clave-derived syncopation; cross-rhythmic comp (3+3+2 within 4/4 montuno).',
  'TI_CELL_FUNK_01 — funk cells: 16th grid; backbeat emphasis; percussive attacks; ghost 16ths between accented hits.',

  'TI_TECH_CHOP_01 — chop: percussive down-bow near frog; off-beat hi-hat/snare surrogate; heavily accented; primary drum_sim engine.',
  'TI_TECH_SLIDE_01 — slide: portamento/swoop between notes; jazz phrasing approaches; allowed on V1 lead lines and arco Vc ballad melodies.',
  'TI_TECH_HICKETY_01 — hickety_mute: fast left-hand muffling + pizz composite; ghost-note comp; percussive filler between chord hits.',
  'TI_TECH_PIZZ_01 — pizz (Vc): walking bass or broken comp; swing/Latin/funk grooves; primary cello mode outside ballad.',
  'TI_TECH_CHOP_PIZZ_01 — chop_pizz (Va/V2): rapid accented left-hand pizz on off-beats; surrogate hi-hat or rim-shot.',
  'TI_TECH_ARCO_LEAD_01 — arco_lead (V1): melody with vibrato and slides; primary lead-melody mode.',
  'TI_TECH_ARCO_PAD_01 — arco_pad (inner): sustained chords with swells and hairpins; primary ballad inner-voice mode.',

  'TI_DRUMSIM_01 — drum_sim layer: snare → chop or col_legno hit; hi-hat → light chop or short pizz; kick → low accented Vc attack or slapped body.',
  'TI_DRUMSIM_02 — full_rhythm_section_state requires (a) dedicated bass line in Vc, (b) percussive attacks in ≥1 upper voice, (c) harmonic support in ≥1 inner/upper voice — simultaneously.',

  'TI_ARTIC_01 — bebop articulation: short articulated notes; slight staccato; quick slurs across guide-tones.',
  'TI_ARTIC_02 — ballad articulation: legato; portamento; swells; sustained values.',
  'TI_ARTIC_03 — funk articulation: accented short strokes; occasional snap pizz; ghost 16ths.',
  'TI_ARTIC_04 — swing articulation: light détaché; ghosted off-beats; backbeat accents.',

  'TI_DYN_01 — ghost (sub-pp) for passing/unaccented notes; sfz for kicks and chord hits; hairpins into important chord arrivals and phrase peaks.',
  'TI_DYN_02 — Solo build: dynamic climb across chorus pairs; shout chorus reaches f-ff with unison_riff arrival.',

  'TI_FORM_01 — Structure slots: intro (optional) → head_in → solo_choruses → interlude → head_out → tag/coda; each slot has allowed roles/grooves/articulations.',
  'TI_FORM_02 — 12-bar blues form: jazz changes; shuffle or swing groove; call_response_pair between V1 and inner strings; tritone subs allowed at bars 4 / 8 / 11.',
  'TI_FORM_03 — 32-bar AABA form: jazz harmonic rhythm; roles shift at B (bridge) section (e.g. V1 step back, Va or V2 take fragmentary lead).',
  'TI_FORM_04 — Modal form: long vamps; pedal bass; scale-colour improvisation; sectional change only at chorus boundary.',
  'TI_FORM_05 — standard_mode: original melody mostly intact in V1; inner voices add riffs, hits, reharmonisations.',
  'TI_FORM_06 — original_mode: free melodic material; same chord-grammar, groove, and roles as standard_mode.',
  'TI_FORM_07 — tag_section: 1-4 bars repeated N times; optional intensity build or improvised fills; clean cut or fade ending.',
  'TI_FORM_08 — transitional_section (classical↔jazz): half-swing; simpler harmony; reduced extensions; gradually add groove patterns and jazz articulations (or reverse).',

  'TI_PROFILE_BEBOP_01 — bebop_profile: high tempo; strong ii–V–I; tight chord-scale alignment; unison/octave head in V1/V2 with harmony in Va/Vc; articulated staccato; soli passages harmonised; open solo choruses with guided_improv.',
  'TI_PROFILE_BALLAD_01 — ballad_profile: slower harmonic rhythm; arco bass; rich pads; legato melody; tritone subs and chromatic passing chords; dynamic swells; sustained voicings; arco throughout.',
  'TI_PROFILE_BLUES_01 — blues_profile: 12-bar form with jazz substitutions; swing or shuffle groove; call_response_pair V1 vs inner strings; rotating solo order.',
  'TI_PROFILE_LATIN_01 — latin_profile: clave and tumbao patterns; syncopated montuno comp; modal harmony; tag_section over clave vamp.',

  'TI_VS_CLASSICAL_01 — vs Beethoven / Bartók: relax parallel 5th/7th prohibition in harmonic voicings; add chord symbols, groove roles, improv slots; replace species counterpoint with guide-tone voice leading.',
  'TI_VS_CLASSICAL_02 — vs Beethoven / Bartók: add swing_feel, groove pattern libraries, and percussive techniques (chop / chop_pizz / col_legno surrogate) as first-class textures.',
  'TI_VS_PIANO_TRIO_01 — vs jazz piano trio: adapt voicing density to four strings (no two-hand spread); replace drum kit with drum_sim layer (chop, col_legno, slap).',
  'TI_VS_PIANO_TRIO_02 — vs jazz piano trio: retain same harmonic grammar; emphasise sustain, counterpoint, and timbral variety over pure percussive drive.',
  'TI_VS_KRONOS_01 — vs Kronos Quartet: chord symbols and improv hooks are first-class; swing_feel and groove patterns are core grammar, not occasional colour. Kronos mode = more fully notated, less improvised, jazz = colour-only.',
  'TI_VS_BIGBAND_01 — vs Maria Schneider / Gil Evans big-band: V1/V2/Va = sax/trumpet section reduced to 3 voices (soli); Vc + percussive techniques = rhythm-section surrogate; use spread voicings and linear guide-tone writing to approximate large-ensemble colour in four voices.',

  'TI_WORK_01 — Spider Dreams / Skylife era: bebop_profile dominant; high-tempo unison heads; chop-driven swing; ii-V-I head_in/head_out.',
  'TI_WORK_02 — Latin/world fusion era (post-1995): latin_profile and modal vamps; clave/tumbao primary; arco_lead melody over montuno.',
] as const;
