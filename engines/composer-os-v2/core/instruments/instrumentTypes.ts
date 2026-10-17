/**
 * Composer OS V3.4 Stage A — instrument catalogue types.
 * Comfort ranges are inference. Hard ranges are the documented sounding limits.
 */

export type InstrumentFamily =
  | 'strings'
  | 'woodwinds'
  | 'brass'
  | 'saxophones'
  | 'percussion'
  | 'keyboard'
  | 'plucked'
  | 'guitar'
  | 'electronic';

/** Rimsky-Korsakov, Principles of Orchestration, chapter I. Saxophone is not in that table. */
export type BalanceClass =
  | 'trumpet_trombone_tuba'
  | 'horn'
  | 'woodwind'
  | 'saxophone'
  | 'strings_section'
  | 'other';

export type Technique =
  | 'arco'
  | 'pizz'
  | 'snap_pizz'
  | 'col_legno'
  | 'sul_pont'
  | 'sul_tasto'
  | 'natural_harmonic'
  | 'artificial_harmonic'
  | 'tremolo_unmeasured'
  | 'con_sord'
  | 'senza_sord'
  | 'straight_mute'
  | 'cup_mute'
  | 'harmon_mute'
  | 'flutter'
  | 'stopped'
  | 'open';

/** Written pitch to sounding pitch, MusicXML `<transpose>` semantics. */
export interface Transposition {
  diatonic: number;
  chromatic: number;
  octaveChange: number;
}

export const CONCERT_TRANSPOSITION: Transposition = { diatonic: 0, chromatic: 0, octaveChange: 0 };

export interface InstrumentSpec {
  id: string;
  displayName: string;
  family: InstrumentFamily;
  /**
   * Sounding MIDI hard range from the V3.4 specification.
   * Null means the specification gives transposition and no numeric range.
   */
  soundingHardRange: [number, number] | null;
  /** Inference. Never wider than the hard range. Null when no hard range is documented. */
  soundingComfortRange: [number, number] | null;
  /** True for every comfort range in this catalogue. */
  comfortInferred: true;
  transposition: Transposition;
  clefs: Array<'treble' | 'alto' | 'tenor' | 'bass' | 'percussion'>;
  /** MusicXML 4.0 sounds.xml id. */
  instrumentSound: string;
  /** 0-based General MIDI program, matching existing Composer OS profiles. */
  midiProgram: number;
  techniques: readonly Technique[];
  maxSimultaneous: 1 | 2 | 4 | 10;
  balanceClass: BalanceClass;
  sources: readonly string[];
  /** Extra documented bound that is not the hard-range floor. Baritone low A uses this. */
  standardSoundingFloor?: number;
}
