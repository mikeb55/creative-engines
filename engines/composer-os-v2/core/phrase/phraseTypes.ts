export type PhraseRhythmComplexity = 'simple' | 'moderate' | 'complex';
export type PhraseFeel = 'straight' | 'swung' | 'laid_back' | 'pushed';
export type PhraseContour = 'ascending' | 'descending' | 'arch' | 'flat' | 'wave';
export type PhraseHarmonicRole = 'tonic' | 'subdominant' | 'dominant' | 'chromatic' | 'ambiguous';

export type PhraseRange = {
  startBar: number;
  endBar: number;
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
};
