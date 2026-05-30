/**
 * V89 composition depth types — harmonic elaboration of any MusicContext.
 */

import type { MusicContextReceipt } from '../music-context/musicContextTypes';

export type DramaticArcFunction = 'exposition' | 'development' | 'climax' | 'resolution';

export type HarmonicDevelopmentPhase = 'tension_rise' | 'plateau' | 'release';

export type HarmonicDevelopmentSegment = {
  phase: HarmonicDevelopmentPhase;
  startBar: number;
  endBar: number;
  tensionLevel: number;
  chordSymbols: readonly string[];
  description: string;
};

export type MotivicTransformationKind = 'augmentation' | 'inversion' | 'retrograde' | 'fragmentation';

export type MotivicTransformation = {
  kind: MotivicTransformationKind;
  sourceMotifId: string;
  intervalPattern: readonly number[];
  rhythmPattern?: readonly { startBeat: number; duration: number }[];
  description: string;
};

export type ReharmonisationAlternative = {
  symbol: string;
  rationale: string;
};

export type ReharmonisationSuggestion = {
  originalSymbol: string;
  alternatives: readonly ReharmonisationAlternative[];
};

export type SectionArcEntry = {
  function: DramaticArcFunction;
  startBar: number;
  endBar: number;
  label: string;
};

export interface CompositionDepth {
  harmonicDevelopmentPlan: readonly HarmonicDevelopmentSegment[];
  motivicTransformations: readonly MotivicTransformation[];
  reharmonisationSuggestions: readonly ReharmonisationSuggestion[];
  sectionArcMap: readonly SectionArcEntry[];
  composerNotes: string;
  provenance: {
    sourceEngineId: 'composition_depth';
    capturedAt: number;
    sourceContextEngineId?: string;
  };
  receipt: MusicContextReceipt;
}

export type CompositionDepthReceiptPayload = {
  sectionCount: number;
  reharmonisationCount: number;
  motivicTransformationCount: number;
  arcSpanBars: number;
};
