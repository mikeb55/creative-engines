/**
 * Composer OS V2 — Regression fixture tests
 */

import { runGoldenPath } from '../../core/goldenPath/runGoldenPath';
import { extractFixture } from './retroTestUtils';

const STABLE_SEED = 7777;

function testBarCountFixture(): boolean {
  const r = runGoldenPath(STABLE_SEED);
  const f = extractFixture(r.score, r.plans, r.readiness);
  return f.barCount === 8;
}

function testSectionLabelsFixture(): boolean {
  const r = runGoldenPath(STABLE_SEED + 1);
  const f = extractFixture(r.score, r.plans, r.readiness);
  return f.sectionLabels.length >= 1;
}

function testEventCountsByPart(): boolean {
  const r = runGoldenPath(STABLE_SEED + 2);
  const f = extractFixture(r.score, r.plans, r.readiness);
  const guitarCount = f.eventCountByPart['clean_electric_guitar'] ?? 0;
  const bassCount = f.eventCountByPart['acoustic_upright_bass'] ?? 0;
  return guitarCount >= 8 && bassCount >= 24;
}

function testPitchRangeSummaries(): boolean {
  const r = runGoldenPath(STABLE_SEED + 3);
  const f = extractFixture(r.score, r.plans, r.readiness);
  const guitar = f.pitchRangeByPart['clean_electric_guitar'];
  const bass = f.pitchRangeByPart['acoustic_upright_bass'];
  return !!guitar && guitar[0] >= 40 && guitar[1] <= 88 && !!bass && bass[0] >= 28 && bass[1] <= 67;
}

function testMotifPlacementBars(): boolean {
  const r = runGoldenPath(STABLE_SEED + 4);
  const f = extractFixture(r.score, r.plans, r.readiness);
  return f.motifPlacementBars.length >= 2;
}

function testChordSymbolCount(): boolean {
  const r = runGoldenPath(STABLE_SEED + 5);
  const f = extractFixture(r.score, r.plans, r.readiness);
  return f.chordSymbolCount >= 8;
}

function testRehearsalMarkBars(): boolean {
  const r = runGoldenPath(STABLE_SEED + 6);
  const f = extractFixture(r.score, r.plans, r.readiness);
  return f.rehearsalMarkBars.includes(1) && f.rehearsalMarkBars.includes(5);
}

function testStyleStackMetadata(): boolean {
  const r = runGoldenPath(STABLE_SEED + 7);
  const f = extractFixture(r.score, r.plans, r.readiness);
  return f.styleStackMetadata.primary === 'barry_harris';
}

function testReadinessThresholds(): boolean {
  const r = runGoldenPath(STABLE_SEED + 8);
  const f = extractFixture(r.score, r.plans, r.readiness);
  return f.readinessRelease >= 0 && f.readinessMx >= 0 && r.readiness.release >= 0 && r.readiness.mx >= 0;
}

export function runRegressionFixturesTests(): { name: string; ok: boolean }[] {
  return [
    ['Bar count fixture', testBarCountFixture],
    ['Section labels fixture', testSectionLabelsFixture],
    ['Event counts by part', testEventCountsByPart],
    ['Pitch range summaries', testPitchRangeSummaries],
    ['Motif placement bars', testMotifPlacementBars],
    ['Chord symbol count', testChordSymbolCount],
    ['Rehearsal mark bars', testRehearsalMarkBars],
    ['Style stack metadata', testStyleStackMetadata],
    ['Readiness thresholds', testReadinessThresholds],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
