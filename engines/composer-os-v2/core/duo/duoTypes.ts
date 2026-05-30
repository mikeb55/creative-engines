/**
 * Duo export-truth types (V100a) + LOCK types (V100b) + MusicContext preset (V105p4).
 */

/** Normalised per-voice harmony timeline at LOCK time. */
export interface DuoVoice {
  bars: string[];
}

export type DuoVoiceRole = 'upper' | 'lower';

export interface DuoLock {
  upper: DuoVoice;
  lower: DuoVoice;
  lockedAt: number;
  checksum: string;
}

export interface DuoExportTruth {
  /** Normalised chord symbols (guitar / upper voice). */
  upperBars: string[];
  /** Normalised chord symbols (bass / lower voice). */
  lowerBars: string[];
  /** Checksum over normalised upper + lower bars (export LOCK). */
  checksum: string;
  capturedAt: number;
}

export type DuoInstrumentTopology = 'guitar_bass' | 'dual_guitar' | 'dual_guitar_bass';

export type DuoIntentMode = 'conversational' | 'supportive';

/** Preset steering for Duo MusicContext realisation (V105p4). */
export interface DuoPreset {
  instrumentTopology: DuoInstrumentTopology;
  duoIntent?: DuoIntentMode;
  seed: number;
  bpm?: number;
}

export type LowerGuitarRole =
  | 'guide_tone_lane'
  | 'counterline'
  | 'pedal'
  | 'sparse_comp_answer'
  | 'rest';

export type LowerGuitarRoleDistribution = Record<LowerGuitarRole, number>;

export type DuoRealisedLowerGuitarBar = {
  barIndex: number;
  role: LowerGuitarRole;
  /** Planned MIDI in working-band register (48–64); null when rest. */
  midi: number | null;
  upperSymbol: string;
  bassSymbol: string;
};

export interface DuoRealisationDiagnostics {
  instrumentTopology: DuoInstrumentTopology;
  duoIntent?: DuoIntentMode;
  lowerGuitarRoleDistribution: LowerGuitarRoleDistribution;
  registralCollisionCount: number;
  parallelMotionCount: number;
  barCount: number;
  lowerGuitarEnabled: boolean;
}
