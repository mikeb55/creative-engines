import type { CompositionContext } from '../compositionContext';
import type { EmotionalDrift } from './reharmCandidateEngine';

export type ReharmSequenceRequest = {
  context: CompositionContext;
  startBar: number;
  endBar: number;
  /** 1–3 songwriter style ids (passed to {@link buildReharmLensConfig}). */
  lensIds: string[];
  /** Optional per-bar melody pitch classes (aligned to **startBar…endBar**); entries may be null. */
  melodyPcs?: (number | null)[];
  drift?: EmotionalDrift;
  seed?: number;
};

export type AlternativeBar = {
  barIndex: number;
  originalSymbol: string;
  substituteChordTypeId: string;
  substituteRootPc: number;
  strategy: string;
  mappingNull: boolean;
};

export type AlternativeProgression = {
  lensId: string;
  bars: AlternativeBar[];
  /** Placeholder mean combined-rank score (0–10) until full GCE wiring. */
  gceScore?: number;
};

export type ReharmResult = {
  alternatives: AlternativeProgression[];
  requestedLens: string[];
  startBar: number;
  endBar: number;
  seed: number;
};
