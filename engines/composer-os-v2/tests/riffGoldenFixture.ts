/**
 * Riff golden fixture — extract metrics from generator output (Phase D eval harness).
 */

import * as fs from 'fs';
import * as path from 'path';
import { runRiffGenerator } from '../core/riff-generator/runRiffGenerator';
import { riffStyleIdForFamily, resolveRiffGeneratorProfileWithMeta } from '../core/riff-generator/resolveRiffGeneratorProfile';
import {
  RIFF_GENERATOR_VRB_IDS,
  RIFF_VRB_EXPECTED_FAMILY,
  type RiffGeneratorVrbId,
} from '../core/riff-generator/riffVrbRegistry';
import type { RiffGridMode, RiffRhythmSegment } from '../core/riff-generator/riffTypes';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';

export const RIFF_GOLDEN_SEED = 42;
export const RIFF_GOLDEN_BARS = 8;

export interface RiffGoldenFixture {
  vrbId: RiffGeneratorVrbId;
  seed: number;
  bars: number;
  /** Normalized 16th-slot attack histogram (length 16, sums to 1). */
  rhythmFingerprint: number[];
  noteCount: number;
  offbeatRatio: number;
  registerMean: number;
  bassRegisterMean: number;
}

export function goldenGridForVrb(vrbId: RiffGeneratorVrbId): RiffGridMode {
  const family = RIFF_VRB_EXPECTED_FAMILY[vrbId];
  const style = riffStyleIdForFamily(family);
  const meta = resolveRiffGeneratorProfileWithMeta({
    vrbId,
    style,
    grid: 'sixteenth',
    density: 'medium',
  });
  return meta.profile.subdivisionGrid === 16 ? 'sixteenth' : 'eighth';
}

export function rhythmFingerprintVector(
  perBarRhythm: RiffRhythmSegment[][],
  grid: RiffGridMode
): number[] {
  const slots = grid === 'sixteenth' ? 16 : 8;
  const vec = new Array<number>(slots).fill(0);
  for (const bar of perBarRhythm) {
    for (const s of bar) {
      if (s.rest) continue;
      const idx = Math.min(slots - 1, Math.max(0, Math.round(s.startBeat * (slots / 4))));
      vec[idx]! += 1;
    }
  }
  const total = vec.reduce((a, b) => a + b, 0) || 1;
  return vec.map((v) => v / total);
}

export function offbeatRatioFromRhythm(perBarRhythm: RiffRhythmSegment[][]): number {
  let attacks = 0;
  let offbeat = 0;
  for (const bar of perBarRhythm) {
    for (const s of bar) {
      if (s.rest) continue;
      attacks++;
      if (Math.abs(s.startBeat - Math.round(s.startBeat)) > 0.11) offbeat++;
    }
  }
  return attacks === 0 ? 0 : offbeat / attacks;
}

function partMidiPitches(score: ScoreModel, instrumentIdentity: string, voice = 1): number[] {
  const part = score.parts.find((p) => p.instrumentIdentity === instrumentIdentity);
  if (!part) return [];
  const out: number[] = [];
  for (const m of part.measures) {
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      if (((e as { voice?: number }).voice ?? 1) !== voice) continue;
      out.push((e as { pitch: number }).pitch);
    }
  }
  return out;
}

export function registerMeanFromScore(score: ScoreModel, instrumentIdentity: string): number {
  const pitches = partMidiPitches(score, instrumentIdentity);
  if (!pitches.length) return 0;
  return pitches.reduce((a, p) => a + p, 0) / pitches.length;
}

export function noteCountGuitar(score: ScoreModel): number {
  return partMidiPitches(score, 'clean_electric_guitar').length;
}

export function buildRiffGoldenFixture(vrbId: RiffGeneratorVrbId): RiffGoldenFixture | { error: string } {
  const family = RIFF_VRB_EXPECTED_FAMILY[vrbId];
  const style = riffStyleIdForFamily(family);
  const grid = goldenGridForVrb(vrbId);
  let r = runRiffGenerator(RIFF_GOLDEN_SEED, {
    vrbId,
    bars: RIFF_GOLDEN_BARS,
    density: 'medium',
    style,
    grid,
    lineMode: 'guitar_bass',
    bassEnabled: true,
    bpm: 100,
  });
  if (!r.success) {
    r = runRiffGenerator(RIFF_GOLDEN_SEED, {
      vrbId,
      bars: RIFF_GOLDEN_BARS,
      density: 'medium',
      style,
      grid,
      lineMode: 'single_line',
      bassEnabled: false,
      bpm: 100,
    });
  }
  if (!r.success) return { error: r.error };
  const rhythmFingerprint = rhythmFingerprintVector(r.perBarRhythm, grid);
  const guitarMean = registerMeanFromScore(r.score, 'clean_electric_guitar');
  const bassMean = registerMeanFromScore(r.score, 'acoustic_upright_bass');
  return {
    vrbId,
    seed: RIFF_GOLDEN_SEED,
    bars: RIFF_GOLDEN_BARS,
    rhythmFingerprint,
    noteCount: noteCountGuitar(r.score),
    offbeatRatio: offbeatRatioFromRhythm(r.perBarRhythm),
    registerMean: guitarMean,
    bassRegisterMean: bassMean,
  };
}

export function fixturePathForVrb(vrbId: RiffGeneratorVrbId): string {
  return path.join(__dirname, 'riffGoldenFixtures', `${vrbId}_golden.json`);
}

export function loadRiffGoldenFixture(vrbId: RiffGeneratorVrbId): RiffGoldenFixture {
  const raw = fs.readFileSync(fixturePathForVrb(vrbId), 'utf-8');
  return JSON.parse(raw) as RiffGoldenFixture;
}

export function writeAllRiffGoldenFixtures(): void {
  const dir = path.join(__dirname, 'riffGoldenFixtures');
  fs.mkdirSync(dir, { recursive: true });
  for (const vrbId of RIFF_GENERATOR_VRB_IDS) {
    const built = buildRiffGoldenFixture(vrbId);
    if ('error' in built) {
      throw new Error(`${vrbId}: ${built.error}`);
    }
    fs.writeFileSync(fixturePathForVrb(vrbId), `${JSON.stringify(built, null, 2)}\n`, 'utf-8');
  }
}

export function fingerprintMaxDelta(a: number[], b: number[]): number {
  const n = Math.max(a.length, b.length);
  let max = 0;
  for (let i = 0; i < n; i++) {
    max = Math.max(max, Math.abs((a[i] ?? 0) - (b[i] ?? 0)));
  }
  return max;
}

export function formatGoldenDiff(
  vrbId: string,
  field: string,
  expected: unknown,
  actual: unknown
): string {
  return `${vrbId} golden diverged on ${field}: expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`;
}
