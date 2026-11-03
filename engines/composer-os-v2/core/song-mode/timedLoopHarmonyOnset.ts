/**
 * Generation-time timed loop-harmony onset authority.
 * Consulted when choosing / realizing melody and bass pitches under loopHarmony.
 */

import type { CanonicalChord } from '../../../core/canonicalChord';
import type { CompositionContext } from '../compositionContext';
import {
  lookupFullSongLoopHarmonyAt,
  quartersPerBarFromMeter,
  type FullSongLoopHarmonyEvent,
} from './fullSongLoopHarmony';
import type { BarMeterSignature } from '../rhythm/barMeterTypes';

export type TimedLoopHarmonyAuthorityState = {
  timeline: readonly FullSongLoopHarmonyEvent[];
  meter: BarMeterSignature;
  songLengthQuarters: number;
};

export type TimedLoopOnsetHarmony =
  | { kind: 'chord'; chord: CanonicalChord; symbol: string; nextBoundaryQuarters: number }
  | { kind: 'rest'; nextBoundaryQuarters: number };

export function getTimedLoopHarmonyAuthority(
  context: CompositionContext
): TimedLoopHarmonyAuthorityState | undefined {
  return context.timedLoopHarmony;
}

export function songAbsoluteQuarters(
  state: TimedLoopHarmonyAuthorityState,
  barIndex: number,
  localBeatQuarters: number
): number {
  const qpb = quartersPerBarFromMeter(state.meter);
  return (barIndex - 1) * qpb + localBeatQuarters;
}

/** Active chord/rest at bar-local onset (half-open timeline). */
export function resolveTimedLoopHarmonyAtOnset(
  context: CompositionContext,
  barIndex: number,
  localBeatQuarters: number
): TimedLoopOnsetHarmony | null {
  const state = getTimedLoopHarmonyAuthority(context);
  if (!state) return null;
  const at = songAbsoluteQuarters(state, barIndex, localBeatQuarters);
  const hit = lookupFullSongLoopHarmonyAt(state.timeline, at, state.songLengthQuarters);
  if (!hit.ok) return null;
  if (hit.hit.event.kind === 'rest') {
    return { kind: 'rest', nextBoundaryQuarters: hit.hit.nextBoundaryQuarters };
  }
  return {
    kind: 'chord',
    chord: hit.hit.event.chord,
    symbol: hit.hit.event.chord.text,
    nextBoundaryQuarters: hit.hit.nextBoundaryQuarters,
  };
}

/**
 * Duration clipped to the next harmony/rest boundary (song-absolute → local duration).
 * Returns 0 when onset is at/past song end or on a zero-width remainder.
 */
export function clipDurationToTimedHarmonyBoundary(
  context: CompositionContext,
  barIndex: number,
  localBeatQuarters: number,
  proposedDuration: number
): number {
  const state = getTimedLoopHarmonyAuthority(context);
  if (!state || !(proposedDuration > 0)) return proposedDuration;
  const abs = songAbsoluteQuarters(state, barIndex, localBeatQuarters);
  const hit = lookupFullSongLoopHarmonyAt(state.timeline, abs, state.songLengthQuarters);
  if (!hit.ok) return 0;
  const maxDur = hit.hit.nextBoundaryQuarters - abs;
  return Math.max(0, Math.min(proposedDuration, maxDur));
}
