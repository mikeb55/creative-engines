/**
 * Tonality Vault — per-note tagging for melody / guitar layers (Build A).
 */

export type NoteTonalRole =
  | 'triadRoot'
  | 'triadThird'
  | 'triadFifth'
  | 'primaryTension'
  | 'secondaryTension'
  | 'triadPairTension'
  | 'bebopPassing'
  | 'chaos';

export type NoteLayer = 0 | 1 | 2 | 3;

/** Where this pitch class is rhythmically valid as an attack target. */
export type BeatLegality = 'strong' | 'weak' | 'syncopated' | 'approachOnly';

export type NoteTag = {
  tonalRole: NoteTonalRole;
  layer: NoteLayer;
  beatLegality: BeatLegality;
  /** Absolute pitch classes (0–11) preferred resolution / continuation targets. */
  resolveTargets: number[];
  voicingCompatibility: string[];
  guitarTechniques: string[];
};
