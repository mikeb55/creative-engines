/**
 * Phase 2+3a — compiled harmonic voice policy bundle (engine-only).
 * Reference vocabulary only — no imports from donor repos.
 */

export type BassPolicyRole =
  | 'root'
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
  /** Lachenmann SQ — noise field, no structural bass */
  | 'noise-field'
  /** Ligeti SQ — Vc participates as one micro-voice in stratified texture; no structural bass function */
  | 'embedded-voice'
  /** Crumb (Black Angels) — Vc alternates between low_ground noise-layer and sustained focal-pc pedal; no structural bass function */
  | 'noise-or-pedal'
  /** Jobim — bass acts as an independent singing line against shifting upper harmony (roots on 1 + syncopated 8th-note fill + cadential contrary motion); slash-chord context allowed */
  | 'melodic-counterline';

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
  | 'stepwise-arc';

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
  | 'aaba-or-through-composed-song';

export type BergRowClarityLevel = 'foreground' | 'balanced' | 'background';

/** Alban Berg — contrapuntal row clarity / strand hints (`voiceLeadingSolver.ts`). */
export interface BergVoiceLeadingParams {
  rowClarityLevel: BergRowClarityLevel;
  /** Preferred independent strands (4–8); informational for orchestration planning. */
  contrapuntalStrandTarget?: number;
}

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
    /** Pat Metheny — informational */
    flatTwoMaj7Approach?: boolean;
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
  };

  rhythmPolicy: {
    antiMetric: boolean;
    gospelShoutThreshold?: number;
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
}
