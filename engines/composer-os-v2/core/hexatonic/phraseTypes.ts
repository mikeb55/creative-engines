/**
 * Hexatonic Phase H3 — phrase types.
 * BMEF numbers describe the phrase. They do not approve it.
 */

import type { MotifMapMethod } from '../pentatonic/motifTransform';
import type { DistanceClass } from '../pentatonic/fieldDistance';
import type { VaultTriadQuality } from '../wwh/wps/wpsTonalityVaultRecord';

export const HEXATONIC_PHRASE_VERSION = 'hexatonic-phrase-h3.0';

export type HexatonicPhraseRole = 'inside' | 'outside' | 'return';
export type HexatonicPhraseFamily = 'scalar' | 'wps-pair';
export type HexatonicSurface = 'melody' | 'dyad' | 'triad' | 'rest' | 'bass';

export interface HexatonicAttack {
  part: 'guitar' | 'bass';
  startBeat: number;
  duration: number;
  pitches: readonly number[];
  spellings: readonly string[];
  pitchClasses: readonly number[];
  surface: HexatonicSurface;
}

export interface HexatonicPhraseBar {
  index: number;
  role: HexatonicPhraseRole;
  collectionId: string;
  direction: string;
  attacks: readonly HexatonicAttack[];
}

export interface HexatonicPhraseRequest {
  seed: number;
  /** Semitone offset from the collection's reference spelling. 0–11. */
  centre: number;
  method?: MotifMapMethod;
  scalarId?: string;
  wpsId?: string;
}

export interface HexatonicBmef {
  name: 'BMEF';
  role: 'descriptive';
  artisticApproval: false;
  humanPlayability: 'NOT VERIFIED';
  note: string;
  motifRecurrence: {
    cellNotes: number;
    returnNotes: number;
    sharedPitchClasses: number;
    rhythmRestated: boolean;
  };
  transformations: readonly string[];
  noteDensityPerBar: number;
  restCount: number;
  restBeats: number;
  phraseBars: number;
  phraseBeats: number;
  registerSpan: number;
  registerChanged: boolean;
  collectionMembership: { inside: boolean; outside: boolean; return: boolean };
  harmonicDisplacement: {
    outsideOnlyPitchClasses: number;
    distanceClass: DistanceClass;
    sharedPitchClasses: number;
  };
  returnEvidence: {
    method: MotifMapMethod;
    commonToneRetentions: number;
    nearestTone: boolean;
    registerOrRhythmChange: boolean;
    homeRecovered: boolean;
  };
  guitar: {
    maxSimultaneous: number;
    maxFretSpan: number;
    sixNoteChords: number;
    inRange: boolean;
  };
}

export interface HexatonicPhrase {
  version: typeof HEXATONIC_PHRASE_VERSION;
  seed: number;
  centre: number;
  centreName: string;
  family: HexatonicPhraseFamily;
  homeId: string;
  outsideId: string;
  developmentMethod: MotifMapMethod;
  returnMethod: MotifMapMethod;
  displacementRepair: boolean;
  cellDegrees: readonly number[];
  parentSymbol: string | null;
  harrisLabel: string | null;
  provenance: string;
  resolutionQuality: VaultTriadQuality | null;
  tensionQuality: VaultTriadQuality | null;
  resolutionSpelling: readonly string[] | null;
  tensionSpelling: readonly string[] | null;
  shellOutsideUnion: readonly number[];
  symmetryLandingId: string | null;
  bars: readonly HexatonicPhraseBar[];
  bmef: HexatonicBmef;
  musicXml: string;
}
