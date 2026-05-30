/**
 * SY-only lower-guitar role resolver (V106p3) — feeds existing Duo roles, not realiseDuoLowerGuitar.
 */

import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { mulberry32 } from '../remix/vaultSeedMix';
import type {
  DuoRealisedLowerGuitarBar,
  LowerGuitarRole,
  LowerGuitarRoleDistribution,
} from '../duo/duoTypes';
import { isPedalHeavyTuning } from './syTuningPresetCatalog';
import { parseShapeRootPc } from './syTuningShapeHarmony';
import { shapeMotionScore } from './syTuningVoiceLeading';
import type { SYShapeBarPlan, SYTuningDefinition, SYTuningPresetId } from './syTuningTypes';

export const SY_LOWER_GUITAR_MIDI_LO = 48;
export const SY_LOWER_GUITAR_MIDI_HI = 64;

const ALL_ROLES: readonly LowerGuitarRole[] = [
  'guide_tone_lane',
  'counterline',
  'pedal',
  'sparse_comp_answer',
  'rest',
];

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
  return Math.max(SY_LOWER_GUITAR_MIDI_LO, Math.min(SY_LOWER_GUITAR_MIDI_HI, Math.round(m)));
}

function pcToMidiInBand(pc: number, preferOctave: number): number {
  let midi = preferOctave * 12 + ((pc % 12) + 12) % 12;
  while (midi < SY_LOWER_GUITAR_MIDI_LO) midi += 12;
  while (midi > SY_LOWER_GUITAR_MIDI_HI) midi -= 12;
  return clampMidi(midi);
}

function syRoleWeights(params: {
  plan: SYShapeBarPlan;
  tuningId: SYTuningPresetId;
  guitar1: SYTuningDefinition;
}): Record<LowerGuitarRole, number> {
  const w = emptyDistribution();
  w.rest = 0.9;

  if (isPedalHeavyTuning(params.tuningId) || isPedalHeavyTuning(params.guitar1.id)) {
    w.pedal += 3.4;
  } else {
    w.pedal += 2.8;
  }

  w.counterline += 1.0;
  w.sparse_comp_answer += 1.2;

  if (params.tuningId === 'drone_melody') {
    w.guide_tone_lane += 2.4;
    if (params.plan.barIndex % 3 === 0) w.guide_tone_lane += 1.5;
  } else {
    w.guide_tone_lane += 0.08;
  }

  const clusterHeavy = params.plan.guitar1Midis.length >= 4 || /sus4/.test(params.plan.exportSymbol);
  if (clusterHeavy) {
    w.sparse_comp_answer += 0.6;
    if (params.tuningId !== 'drone_melody') w.guide_tone_lane *= 0.3;
  }

  return w;
}

function shapeParallelCounterMidi(plan: SYShapeBarPlan, prevMidi: number | null): number {
  const midis = plan.guitar1Midis;
  if (midis.length === 0) {
    return prevMidi ?? pcToMidiInBand(parseShapeRootPc(plan.exportSymbol), 4);
  }
  const anchor = midis[0]!;
  const blockShift = plan.fretOffset % 2 === 0 ? 2 : -2;
  let candidate = anchor + blockShift;
  while (candidate < SY_LOWER_GUITAR_MIDI_LO) candidate += 12;
  while (candidate > SY_LOWER_GUITAR_MIDI_HI) candidate -= 12;
  if (prevMidi != null && shapeMotionScore([prevMidi], [candidate]) < shapeMotionScore([prevMidi], midis)) {
    return clampMidi(midis[midis.length - 1] ?? candidate);
  }
  return clampMidi(candidate);
}

function clusterPunctuationMidi(plan: SYShapeBarPlan): number {
  const midis = plan.guitar1Midis;
  if (midis.length >= 2) {
    const cluster = midis[midis.length - 1]!;
    return clampMidi(cluster);
  }
  const rootPc = parseShapeRootPc(plan.exportSymbol);
  return pcToMidiInBand((rootPc + 7) % 12, 4);
}

function pedalMidi(plan: SYShapeBarPlan, guitar1: SYTuningDefinition): number {
  const openLow = guitar1.strings[0] ?? 48;
  let midi = openLow;
  while (midi < SY_LOWER_GUITAR_MIDI_LO) midi += 12;
  while (midi > SY_LOWER_GUITAR_MIDI_HI) midi -= 12;
  if (plan.guitar1Midis.length > 0) {
    const drone = plan.guitar1Midis[0]!;
    if (drone >= SY_LOWER_GUITAR_MIDI_LO && drone <= SY_LOWER_GUITAR_MIDI_HI) return drone;
  }
  return clampMidi(midi);
}

function midiForSYRole(
  role: LowerGuitarRole,
  plan: SYShapeBarPlan,
  guitar1: SYTuningDefinition,
  prevMidi: number | null,
): number | null {
  if (role === 'rest') return null;
  if (role === 'pedal') return pedalMidi(plan, guitar1);
  if (role === 'counterline') return shapeParallelCounterMidi(plan, prevMidi);
  if (role === 'sparse_comp_answer') return clusterPunctuationMidi(plan);
  if (role === 'guide_tone_lane') {
    const rootPc = parseShapeRootPc(plan.exportSymbol);
    return pcToMidiInBand((rootPc + 4) % 12, 4);
  }
  return null;
}

function bassSymbolFromPlan(plan: SYShapeBarPlan): string {
  const rootPc = parseShapeRootPc(plan.exportSymbol);
  const names = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  return names[rootPc] ?? 'C';
}

function resolveSYBarRole(params: {
  plan: SYShapeBarPlan;
  tuningId: SYTuningPresetId;
  guitar1: SYTuningDefinition;
  prevMidi: number | null;
  prevRole: LowerGuitarRole | null;
  rng: () => number;
}): { role: LowerGuitarRole; midi: number | null } {
  const weights = syRoleWeights({
    plan: params.plan,
    tuningId: params.tuningId,
    guitar1: params.guitar1,
  });
  const ranked = ALL_ROLES.map((role) => {
    const midi = midiForSYRole(role, params.plan, params.guitar1, params.prevMidi);
    let score = weights[role] + params.rng() * 0.12;
    if (role === 'counterline' && params.prevMidi != null && midi != null) {
      score += shapeMotionScore([params.prevMidi], [midi]) * 0.05;
    }
    if (params.prevRole === role && role === 'sparse_comp_answer') score -= 0.4;
    return { role, midi, score };
  }).sort((a, b) => b.score - a.score);
  const best = ranked[0]!;
  if (best.role !== 'rest' && best.score < 0.35) return { role: 'rest', midi: null };
  return { role: best.role, midi: best.midi };
}

export function resolveSYTuningLowerGuitarRoles(params: {
  shapePlans: readonly SYShapeBarPlan[];
  tuningId: SYTuningPresetId;
  guitar1: SYTuningDefinition;
  seed: number;
}): DuoRealisedLowerGuitarBar[] {
  const rng = mulberry32((params.seed ^ 0x0570103) >>> 0);
  const bars: DuoRealisedLowerGuitarBar[] = [];
  let prevMidi: number | null = null;
  let prevRole: LowerGuitarRole | null = null;

  for (const plan of params.shapePlans) {
    const { role, midi } = resolveSYBarRole({
      plan,
      tuningId: params.tuningId,
      guitar1: params.guitar1,
      prevMidi,
      prevRole,
      rng,
    });
    bars.push({
      barIndex: plan.barIndex,
      role,
      midi,
      upperSymbol: plan.exportSymbol,
      bassSymbol: bassSymbolFromPlan(plan),
    });
    prevMidi = midi;
    prevRole = role;
  }
  return bars;
}

export function syLowerGuitarRoleDistribution(
  bars: readonly DuoRealisedLowerGuitarBar[],
): LowerGuitarRoleDistribution {
  const dist = emptyDistribution();
  for (const bar of bars) dist[bar.role] += 1;
  return dist;
}

export function inferBassPcFromSymbol(symbol: string): number {
  const m = parseChordSymbol(symbol).harmonyPart.match(/^([A-G][#b]?)/i);
  return noteNameToPitchClass(m?.[1] ?? 'C') ?? 0;
}
