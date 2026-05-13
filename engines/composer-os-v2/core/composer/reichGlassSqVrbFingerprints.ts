/**
 * Reich / Glass — SQ VRB minimalist-process entry.
 * Reference vocabulary: RG_* receipts encode pitch collections,
 * phase / additive process logic, pattern integrity, layered-ostinato
 * texture, and sub-profile flags for `reich_profile` vs `glass_profile`.
 * Anchored in Reich Different Trains (1988) and Glass String Quartets 2–5.
 */

export const REICH_GLASS_SQ_VRF_FINGERPRINT_RECEIPTS = [
  'RG_POLICY_01 — voiceId=reich_glass: SQ VRB minimalist-process entry with two sub-profiles: composer_profile ∈ {reich, glass}.',
  'RG_POLICY_02 — harmonicRhythm: min 4 / max 64 bars per chord/field; harmonic change is process-driven, not bar-counted.',
  'RG_POLICY_03 — bassPolicy.role=pattern-bass: Vc functions as pedal pitch or repeating bass pattern; no walking, no functional cadence motion.',
  'RG_POLICY_04 — melodicPolicy.contour=pattern-loop; preferredIntervalSets [2,3,4,7] (whole-step, m3, M3, P4/P5); no large random leaps mid-pattern.',
  'RG_POLICY_05 — pulseState=steady: pulse never disrupted; meter constant per section; thinning texture is the only allowed transition disruption.',
  'RG_POLICY_06 — rhythmPolicy.antiMetric=false: phase / additive process is structural; surface accent is steady-grid syncopation, not anti-metric.',
  'RG_POLICY_07 — phaseProcessEnabled=true (reich_profile only): Voice B re-enters Voice A pattern with start_offset incremented by Δ subdivisions after M repetitions.',
  'RG_POLICY_08 — additiveProcessEnabled=true (glass_profile only): base_unit + growth_sequence (e.g. [1,2,3,4,5,4,3,2,1]) governs section length.',
  'RG_POLICY_09 — patternIntegrityMinRepeats=N: every short pattern must repeat ≥N times before mutation; forbid spontaneous pitch substitution inside a running pattern.',

  'RG_PITCH_REICH_01 — reich_profile: per movement define centre_pc + pc_set (e.g. D major pentachord + neighbours); 80–90% of notes ∈ pc_set; foreign pcs only as brief neighbours / modulatory pivots.',
  'RG_PITCH_REICH_02 — reich_profile: harmonic interest comes from pattern interaction (phase, layer entrance/exit) not chord change; pc_set is fixed for the duration of a phase_block.',
  'RG_PITCH_GLASS_01 — glass_profile: mode_tag per movement (e.g. E Aeolian, B Dorian, D Mixolydian); diatonic to that mode except passing chromaticism.',
  'RG_PITCH_GLASS_02 — glass_profile: explicit progressions allowed (I–IV–V, tonic–relative–submediant); change between modes/keys at section boundaries.',

  'RG_CENTRE_01 — Both profiles: centre_pc enforced as (a) most frequent pitch, (b) Vc pedal, (c) final pitch of movements/sections.',
  'RG_CENTRE_02 — Centricity via tonic pedals, repeated cadential cells, and registral anchors — never V–I cadence.',

  'RG_CHORD_REICH_01 — reich_profile: open 5ths, triads, stacked 5ths/4ths across quartet; added 2nds/6ths for colour; example Vc=D, Va=A, V2=D, V1=E (D5 with added 2).',
  'RG_CHORD_GLASS_01 — glass_profile: tertian triads + 7th chords often arpeggiated; added 2/6/7 as colour; example Vc=C, Va=G, V2=E, V1=D (Cmaj9 spread).',
  'RG_CHORD_BOTH_01 — Chord classes limited to {I, IV, V, vi, ii, occasional III or ♭VII} plus added 2/6/7; no functional dominant 7 chains, no tritone subs.',
  'RG_CHORD_BOTH_02 — Voicing prefers open spacing: outer voices span 5th or octave at minimum; mid voices fill chord tones; no close stacks in upper strings.',

  'RG_HARM_RHYTHM_REICH_01 — reich_profile: chord/field stays until a process boundary; tie harmonic change to pattern transition not bar count; field can sustain tens of measures.',
  'RG_HARM_RHYTHM_REICH_02 — reich_profile: change triggers ∈ {new speech sample (Different Trains), layer entrance/exit, completed phase process}; never time-only.',
  'RG_HARM_RHYTHM_GLASS_01 — glass_profile: progression_loop sequences (e.g. |I–IV–I–V| repeated N times); 2–8 bar loops; changes mark section boundaries or additive growth steps.',

  'RG_PHASE_BLOCK_01 — phase_block (reich_profile): define base pattern P of length L; Voice A loops P; Voice B loops P with start_offset incremented by Δ after M repetitions.',
  'RG_PHASE_BLOCK_02 — phase_block: forbid changing pc_set inside the block; new vertical combinations and shifting accents are the harmonic content.',
  'RG_PHASE_BLOCK_03 — phase_block: process_parameter (phase offset, layer count, density) is the primary form axis; sections defined by offset ranges (0, 1/16, 2/16, … L−1/16).',
  'RG_PHASE_BLOCK_04 — phase_block: phase_index per voice; incremental change scheme; meter constant; pulse never reset.',

  'RG_CROSSFADE_01 — crossfade_section (reich_profile): pattern A decays over N bars while pattern B grows; overlap required; no abrupt cuts between phase_blocks.',
  'RG_CROSSFADE_02 — crossfade_section may span 4–16 bars; both patterns audible simultaneously for at least 25% of the crossfade window.',

  'RG_ADDITIVE_01 — additive_pattern (glass_profile): base_unit = 3-note or rhythmic cell; growth_sequence e.g. [1,2,3,4,5,4,3,2,1] units; transformation points at barlines or structural accents.',
  'RG_ADDITIVE_02 — additive_pattern: new units appended or truncated only at structural boundaries; mid-pattern substitution forbidden.',
  'RG_ADDITIVE_03 — section_cut (glass_profile): new additive_pattern may begin suddenly with optional common-tone link between old and new bass/pedal.',

  'RG_REPETITION_REICH_01 — reich_profile: long repeats; mutation only via phase shifts, layer add/remove, or new speech-derived motives; no arbitrary variation.',
  'RG_REPETITION_GLASS_01 — glass_profile: repeat pattern until additive change; transition via abrupt cut to new pattern (often new key area).',
  'RG_REPETITION_BOTH_01 — Both profiles forbid arbitrary melodic variation inside a running pattern; changes must follow declared process rules.',

  'RG_PATTERN_INTEGRITY_01 — Any short pattern maintains identity for ≥N repeats before mutation; forbid spontaneous pitch substitution.',
  'RG_PATTERN_INTEGRITY_02 — Pattern definition is immutable mid-run: voice may join, drop, or phase but cannot substitute pitches inside the loop.',

  'RG_ROLE_01 — role ∈ {top_pattern, second_pattern, mid_ostinato, bass_pedal}; default: V1=top_pattern, V2=second_pattern, Va=mid_ostinato, Vc=bass_pedal.',
  'RG_ROLE_02 — Role changes only at section boundaries; never mid-pattern.',

  'RG_INTERVOICE_REICH_01 — reich_profile: layered canons; strict canon at equal interval/time at start, then diverging via phase; canon_offset per voice.',
  'RG_INTERVOICE_GLASS_01 — glass_profile: stacked unisons/octaves; multiple parts share the same pattern at different starting points or registers; octave_transposition per voice.',
  'RG_INTERVOICE_BOTH_01 — Both: high correlation between voice pitch sequences; voices differ mainly in phase / register, not in independent melodic material.',

  'RG_WITHIN_LINE_01 — Within a line restrict interval content to {±2,±3,±4,±7 semitones}; forbid large random leaps unless start of a new section.',
  'RG_WITHIN_LINE_REICH_01 — reich_profile: arpeggios + small leaps within pc_set; pitch choices constrained to current pc_set.',
  'RG_WITHIN_LINE_GLASS_01 — glass_profile: arpeggiated triadic patterns + scalar runs; each line = repeated pattern with small stepwise inflections.',

  'RG_RHY_REICH_01 — reich_profile rhythmic cells: small motives 8–12 notes looped; straight 16ths or 8ths with syncopated accent maps.',
  'RG_RHY_REICH_02 — reich_profile: paradiddle-derived accent maps [strong,weak,weak,strong] or RLRR/LRLL mapped to pitches (ABAA BABB).',
  'RG_RHY_REICH_03 — reich_profile: phase = one voice shifts pattern by 1 subdivision after M repetitions; polyrhythmic feel emerges without changing beat grid.',
  'RG_RHY_GLASS_01 — glass_profile additive units: 3+3+2, 2+2+2+2, or repeating 4-note cells; pattern = concatenation [u1,u1,u2] with growth/decay lists controlling overall length.',
  'RG_RHY_GLASS_02 — glass_profile: growth/decay by adding/removing units at bar boundaries only.',

  'RG_PULSE_01 — pulse_state=steady at almost all times; meter rarely changes; never obscured to Ligeti / Bartók degree.',
  'RG_PULSE_02 — Only section transitions may thin texture without disrupting pulse; tempo modulation forbidden inside a phase_block or additive_pattern.',

  'RG_RESTS_01 — Rests sparse inside patterns; steady flow is default; full-voice rests only at end of large sections or Different Trains movement starts.',
  'RG_RESTS_02 — "Hole" patterns: specific rest positions inside a pattern allowed when encoded in pattern definition; rests never improvised.',

  'RG_RHY_HARM_REL_REICH_01 — reich_profile: accent structure functions as harmonic-rhythm surrogate; pattern_highlight positions align with key melodic / pedal tones.',
  'RG_RHY_HARM_REL_GLASS_01 — glass_profile: allow either pattern_reuse under different chord labels OR pattern_change with same chords; both valid harmonic-rhythm strategies.',

  'RG_TEX_LAYERED_OSTINATO_01 — layered_ostinato (default both profiles): ≥2 repeating patterns; each voice assigned pattern_id + phase_offset.',
  'RG_TEX_UNISON_LINE_01 — unison_line: 2–4 voices at unison/octave; optional chord tones in others; used for speech-derived melodies (Reich) or lyrical themes (Glass).',
  'RG_TEX_HETEROPHONIC_CANON_01 — heterophonic_canon: small deviations (missing notes, extra repeats) around shared base pattern; yields shimmer.',

  'RG_DENSITY_01 — Density is the primary formal tool: patterns start with 1–2 voices, build to 4-voice saturation, drop back; density parameter per section is monotone growth or decay segments.',
  'RG_DENSITY_02 — High density implies high pattern complexity (more phase offsets / more additive units); low density implies long pedals and bare textures.',

  'RG_TECH_01 — Both profiles: standard arco primary; occasional pizz; minimal extended techniques compared to Ligeti / Lachenmann.',
  'RG_TECH_02 — Colour primarily via register and dynamics, not special effects; Different Trains permits occasional col legno or sul ponticello as colour only.',

  'RG_DYN_01 — Dynamics terraced or slowly evolving: long arcs not detailed phrasing; crescendi/decrescendi mark large-scale form shape.',
  'RG_DYN_02 — Avoid articulation-heavy micro-dynamics; prefer sustained curves; phrase-level swells reserved for unison_line or section seams.',

  'RG_FORM_REICH_01 — Different Trains three-movement form: I America–Before the War, II Europe–During the War, III After the War.',
  'RG_FORM_REICH_02 — Different Trains: each movement = sequence of short speech fragments; quartet doubles and develops motives over repeating overlapping pattern layers.',
  'RG_FORM_REICH_03 — Treat each speech-derived motif as pattern seed; new section when new sample/motif enters; harmonic field stable per movement; sections joined via crossfade_section.',
  'RG_FORM_GLASS_01 — Glass quartets (2–5): multi-movement; each movement has own groove / texture / tonality; form is sectional (A–B–C…) with clear mode, register, and pattern changes.',
  'RG_FORM_GLASS_02 — Glass quartets: movement = list of {pattern_section} entries each with pattern_id, chord_loop, and mode_tag; additive process shapes growth within sections.',

  'RG_OPEN_01 — opening_profile=pattern_in_medias_res (both profiles): immediate pattern start; no intro; pattern already running at bar 1.',
  'RG_CLOSE_01 — loop_decrescendo: thinning texture + long decrescendo to silence (preferred for reich_profile and Glass slow movements).',
  'RG_CLOSE_02 — sharp_cut: sudden stop on final tonic loop iteration (preferred for glass_profile fast movements).',

  'RG_SUBPROFILE_REICH_01 — composer_profile=reich: require process parameters (phase index, layer count) on every phase_block; pc_set fixed per movement; chord progressions rare; crossfade_section for transitions; accent structure = harmonic surrogate.',
  'RG_SUBPROFILE_GLASS_01 — composer_profile=glass: require defined chord_loops + additive_operations; less phasing; clearer key changes; section_cut transitions allowed; progression_loop as primary harmonic driver.',

  'RG_VS_EACH_OTHER_01 — Reich vs Glass: Reich is process/phase-driven with complex rhythmic interactions, small pc_sets, harmonic fields not progressions.',
  'RG_VS_EACH_OTHER_02 — Glass vs Reich: Glass uses harmonic progression, additive melodic arpeggios, sectional arcs, less complex rhythmic phasing.',

  'RG_VS_LIGETI_01 — vs Ligeti micropolyphony: forbid opaque micropolyphonic cluster textures; patterns must be low-information and clearly perceivable.',
  'RG_VS_LIGETI_02 — vs Ligeti: no chromatic saturation fields; no hidden canonic complexity; pulse_state=steady always (Ligeti = flexible/suspended).',

  'RG_VS_BARTOK_01 — vs Bartók: suppress complex motivic transformation and varied time signatures; no dramatic recaps or folk-derived rhythmic asymmetry.',
  'RG_VS_BARTOK_02 — vs Bartók: no axis system, no aksak meters; emphasise process, loop, and gradual change over development.',

  'RG_VS_BEETHOVEN_01 — vs Beethoven: no sonata-like exposition–development–recap; no requirement for thematic return in resolved form; form = sequence of processes or blocks (non-teleological).',
  'RG_VS_BEETHOVEN_02 — vs Beethoven: tension/release via density accumulation/depletion, not V–I cadence; no Aug6 / N6 / dim7 pivot graph.',

  'RG_VS_TURTLE_ISLAND_01 — vs Turtle Island: no chord_symbols + improv hooks; no swing_feel; no walking-bass; harmonic rhythm 4–64 bars vs 0.5–4 bars in TI.',
  'RG_VS_KRONOS_01 — vs Kronos Quartet: process and pattern are the work; Kronos = curated stylistic variety where minimalism is one mode among many.',

  'RG_WORK_REICH_01 — Different Trains (1988) preset: pc_set fixed per movement; speech-sample → motif seeds; phase_block + crossfade_section primary process types; three-movement spine (America/Europe/After-the-War).',
  'RG_WORK_GLASS_01 — Glass SQ No. 2 "Company" (1983): four short movements; tertian triads + open spacing; additive_pattern with arpeggiated triads in V1/V2; clear sectional cuts.',
  'RG_WORK_GLASS_02 — Glass SQ No. 3 "Mishima" (1985): six movements; cinematic; section_cut transitions; mode_tag rotation across movements; progression_loop |i–♭VII–i–v|-style patterns.',
  'RG_WORK_GLASS_03 — Glass SQ No. 4 "Buczak" (1989): five movements; lyrical unison_line themes alternating with layered_ostinato; loop_decrescendo closings.',
  'RG_WORK_GLASS_04 — Glass SQ No. 5 (1991): five movements; longer additive growth_sequences; layered arpeggios in 6/8 and 12/8; broader dynamic arcs.',
] as const;
