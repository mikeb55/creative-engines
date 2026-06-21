// CHECKPOINT (2026-06-21): read-only TV Suite section-start bar-math investigation — PAUSED, no fix yet.
// Reported failure: guitar bars 1 / 9 / 29 → voice 1 sum 4.5 ≠ 4, overlap at beat 2 (score-truth / strictBarMath).
// Section starts: intro(1) · build(9) · peak(21) · tail(29) — same family as 305f3e15 intro bug (stripMelodyMeasure gap rests).
// Resume: omit mosaicOutputFormat so runGoldenPath skips auto strip; then call applyMelodyBassFormat manually (see main()).
// Also run: validateArtRockMosaicArc.ts seed 90106 · git blame generateMelodyBassScore.ts stripMelodyMeasure · mosaicTilePipeline inject.
// Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/scripts/diagnoseTvSuiteBarMath.ts

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import { validateStrictBarMathSibeliusSafe } from '../core/score-integrity/strictBarMath';
import { applyMelodyBassFormat } from '../core/goldenPath/generateMelodyBassScore';
import { buildMosaicTonicMap } from '../core/mosaic-mode/precomputeMosaicEffectiveHarmonyBars';
import { cloneMosaicSectionPlanPresetPlan, TELEVISION_FIELD_SUITE_PRESET_ID } from '../core/mosaic-mode/mosaicSectionPlanPresets';
import type { MeasureModel, ScoreEvent } from '../core/score-model/scoreModelTypes';

const PROOF_SEED = 90106;
const TOTAL_BARS = 40;
const TARGET_BARS = [1, 9, 21, 29];

function lockedHarmony40(): string[] {
  const cycle = ['Em', 'Am', 'D', 'G', 'C', 'B7', 'Em', 'Am'];
  return Array.from({ length: TOTAL_BARS }, (_, i) => cycle[i % cycle.length]!);
}

function fmtEvent(e: ScoreEvent): string {
  const pitch = e.kind === 'note' ? ` pitch=${(e as { pitch: number }).pitch}` : '';
  return `${e.kind} start=${e.startBeat} dur=${e.duration} voice=${e.voice ?? 1}${pitch}`;
}

function dumpBar(label: string, m: MeasureModel | undefined): void {
  if (!m) { console.log(`${label}: MISSING`); return; }
  const span = m.measureBeatSpanQuarters ?? 4;
  const v1 = m.events.filter((e) => (e.voice ?? 1) === 1).sort((a, b) => a.startBeat - b.startBeat);
  const v2 = m.events.filter((e) => (e.voice ?? 1) === 2).sort((a, b) => a.startBeat - b.startBeat);
  let sum1 = 0; for (const e of v1) sum1 += e.duration;
  console.log(`\n${label} bar ${m.index} span=${span} v1_sum=${sum1}`);
  console.log('  VOICE 1:'); for (const e of v1) console.log('   ', fmtEvent(e));
  console.log('  VOICE 2:'); for (const e of v2) console.log('   ', fmtEvent(e));
}

function main(): void {
  const plan = cloneMosaicSectionPlanPresetPlan(TELEVISION_FIELD_SUITE_PRESET_ID);
  const locked = lockedHarmony40();
  const pre = runGoldenPathOnce(PROOF_SEED, {
    presetId: 'guitar_bass_duo', totalBars: TOTAL_BARS, longFormEnabled: true,
    harmonyMode: 'custom_locked', lockedHarmonyBarsRaw: locked, parsedChordBars: [...locked],
    chordProgressionText: locked.join(' | '), mosaicSectionPlan: plan, mosaicOutputFormat: 'lead-sheet',
    primarySongwriterStyle: 'verlaine', songModeHookFirstIdentity: true,
  });
  if (!pre.score || !pre.context) { console.error('fail', pre.errors); process.exit(1); }
  const guitarPre = pre.score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar' || p.id === 'guitar');
  console.log('=== PRE applyMelodyBassFormat ===');
  for (const bar of TARGET_BARS) dumpBar('PRE', guitarPre?.measures.find((m) => m.index === bar));
  console.log('\nPRE bar-math valid:', validateStrictBarMathSibeliusSafe(pre.score).valid);
  const stripped = applyMelodyBassFormat(pre.score, plan, buildMosaicTonicMap(plan, pre.context));
  const guitarPost = stripped.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar' || p.id === 'guitar');
  console.log('\n=== POST applyMelodyBassFormat ===');
  for (const bar of TARGET_BARS) dumpBar('POST', guitarPost?.measures.find((m) => m.index === bar));
  const postBm = validateStrictBarMathSibeliusSafe(stripped);
  console.log('\nPOST bar-math valid:', postBm.valid);
  for (const e of postBm.errors) if (e.includes('guitar')) console.log(' POST ERR:', e);
  for (const d of postBm.details.filter((d) => d.partId === 'guitar' && TARGET_BARS.includes(d.measureIndex)))
    console.log(' POST DETAIL sum=', d.summedDuration, 'events=', d.eventsJson);
}
main();
