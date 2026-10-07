/**
 * Dev 5A colour-field vocabulary.
 * Bands are coarse musical judgements. They are not measurements.
 * Colour names are not Roman-numeral functions.
 * Centre is never stored here. Home is a collection, decided in context.
 */

export type ColourBand = 'low' | 'moderate' | 'high';

/** Intrinsic tendency of the resource when it is not the home collection. */
export type HomeDistanceBand = 'near' | 'moderate' | 'far';

export type PentatonicColourFunction =
  | 'HOME'
  | 'INSIDE'
  | 'CONTINUITY'
  | 'BRIGHT_COLOUR'
  | 'DARK_COLOUR'
  | 'SUSPENDED'
  | 'AMBIGUOUS'
  | 'EDGE'
  | 'OUTSIDE'
  | 'REMOTE'
  | 'RESOLUTION';

export interface PentatonicColourMetadata {
  brightness: ColourBand;
  darkness: ColourBand;
  stability: ColourBand;
  ambiguity: ColourBand;
  openness: ColourBand;
  tension: ColourBand;
  chromaticEdge: ColourBand;
  distanceFromHome: HomeDistanceBand;
  commonTonePotential: ColourBand;
  /** Semitone offsets from the reference that mark this colour. Not a chord formula. */
  characteristicIntervals: readonly number[];
  suitabilityRetention: ColourBand;
  suitabilityDeparture: ColourBand;
  suitabilityResolution: ColourBand;
  primaryColour: PentatonicColourFunction;
  alsoServes: readonly PentatonicColourFunction[];
}

export interface PentatonicColourResource {
  id: string;
  displayName: string;
  /** Semitone offsets from the reference pitch. Five unique values. Reference is 0. */
  intervals: readonly number[];
  letterSteps: readonly number[];
  family: string;
  /** Why this collection is in the vocabulary. */
  role: string;
  metadata: PentatonicColourMetadata;
  /** Set only when the same intervals already exist on the Dev 1 path registry. */
  pathArchetypeId: 'major_pentatonic' | 'minor_pentatonic' | null;
}

export interface ColourFieldAssessment {
  resourceId: string;
  displayName: string;
  referenceNote: string;
  pitchClasses: readonly number[];
  colour: PentatonicColourFunction;
  /** Shared evidence pitch classes / evidence pitch classes. Not voice-leading. */
  pitchCompatibility: number | null;
  /** Shared tones with the current collection, else with HOME. Not voice-leading. */
  commonToneContinuity: number | null;
  /** How useful a difference from HOME or the current collection is. Null when there is nothing to differ from. */
  usefulContrast: number | null;
  /** Mean nearest pitch-class distance from this collection to HOME, divided by 6. Not voice-leading. */
  colourDistanceFromHome: number | null;
  nearestPitchClassDisplacement: number | null;
  tension: number;
  resolutionPotential: number;
  neighbourContinuity: number | null;
  changeFriction: number;
  /** Heuristic 0–1. Not a probability. Not a suitability floor. */
  score: number;
  explanation: string;
}

export type ColourFieldDisposition = 'NONE' | 'RETAIN' | 'SELECT';

export interface ColourFieldResult {
  registryVersion: string;
  evaluatorVersion: string;
  disposition: ColourFieldDisposition;
  /** Reported centre pitch. Never used as HOME. */
  centreNote: string | null;
  homeResourceId: string | null;
  selected: ColourFieldAssessment | null;
  /** At most four collections. Not the full vocabulary. */
  shortlist: readonly ColourFieldAssessment[];
  nonePreferred: boolean;
  explanation: string;
  /** Harmony symbol strings seen on MusicContext and left unmapped. */
  harmonySymbolsIgnored: readonly string[];
}

export interface ColourContextEvidence {
  centreNote?: string | null;
  home?: { resourceId: string; referenceNote: string } | null;
  current?: { resourceId: string; referenceNote: string } | null;
  melodyNotes?: readonly string[];
  bassNotes?: readonly string[];
  harmonyNotes?: readonly string[];
  heldNotes?: readonly string[];
  previousPitchClasses?: readonly number[] | null;
  nextPitchClasses?: readonly number[] | null;
}
