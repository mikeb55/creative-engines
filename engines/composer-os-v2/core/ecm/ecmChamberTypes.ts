/**
 * ECM Chamber engine — explicit modes (distinct; not blended).
 */

export type EcmChamberMode = 'ECM_METHENY_QUARTET' | 'ECM_SCHNEIDER_CHAMBER';

export interface EcmSectionMetrics {
  label: string;
  startBar: number;
  length: number;
  foregroundLineCount: number;
  backgroundComplexityScore: number;
  avgChordsPerBar: number;
  cadenceCount: number;
  swellEvents: number;
  textureStates: string[];
}

export interface EcmGenerationMetrics {
  mode: EcmChamberMode;
  sections: EcmSectionMetrics[];
  motifEchoSegments: number;
  innerVoiceSmoothnessEstimate: number;
  strongCadenceEstimate: number;
}
