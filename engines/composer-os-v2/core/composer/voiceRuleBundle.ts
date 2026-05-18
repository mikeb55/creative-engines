/**
 * Phase 2+3a — compiled harmonic voice policy bundle (engine-only).
 * Reference vocabulary only — may import cross-cutting engine types from `core/counterpoint/`.
 */

import type { AbstractLineTextureTag, DissonanceProfile } from '../counterpoint/abstractLineSet';

export type BassPolicyRole =
  | 'root'
  /** Jobim — bass as independent singing line (beat-1 roots + syncopated fill + cadential contrary motion); slash-chord context allowed */
  | 'melodic-counterline'
  | 'chromatic-first'
  /** Wayne Shorter axis / pedal bass motion */
  | 'axis-root'
  /** Pat Metheny diatonic step / third root pathways */
  | 'diatonic-step-third'
  /** Beethoven late SQ — pedal + cadential fifth grammar */
  | 'structural-bass'
  /** Turtle Island Quartet — pizz quarter-note walking pulse */
  | 'walking-bass'
  /** Reich / Glass — pedal pc or repeating bass pattern (no functional motion) */
  | 'pattern-bass'
  /** Shostakovich SQ — ostinato bass figure or sustained pedal pc */
  | 'ostinato-or-pedal'
  /** Arvo Pärt tintinnabuli — tonic/dominant pedal or sustained open-fifth drone under M+T */
  | 'pedal-or-drone'
  /** Erik Satie — slow tonic/modal pedal or static bass degrees (Gymnopédie alternation); no walking line */
  | 'pedal-or-static'
  /** Lachenmann SQ — noise field, no structural bass */
  | 'noise-field'
  /** Ligeti SQ — Vc participates as one micro-voice in stratified texture; no structural bass function */
  | 'embedded-voice'
  /** Ligeti SQ VRB — bass marks lowest spatial limit; not root function or melodic bass */
  | 'registral_boundary'
  /** Crumb (Black Angels) — Vc alternates between low_ground noise-layer and sustained focal-pc pedal; no structural bass function */
  | 'noise-or-pedal'
  /** Ornette Coleman harmolodics — bass floats tonal hints (steps, 4ths/5ths, riffs); not a fixed progression anchor */
  | 'melodic-floating'
  /** George Gershwin — walking songbook bass vs concert symphonic bass motion */
  | 'walking-or-symphonic'
  /** Cole Porter — functional roots + semitone bass descent modules + scalar linkage */
  | 'chromatic-descent-or-root';

export type MelodicContourPolicy =
  | 'descending-arc'
  | 'orbiting'
  | 'angular'
  | 'pentatonic-cell'
  /** Beethoven late SQ — terse interval/rhythm cells */
  | 'motivic-cell'
  | 'diatonic-step'
  /** Turtle Island Quartet — chord-scale aligned melodic line */
  | 'chord-scale'
  /** Reich / Glass — looped pattern with constrained interval set */
  | 'pattern-loop'
  /** Shostakovich SQ — stepwise default with flagged expressive leaps */
  | 'stepwise-with-leaps'
  /** Lachenmann SQ — gesture-physical (pitch decoupled; sound_type-driven) */
  | 'gesture-physical'
  /** Ligeti SQ — neighbor-tone motion (±1, ±2 semitones); micropolyphony default */
  | 'neighbor-motion'
  /** Crumb (Black Angels) — symbolic gesture-driven contour (angelic ascent / demonic plunge / spectral hover); pc-set + ic1/ic6/P5/P4 vocabulary */
  | 'gesture-symbolic'
  /** Jobim — stepwise majority with occasional 4th / 5th leaps; long arcs over slow harmonic rhythm; raised 4 in major / natural 6 in minor */
  | 'stepwise-arc'
  /** Arvo Pärt tintinnabuli — M-voice strictly diatonic/modal stepwise with registral expansion rules */
  | 'stepwise-diatonic'
  /** Erik Satie — shallow modal/pentatonic-inflected lines; no leading-tone climax */
  | 'stepwise-modal'
  /** Ornette Coleman harmolodics — blues/modal pitch field, phrase-first lines; no chord-scale bar spine */
  | 'blues-field-free'
  /** George Gershwin — diatonic song contour with authorised blue inflections over functional harmony */
  | 'blues-diatonic'
  /** Cole Porter — speech-shaped, lyric-led elegance; chromatic passing without blues field */
  | 'speech-elegant';

export type NarrativeArcPolicy =
  | 'continuous-curve'
  | 'suite'
  | 'blues-backbone'
  | 'free'
  /** Beethoven late string quartets — sonata / variation / fugue / attacca spine */
  | 'sonata-variation-fugue-attacca'
  /** Turtle Island Quartet — head-in / solo choruses / head-out spine */
  | 'head-solos-head'
  /** Reich / Glass — phase / additive process sections (non-teleological) */
  | 'minimalist-process'
  /** Shostakovich SQ — episodic narrative blocks (march / scherzo / lament / quotation) */
  | 'narrative-episodic'
  /** Lachenmann SQ — through-composed sound-type / energy-curve grammar */
  | 'through-composed-noise-grammar'
  /** Ligeti SQ1 — 12–17 continuous sections with G4 cell continuity (no harmonic cadence boundaries) */
  | 'continuous-sections'
  /** Ligeti SQ2 — five-movement profile (nervoso / sostenuto / meccanismo / furioso / delicatezza) */
  | 'five-movement'
  /** Crumb Black Angels — 13 images / 3 parts ritual arch with global peak at image 7 (Threnody II); Threnodies 1/7/13 = arch supports */
  | 'ritual-arch'
  /** Jobim — 32-bar AABA (default), AABBA, or through-composed (Águas de Março) song form with remote-key bridge */
  | 'aaba-or-through-composed-song'
  /** Arvo Pärt tintinnabuli — variation cycles (Fratres) and/or single long arch (Spiegel) without teleological drama */
  | 'variation-or-arch'
  /** Erik Satie — loops, juxtaposition, furniture modules; no obligatory climax or cadential goal */
  | 'non-teleological'
  /** Ornette Coleman — scripted collective sections (tutti / solos / duo) without harmonic milestone teleology */
  | 'through-composed-event-script'
  /** George Gershwin — 32-bar AABA songbook vs multi-section concert rhapsody */
  | 'aaba-or-rhapsody'
  /** Cole Porter — 32-bar discipline vs extended continuous refrain / beguine chain */
  | 'aaba-or-extended-refrain';

export type BergRowClarityLevel = 'foreground' | 'balanced' | 'background';

/** T-voice positional shadow modes relative to M (tintinnabuli VRB). */
export type TintinnabuliTVoicePositionMode =
  | '1_above'
  | '1_below'
  | '2_above'
  | '2_below'
  | 'alternating';

/** Alban Berg — contrapuntal row clarity / strand hints (`voiceLeadingSolver.ts`). */
export interface BergVoiceLeadingParams {
  rowClarityLevel: BergRowClarityLevel;
  /** Preferred independent strands (4–8); informational for orchestration planning. */
  contrapuntalStrandTarget?: number;
}

/** SQ→BB Harmonic Voice — optional metadata on {@link ContrapuntalLinePolicy} (Ravel, future SQ picks). */
export type SqVrbIndependenceLevel = 'low' | 'moderate' | 'high' | 'maximum';
export type SqVrbImitationStyle =
  | 'motivic_echo'
  | 'strict_interval_cycle'
  | 'staggered_entry'
  | 'climactic_synthesis'
  | 'leitmotif_development';
export type SqVrbRegisterPolicy =
  | 'comfortable_with_climax_leaps'
  | 'wide_registral_contrast'
  | 'extreme_registers'
  | 'lyrical_arch'
  | 'heroic_arch_with_fanfare_leaps'
  | 'lyrical_soprano_arch_mid_centrist'
  | 'dramatically_volatile_wide_arc'
  | 'mid_register_additive_expansion'
  | 'dynamically_wide_arc_accumulative'
  | 'systematic_bass_to_soprano_expansion'
  | 'mid_register_chromatic_inner_compression'
  | 'low_biased_extreme_punctuation_spikes'
  | 'extreme_pointillist_leaps_all_registers'
  | 'open_string_low_pedal_lyrical_soprano_arch'
  | 'registral_expansion_contraction'
  | 'micropolyphonic_merged_texture';
export type SqVrbPhraseArticulation =
  | 'periodic_cadential'
  | 'continuous_motor_rhythm'
  | 'ostinato_cell_based'
  | 'folk_modal_suspended'
  | 'romantic_periodic_cadential'
  | 'strict_periodic_tonal_cadence'
  | 'doubly_open_cell_development'
  | 'looping_cell_no_cadence'
  | 'repeating_ostinato_no_cadence'
  | 'ground_iterations_progressive_entry'
  | 'through_composed_arch_no_cadence'
  | 'asymmetric_cell_non_resolving'
  | 'aphoristic_cell_silence_bounded'
  | 'four_bar_periodic_suspended_non_resolving'
  | 'micropolyphonic_stasis';

/** ContrapuntalLineEngine — VRB hooks for line-first generation + post-filter (Pass 2 stub). */
export interface ContrapuntalLinePolicy {
  enabled: boolean;
  dissonanceProfile: DissonanceProfile;
  preferredImitationTypes: Array<'strict' | 'free' | 'invertible'>;
  rhythmicIndependenceRequired: boolean;
  /** `fixed` = roles locked per voice (Pärt-style); `dynamic` = roles shift from interaction (Brookmeyer-style). */
  lineRoleAssignment: 'fixed' | 'dynamic';
  /** SQ→BB profile id when this policy row is composer-specific (e.g. `ravel`). */
  vrbId?: string;
  independenceLevel?: SqVrbIndependenceLevel;
  imitationStyle?: SqVrbImitationStyle;
  registerPolicy?: SqVrbRegisterPolicy;
  phraseArticulation?: SqVrbPhraseArticulation;
  /** Zimmer passacaglia — ground bass + progressive voice entry (sub-mode, not separate vrbId). */
  passacagliaMode?: boolean;
  /** Ligeti — canonic independence; not conventional parallel/contrary pairing. */
  parallelMotionPolicy?: 'avoid' | 'allow';
  /** Ligeti — large leaps only at structural boundaries. */
  leapPolicy?: 'structural_only' | 'free';
  /** Ligeti — ic1/ic2-dominant vertical vocabulary. */
  preferredIntervals?: number[];
  dissonanceTolerance?: 'low' | 'moderate' | 'high';
}

/** Duo golden-path — guitar/bass derivation from {@link AbstractLineSet} (stubs + routing hints). */
export type DuoVoiceIntervalPreference =
  | 'chromatic'
  | 'ic1_tritone'
  | 'diatonic'
  | 'chromatic_upper_extension'
  | 'chromatic_sheets_of_sound'
  | 'diatonic_chromatic'
  | 'whole_tone_pentatonic'
  | 'upper_extension_non_functional'
  | 'blues_chromatic_collective'
  | 'chromatic_voice_colour'
  | 'blues_chromatic'
  | 'whole_tone_chromatic'
  | 'chromatic_flat2_tritone'
  | 'chromatic_pedal_modal' // Oliver Nelson — minor-pedal / modal blues over chromatic inner motion
  | 'chromatic_studio'
  | 'chromatic_lush'
  | 'chromatic_polytonal'
  | 'modal_sparse'
  | 'pentatonic_diatonic'
  | 'limited_transposition';

export interface DuoVoicePolicy {
  guitarSource: 'soprano_line' | 'chord_block_derived';
  bassSource: 'bass_line' | 'root_extraction';
  rhythmicIndependenceFloor: number;
  registerInterlock: boolean;
  intervalPreference: DuoVoiceIntervalPreference;
  /** When true, duo post-process may read {@link AbstractLineSet.asymmetricMeterMap} (Fripp / Crimson). */
  useAsymmetricMeterMap?: boolean;
  /** Default funk texture tag for line-first post (James Brown). */
  textureTagType?: AbstractLineTextureTag['type'];
  /** When true, duo post-process may read {@link AbstractLineSet.extendedTechniquePolicy} (Messiaen). */
  useExtendedTechniquePolicy?: boolean;
}

/** SQ VRB duo defaults — spread as `DUO_VOICE_POLICY_SQ_FAMILY_STUB`; per-bundle overrides floors in `voiceRuleBundles.ts`. */
export const DUO_VOICE_POLICY_SQ_FAMILY_STUB: DuoVoicePolicy = {
  guitarSource: 'soprano_line',
  bassSource: 'bass_line',
  rhythmicIndependenceFloor: 0.75,
  registerInterlock: true,
  intervalPreference: 'chromatic',
};

/** Shared line-first SATB policy for jazz / BB VRBs (parallel fifths allowed; octaves forbidden). */
export const DUO_CONTRAPUNTAL_POLICY_JAZZ: ContrapuntalLinePolicy = {
  enabled: true,
  dissonanceProfile: {
    allowedIntervals: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    forbiddenIntervals: [],
    parallelFifthsAllowed: true,
    parallelOctavesAllowed: false,
    resolveByStep: false,
  },
  preferredImitationTypes: ['free', 'invertible'],
  rhythmicIndependenceRequired: true,
  lineRoleAssignment: 'dynamic',
};

/** Colour / SQ-adjacent line-first policy (parallel fifths discouraged like Bartók bundle). */
export const DUO_CONTRAPUNTAL_POLICY_COLOR: ContrapuntalLinePolicy = {
  enabled: true,
  dissonanceProfile: {
    allowedIntervals: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    forbiddenIntervals: [6],
    parallelFifthsAllowed: false,
    parallelOctavesAllowed: false,
    resolveByStep: false,
  },
  preferredImitationTypes: ['strict', 'invertible'],
  rhythmicIndependenceRequired: true,
  lineRoleAssignment: 'fixed',
};

export interface VoiceRuleBundle {
  voiceId: string;

  harmonicRhythm: {
    /** Minimum bars to hold one chord symbol before allowing a change (0 = no bar-level minimum). */
    minChordDurationBars: number;
    /** Maximum bars the same symbol may be held before a refresh is encouraged (large = relaxed). */
    maxChordDurationBars: number;
    allowMidBarChange: boolean;
  };

  bassPolicy: {
    role: BassPolicyRole;
    allowOctaveDoubling: boolean;
  };

  voicingPolicy: {
    minSpreadSemitones: number;
    maxSpreadSemitones: number;
    clusterSizeNotes: [number, number];
    forbidParallelFifths: boolean;
    forbidOctaveDoubling: boolean;
    /** Coltrane lattice emphasis — informational / Phase 3b */
    augmentedTriadLatticeBasis?: boolean;
    /** Pat Metheny colour hint — informational */
    lydianMaj7Sharp11Default?: boolean;
  };

  melodicPolicy: {
    contour: MelodicContourPolicy;
    maxLeapSemitones: number;
    preferredIntervalSets?: number[];
    /** Ligeti / research — ic1/ic2 stepwise preference (alias readable in tests). */
    preferredIntervals?: number[];
    /** Pat Metheny — informational */
    flatTwoMaj7Approach?: boolean;
    /** Ligeti — pure ascent / descent as formal gesture. */
    directionalArch?: boolean;
  };

  orchestrationPolicy: {
    anchorToneCount: number;
    mutateSingleVoiceAtTime: boolean;
    allowCollectiveImprov: boolean;
    /** Optional research-derived fingerprint lines (Thad Jones BB orchestration vocabulary). */
    fingerprintReceipts?: readonly string[];
  };

  formPolicy: {
    narrativeArc: NarrativeArcPolicy;
    sectionRecallEnforced: boolean;
    /** Ligeti — climax at golden-mean placement; not teleological cadence. */
    goldenMeanClimax?: boolean;
    /** Ligeti — registral density expansion/contraction arc. */
    densityExpansionContraction?: boolean;
    /** Ligeti — thinning replaces cadential release. */
    noCadentialRelease?: boolean;
    /** Ligeti — stasis as default surface. */
    stasisSurface?: boolean;
  };

  rhythmPolicy: {
    antiMetric: boolean;
    gospelShoutThreshold?: number;
    /** Ligeti Etudes — polyrhythmic phase offset / two-hand canon. */
    phaseDisplacement?: boolean;
  };

  repairPolicy: {
    resolveParallels: boolean;
    maxVoiceOverlap: number;
  };

  /** Alban Berg — optional row-aware scoring (`voiceLeadingSolver.ts`). */
  bergVoiceLeading?: BergVoiceLeadingParams;
  /** Bob Brookmeyer — harmony voicing yields to melodic line (`voiceLeadingSolver.ts`). */
  lineFirstHierarchy?: boolean;
  /** Beethoven late SQ VRB — dim7 / enharmonic pivot graph (informational). */
  dim7EnharmonicModulationEnabled?: boolean;
  /** Beethoven late SQ VRB — species-style strictness hint (informational). */
  speciesVoiceLeadingBias?: 'off' | 'low' | 'medium' | 'high';
  /** Turtle Island Quartet — swing eighths performed [long,short] 2:1 (informational). */
  swingFeel?: boolean;
  /** Turtle Island Quartet — guide-tone voice-leading enforced (informational). */
  guideToneVoiceLeading?: boolean;
  /** Turtle Island Quartet — chord-scale-based improv slots enabled (informational). */
  improvSlots?: boolean;
  /** Reich / Glass SQ VRB — sub-profile flag selecting process grammar. */
  composerProfile?: 'reich' | 'glass';
  /** Reich / Glass SQ VRB — pulse-state posture (Reich/Glass = always steady). */
  pulseState?: 'steady' | 'flexible' | 'suspended';
  /** Reich / Glass SQ VRB — phase_block process available (reich_profile). */
  phaseProcessEnabled?: boolean;
  /** Reich / Glass SQ VRB — additive_pattern process available (glass_profile). */
  additiveProcessEnabled?: boolean;
  /** Reich / Glass SQ VRB — minimum repeats before a pattern may mutate. */
  patternIntegrityMinRepeats?: number;
  /** Shostakovich SQ VRB — DSCH motive grammar (theme / accomp / fugue subject / bass ostinato). */
  dschMotifEnabled?: boolean;
  /** Shostakovich SQ VRB — quotation events (own symphonies / opera / revolutionary songs). */
  quotationEventsEnabled?: boolean;
  /** Shostakovich SQ VRB — tragic-slow-movement profile (ground bass + DSCH + morendo). */
  tragicSlowMovementProfile?: boolean;
  /** Shostakovich SQ VRB — period sub-profile. */
  shostakovichPeriod?: 'early' | 'middle' | 'late';
  /** Lachenmann SQ VRB — sound_type grammar (Klangtypen as primary structural axis). */
  soundTypeGrammarEnabled?: boolean;
  /** Lachenmann SQ VRB — primary Klangtypen palette (5 noise-grammar categories). */
  klangtypenPrimary?: readonly (
    | 'fließklang'
    | 'geräuschklang'
    | 'druckklang'
    | 'tonklang'
    | 'impulsklang'
  )[];
  /** Lachenmann SQ VRB — pitch_role decoupled from structural function. */
  pitchRoleDecoupled?: boolean;
  /** Lachenmann SQ VRB — forbid extra-musical / numerological / quotation overlays. */
  noSemanticOverlay?: boolean;
  /** Ligeti SQ VRB — sub-profile flag selecting SQ1 vs SQ2 grammar. */
  ligetiProfile?: 'sq1' | 'sq2';
  /** Ligeti SQ VRB — G4 germinal interval set (Forte 4-1, prime form `[0,1,2,3]`) drives motivic identity. */
  g4GerminalSetEnabled?: boolean;
  /** Ligeti SQ VRB — micropolyphony mode: continuous neighbor-tone lines, phase-independent voices, density lifecycle. */
  micropolyphonyMode?: boolean;
  /** Ligeti SQ VRB — tension-metric curve required per section/movement (cluster width, pc_count, ic1 density). */
  tensionMetricCurvesRequired?: boolean;
  /** Ligeti SQ VRB — pc-field state grammar (chromatic_dense / cluster_narrow / constellation / sparse_filtered). */
  pcFieldStateGrammarEnabled?: boolean;
  /** Ligeti SQ VRB — silence as active structural element (silence_windows at section boundaries). */
  silenceAsStructureEnabled?: boolean;
  /** Ligeti SQ VRB — large-scale tempo-curve direction per movement (accel / rit / arch / flat). */
  tempoCurveDirection?: 'accelerating' | 'decelerating' | 'arch' | 'flat' | 'flexible';
  /** Ligeti SQ VRB — texture-as-harmony: forbid discrete chord changes in micropolyphony mode. */
  textureAsHarmonyEnabled?: boolean;
  /** Crumb (Black Angels) — numerology system (7 + 13) governs groupings, repeat counts, phrase lengths, counting gestures. */
  numerologyEnabled?: boolean;
  /** Crumb (Black Angels) — amplification is an independent dimension from dynamic marking (hyper-real ppp on sul pont harmonics). */
  amplificationDecoupled?: boolean;
  /** Crumb (Black Angels) — symbolically coded technique states (electric_insects / devil_music / god_music / consort_past / lament_slow). */
  symbolicTechniqueStatesEnabled?: boolean;
  /** Crumb (Black Angels) — sound_type per image ∈ {pitched, noise, hybrid}; transitions aligned with image / part boundaries. */
  soundTypeStates?: readonly ('pitched' | 'noise' | 'hybrid')[];
  /** Crumb (Black Angels) — mirror / echo image pairs (3↔9 · 11↔12 · 1↔13) carry shared pc_set + technique + transformed dynamic / inversion. */
  mirrorEchoEnabled?: boolean;
  /** Jobim — bossa-nova rhythmic feel: 3+3+2 / 2+3+3 8th-note groupings over 4/4 + melodic anticipation + soft internalised pulse (no drum kit). */
  bossaNovaFeel?: boolean;
  /** Jobim — Lydian raised-4 colour on tonic maj7♯11 in major contexts (Wave, Girl from Ipanema, Triste); maj7♯11 verticals allowed without dominant prep. */
  lydianColourEnabled?: boolean;
  /** Arvo Pärt tintinnabuli VRB — dual-voice M (scale) + T (triad shadow) system active. */
  tintinnabuliEnabled?: boolean;
  /** T-voice position law options (whole-passage / section). */
  tVoicePositionModes?: readonly TintinnabuliTVoicePositionMode[];
  /** Sacred-stillness posture: sparse texture, mf ceiling, symmetry bias. */
  sacredProfile?: boolean;
  /** Formal silence / unison–triad collapse at boundaries (tintinnabuli etiquette). */
  silenceAsStructure?: boolean;
  /** Tintinnabuli technique ceiling — color only, no noise grammar. */
  tintinnabuliExtendedTechniquesLevel?: 'minimal';
  /** Structural soft dynamic ceiling (pp–mf field). */
  dynamicCeiling?: 'pp' | 'p' | 'mp' | 'mf';
  /** Forbid Western teleological development / transformation as primary driver. */
  noTeleologicalDevelopment?: boolean;
  /** Forbid Reich/Glass-style audible process operators as structural subject. */
  forbidAudibleProcessOperators?: boolean;
  /** Erik Satie — parallel triad/seventh/add-note planing as first-class colour (no CP repair). */
  parallelChordsEnabled?: boolean;
  /** Erik Satie — V7 as colour with low tonic-resolution probability. */
  unresolvedDominantEnabled?: boolean;
  /** Erik Satie — musique d'ameublement: short isochronous loops, arbitrary concat. */
  furnitureModeEnabled?: boolean;
  /** Erik Satie — church_mode ↔ salon_waltz ↔ cabaret_vamp ↔ furniture_loop section switches. */
  ironicStyleSwitchEnabled?: boolean;
  /** Erik Satie SQ VRB — suppress functional V→I scoring on line + GCE path. */
  suppressFunctionalResolution?: boolean;
  /** Ornette Coleman harmolodics — coequal harmony/melody/rhythm grid; democratic lines */
  harmolodicsEnabled?: boolean;
  /** Ornette Coleman — pitch field + pulse replace chord-chart truth */
  pitchFieldGoverned?: boolean;
  /** Ornette Coleman — foreground/background roles shift by listening cues */
  democraticEnsemble?: boolean;
  /** Ornette Coleman — collective improv + micro call/response (informational; see orchestrationPolicy.allowCollectiveImprov) */
  collectiveImprovEnabled?: boolean;
  /** Ornette Coleman — blue thirds/fifths and bend vocabulary required at planning layer */
  bluesInflectionRequired?: boolean;
  /** George Gershwin — blue degrees in melody and supporting voicings */
  blueNoteEnabled?: boolean;
  /** George Gershwin — jazz extension voicings (m7, 9, 13, alt) on functional shell */
  jazzExtensionEnabled?: boolean;
  /** George Gershwin — blues field colour (♭3, ♭7, ♯4) on diatonic framework */
  bluesColourEnabled?: boolean;
  /** George Gershwin — III7–VI7–II7–V7 bridge / I–vi–ii–V turnaround vocabulary */
  rhythmChangesEnabled?: boolean;
  /** George Gershwin — wide-register rhapsody / concerto developmental arcs */
  concertModeEnabled?: boolean;
  /** George Gershwin — compact 32-bar songbook phrasing */
  songModeEnabled?: boolean;
  /** Cole Porter — semitone bass descent modules as first-class device */
  chromaticBassEnabled?: boolean;
  /** Cole Porter — parallel major/minor mixture on shared tonic_pc */
  majorMinorMixtureEnabled?: boolean;
  /** Cole Porter — repeated-note obsessive openings */
  repeatedNoteOpeningEnabled?: boolean;
  /** Cole Porter — harmony events align with lyric / formal milestones */
  textCoupledHarmonyEnabled?: boolean;
  /** Cole Porter — sidestep / delay / mode-trigger wit parameters active */
  witStyleProfile?: boolean;
  /** ContrapuntalLineEngine — line-first SATB policy when VRB opts in (`bartok`, `bob_brookmeyer`, …). */
  contrapuntalLinePolicy?: ContrapuntalLinePolicy;
  /** Duo golden-path — AbstractLineSet lane + independence floor (Brookmeyer / Bartók stubs). */
  duoVoicePolicy?: DuoVoicePolicy;
  /** SQ→BB — primary BB arranging style for compatibility badge (read in UI, not hardcoded). */
  bestBbStyle?: import('../counterpoint/sqToBbWorkflowTypes').SqToBbStyleProfileId;
  secondaryBbStyle?: import('../counterpoint/sqToBbWorkflowTypes').SqToBbStyleProfileId;
  cautionBbStyle?: import('../counterpoint/sqToBbWorkflowTypes').SqToBbStyleProfileId;
  /** SQ→BB — stable extended chord color tags for harmony planners. */
  sqChordVocabulary?: string[];
  /** SQ→BB Harmonic Voice profile id when specialized (`ravel`, …). */
  sqVrbProfileId?: string;
  /** SQ→BB — optional late-style flag (modal pedal, Spanish dance); not default quartet. */
  lateStyleAvailable?: boolean;
  /** Herrmann film stub — romantic mode (clearer centers) vs default thriller. */
  herrmannRomanticModeAvailable?: boolean;
  /** Morricone — pedal may sustain up to N bars (Deborah's Theme / modal float). */
  pedalPointValidBars?: number;
  /** Morricone — romantic period (legato arcs) vs default western. */
  morriconeRomanticModeAvailable?: boolean;
  /** Badalamenti film stub — Vln I lead / inner jazz cushion / Vc pedal (documented). */
  badalamentiThreeTierTexture?: import('../counterpoint/vrbProfiles/sqVrbProfileTypes').SqBadalamentiThreeTierTexture;
}
