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
  | 'noise-field';

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
  | 'gesture-physical';

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
  | 'through-composed-noise-grammar';

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
}
