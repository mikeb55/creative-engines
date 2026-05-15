/**
 * DUO Run 1c — Gate B re-run (same harness as Run 1b).
 * npx ts-node --project tsconfig.json engines/composer-os-v2/scripts/gateBRun1cDuoVerify.ts
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import type { AbstractLineSet } from '../core/counterpoint/abstractLineSet';
import type { NoteEvent, PartModel } from '../core/score-model/scoreModelTypes';

const SQ8 = ['Dm7', 'G7', 'Cmaj7', 'Am7', 'Dm7', 'G7', 'Cmaj7', 'Am7'] as const;
const BB8 = ['Bbmaj7', 'Bb6', 'Cm7', 'F7', 'Bbmaj7', 'Bb6', 'Cm7', 'F7'] as const;

const SQ_IDS = [
  'beethoven_late',
  'turtle_island',
  'reich_glass',
  'shostakovich',
  'lachenmann',
  'ligeti',
  'crumb_black_angels',
  'part',
  'dutilleux',
] as const;

const BB_IDS = [
  'charles_mingus',
  'duke_ellington',
  'count_basie',
  'oliver_nelson',
  'maria_schneider',
] as const;

function duoScoreStrongBeatCoOnsetWorst(guitar: PartModel, bass: PartModel, bars: number): number {
  const eps = 0.07;
  let run = 0;
  let worst = 0;
  for (let b = 1; b <= bars; b++) {
    const gm = guitar.measures.find((m) => m.index === b);
    const bm = bass.measures.find((m) => m.index === b);
    const g0 = gm?.events.find((e) => e.kind === 'note' && ((e as NoteEvent).startBeat % 4 + 4) % 4 < eps);
    const b0 = bm?.events.find((e) => e.kind === 'note' && ((e as NoteEvent).startBeat % 4 + 4) % 4 < eps);
    if (g0 && b0) {
      run++;
      worst = Math.max(worst, run);
    } else {
      run = 0;
    }
  }
  return worst;
}

function guitarBarsMatchAbstractSopranoPcs(guitar: PartModel, ls: AbstractLineSet, bar1Based: number): boolean {
  const b0 = bar1Based - 1;
  const abs = (ls.voices.find((v) => v.role === 'soprano')?.notes ?? [])
    .filter((n) => n.offsetBars >= b0 - 1e-9 && n.offsetBars < b0 + 1 - 1e-9)
    .sort((a, c) => a.offsetBars - c.offsetBars);
  const gm = guitar.measures.find((m) => m.index === bar1Based);
  const gn = (gm?.events.filter((e) => e.kind === 'note') as NoteEvent[]).sort((a, c) => a.startBeat - c.startBeat);
  if (abs.length === 0 || gn.length === 0) return false;
  const bagUniquePcs = (xs: number[]) =>
    [...new Set(xs)]
      .sort((a, b) => a - b)
      .join(',');
  const a = bagUniquePcs(abs.map((n) => Math.round(n.pitchMidi) % 12));
  const g = bagUniquePcs(gn.map((n) => n.pitch % 12));
  return a === g;
}

function bassBarsMatchAbstractBassPcs(bass: PartModel, ls: AbstractLineSet, bar1Based: number): boolean {
  const b0 = bar1Based - 1;
  const abs = (ls.voices.find((v) => v.role === 'bass')?.notes ?? [])
    .filter((n) => n.offsetBars >= b0 - 1e-9 && n.offsetBars < b0 + 1 - 1e-9)
    .sort((a, c) => a.offsetBars - c.offsetBars);
  const bm = bass.measures.find((m) => m.index === bar1Based);
  const bn = (bm?.events.filter((e) => e.kind === 'note') as NoteEvent[]).sort((a, c) => a.startBeat - c.startBeat);
  if (abs.length === 0 || bn.length === 0) return false;
  const bagUniquePcs = (xs: number[]) =>
    [...new Set(xs)]
      .sort((a, b) => a - b)
      .join(',');
  const a = bagUniquePcs(abs.map((n) => Math.round(n.pitchMidi) % 12));
  const g = bagUniquePcs(bn.map((n) => n.pitch % 12));
  return a === g;
}

function abstractStyleFingerprint(ls: AbstractLineSet): string {
  const ser = (role: 'soprano' | 'bass') => {
    const v = ls.voices.find((x) => x.role === role);
    if (!v) return '';
    return v.notes
      .map((n) => `${n.offsetBars.toFixed(4)}:${Math.round(n.pitchMidi)}`)
      .join('|');
  };
  const im = ls.imitationMap?.length ?? 0;
  return `${ls.styleSourceVrbId}#${im}#${ser('soprano')}#${ser('bass')}`;
}

function primaryForVrb(vrb: string): string {
  if (vrb === 'part') return 'arvo_part';
  return vrb;
}

function runDuo(
  seed: number,
  vrb: string,
  locked: readonly string[],
  tonal: string,
): ReturnType<typeof runGoldenPathOnce> {
  const bars = [...locked];
  return runGoldenPathOnce(seed, {
    presetId: 'guitar_bass_duo',
    totalBars: 8,
    harmonyMode: 'custom_locked',
    lockedHarmonyBarsRaw: bars,
    parsedChordBars: bars,
    chordProgressionText: bars.join(' | '),
    tonalCenterOverride: tonal,
    primarySongwriterStyle: primaryForVrb(vrb),
    harmonicVoice: vrb,
    songModeHookFirstIdentity: false,
    suppressWybleVoiceLayoutForTest: true,
    orchestrationEnabled: false,
  });
}

function routeOk(r: ReturnType<typeof runGoldenPathOnce>): boolean {
  const g = r.score?.parts.find((p) => p.id === 'guitar');
  const b = r.score?.parts.find((p) => p.id === 'bass');
  const ls = r.context?.generationMetadata?.contrapuntalLineSet;
  if (!g || !b || !ls) return false;
  return (
    guitarBarsMatchAbstractSopranoPcs(g, ls, 1) &&
    guitarBarsMatchAbstractSopranoPcs(g, ls, 2) &&
    bassBarsMatchAbstractBassPcs(b, ls, 1) &&
    bassBarsMatchAbstractBassPcs(b, ls, 2)
  );
}

function indepOk(r: ReturnType<typeof runGoldenPathOnce>): boolean {
  const g = r.score?.parts.find((p) => p.id === 'guitar');
  const b = r.score?.parts.find((p) => p.id === 'bass');
  if (!g || !b) return false;
  return duoScoreStrongBeatCoOnsetWorst(g, b, 8) <= 2;
}

const SEED_SQ = 72001;
const SEED_BB = 73001;

const bartokRef = runDuo(SEED_SQ, 'bartok', SQ8, 'C');
const brookRef = runDuo(SEED_BB, 'bob_brookmeyer', BB8, 'Bb');

const bartokLs = bartokRef.context?.generationMetadata?.contrapuntalLineSet;
const brookLs = brookRef.context?.generationMetadata?.contrapuntalLineSet;
if (!bartokLs || !brookLs) {
  // eslint-disable-next-line no-console
  console.error('Reference runs missing AbstractLineSet');
  process.exit(1);
}
const bartokFp = abstractStyleFingerprint(bartokLs);
const brookFp = abstractStyleFingerprint(brookLs);

const sqRows: { id: string; indep: boolean; route: boolean; style: boolean; fp: string }[] = [];
for (const id of SQ_IDS) {
  const r = runDuo(SEED_SQ, id, SQ8, 'C');
  const ls = r.context?.generationMetadata?.contrapuntalLineSet;
  const fp = ls ? abstractStyleFingerprint(ls) : '';
  sqRows.push({
    id,
    indep: Boolean(r.score) && indepOk(r),
    route: Boolean(r.score) && routeOk(r),
    style: false,
    fp,
  });
}
const sqFpCounts = new Map<string, number>();
for (const row of sqRows) {
  sqFpCounts.set(row.fp, (sqFpCounts.get(row.fp) ?? 0) + 1);
}
for (const row of sqRows) {
  const uniqueAmongSq = row.fp.length > 0 && (sqFpCounts.get(row.fp) ?? 0) === 1;
  row.style =
    Boolean(row.fp) &&
    Boolean(bartokRef.score) &&
    row.fp !== bartokFp &&
    uniqueAmongSq &&
    row.fp.startsWith(`${row.id}#`);
}

const bbRows: { id: string; indep: boolean; route: boolean; style: boolean; fp: string }[] = [];
for (const id of BB_IDS) {
  const r = runDuo(SEED_BB, id, BB8, 'Bb');
  const ls = r.context?.generationMetadata?.contrapuntalLineSet;
  const fp = ls ? abstractStyleFingerprint(ls) : '';
  bbRows.push({
    id,
    indep: Boolean(r.score) && indepOk(r),
    route: Boolean(r.score) && routeOk(r),
    style: false,
    fp,
  });
}
const bbFpCounts = new Map<string, number>();
for (const row of bbRows) {
  bbFpCounts.set(row.fp, (bbFpCounts.get(row.fp) ?? 0) + 1);
}
for (const row of bbRows) {
  const uniqueAmongBb = row.fp.length > 0 && (bbFpCounts.get(row.fp) ?? 0) === 1;
  row.style =
    Boolean(row.fp) &&
    Boolean(brookRef.score) &&
    row.fp !== brookFp &&
    uniqueAmongBb &&
    row.fp.startsWith(`${row.id}#`);
}

function tick(ok: boolean): string {
  return ok ? '✓' : '✗';
}

// eslint-disable-next-line no-console
console.log('=== TASK 3 — GATE B (SQ seed', SEED_SQ, SQ8.join(' | '), ') ===');
for (const row of sqRows) {
  // eslint-disable-next-line no-console
  console.log(`${row.id}: Independence ${tick(row.indep)} | Routing ${tick(row.route)} | Style ${tick(row.style)}`);
}
// eslint-disable-next-line no-console
console.log('\n=== TASK 3 — GATE B (BB seed', SEED_BB, ') ===');
for (const row of bbRows) {
  // eslint-disable-next-line no-console
  console.log(`${row.id}: Independence ${tick(row.indep)} | Routing ${tick(row.route)} | Style ${tick(row.style)}`);
}

const routeFail = [...sqRows, ...bbRows].some((x) => !x.route);
// eslint-disable-next-line no-console
console.log('\nROUTING_ALL_PASS:', !routeFail);
// eslint-disable-next-line no-console
console.log(
  'ANY_FAIL:',
  [...sqRows, ...bbRows].some((x) => !x.indep || !x.route || !x.style),
);
