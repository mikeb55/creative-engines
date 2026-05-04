/**
 * Tonality Vault Build C — guitar voicing snapshot (engine layer).
 */

export type FretboardTechniqueTag =
  | 'alternate'
  | 'economy'
  | 'sweep'
  | 'legato'
  | 'slide'
  | 'bend'
  | 'double-stop';

export type FretboardTonalRole = 'triad' | 'primaryQuadratonic' | 'tensionQuadratonic' | 'triadPair';

export type FretboardRealization = {
  /** Absolute pitch classes 0–11 (one per fingered string). */
  pitchClasses: number[];
  /** Guitar string indices 0 = low E, 5 = high e. */
  strings: number[];
  /** Frets parallel to `strings` (0 = open). */
  frets: number[];
  /** Mean fret (register / “position”). */
  positionCenter: number;
  techniqueTags: FretboardTechniqueTag[];
  tonalRole: FretboardTonalRole;
  tuningId: string;
};
