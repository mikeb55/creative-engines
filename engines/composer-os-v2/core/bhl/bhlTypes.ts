/**
 * BHL iteration 1 — source events and locks.
 * No phrase generation. No ScoreModel round trip.
 */

export interface BhlSpan {
  /** Document order, 1-based, inclusive. */
  from: number;
  to: number;
}

/** One attack from `measureViews` (chord tones folded into `midis`; grace notes omitted). */
export interface BhlSourceEvent {
  partId: string;
  bar: number;
  voice: string;
  onsetTicks: number;
  ticks: number;
  divisions: number;
  onsetQuarters: number;
  quarters: number;
  rest: boolean;
  /** Sounding MIDI. Empty on a rest. */
  midis: number[];
  /** `<tie>` or `<tied>` start. */
  tieStart: boolean;
  /** `<tie>` or `<tied>` stop. */
  tieStop: boolean;
}

export interface BhlMetreLock {
  partId: string;
  bar: number;
  beats: number;
  beatType: number;
  /** True when this bar contains a `<time>` element. */
  stated: boolean;
}

/** Tempo in force for one bar. `statedAtBar` may sit before the locked span. */
export interface BhlTempoLock {
  bar: number;
  beatUnit: string | null;
  perMinute: string | null;
  soundTempo: string | null;
  statedAtBar: number | null;
  statedOnPartId: string | null;
}

export type BhlTextKind = 'rehearsal' | 'words' | 'segno' | 'coda' | 'ending' | 'repeat';

export interface BhlTextLock {
  partId: string;
  bar: number;
  kind: BhlTextKind;
  text: string;
}

/** Sounding bass from `absTimeline` (rests omitted, tied pitches merged). */
export interface BhlSoundingBass {
  startQuarters: number;
  endQuarters: number;
  midi: number;
}

export interface BhlLockSpec {
  span: BhlSpan;
  bassPartId: string;
  guitarPartId: string;
  /** Document-order guitar bars whose notes stay locked. */
  protectedGuitarBars: readonly number[];
}

export interface BhlLockMap extends BhlLockSpec {
  sourcePath: string;
  sourceSha256: string;
  bass: BhlSourceEvent[];
  guitar: BhlSourceEvent[];
  metres: BhlMetreLock[];
  tempos: BhlTempoLock[];
  rehearsal: BhlTextLock[];
  structural: BhlTextLock[];
  soundingBass: BhlSoundingBass[];
}

export interface BhlLockReport {
  ok: boolean;
  errors: string[];
  reimports: boolean;
}
