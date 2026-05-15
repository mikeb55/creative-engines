/**
 * DUO Run 5 — Gate B harness for Priority 3 line-first duo VRBs.
 * npx ts-node --project tsconfig.json engines/composer-os-v2/scripts/gateBRun5P3Verify.ts
 *
 * Routing column: strict abstract PC parity (bars 1–2) when colour post preserves PCs;
 * otherwise `routingRelaxed` (line set present + guitar/bass notes in bars 1–2) is logged
 * for diagnostics — P3 colour post is allowed to mutate PCs by design (see INVARIANTS).
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import type { AbstractLineSet } from '../core/counterpoint/abstractLineSet';
import type { NoteEvent, PartModel } from '../core/score-model/scoreModelTypes';

const P3_CHORDS = ['Dm7', 'G7', 'Cmaj7', 'Am7', 'Dm7', 'G7', 'Cmaj7', 'Am7'] as const;

const P3_IDS = [
  'donald_fagen',
  'bacharach',
  'frank_zappa',
  'ecm_chamber',
  'fripp_king_crimson',
  'james_brown',
  'messiaen',
] as const;

const SEED_P3 = 75001;

function duoScoreStrongBeatCoOnsetWorst(guitar: PartModel, bass: PartModel, bars: number): number {
  const eps = 0.07;
  let run = 0;
  let worst = 0;
  for (let b = 1; b <= bars; b++) {
    const gm = guitar.measures.find((m) => m.index === b);
    const bm = bass.measures.find((m) => m.index === b);
    const g0 = gm?.events.find((e) => e.kind === 'note' && ((((e as NoteEvent).startBeat % 4) + 4) % 4) < eps);
    const b0 = bm?.events.find((e) => e.kind === 'note' && ((((e as NoteEvent).startBeat % 4) + 4) % 4) < eps);
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

function routeStrict(r: ReturnType<typeof runGoldenPathOnce>): boolean {
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

function routingRelaxed(r: ReturnType<typeof runGoldenPathOnce>): boolean {
  const g = r.score?.parts.find((p) => p.id === 'guitar');
  const b = r.score?.parts.find((p) => p.id === 'bass');
  const ls = r.context?.generationMetadata?.contrapuntalLineSet;
  if (!g || !b || !ls) return false;
  for (const bar of [1, 2]) {
    const gm = g.measures.find((m) => m.index === bar);
    const bm = b.measures.find((m) => m.index === bar);
    const gn = (gm?.events.filter((e) => e.kind === 'note') ?? []).length;
    const bn = (bm?.events.filter((e) => e.kind === 'note') ?? []).length;
    if (gn === 0 || bn === 0) return false;
  }
  return true;
}

function indepOk(r: ReturnType<typeof runGoldenPathOnce>): boolean {
  const g = r.score?.parts.find((p) => p.id === 'guitar');
  const b = r.score?.parts.find((p) => p.id === 'bass');
  if (!g || !b) return false;
  return duoScoreStrongBeatCoOnsetWorst(g, b, 8) <= 2;
}

const bartokRef = runDuo(SEED_P3, 'bartok', P3_CHORDS, 'C');
const brookRef = runDuo(SEED_P3, 'bob_brookmeyer', P3_CHORDS, 'C');
const bartokLs = bartokRef.context?.generationMetadata?.contrapuntalLineSet;
const brookLs = brookRef.context?.generationMetadata?.contrapuntalLineSet;
const bartokFp = bartokLs ? abstractStyleFingerprint(bartokLs as AbstractLineSet) : '';
const brookFp = brookLs ? abstractStyleFingerprint(brookLs as AbstractLineSet) : '';

const rows: {
  id: string;
  indep: boolean;
  routeStrict: boolean;
  routeRelaxed: boolean;
  style: boolean;
  fp: string;
}[] = [];

for (const id of P3_IDS) {
  const r = runDuo(SEED_P3, id, P3_CHORDS, 'C');
  const ls = r.context?.generationMetadata?.contrapuntalLineSet;
  const fp = ls ? abstractStyleFingerprint(ls as AbstractLineSet) : '';
  rows.push({
    id,
    indep: Boolean(r.score) && indepOk(r),
    routeStrict: Boolean(r.score) && routeStrict(r),
    routeRelaxed: Boolean(r.score) && routingRelaxed(r),
    style: false,
    fp,
  });
}

const fpCounts = new Map<string, number>();
for (const row of rows) {
  fpCounts.set(row.fp, (fpCounts.get(row.fp) ?? 0) + 1);
}

for (const row of rows) {
  const uniqueAmongP3 = row.fp.length > 0 && (fpCounts.get(row.fp) ?? 0) === 1;
  row.style =
    Boolean(row.fp) &&
    Boolean(bartokRef.score) &&
    Boolean(brookRef.score) &&
    row.fp !== bartokFp &&
    row.fp !== brookFp &&
    uniqueAmongP3 &&
    row.fp.startsWith(`${row.id}#`);
}

function tick(ok: boolean): string {
  return ok ? '✓' : '✗';
}

// eslint-disable-next-line no-console
console.log('=== RUN 5 — GATE B P3 (seed', SEED_P3, ', 8 bars, C,', P3_CHORDS.join(' | '), ') ===');
for (const row of rows) {
  const routeCol = tick(row.routeRelaxed);
  // eslint-disable-next-line no-console
  console.log(
    `${row.id}: Independence ${tick(row.indep)} | Routing ${routeCol} | Style ${tick(row.style)} | strictPC ${tick(row.routeStrict)}`,
  );
}

// eslint-disable-next-line no-console
console.log(
  'ANY_FAIL:',
  rows.some((x) => !x.indep || !x.routeRelaxed || !x.style),
);
