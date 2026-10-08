/**
 * WWH Performance Director V7.3A — editable plan contract.
 * The plan selects, orders, and labels source material. It does not contain notes.
 */

export type Player = 'guitar' | 'bass';
export type Product = 'performance' | 'leadsheet' | 'guitar_study' | 'bass_partner';
export type GuitarMode = 'MELODIC' | 'CHORDAL' | 'HYBRID' | 'CHORD_MELODY';
export type Leadership = 'guitar' | 'bass' | 'shared';
export type EngineEdition = '7.3' | '7.3b';
export type Rat = { n: number; d: number };
export type Span = { firstMeasureId: string; lastMeasureId: string };
export type Point = { bar: number; offsetQ: Rat };
export type Role = 'lead' | 'respond' | 'support' | 'counterpoint' | 'listen';
export type Purpose =
  | 'statement'
  | 'fragmentation'
  | 'extension'
  | 'contrast'
  | 'improvisation'
  | 'bass_feature'
  | 'dialogue'
  | 'recall'
  | 'transformation'
  | 'silence'
  | 'ending';

export interface SourceBinding {
  scoreId: string;
  sha256: string;
  partIds: Record<Player, string>;
  annotationSha256: string | null;
}

export interface MotifRef {
  id: string;
  owner: Player;
  span: Span;
  sourceEventIds: string[];
  provenance: 'source_annotation' | 'user_confirmed' | 'candidate';
  preserve: Array<'rhythm' | 'contour' | 'pitch' | 'rests' | 'landing'>;
}

export type Length =
  | { kind: 'source'; span: Span }
  | { kind: 'fixed'; bars: number }
  | {
      kind: 'cue_window';
      cycleBars: number;
      minCycles: number;
      maxCycles: number;
      previewCycles: number;
      releaseCueId: string;
    };

export type MeterPolicy =
  | { kind: 'source'; span: Span }
  | { kind: 'repeat_template'; span: Span }
  | { kind: 'explicit'; beats: number; beatType: number; groups: number[] };

export type TempoPolicy =
  | { kind: 'source'; span: Span }
  | { kind: 'inherit_entry' }
  | { kind: 'explicit'; unitDenominator: number; dots: number; bpm: number }
  | { kind: 'rubato'; rejoinSectionId: string; previewQuarterBpm: number };

export interface ChordMelodyRef {
  id: string;
  sha256: string;
  scoreId: string;
  label: string;
}

export type Material =
  | { kind: 'source'; span: Span; sourcePlayer: Player; integrity: 'exact' }
  | { kind: 'chord_melody'; sourceSpan: Span; arrangementSpan: Span; integrity: 'exact' }
  | { kind: 'performer'; motifIds: string[]; instruction: string }
  | { kind: 'tacet'; reason: 'yield' | 'structural' | 'breath' };

export type Density = 'sparse' | 'moderate' | 'active';

export interface VoicePlan {
  material: Material;
  role: Role;
  entry: { kind: 'at'; point: Point } | { kind: 'cue'; cueId: string };
  exit: { kind: 'section_end' } | { kind: 'at'; point: Point } | { kind: 'cue'; cueId: string };
  density: Array<{ at: Point; level: Density }>;
}

export type InterruptionBehaviour = 'none' | 'stop' | 'overlap' | 'handoff';

export interface ResponseDelay {
  minQ: Rat;
  maxQ: Rat;
  previewQ: Rat;
}

export interface CueInterruption {
  behaviour: InterruptionBehaviour;
  overlapQ?: Rat;
  handoffTo?: Player;
}

export interface Cue {
  id: string;
  owner: Player | 'both';
  action: 'enter' | 'release' | 'handoff' | 'rejoin' | 'end' | 'interrupt';
  target: Player | 'both';
  trigger: { kind: 'at'; point: Point } | { kind: 'performer_signal'; earliest: Point; latest: Point; afterCueId: string | null };
  printedText: string;
  /** V7.3B. Absent on V7.3A cues. */
  prerequisites?: string[];
  responseDelay?: ResponseDelay;
  interruption?: CueInterruption;
  returnLandmarkId?: string | null;
}

export interface Exchange {
  id: string;
  initiator: Player;
  responder: Player;
  motifIds: string[];
  proposalCueId: string;
  responseCueId: string;
  relation: 'retain_rhythm' | 'answer_contour' | 'literal_recall' | 'contrast_then_return' | 'leave_space';
  retainedAnchor: string;
  returnSectionId: string | null;
  execution: 'performer_directed';
}

export interface Development {
  parentMotifIds: string[];
  operation: 'none' | 'fragment' | 'extend' | 'contrast' | 'recall' | 'transform';
  retained: Array<'rhythm' | 'contour' | 'pitch' | 'silence' | 'source_field'>;
  permittedDeparture: Array<'register' | 'rhythm' | 'texture' | 'harmony'>;
  returnSectionId: string | null;
  execution: 'literal_quote' | 'performer_directed';
}

export interface PlanSection {
  id: string;
  purpose: Purpose;
  length: Length;
  meter: MeterPolicy;
  tempo: TempoPolicy;
  primarySourceSpan: Span | null;
  guitarMode: GuitarMode;
  voices: Record<Player, VoicePlan>;
  development: Development;
  harmony: {
    policy: 'source' | 'performer_intent';
    sourceSpan: Span | null;
    vocabularyRefs: string[];
    instruction: string | null;
  };
  cues: Cue[];
  exchanges: Exchange[];
  rationale: string;
  /** V7.3B open sections. Absent on V7.3A. */
  leadership?: Leadership;
  /** Authorises a guitar swap between duo source and one verified arrangement span. */
  authorisedSubstitution?: { sourceSpan: Span; arrangementSpan: Span } | null;
}

export interface PracticeView {
  id: string;
  product: 'guitar_study' | 'bass_partner';
  sectionIds: string[];
  focus: Player;
  approaches: Array<'minimal' | 'lyrical' | 'adventurous'>;
}

export interface PerformancePlan {
  schemaVersion: '1.0';
  engineEdition: EngineEdition;
  id: string;
  source: SourceBinding;
  motifs: MotifRef[];
  identity: {
    primaryTraversal: Span[];
    protectedSpans: Span[];
    requiredMotifIds: string[];
    returnLandmarks: Array<{ id: string; span: Span }>;
  };
  sections: PlanSection[];
  ending:
    | { kind: 'source'; finalSectionId: string; tail: Span }
    | { kind: 'cue_release'; finalSectionId: string; cueId: string; preserveFinalSonority: boolean };
  practiceViews: PracticeView[];
  notes: string[];
  /** Absent on V7.3A plans. Present only when a verified arrangement is selected. */
  chordMelody?: ChordMelodyRef | null;
}

export interface CueTrace {
  planId: string;
  decisions: Array<
    | { kind: 'cycles'; sectionId: string; cycles: number }
    | { kind: 'signal'; sectionId: string; cueId: string; at: Point }
  >;
}

export interface CompiledSection {
  id: string;
  firstOutputBar: number;
  barCount: number;
  durationQ: Rat;
  cueTimes: Array<{ cueId: string; at: Point }>;
}

export interface PlanDiagnostic {
  code: string;
  sectionId: string | null;
  message: string;
}

export interface ExecutionReceipt {
  sourceSha256: string;
  planSha256: string;
  compilerVersion: string;
  sections: CompiledSection[];
  materials: Array<{
    sectionId: string;
    player: Player;
    status: 'SOURCE_REALIZED' | 'REST_REALIZED' | 'PERFORMER_UNREALIZED' | 'CHORD_MELODY_REALIZED';
  }>;
  warnings: PlanDiagnostic[];
  sourceMap: Array<{
    sectionId: string;
    player: Player;
    outputBar: number;
    sourceMeasureId: string | null;
    use: 'primary' | 'quotation' | 'none' | 'chord_melody';
    arrangementMeasureId?: string | null;
    notation?: 'source' | 'chord_melody' | 'rest' | 'open' | 'rest_then_open';
  }>;
  /** Section-relative schedule. Empty on V7.3A plans. */
  schedule?: SectionSchedule[];
  playbackStatus: 'SOURCE_AND_RESTS_ONLY' | 'ALL_NOTATED';
  products: Record<Product, { bars: number; sectionIds: string[] }>;
}

export interface PlayerWindow {
  entry: Point;
  exit: Point;
  causeCueId: string | null;
  exitCueId: string | null;
}

export interface SectionSchedule {
  sectionId: string;
  barCount: number;
  durationQ: Rat;
  plannedBarCount: number;
  firstOutputBar: number;
  leadership: Leadership | null;
  cues: Array<{ cueId: string; owner: Player | 'both'; at: Point; behaviour: InterruptionBehaviour }>;
  guitar: PlayerWindow;
  bass: PlayerWindow;
}

export const DIRECTOR_COMPILER_VERSION = 'wwh-performance-director-7.3a';
export const DIRECTOR_COMPILER_VERSION_73B = 'wwh-performance-director-7.3b';
