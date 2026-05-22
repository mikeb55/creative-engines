/**
 * Multi-voice riff generator tracks (horns, call-response windows, FX metadata).
 */

import type { RiffVoicingClass } from './riffPitchField';

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
  multiVoiceBadges?: {
    horns: boolean;
    bassInterlock: boolean;
    fxMarkers: boolean;
    solo: boolean;
  };
}
