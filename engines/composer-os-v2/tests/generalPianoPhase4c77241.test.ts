/**
 * Seed 77241 Phase 4C — B-section rhythm/harmony repair; bars 1–8 & 17–24 match motif-fix input.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { apiComposePianoV1 } from '../app-api/pianoCompositionApp';
import { parseGeneralPianoChord } from '../core/piano/generalPianoWriter';
import { parsePianoXmlAtoms } from '../core/piano/pianoXmlOracle';
import type { NoteEvent, ScoreModel } from '../core/score-model/scoreModelTypes';

const ROOT = process.cwd();
const REF = path.join(ROOT, '.tmp-piano-24bar-original-test/Original-24bar-Seed77241-motif-fix.musicxml');
const EXPORT = path.join(ROOT, '.tmp-piano-24bar-original-test/Original-24bar-Seed77241-phase4c-final.musicxml');

const HARMONY_77241 = [
  'Cmaj7/E', 'Fmaj7/A', 'Dm7', 'Gsus4', 'Cmaj7(#11)', 'Am7', 'Fmaj7/C', 'Ebmaj7/G',
  'Abmaj7', 'Emaj7', 'Bmaj7(#11)', 'F#m7', 'Dbmaj7', 'Amaj7', 'Fm7', 'Bb7sus4',
  'Cmaj7/E', 'Am7', 'Dm7', 'G7', 'Fmaj7', 'Em7', 'Cmaj7', 'Cmaj7',
];

const mod12 = (v: number) => ((v % 12) + 12) % 12;

function measureEventSig(score: ScoreModel, bar: number, voice?: number): string {
  const measure = score.parts[0]?.measures[bar - 1];
  const notes = (measure?.events ?? []).filter((e) => e.kind === 'note') as NoteEvent[];
  return notes
    .filter((n) => voice === undefined || (n.voice ?? 1) === voice)
    .map((n) => `${n.voice ?? 1}:${n.startBeat}:${n.duration}:${n.pitch}`)
    .sort()
    .join(',');
}

function refMeasureSig(xml: string, bar: number, voice?: number): string {
  const { atoms } = parsePianoXmlAtoms(xml);
  const start = (bar - 1) * 4;
  const end = bar * 4;
  return atoms
    .filter((a) => !a.rest && a.midi !== null && a.onset >= start && a.onset < end)
    .filter((a) => voice === undefined || a.voice === voice)
    .map((a) => `${a.voice}:${a.onset - start}:${a.duration}:${a.midi}`)
    .sort()
    .join(',');
}

function rhRhythmSig(score: ScoreModel, bar: number): string {
  const measure = score.parts[0]?.measures[bar - 1];
  const rh = (measure?.events ?? []).filter(
    (e): e is NoteEvent => e.kind === 'note' && (e.voice ?? 1) === 1,
  );
  return rh.map((n) => `${n.startBeat}:${n.duration}`).join('|');
}

function lhRhythmSig(score: ScoreModel, bar: number): string {
  const measure = score.parts[0]?.measures[bar - 1];
  const lh = (measure?.events ?? []).filter(
    (e): e is NoteEvent => e.kind === 'note' && (e.voice ?? 1) === 3,
  );
  return lh.map((n) => `${n.startBeat}:${n.duration}`).join('|');
}

function rhSoundingAt(score: ScoreModel, bar: number, beat: number, voice = 1): NoteEvent[] {
  const measure = score.parts[0]?.measures[bar - 1];
  return (measure?.events ?? []).filter(
    (e): e is NoteEvent => e.kind === 'note'
      && (e.voice ?? 1) === voice
      && e.startBeat <= beat + 1e-6
      && e.startBeat + e.duration > beat + 1e-6,
  );
}

function strongBeatClashesSustained(score: ScoreModel, bar: number, symbol: string): number {
  const ch = parseGeneralPianoChord(symbol);
  if (!ch) return 99;
  let clashes = 0;
  for (const beat of [0, 2]) {
    for (const n of rhSoundingAt(score, bar, beat)) {
      if (!ch.tones.includes(mod12(n.pitch))) clashes += 1;
    }
  }
  return clashes;
}

function rhIntervals(notes: NoteEvent[]): number[] {
  const pitches = notes.map((n) => n.pitch);
  const out: number[] = [];
  for (let i = 1; i < pitches.length; i += 1) out.push(pitches[i]! - pitches[i - 1]!);
  return out;
}

export function runGeneralPianoPhase4c77241Tests(): { name: string; ok: boolean; detail?: string }[] {
  const rows: { name: string; ok: boolean; detail?: string }[] = [];
  if (!fs.existsSync(REF)) {
    rows.push({ name: 'motif-fix reference present', ok: false, detail: REF });
    return rows;
  }
  const refXml = fs.readFileSync(REF, 'utf8');
  const composed = apiComposePianoV1({
    pianoCompositionV1: true,
    generalPianoV1: true,
    seed: 77241,
    bars: 24,
    tempo: 72,
    tonalCentre: 'C',
    harmony: HARMONY_77241,
    metre: '4/4',
  });
  rows.push({
    name: 'seed 77241 composes',
    ok: composed.ok,
    detail: composed.ok ? '' : composed.error,
  });
  if (!composed.ok) return rows;

  fs.writeFileSync(EXPORT, composed.xml);

  for (let bar = 1; bar <= 8; bar += 1) {
    const expected = refMeasureSig(refXml, bar);
    const actual = measureEventSig(composed.score, bar);
    rows.push({
      name: `bar ${bar} matches motif-fix`,
      ok: expected === actual,
      detail: expected === actual ? '' : `ref ${expected} vs ${actual}`,
    });
  }
  for (let bar = 17; bar <= 24; bar += 1) {
    const voiceOnly = bar >= 23 ? 1 : undefined;
    const expected = refMeasureSig(refXml, bar, voiceOnly);
    const actual = measureEventSig(composed.score, bar, voiceOnly);
    rows.push({
      name: `bar ${bar} matches motif-fix`,
      ok: expected === actual,
      detail: expected === actual ? '' : `ref ${expected} vs ${actual}`,
    });
  }

  const bar17 = (composed.score.parts[0]?.measures[16]?.events ?? []).filter(
    (e): e is NoteEvent => e.kind === 'note' && (e.voice ?? 1) === 1,
  );
  rows.push({
    name: 'bar 17 RH intervals [+1,+2,0]',
    ok: JSON.stringify(rhIntervals(bar17)) === JSON.stringify([1, 2, 0]),
    detail: JSON.stringify(rhIntervals(bar17)),
  });

  const bRhythms = new Set<number>();
  for (let bar = 9; bar <= 16; bar += 1) bRhythms.add(rhRhythmSig(composed.score, bar));
  rows.push({
    name: 'B section has >1 distinct RH rhythm profile',
    ok: bRhythms.size > 1,
    detail: `unique=${bRhythms.size}`,
  });

  const bLhRhythms = new Set<string>();
  for (let bar = 9; bar <= 16; bar += 1) bLhRhythms.add(lhRhythmSig(composed.score, bar));
  rows.push({
    name: 'B section has >1 distinct LH rhythm profile',
    ok: bLhRhythms.size > 1,
    detail: `unique=${bLhRhythms.size}`,
  });

  let clashes = 0;
  for (let bar = 9; bar <= 16; bar += 1) {
    const symbol = bar === 13 ? 'C#maj7' : HARMONY_77241[bar - 1]!;
    clashes += strongBeatClashesSustained(composed.score, bar, symbol);
  }
  rows.push({
    name: 'B section strong-beat clashes (sustained)',
    ok: clashes === 0,
    detail: String(clashes),
  });

  const bar9 = (composed.score.parts[0]?.measures[8]?.events ?? []).filter(
    (e): e is NoteEvent => e.kind === 'note' && (e.voice ?? 1) === 1,
  );
  const bar16 = (composed.score.parts[0]?.measures[15]?.events ?? []).filter(
    (e): e is NoteEvent => e.kind === 'note' && (e.voice ?? 1) === 1,
  );
  rows.push({
    name: 'bars 9 and 16 share RH interval contour',
    ok: JSON.stringify(rhIntervals(bar9)) === JSON.stringify(rhIntervals(bar16)),
    detail: `${JSON.stringify(rhIntervals(bar9))} vs ${JSON.stringify(rhIntervals(bar16))}`,
  });

  rows.push({
    name: 'bar 13 chord spelled C#maj7',
    ok: composed.score.parts[0]?.measures[12]?.chord === 'C#maj7',
    detail: composed.score.parts[0]?.measures[12]?.chord ?? '',
  });

  const m13 = composed.xml.match(/<measure number="13"[\s\S]*?<\/measure>/)?.[0] ?? '';
  rows.push({
    name: 'bar 13 export harmony uses C# root',
    ok: /<root-step>C<\/root-step>\s*<root-alter>1<\/root-alter>/.test(m13),
    detail: m13.includes('root-step') ? 'harmony present' : 'missing harmony',
  });

  return rows;
}

if (process.argv[1]?.includes('generalPianoPhase4c77241.test')) {
  const rows = runGeneralPianoPhase4c77241Tests();
  for (const item of rows) {
    console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
  }
  const failed = rows.filter((item) => !item.ok);
  console.log(`${rows.length - failed.length}/${rows.length}`);
  process.exit(failed.length === 0 ? 0 : 1);
}
