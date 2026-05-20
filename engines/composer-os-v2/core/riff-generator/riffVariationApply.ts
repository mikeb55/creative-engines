/**
 * Apply VRB {@link RiffProfile.variationOperators} to a single-bar riff snapshot (mutate path).
 */

import type { RiffProfile, RiffVariationOperator } from '../composer/riffProfileTypes';
import type { RiffBarSnapshot } from './riffCarryForward';
import { mulberry32, randInt } from './riffRandom';

function cloneSnap(s: RiffBarSnapshot): RiffBarSnapshot {
  return {
    ...s,
    rhythm: s.rhythm.map((r) => ({ ...r })),
    guitarNotes: s.guitarNotes.map((n) => ({ ...n })),
    bassNotes: s.bassNotes?.map((n) => ({ ...n })),
  };
}

function applyOne(
  bar: RiffBarSnapshot,
  op: RiffVariationOperator,
  rng: () => number,
  profile: RiffProfile
): RiffBarSnapshot {
  const out = cloneSnap(bar);
  switch (op) {
    case 'targetToneShift': {
      const step = randInt(rng, 0, 2) === 0 ? -2 : 2;
      for (const n of out.guitarNotes) n.pitch = Math.min(profile.riffRegisterCeiling, Math.max(profile.riffRegisterFloor, n.pitch + step));
      break;
    }
    case 'startOffsetShift': {
      const delta = randInt(rng, 0, 1) === 0 ? 0.25 : -0.25;
      for (const n of out.guitarNotes) n.startBeat = Math.max(0, Math.min(3.75, n.startBeat + delta));
      for (const r of out.rhythm) if (!r.rest) r.startBeat = Math.max(0, Math.min(3.75, r.startBeat + delta));
      break;
    }
    case 'registerShift': {
      const oct = randInt(rng, 0, 1) === 0 ? 12 : -12;
      for (const n of out.guitarNotes) n.pitch = Math.min(profile.riffRegisterCeiling, Math.max(profile.riffRegisterFloor, n.pitch + oct));
      break;
    }
    case 'cellTransposition': {
      const cell = profile.intervalCell?.steps[0] ?? 2;
      for (const n of out.guitarNotes) n.pitch = Math.min(profile.riffRegisterCeiling, Math.max(profile.riffRegisterFloor, n.pitch + cell));
      break;
    }
    case 'rhythmicWarp': {
      if (out.rhythm.length >= 2) {
        const i = randInt(rng, 0, out.rhythm.length - 2);
        const a = out.rhythm[i]!;
        const b = out.rhythm[i + 1]!;
        const td = a.duration;
        a.duration = b.duration;
        b.duration = td;
      }
      break;
    }
    case 'truncateOrExtend': {
      const last = out.rhythm[out.rhythm.length - 1];
      if (last && !last.rest) {
        last.duration = Math.max(0.25, last.duration + (randInt(rng, 0, 1) === 0 ? -0.25 : 0.25));
      }
      break;
    }
    case 'tailFill': {
      const end = out.guitarNotes.reduce((m, n) => Math.max(m, n.startBeat + n.duration), 0);
      if (end < 3.5 && out.guitarNotes[0]) {
        const p = out.guitarNotes[out.guitarNotes.length - 1]!.pitch;
        out.guitarNotes.push({ pitch: p, startBeat: end, duration: 0.5, voice: 1 });
      }
      break;
    }
    case 'chromaticTag': {
      if (out.guitarNotes[0]) {
        const anchor = out.guitarNotes[0];
        out.guitarNotes.unshift({
          pitch: anchor.pitch - 1,
          startBeat: Math.max(0, anchor.startBeat - 0.25),
          duration: 0.25,
          voice: 1,
        });
      }
      break;
    }
    case 'articulationSwap':
    case 'finalChordSubstitution':
      break;
    default:
      break;
  }
  return out;
}

export function applyRiffVariationOperators(
  bar: RiffBarSnapshot,
  operators: RiffVariationOperator[] | undefined,
  seed: number,
  profile: RiffProfile
): RiffBarSnapshot {
  if (!operators?.length) return cloneSnap(bar);
  const rng = mulberry32(seed);
  let out = cloneSnap(bar);
  for (const op of operators) {
    out = applyOne(out, op, rng, profile);
  }
  return out;
}
