/**
 * E2 harmonic resources. Polychord, triad pair and dyad pair stay distinct.
 * Ensemble allocation is out of scope.
 */

import type { ExactQuarter } from '../piano/pianoExactTiming';
import type { LayerRole } from './types';
import type { ValidatedTriad } from '../wwh/wwhTriadPair';

export const E2_HARMONIC_COLOUR_VERSION = 'e2-harmonic-colour-1';

export type ParentId = string;

export interface MemberRef {
  parentId: ParentId;
  memberId: string;
}

export interface SpelledRegister {
  step: string;
  alter: number;
  octave: number;
  midi: number;
}

export interface RegisteredMember {
  ref: MemberRef;
  pitch: SpelledRegister;
}

export interface TriadParent {
  id: ParentId;
  triad: ValidatedTriad;
  inversion?: 0 | 1 | 2;
  soundingRegister?: readonly [number, number];
  voices: readonly [RegisteredMember, RegisteredMember, RegisteredMember];
}

export interface DyadInterval {
  directedSemitones: number;
  directedDiatonicSteps: number;
  intervalClass: number;
}

export interface DyadParent {
  id: ParentId;
  members: readonly [RegisteredMember, RegisteredMember];
  interval: DyadInterval;
  derivedFrom?: readonly MemberRef[];
}

export type HarmonicUse = 'alternate' | 'interlock' | 'superpose';

export type HarmonicIntent =
  | { kind: 'polychord'; id: string; upper: TriadParent; lower: TriadParent; use: 'simultaneous' }
  | { kind: 'triad-pair'; id: string; a: TriadParent; b: TriadParent; use: HarmonicUse }
  | { kind: 'dyad-pair'; id: string; a: DyadParent; b: DyadParent; use: HarmonicUse };

export interface HarmonicRegion {
  span: { onset: ExactQuarter; duration: ExactQuarter };
  intent: HarmonicIntent;
}

export interface EventOwnership {
  eventId: string;
  members: readonly MemberRef[];
  role?: LayerRole;
}

export interface SoundingAttack {
  eventId: string;
  onset: ExactQuarter;
  duration: ExactQuarter;
  pitch: SpelledRegister;
  members: readonly MemberRef[];
  rest: boolean;
}

export interface HarmonicConflict {
  ok: false;
  reason: string;
}
