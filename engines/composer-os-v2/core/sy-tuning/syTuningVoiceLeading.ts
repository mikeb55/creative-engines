/**
 * SY tuning-native voice-leading metrics (V106p3).
 */

import { STANDARD_EADGBE_MIDI } from './syTuningPresetCatalog';
import { adjacentStringBlocks } from './syTuningShapeHarmony';
import type { SYShapeBarPlan, SYTuningDefinition } from './syTuningTypes';

function standardTuningPlayable(midis: readonly number[]): boolean {
  if (midis.length === 0) return true;
  const stdPcs = STANDARD_EADGBE_MIDI.map((m) => ((m % 12) + 12) % 12);
  return midis.every((midi) => {
    const pc = ((midi % 12) + 12) % 12;
    const octave = Math.floor(midi / 12);
    for (let s = 0; s < stdPcs.length; s++) {
      const stdMidi = STANDARD_EADGBE_MIDI[s]! + (octave - Math.floor(STANDARD_EADGBE_MIDI[s]! / 12)) * 12;
      if (Math.abs(stdMidi - midi) <= 2) return true;
    }
    return stdPcs.includes(pc);
  });
}

function openResonanceRatio(plans: readonly SYShapeBarPlan[], tuning: SYTuningDefinition): number {
  if (plans.length === 0) return 0;
  let hits = 0;
  let total = 0;
  const openPcs = tuning.strings.map((m) => ((m % 12) + 12) % 12);
  for (const plan of plans) {
    for (let i = 0; i < plan.ringingMask.length; i++) {
      if (!plan.ringingMask[i]) continue;
      total += 1;
      const sounding = plan.guitar1Midis.map((m) => ((m % 12) + 12) % 12);
      if (sounding.includes(openPcs[i]!)) hits += 1;
    }
  }
  return total > 0 ? hits / total : 0;
}

function shapeRedundancy(plans: readonly SYShapeBarPlan[]): number {
  if (plans.length <= 1) return 0;
  let same = 0;
  for (let i = 1; i < plans.length; i++) {
    const prev = plans[i - 1]!;
    const cur = plans[i]!;
    if (cur.fretOffset === prev.fretOffset && cur.exportSymbol === prev.exportSymbol) same += 1;
  }
  return same / (plans.length - 1);
}

function clusterIdentity(plans: readonly SYShapeBarPlan[], tuning: SYTuningDefinition): number {
  const blocks = adjacentStringBlocks(tuning.strings);
  const friction = blocks.filter((b) => b.interval === 1 || b.interval === 2 || b.interval === 0).length;
  const maxBlocks = Math.max(1, blocks.length);
  const barFriction = plans.filter((p) => /sus4|5/.test(p.exportSymbol)).length / Math.max(1, plans.length);
  return Math.min(1, (friction / maxBlocks) * 0.6 + barFriction * 0.4);
}

function retuneDependence(tuning: SYTuningDefinition): number {
  let drift = 0;
  for (let i = 0; i < tuning.strings.length; i++) {
    const diff = Math.abs(tuning.strings[i]! - STANDARD_EADGBE_MIDI[i]!);
    if (diff > 2) drift += 1;
  }
  return drift / tuning.strings.length;
}

function resonanceContinuity(plans: readonly SYShapeBarPlan[]): number {
  if (plans.length <= 1) return 1;
  let carry = 0;
  for (let i = 1; i < plans.length; i++) {
    const prev = plans[i - 1]!;
    const cur = plans[i]!;
    const prevSet = new Set(prev.guitar1Midis.map((m) => ((m % 12) + 12) % 12));
    const overlap = cur.guitar1Midis.filter((m) => prevSet.has(((m % 12) + 12) % 12)).length;
    if (overlap > 0) carry += 1;
  }
  return carry / (plans.length - 1);
}

function parallelShapeUsage(plans: readonly SYShapeBarPlan[]): number {
  if (plans.length <= 1) return 0;
  let parallel = 0;
  for (let i = 1; i < plans.length; i++) {
    const prev = plans[i - 1]!;
    const cur = plans[i]!;
    const delta = cur.fretOffset - prev.fretOffset;
    if (delta !== 0 && cur.exportSymbol.replace(/sus[24]|5/g, '') === prev.exportSymbol.replace(/sus[24]|5/g, '')) {
      parallel += 1;
    }
  }
  return parallel / (plans.length - 1);
}

function tertianNormalizationPenalty(plans: readonly SYShapeBarPlan[]): number {
  if (plans.length === 0) return 0;
  let tertian = 0;
  let eadgbe = 0;
  for (const plan of plans) {
    if (/maj7|m7|7$|dim|°/.test(plan.exportSymbol)) tertian += 1;
    const combined = [...plan.guitar1Midis, ...plan.guitar2Midis];
    if (standardTuningPlayable(combined)) eadgbe += 1;
  }
  const tertianRate = tertian / plans.length;
  const eadgbeRate = eadgbe / plans.length;
  return Math.min(1, tertianRate * 0.7 + eadgbeRate * 0.3);
}

export type SYVoiceLeadingMetrics = {
  openStringResonanceRatio: number;
  shapeRedundancyScore: number;
  clusterIdentityScore: number;
  retuneDependenceIndex: number;
  resonanceContinuityMetric: number;
  parallelShapeUsage: number;
  tertianNormalizationPenalty: number;
};

export function computeSYVoiceLeadingMetrics(
  plans: readonly SYShapeBarPlan[],
  guitar1: SYTuningDefinition,
  guitar2: SYTuningDefinition,
): SYVoiceLeadingMetrics {
  const g1 = openResonanceRatio(plans, guitar1);
  const g2 = openResonanceRatio(
    plans.map((p) => ({ ...p, ringingMask: p.ringingMask, guitar1Midis: p.guitar2Midis })),
    guitar2,
  );
  return {
    openStringResonanceRatio: Math.min(1, (g1 + g2) / 2),
    shapeRedundancyScore: shapeRedundancy(plans),
    clusterIdentityScore: Math.min(1, (clusterIdentity(plans, guitar1) + clusterIdentity(plans, guitar2)) / 2),
    retuneDependenceIndex: Math.min(1, (retuneDependence(guitar1) + retuneDependence(guitar2)) / 2),
    resonanceContinuityMetric: resonanceContinuity(plans),
    parallelShapeUsage: parallelShapeUsage(plans),
    tertianNormalizationPenalty: tertianNormalizationPenalty(plans),
  };
}

/** Prefer common ringing strings over semitone motion when scoring shape motion. */
export function shapeMotionScore(
  prevMidis: readonly number[],
  nextMidis: readonly number[],
): number {
  const prevSet = new Set(prevMidis.map((m) => ((m % 12) + 12) % 12));
  const shared = nextMidis.filter((m) => prevSet.has(((m % 12) + 12) % 12)).length;
  const semitoneSteps = nextMidis.filter((m) => {
    const pc = ((m % 12) + 12) % 12;
    return [...prevSet].some((p) => Math.abs(p - pc) === 1 || Math.abs(p - pc) === 11);
  }).length;
  return shared * 2 - semitoneSteps * 0.5;
}
