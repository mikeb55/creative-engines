/**
 * Imported external groove MIDI — types for v1.7 groove bridge (read-only extraction).
 */

export enum GmDrumPitch {
  HI_HAT_FOOT = 22,
  KICK = 36,
  SNARE = 38,
  SNARE_RIM = 40,
  HI_HAT_CLOSED = 42,
  TOM_LOW = 45,
  HI_HAT_OPEN = 46,
  TOM_MID = 47,
  CRASH = 49,
  TOM_HIGH = 50,
  RIDE = 51,
}

export interface GrooveDrumEvent {
  pitch: GmDrumPitch;
  beatPosition: number;
  durationQuarters: number;
  velocity: number;
}

export interface ImportedGroove {
  sourceFile: string;
  ticks_per_beat: number;
  events: GrooveDrumEvent[];
  loopLengthBars: number;
  timeSignatureNumerator: number;
  timeSignatureDenominator: number;
}

export interface GrooveSectionAssignment {
  grooveId: string;
  startBar: number;
  endBar: number;
  groove: ImportedGroove;
}

export interface ImportedGrooveMusicContext {
  sourceEngineId: 'imported_groove';
  assignments: GrooveSectionAssignment[];
  totalBars: number;
  tempo: number;
}

/** GM percussion channel (1-based MIDI channel number). */
export const GM_DRUM_MIDI_CHANNEL = 10;

/** All enum values for pitch lookup. */
export const GM_DRUM_PITCH_VALUES: readonly GmDrumPitch[] = Object.values(GmDrumPitch).filter(
  (v): v is GmDrumPitch => typeof v === 'number',
);

const GM_DRUM_PITCH_SET = new Set<number>(GM_DRUM_PITCH_VALUES);

export function midiPitchToGmDrumPitch(midi: number): GmDrumPitch | undefined {
  if (!GM_DRUM_PITCH_SET.has(midi)) return undefined;
  return midi as GmDrumPitch;
}

export function beatsPerBarFromTimeSignature(numerator: number, denominator: number): number {
  if (denominator <= 0) return numerator;
  return numerator * (4 / denominator);
}
