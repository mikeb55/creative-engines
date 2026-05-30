/**
 * Lower guitar role resolver — inspects upper guitar + bass per bar (V105p4).
 */

import {
  chordTonesForChordSymbol,
  noteNameToPitchClass,
  parseChordSymbol,
} from '../harmony/chordSymbolAnalysis';
import { mulberry32 } from '../remix/vaultSeedMix';
import type {
  DuoIntentMode,
  DuoInstrumentTopology,
  LowerGuitarRole,
  LowerGuitarRoleDistribution,
  DuoRealisedLowerGuitarBar,
} from './duoTypes';

/** Working-band register — low-mid through middle (Wyble V2 floor extended). */
export const LOWER_GUITAR_MIDI_LO = 48;
export const LOWER_GUITAR_MIDI_HI = 64;

const ALL_ROLES: readonly LowerGuitarRole[] = [
  'guide_tone_lane',
  'counterline',
  'pedal',
  'sparse_comp_answer',
  'rest',
];

export type UpperGuitarActivity = 'chordal_active' | 'sparse' | 'melodic';

function emptyDistribution(): LowerGuitarRoleDistribution {
  return {
    guide_tone_lane: 0,
    counterline: 0,
    pedal: 0,
    sparse_comp_answer: 0,
    rest: 0,
  };
}

function clampMidi(m: number): number {
  return Math.max(LOWER_GUITAR_MIDI_LO, Math.min(LOWER_GUITAR_MIDI_HI, Math.round(m)));
}

function pcToMidiInBand(pc: number, prefer: number): number {
  let midi = prefer * 12 + ((pc % 12) + 12) % 12;
  while (midi < LOWER_GUITAR_MIDI_LO) midi += 12;
  while (midi > LOWER_GUITAR_MIDI_HI) midi -= 12;
  return clampMidi(midi);
}

function inferBassSymbol(upper: string, lower: string | undefined, topology: DuoInstrumentTopology): string {
  if (topology !== 'dual_guitar' && lower?.trim()) return lower;
  const parsed = parseChordSymbol(upper);
  const m = parsed.harmonyPart.match(/^([A-G](?:#|b)?)/i);
  const root = m?.[1] ?? 'C';
  return `${root}`;
}

function classifyUpperActivity(symbol: string): UpperGuitarActivity {
  const s = symbol.trim();
  if (!s) return 'sparse';
  if (/alt|#11|b9|#9|13|9|11|add|sus/i.test(s)) return 'chordal_active';
  if (/^([A-G][#b]?)(m|min|sus)/i.test(s)) return 'sparse';
  if (/maj7|m7|7/i.test(s)) return 'chordal_active';
  return 'melodic';
}

function bassBusyNow(current: string, previous: string | null): boolean {
  if (!previous) return false;
  return current !== previous;
}

function bassSustainingNow(current: string, previous: string | null): boolean {
  if (!previous) return true;
  return current === previous;
}

function roleWeights(params: {
  upperActivity: UpperGuitarActivity;
  bassBusy: boolean;
  bassSustaining: boolean;
  intent?: DuoIntentMode;
}): Record<LowerGuitarRole, number> {
  const w = emptyDistribution();
  w.rest = 1.2;

  if (params.intent === 'conversational') {
    w.counterline += 1.4;
    w.sparse_comp_answer += 1.1;
    w.guide_tone_lane += 0.4;
  } else if (params.intent === 'supportive') {
    w.guide_tone_lane += 1.5;
    w.pedal += 1.2;
    w.rest += 0.6;
  } else {
    w.guide_tone_lane += 0.8;
    w.pedal += 0.6;
  }

  if (params.upperActivity === 'chordal_active') {
    w.rest += 1.5;
    w.guide_tone_lane += 0.5;
    w.counterline *= 0.5;
    w.sparse_comp_answer *= 0.4;
  } else if (params.upperActivity === 'sparse' || params.upperActivity === 'melodic') {
    w.sparse_comp_answer += 1.3;
    w.counterline += 0.9;
    w.rest *= 0.7;
  }

  if (params.bassBusy) {
    w.counterline += 0.8;
    w.rest += 0.9;
    w.pedal *= 0.5;
    w.sparse_comp_answer *= 0.6;
  }
  if (params.bassSustaining) {
    w.sparse_comp_answer += 1.0;
    w.pedal += 0.7;
  }

  return w;
}

function pickRole(weights: Record<LowerGuitarRole, number>, rng: () => number): LowerGuitarRole {
  const entries = ALL_ROLES.map((role) => ({ role, w: Math.max(0.01, weights[role]) }));
  const total = entries.reduce((s, e) => s + e.w, 0);
  let r = rng() * total;
  for (const e of entries) {
    r -= e.w;
    if (r <= 0) return e.role;
  }
  return 'rest';
}

function upperTopMidi(symbol: string): number {
  const tones = chordTonesForChordSymbol(symbol, { lockedHarmony: true });
  const candidates = [tones.seventh, tones.third, tones.fifth, tones.root].filter((n) => n > 0);
  const top = Math.max(...candidates, tones.root);
  let midi = top;
  while (midi < 55) midi += 12;
  while (midi > 84) midi -= 12;
  return midi;
}

function midiForRole(
  role: LowerGuitarRole,
  upper: string,
  bass: string,
  prevMidi: number | null,
  upperTop: number,
): number | null {
  if (role === 'rest') return null;
  const upperTones = chordTonesForChordSymbol(upper, { lockedHarmony: true });
  const bassPc = noteNameToPitchClass(parseChordSymbol(bass).harmonyPart.match(/^([A-G][#b]?)/i)?.[1] ?? 'C') ?? 0;

  if (role === 'guide_tone_lane') {
    const pc = upperTones.seventh > 0 ? ((upperTones.seventh % 12) + 12) % 12 : ((upperTones.third % 12) + 12) % 12;
    return pcToMidiInBand(pc, 4);
  }
  if (role === 'pedal') {
    return pcToMidiInBand(bassPc, 3);
  }
  if (role === 'sparse_comp_answer') {
    const pc = ((upperTones.fifth % 12) + 12) % 12;
    return pcToMidiInBand(pc, 4);
  }
  if (role === 'counterline') {
    const seed = prevMidi ?? pcToMidiInBand(((upperTones.third % 12) + 12) % 12, 4);
    const outerDelta = prevMidi != null ? upperTop - prevMidi : 0;
    const direction = outerDelta >= 0 ? -2 : 2;
    return clampMidi(seed + direction);
  }
  return null;
}

function isLockstepWithBass(lowerMidi: number, bassSymbol: string, prevLower: number | null, prevBass: string | null): boolean {
  if (prevLower == null || !prevBass) return false;
  const bassPc = noteNameToPitchClass(parseChordSymbol(bassSymbol).harmonyPart.match(/^([A-G][#b]?)/i)?.[1] ?? 'C') ?? 0;
  const prevBassPc =
    noteNameToPitchClass(parseChordSymbol(prevBass).harmonyPart.match(/^([A-G][#b]?)/i)?.[1] ?? 'C') ?? 0;
  const lowerPc = ((lowerMidi % 12) + 12) % 12;
  const prevLowerPc = ((prevLower % 12) + 12) % 12;
  const bassDelta = (bassPc - prevBassPc + 12) % 12;
  const lowerDelta = (lowerPc - prevLowerPc + 12) % 12;
  if (bassDelta === 0) return false;
  return bassDelta === lowerDelta && (bassDelta === 0 || bassDelta === 7 || bassDelta === 5);
}

function sameOctaveAsUpperTop(lowerMidi: number, upperTop: number): boolean {
  return Math.floor(lowerMidi / 12) === Math.floor(upperTop / 12) && (lowerMidi % 12) === (upperTop % 12);
}

function penalizeRole(params: {
  role: LowerGuitarRole;
  midi: number | null;
  upper: string;
  bass: string;
  prevLower: number | null;
  prevBass: string | null;
  prevRole: LowerGuitarRole | null;
  upperTop: number;
}): number {
  let penalty = 0;
  if (params.role !== 'rest' && params.midi != null) {
    if (sameOctaveAsUpperTop(params.midi, params.upperTop)) penalty += 4;
    if (isLockstepWithBass(params.midi, params.bass, params.prevLower, params.prevBass)) penalty += 3;
    if (params.midi < LOWER_GUITAR_MIDI_LO || params.midi > LOWER_GUITAR_MIDI_HI) penalty += 5;
  }
  if (params.prevRole && params.prevRole === params.role && params.role === 'sparse_comp_answer') {
    penalty += 1.5;
  }
  if (params.role !== 'rest' && classifyUpperActivity(params.upper) === 'chordal_active') {
    penalty += 0.8;
  }
  return penalty;
}

function resolveBarRole(params: {
  barIndex: number;
  upper: string;
  bass: string;
  prevLower: number | null;
  prevBass: string | null;
  prevRole: LowerGuitarRole | null;
  intent?: DuoIntentMode;
  rng: () => number;
}): { role: LowerGuitarRole; midi: number | null } {
  const upperActivity = classifyUpperActivity(params.upper);
  const weights = roleWeights({
    upperActivity,
    bassBusy: bassBusyNow(params.bass, params.prevBass),
    bassSustaining: bassSustainingNow(params.bass, params.prevBass),
    intent: params.intent,
  });
  const upperTop = upperTopMidi(params.upper);
  const ranked = ALL_ROLES.map((role) => {
    const midi = midiForRole(role, params.upper, params.bass, params.prevLower, upperTop);
    const penalty = penalizeRole({
      role,
      midi,
      upper: params.upper,
      bass: params.bass,
      prevLower: params.prevLower,
      prevBass: params.prevBass,
      prevRole: params.prevRole,
      upperTop,
    });
    return { role, midi, penalty, score: weights[role] - penalty + params.rng() * 0.15 };
  }).sort((a, b) => b.score - a.score);
  const best = ranked[0]!;
  if (best.penalty > 3 && weights.rest > 0.5) {
    return { role: 'rest', midi: null };
  }
  return { role: best.role, midi: best.midi };
}

/** Resolve lower-guitar roles bar-by-bar from upper + bass harmony symbols. */
export function resolveLowerGuitarRoles(params: {
  upperBars: readonly string[];
  bassBars: readonly string[];
  topology: DuoInstrumentTopology;
  intent?: DuoIntentMode;
  seed: number;
}): DuoRealisedLowerGuitarBar[] {
  if (params.topology === 'guitar_bass') return [];

  const rng = mulberry32((params.seed ^ 0x0d0104) >>> 0);
  const bars: DuoRealisedLowerGuitarBar[] = [];
  let prevLower: number | null = null;
  let prevBass: string | null = null;
  let prevRole: LowerGuitarRole | null = null;

  for (let i = 0; i < params.upperBars.length; i++) {
    const upper = params.upperBars[i] ?? '';
    const bass = inferBassSymbol(upper, params.bassBars[i], params.topology);
    const { role, midi } = resolveBarRole({
      barIndex: i,
      upper,
      bass,
      prevLower,
      prevBass,
      prevRole,
      intent: params.intent,
      rng,
    });
    bars.push({ barIndex: i, role, midi, upperSymbol: upper, bassSymbol: bass });
    prevLower = midi;
    prevBass = bass;
    prevRole = role;
  }
  return bars;
}

export function lowerGuitarRoleDistribution(bars: readonly DuoRealisedLowerGuitarBar[]): LowerGuitarRoleDistribution {
  const dist = emptyDistribution();
  for (const bar of bars) dist[bar.role] += 1;
  return dist;
}

export function countRegistralCollisions(bars: readonly DuoRealisedLowerGuitarBar[]): number {
  let n = 0;
  for (const bar of bars) {
    if (bar.midi == null) continue;
    const top = upperTopMidi(bar.upperSymbol);
    if (sameOctaveAsUpperTop(bar.midi, top)) n += 1;
  }
  return n;
}

export function countParallelMotionWithBass(bars: readonly DuoRealisedLowerGuitarBar[]): number {
  let n = 0;
  for (let i = 1; i < bars.length; i++) {
    const prev = bars[i - 1]!;
    const cur = bars[i]!;
    if (prev.midi == null || cur.midi == null) continue;
    if (isLockstepWithBass(cur.midi, cur.bassSymbol, prev.midi, prev.bassSymbol)) n += 1;
  }
  return n;
}
