/**
 * PR C — leap-peak preferredIntervals skip motif blend; step/absent unchanged.
 */

import type { RiffIntervalWeightMap, RiffProfile } from '../core/composer/riffProfileTypes';
import { generateRiffCoreMotif } from '../core/motif/songModeMotifEngine';
import {
  applyLoopClosure,
  assignMelodyToBar,
  isLeapFamilyPeakPreferredIntervals,
  motifBlendWeightForPitchField,
  RIFF_MOTIF_BLEND_DEFAULT,
  RIFF_MOTIF_BLEND_WHEN_LEAP_PEAK,
  type MelodyLine,
} from '../core/riff-generator/riffMelody';
import { guitarRiffPitchFieldForBar, RIFF_INTERVAL_WEIGHT_SEMITONES } from '../core/riff-generator/riffPitchField';
import { mulberry32 } from '../core/riff-generator/riffRandom';
import type { RiffRhythmSegment } from '../core/riff-generator/riffTypes';

const SYNTH_STEP: RiffIntervalWeightMap = { m2: 0.35, M2: 0.4, m3: 0.25, P5: 0.05 };
const SYNTH_LEAP: RiffIntervalWeightMap = { P5: 0.45, P4: 0.3, tritone: 0.25, M2: 0.05 };
const SEEDS = [42, 7, 99, 1234, 777];

function fixedBar(nNotes: number): RiffRhythmSegment[] {
  const dur = 4 / nNotes;
  return Array.from({ length: nNotes }, (_, i) => ({
    startBeat: i * dur,
    duration: dur,
    rest: false,
  }));
}

function intervalsOf(pitches: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < pitches.length; i++) out.push(Math.abs(pitches[i]! - pitches[i - 1]!));
  return out;
}

function matchPreferredIcRate(pitches: number[], weights: RiffIntervalWeightMap): number {
  let max = -Infinity;
  for (const k of Object.keys(RIFF_INTERVAL_WEIGHT_SEMITONES) as (keyof RiffIntervalWeightMap)[]) {
    const w = weights[k];
    if (typeof w === 'number' && w > max) max = w;
  }
  const pref = new Set<number>();
  for (const k of Object.keys(RIFF_INTERVAL_WEIGHT_SEMITONES) as (keyof RiffIntervalWeightMap)[]) {
    const w = weights[k];
    if (typeof w === 'number' && w >= max * 0.7) pref.add(RIFF_INTERVAL_WEIGHT_SEMITONES[k]);
  }
  let hit = 0;
  let n = 0;
  for (let i = 1; i < pitches.length; i++) {
    const d = Math.abs(pitches[i]! - pitches[i - 1]!);
    if (d === 0) continue;
    n++;
    const ic = d % 12;
    if (pref.has(ic) || pref.has(12 - ic)) hit++;
  }
  return n === 0 ? 0 : hit / n;
}

function leapShare(deltas: number[]): number {
  if (deltas.length === 0) return 0;
  return deltas.filter((d) => d >= 5).length / deltas.length;
}

function stepShare(deltas: number[]): number {
  if (deltas.length === 0) return 0;
  return deltas.filter((d) => d > 0 && d <= 3).length / deltas.length;
}

function aggregate(weights: RiffIntervalWeightMap, withMotif: boolean) {
  const field = guitarRiffPitchFieldForBar('Am7', 'neutral', { intervalWeights: weights } as RiffProfile);
  const bar = fixedBar(8);
  let all: number[] = [];
  let pref = 0;
  for (const seed of SEEDS) {
    const motif = withMotif ? generateRiffCoreMotif(seed) : undefined;
    const pitches = assignMelodyToBar(
      bar,
      'Am7',
      'neutral',
      mulberry32(seed),
      0,
      undefined,
      undefined,
      motif,
      field
    ).notes.map((n) => n.pitch);
    all = all.concat(intervalsOf(pitches));
    pref += matchPreferredIcRate(pitches, weights);
  }
  return {
    leap: leapShare(all),
    step: stepShare(all),
    pref: pref / SEEDS.length,
  };
}

export function runRiffMotifBlendLeapGateTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  {
    const stepField = guitarRiffPitchFieldForBar('Am7', 'neutral', {
      intervalWeights: SYNTH_STEP,
    } as RiffProfile);
    const leapField = guitarRiffPitchFieldForBar('Am7', 'neutral', {
      intervalWeights: SYNTH_LEAP,
    } as RiffProfile);
    const absentField = guitarRiffPitchFieldForBar('Am7', 'neutral', undefined);
    out.push({
      ok:
        RIFF_MOTIF_BLEND_WHEN_LEAP_PEAK === 0 &&
        RIFF_MOTIF_BLEND_DEFAULT === 0.55 &&
        isLeapFamilyPeakPreferredIntervals(leapField.preferredIntervals) === true &&
        isLeapFamilyPeakPreferredIntervals(stepField.preferredIntervals) === false &&
        isLeapFamilyPeakPreferredIntervals(absentField.preferredIntervals) === false &&
        motifBlendWeightForPitchField(leapField) === 0 &&
        motifBlendWeightForPitchField(stepField) === 0.55 &&
        motifBlendWeightForPitchField(absentField) === 0.55 &&
        motifBlendWeightForPitchField(undefined) === 0.55,
      name: 'motif blend policy: leap-peak -> 0; step/absent -> 0.55',
    });
  }

  {
    const leapOff = aggregate(SYNTH_LEAP, false);
    const leapOn = aggregate(SYNTH_LEAP, true);
    const ok =
      Math.abs(leapOn.leap - leapOff.leap) < 1e-9 &&
      Math.abs(leapOn.pref - leapOff.pref) < 1e-9 &&
      leapOn.leap > 0.35 &&
      leapOn.pref > 0.35;
    out.push({
      ok,
      name: `leap-heavy: motif on == off (leap%=${(leapOn.leap * 100).toFixed(1)} prefIC=${(leapOn.pref * 100).toFixed(1)})`,
    });
  }

  {
    const stepOff = aggregate(SYNTH_STEP, false);
    const stepOn = aggregate(SYNTH_STEP, true);
    // Motif still active for step: should differ from no-motif and keep strong step share when on
    const stillBlends = Math.abs(stepOn.step - stepOff.step) > 0.05;
    const ok = stillBlends && stepOn.step > stepOff.step;
    out.push({
      ok,
      name: `step-heavy: motif blend still active (step% ${((stepOff.step * 100).toFixed(1))} -> ${(stepOn.step * 100).toFixed(1)})`,
    });
  }

  {
    const before: MelodyLine[] = [
      { startBeat: 0, duration: 1, pitch: 60 },
      { startBeat: 1, duration: 1, pitch: 62 },
      { startBeat: 2, duration: 1, pitch: 64 },
      { startBeat: 3, duration: 1, pitch: 65 },
    ];
    const notes = before.map((n) => ({ ...n }));
    applyLoopClosure(notes, 67, () => 0.5);
    out.push({
      ok: notes[3]!.pitch % 12 === 67 % 12 && notes[3]!.pitch === 67,
      name: 'applyLoopClosure untouched (still closes to first PC)',
    });
  }

  return out;
}