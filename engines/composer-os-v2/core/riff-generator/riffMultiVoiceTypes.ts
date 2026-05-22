/**
 * Multi-voice riff generator tracks (horns, call-response windows, FX metadata).
 */

import type { ScoreModel } from '../score-model/scoreModelTypes';
import type { RiffVoicingClass } from './riffPitchField';

/** Riff-path MusicXML / GM instrument tags (guitar vs solo lane). */
export type RiffPartInstrumentTag = 'cleanGuitar' | 'overdrivenGuitar';

export const RIFF_GUITAR_PART_INSTRUMENT_TAG: RiffPartInstrumentTag = 'cleanGuitar';
export const RIFF_SOLO_PART_INSTRUMENT_TAG: RiffPartInstrumentTag = 'overdrivenGuitar';

export interface RiffPartInstrumentAssignment {
  guitar: RiffPartInstrumentTag;
  solo?: RiffPartInstrumentTag;
}

/** GM program 0-based on score parts (buildRiffScoreModel): clean = 27, overdriven = 29. */
export const RIFF_INSTRUMENT_MIDI_PROGRAM: Record<RiffPartInstrumentTag, number> = {
  cleanGuitar: 27,
  overdrivenGuitar: 29,
};

/** GM 1–128 values written to MusicXML `<midi-program>` (General MIDI standard). */
export const RIFF_GM_MIDI_PROGRAM_MUSICXML: Record<RiffPartInstrumentTag, number> = {
  cleanGuitar: 27,
  overdrivenGuitar: 30,
};

export function scorePartInstrumentTag(part: {
  id: string;
  name?: string;
  instrumentIdentity?: string;
}): RiffPartInstrumentTag | null {
  if (
    part.id === 'guitar' &&
    part.instrumentIdentity === 'clean_electric_guitar' &&
    part.name === 'Clean Electric Guitar'
  ) {
    return RIFF_GUITAR_PART_INSTRUMENT_TAG;
  }
  if (part.id === 'solo' && part.instrumentIdentity === 'electric_guitar_solo') {
    return RIFF_SOLO_PART_INSTRUMENT_TAG;
  }
  return null;
}

export function riffMusicXmlMidiProgramForPart(part: {
  id: string;
  name?: string;
  instrumentIdentity?: string;
}): number | null {
  const tag = scorePartInstrumentTag(part);
  return tag ? RIFF_GM_MIDI_PROGRAM_MUSICXML[tag] : null;
}

export function riffPartInstrumentTagForPartId(partId: string): RiffPartInstrumentTag | null {
  if (partId === 'guitar') return RIFF_GUITAR_PART_INSTRUMENT_TAG;
  if (partId === 'solo') return RIFF_SOLO_PART_INSTRUMENT_TAG;
  return null;
}

export function riffPartInstrumentTagsFromScore(score: ScoreModel): RiffPartInstrumentAssignment | null {
  const guitar = score.parts.find((p) => p.id === 'guitar');
  if (!guitar) return null;
  const solo = score.parts.find((p) => p.id === 'solo');
  const out: RiffPartInstrumentAssignment = { guitar: RIFF_GUITAR_PART_INSTRUMENT_TAG };
  if (solo) out.solo = RIFF_SOLO_PART_INSTRUMENT_TAG;
  return out;
}

export type HornStabFunction = 'answer' | 'double' | 'block';

export interface StabEvent {
  bar: number;
  beat16th: number;
  duration16ths: number;
  voicingClass: RiffVoicingClass;
  function: HornStabFunction;
}

export type HornStabTrack = StabEvent[];

export interface GuitarRestWindow {
  bar: number;
  startBeat: number;
  endBeat: number;
  ghostOnly: boolean;
}

export type FxMarkerType = 'bow' | 'theremin' | 'reverseEcho';

export type FxMarkerRole = 'sectionBoundary' | 'cadentialReset' | 'textureBridge';

export interface FxMarker {
  bar: number;
  type: FxMarkerType;
  role: FxMarkerRole;
  receiptId?: string;
  metadataOnly: true;
}

export type FxMarkerTrack = FxMarker[];

/** Per-bar lock-grid part indicators (stub — no waveform). */
export interface RiffBarPartIndicator {
  bar: number;
  parts: Array<'guitar' | 'horns' | 'bass' | 'fx' | 'solo'>;
}

export interface RiffGenerationMetadata {
  hornStabTrack?: HornStabTrack;
  fxMarkerTrack?: FxMarkerTrack;
  guitarRestWindows?: GuitarRestWindow[];
  barPartIndicators?: RiffBarPartIndicator[];
  /** Riff generator part → instrument tag (clean vs overdriven solo). */
  partInstruments?: RiffPartInstrumentAssignment;
  multiVoiceBadges?: {
    horns: boolean;
    bassInterlock: boolean;
    fxMarkers: boolean;
    solo: boolean;
  };
}
