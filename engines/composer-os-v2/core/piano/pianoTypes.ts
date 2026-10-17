/**
 * Piano Composition V1 types. The writer owns final pitches. This module does not generate notes.
 */

import type { PianoGrandStaffV1 } from '../score-model/scoreModelTypes';

export type PianoHand = 'RH' | 'LH';

export interface PianoVoiceLane {
  voice: 1 | 2 | 3;
  hand: PianoHand;
  role: 'melody' | 'inner' | 'bass';
  staff: 1 | 2;
}

export const PIANO_VOICE_LANES: readonly PianoVoiceLane[] = [
  { voice: 1, hand: 'RH', role: 'melody', staff: 1 },
  { voice: 2, hand: 'RH', role: 'inner', staff: 1 },
  { voice: 3, hand: 'LH', role: 'bass', staff: 2 },
];

export const PIANO_KEYBOARD_RANGE = { low: 21, high: 108 } as const;
export const PIANO_RH_WINDOW = { low: 60, high: 84 } as const;
export const PIANO_LH_WINDOW = { low: 36, high: 60 } as const;
export const PIANO_MAX_HAND_SPAN = 12;
export const PIANO_MAX_KEYS_PER_HAND = 4;
export const PIANO_MAX_KEYS_COMBINED = 6;
export const PIANO_RELOCATION_SEMITONES = 12;
export const PIANO_RELOCATION_SECONDS = 0.5;
export const PIANO_V1_BARS = 8;
export const PIANO_V1_TEMPO = 64;
export const PIANO_V1_SEEDS = [76018, 76019] as const;

/** Opt-in general piano writer. The 8-bar fixture does not read these. */
export const GENERAL_PIANO_BAR_COUNTS = [8, 16, 24] as const;
export const GENERAL_PIANO_TEMPO_MIN = 48;
export const GENERAL_PIANO_TEMPO_MAX = 120;
export const GENERAL_PIANO_CENTRES = ['C', 'Am'] as const;
export type GeneralPianoBarCount = (typeof GENERAL_PIANO_BAR_COUNTS)[number];
export type GeneralPianoCentre = (typeof GENERAL_PIANO_CENTRES)[number];

export function pianoGrandStaffConfig(innerVoiceEnabled: boolean): PianoGrandStaffV1 {
  return { kind: 'grand-staff-v1', innerVoiceEnabled };
}

export function pianoStaffForVoice(voice: number): 1 | 2 {
  if (voice === 1 || voice === 2) return 1;
  if (voice === 3) return 2;
  throw new Error(`Piano grand staff cannot represent voice ${voice}`);
}

export function pianoHandForVoice(voice: number): PianoHand {
  if (voice === 1 || voice === 2) return 'RH';
  if (voice === 3) return 'LH';
  throw new Error(`Piano grand staff cannot represent voice ${voice}`);
}

export interface PianoLockedEvent {
  bar: number;
  voice: 1 | 2 | 3;
  startBeat: number;
  duration: number;
  pitch: number;
  pitches?: number[];
  tie?: 'start' | 'stop' | 'continue';
}

export interface PianoCompositionV1Request {
  pianoCompositionV1: true;
  seed: number;
  bars?: number;
  tempo?: number;
  innerVoice?: boolean;
  lockedEvents?: PianoLockedEvent[];
}
