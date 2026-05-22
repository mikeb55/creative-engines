/**
 * Apply VRB {@link RiffProfile.variationOperators} to a single-bar riff snapshot (mutate path).
 */

import type { LedZeppelinStyleMode, RiffProfile, RiffVariationOperator } from '../composer/riffProfileTypes';
import type { RiffBarSnapshot } from './riffCarryForward';
import { resolveStyleModeForBar } from './riffPitchField';
import { mulberry32, randInt } from './riffRandom';

const LED_BLUES_ROCK_OPS: RiffVariationOperator[] = [
  'microTimingShift',
  'endTruncation',
  'ornamentAdd',
];
const LED_EPIC_OPS: RiffVariationOperator[] = ['upperVoicingColourSwap'];
const LED_FOLK_OPS: RiffVariationOperator[] = ['strumPatternChange', 'ornamentOnDrone'];
const SLY_STONE_OPS: RiffVariationOperator[] = [
  'harmonicColourSwap',
  'rhythmicWarp',
  'registerShift',
];

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
      for (const n of out.guitarNotes)
        n.pitch = Math.min(profile.riffRegisterCeiling, Math.max(profile.riffRegisterFloor, n.pitch + step));
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
      for (const n of out.guitarNotes)
        n.pitch = Math.min(profile.riffRegisterCeiling, Math.max(profile.riffRegisterFloor, n.pitch + oct));
      break;
    }
    case 'cellTransposition': {
      const cell = profile.intervalCell?.steps[0] ?? 2;
      for (const n of out.guitarNotes)
        n.pitch = Math.min(profile.riffRegisterCeiling, Math.max(profile.riffRegisterFloor, n.pitch + cell));
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
    case 'microTimingShift': {
      const delta = randInt(rng, 0, 1) === 0 ? 0.25 : -0.25;
      for (const n of out.guitarNotes) {
        const shifted = n.startBeat + delta;
        if (shifted >= 0 && shifted <= 3) n.startBeat = shifted;
      }
      break;
    }
    case 'ornamentAdd':
    case 'ornamentOnDrone': {
      if (out.guitarNotes[0]) {
        const anchor = out.guitarNotes[0];
        out.guitarNotes.unshift({
          pitch: anchor.pitch - 1,
          startBeat: Math.max(0, anchor.startBeat - 0.25),
          duration: 0.125,
          voice: anchor.voice ?? 1,
        });
      }
      break;
    }
    case 'chromaticAdd': {
      if (out.guitarNotes[0]) {
        const anchor = out.guitarNotes[0];
        out.guitarNotes.unshift({
          pitch: anchor.pitch - 1,
          startBeat: 0,
          duration: 0.25,
          voice: anchor.voice ?? 1,
        });
      }
      break;
    }
    case 'dynamicsVariation': {
      const role = out.guitarNotes.length % 4;
      const scale = role < 1 ? 0.82 : role < 3 ? 0.95 : 1.08;
      for (const n of out.guitarNotes) {
        const vel = (n as { velocity?: number }).velocity ?? 90;
        (n as { velocity?: number }).velocity = Math.round(vel * scale);
      }
      break;
    }
    case 'harmonicColourSwap':
    case 'upperVoicingColourSwap': {
      for (const n of out.guitarNotes) {
        const pc = ((n.pitch % 12) + 12) % 12;
        if (pc === 4 || pc === 11) n.pitch += 1;
        else if (pc === 7) n.pitch += 2;
      }
      break;
    }
    case 'strumPatternChange': {
      if (out.rhythm.length >= 2) {
        const i = randInt(rng, 0, out.rhythm.length - 2);
        const a = out.rhythm[i]!;
        const b = out.rhythm[i + 1]!;
        const ts = a.startBeat;
        a.startBeat = b.startBeat;
        b.startBeat = ts;
      }
      break;
    }
    case 'bassNoteSwap': {
      if (out.bassNotes?.length) {
        const i = randInt(rng, 0, out.bassNotes.length - 1);
        const n = out.bassNotes[i]!;
        n.pitch = n.pitch + (randInt(rng, 0, 1) === 0 ? 5 : 7);
      }
      break;
    }
    case 'endTruncation': {
      if (out.guitarNotes.length > 1) {
        const lastStart = out.guitarNotes[out.guitarNotes.length - 1]!.startBeat;
        out.guitarNotes = out.guitarNotes.filter((n) => n.startBeat < lastStart - 0.01);
      }
      break;
    }
    default:
      break;
  }
  return out;
}

function receiptPreferredOperators(
  profile: RiffProfile,
  vrbId: string | undefined,
  barIndex: number,
  chordSymbol: string
): RiffVariationOperator[] | undefined {
  if (!vrbId) return undefined;
  if (/sly_stone|sly|family_stone/.test(vrbId)) {
    const fromProfile = profile.variationOperators ?? [];
    if (fromProfile.length) {
      const receipt = SLY_STONE_OPS.filter((op) => fromProfile.includes(op));
      if (receipt.length) return receipt;
    }
    return SLY_STONE_OPS;
  }
  if (/led_zeppelin|zeppelin|jimmy_page|page/.test(vrbId)) {
    const mode =
      resolveStyleModeForBar(vrbId, chordSymbol, barIndex) ?? ('blues_rock' as LedZeppelinStyleMode);
    if (mode === 'epic_modal_heavy') return LED_EPIC_OPS;
    if (mode === 'folk_modal') return LED_FOLK_OPS;
    return LED_BLUES_ROCK_OPS;
  }
  return undefined;
}

function randomOperatorSubset(
  pool: RiffVariationOperator[],
  rng: () => number,
  maxOps: number
): RiffVariationOperator[] {
  if (!pool.length) return [];
  const copy = [...pool];
  const n = Math.min(maxOps, Math.max(1, randInt(rng, 1, Math.min(3, copy.length))));
  const out: RiffVariationOperator[] = [];
  for (let i = 0; i < n && copy.length; i++) {
    const idx = randInt(rng, 0, copy.length - 1);
    out.push(copy.splice(idx, 1)[0]!);
  }
  return out;
}

/**
 * Apply mutation using receipt-listed operators per VRB / style mode when available.
 */
export function applyMutation(
  bar: RiffBarSnapshot,
  profile: RiffProfile,
  seed: number,
  vrbId?: string,
  barIndex = 0
): RiffBarSnapshot {
  const chord = bar.chord ?? 'Am7';
  const preferred = receiptPreferredOperators(profile, vrbId, barIndex, chord);
  const rng = mulberry32(seed);
  if (preferred?.length) {
    let out = cloneSnap(bar);
    for (const op of preferred) {
      out = applyOne(out, op, rng, profile);
    }
    return out;
  }
  const pool = profile.variationOperators ?? [];
  if (!pool.length) return cloneSnap(bar);
  const subset = randomOperatorSubset(pool, rng, 3);
  let out = cloneSnap(bar);
  for (const op of subset) {
    out = applyOne(out, op, rng, profile);
  }
  return out;
}

export function applyRiffVariationOperators(
  bar: RiffBarSnapshot,
  operators: RiffVariationOperator[] | undefined,
  seed: number,
  profile: RiffProfile,
  vrbId?: string,
  barIndex = 0
): RiffBarSnapshot {
  if (vrbId && receiptPreferredOperators(profile, vrbId, barIndex, bar.chord ?? 'Am7')) {
    return applyMutation(bar, profile, seed, vrbId, barIndex);
  }
  if (!operators?.length) return cloneSnap(bar);
  const rng = mulberry32(seed);
  let out = cloneSnap(bar);
  for (const op of operators) {
    out = applyOne(out, op, rng, profile);
  }
  return out;
}

/** Ops chosen for last mutate (tests). */
export function mutationOperatorsForBar(
  profile: RiffProfile,
  vrbId: string | undefined,
  barIndex: number,
  chordSymbol: string
): RiffVariationOperator[] {
  const preferred = receiptPreferredOperators(profile, vrbId, barIndex, chordSymbol);
  if (preferred?.length) return preferred;
  return profile.variationOperators ?? [];
}
