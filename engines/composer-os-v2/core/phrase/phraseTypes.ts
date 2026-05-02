/** Stage 2 phrase arc labels — 4-bar duo sequencing / contrast (not identical to bar-level PhraseIntent). */
export type PhraseSequencingType = 'question' | 'departure' | 'cadence' | 'arrival';

export type PhraseRhythmComplexity = 'simple' | 'moderate' | 'complex';
export type PhraseFeel = 'straight' | 'swung' | 'laid_back' | 'pushed';
export type PhraseContour = 'ascending' | 'descending' | 'arch' | 'flat' | 'wave';
export type PhraseHarmonicRole = 'tonic' | 'subdominant' | 'dominant' | 'chromatic' | 'ambiguous';

export type PhraseRange = {
  startBar: number;
  endBar: number;
};

/** Optional Frank Zappa 7/8 rhythmic cell reference (Musicality Phase 1; mirrors solo metadata). */
export type PhraseZappaRhythmicCell = {
  formSection: 'A' | 'B';
  spec: string;
  eighthSpans: readonly number[];
};

export type Phrase = {
  id: string;
  range: PhraseRange;
  rhythmComplexity: PhraseRhythmComplexity;
  feel: PhraseFeel;
  density: number; // 0.0 - 1.0
  contour: PhraseContour;
  harmonicRole: PhraseHarmonicRole;
  gaps: number; // count of silent beats
  repetitionOf?: string; // id of source phrase if this is a return
  rhythmFingerprint?: string[]; // duration-weighted grid-relative rhythm cells
  /** Callback / engine: section rhythmic cell (7/8) when phrase is Zappa-scoped. */
  zappaRhythmicCell?: PhraseZappaRhythmicCell;
};
