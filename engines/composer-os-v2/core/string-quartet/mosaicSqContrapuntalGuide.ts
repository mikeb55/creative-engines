/**
 * V80f - SQ mosaic motif delivery contract (soft target into ContrapuntalLineEngine).
 * Stored on generationMetadata.mosaicSqContrapuntalGuides keyed by sectionLabel.
 */

export type MosaicSqMotifAnchorWeight = 'hard' | 'soft';

export type MosaicSqAllowableTransform =
  | 'registral_transfer'
  | 'fragmentation'
  | 'rhythmic_displacement'
  | 'inversion'
  | 'augmentation';

export type MosaicSqContrapuntalGuide = {
  sectionLabel: string;
  startBar: number;
  endBar: number;
  presetRole: 'string_quartet';
  motifAnchors: Array<{
    bar: number;
    beat: number;
    pitchMidi?: number;
    pitchClass?: number;
    durationBeats: number;
    weight: MosaicSqMotifAnchorWeight;
  }>;
  motifContour?: number[];
  rhythmPattern?: number[];
  protectedBars: number[];
  protectedOnsets?: Array<{ bar: number; beat: number }>;
  allowableTransforms: MosaicSqAllowableTransform[];
  forbiddenRewrites: {
    parallelOctaves: boolean;
    parallelFifths: boolean;
    voiceCrossing: boolean;
    retrograde: true;
  };
  voiceAssignment: {
    leadPartId: 'sq_violin_1';
    handoffAllowed: boolean;
  };
};

export type MosaicSqContrapuntalGuideMap = Record<string, MosaicSqContrapuntalGuide>;
