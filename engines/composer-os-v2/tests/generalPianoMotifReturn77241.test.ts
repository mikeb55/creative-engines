/**
 * Seed 77241 — bar 17 RH must restate bar 1 opening contour; bars 1–8 unchanged vs baseline XML.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { apiComposePianoV1 } from '../app-api/pianoCompositionApp';
import { parsePianoXmlAtoms } from '../core/piano/pianoXmlOracle';
import type { NoteEvent, ScoreModel } from '../core/score-model/scoreModelTypes';

const REF = path.join(
  process.cwd(),
  '.tmp-piano-24bar-original-test/Original-24bar-Seed77241.musicxml',
);

const HARMONY_77241 = [
  'Cmaj7/E', 'Fmaj7/A', 'Dm7', 'Gsus4', 'Cmaj7(#11)', 'Am7', 'Fmaj7/C', 'Ebmaj7/G',
  'Abmaj7', 'Emaj7', 'Bmaj7(#11)', 'F#m7', 'Dbmaj7', 'Amaj7', 'Fm7', 'Bb7sus4',
  'Cmaj7/E', 'Am7', 'Dm7', 'G7', 'Fmaj7', 'Em7', 'Cmaj7', 'Cmaj7',
];

function rhNotes(score: ScoreModel, bar: number): NoteEvent[] {
  const measure = score.parts[0]?.measures[bar - 1];
  return (measure?.events ?? []).filter(
    (event): event is NoteEvent => event.kind === 'note' && (event.voice ?? 1) === 1,
  );
}

function measureEventSig(score: ScoreModel, bar: number): string {
  const measure = score.parts[0]?.measures[bar - 1];
  const notes = (measure?.events ?? []).filter((e) => e.kind === 'note') as NoteEvent[];
  return notes
    .map((n) => `${n.voice ?? 1}:${n.startBeat}:${n.duration}:${n.pitch}`)
    .sort()
    .join(',');
}

function refMeasureSig(xml: string, bar: number): string {
  const { atoms } = parsePianoXmlAtoms(xml);
  const start = (bar - 1) * 4;
  const end = bar * 4;
  return atoms
    .filter((a) => !a.rest && a.midi !== null && a.onset >= start && a.onset < end)
    .map((a) => `${a.voice}:${a.onset - start}:${a.duration}:${a.midi}`)
    .sort()
    .join(',');
}

function rhIntervals(notes: NoteEvent[]): number[] {
  const pitches = notes.map((n) => n.pitch);
  const out: number[] = [];
  for (let i = 1; i < pitches.length; i += 1) out.push(pitches[i]! - pitches[i - 1]!);
  return out;
}

export function runGeneralPianoMotifReturn77241Tests(): { name: string; ok: boolean; detail?: string }[] {
  const rows: { name: string; ok: boolean; detail?: string }[] = [];
  if (!fs.existsSync(REF)) {
    rows.push({ name: 'reference XML present', ok: false, detail: REF });
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

  const bar17 = rhNotes(composed.score, 17);
  rows.push({
    name: 'bar 17 RH four crotchets',
    ok: bar17.length === 4 && bar17.every((n) => Math.abs(n.duration - 1) < 1e-6),
    detail: bar17.map((n) => `${n.startBeat}:${n.duration}:${n.pitch}`).join(' '),
  });
  rows.push({
    name: 'bar 17 RH intervals [+1,+2,0]',
    ok: JSON.stringify(rhIntervals(bar17)) === JSON.stringify([1, 2, 0]),
    detail: JSON.stringify(rhIntervals(bar17)),
  });

  for (let bar = 1; bar <= 8; bar += 1) {
    const expected = refMeasureSig(refXml, bar);
    const actual = measureEventSig(composed.score, bar);
    rows.push({
      name: `bars 1–8 bar ${bar} matches reference`,
      ok: expected === actual,
      detail: expected === actual ? '' : `ref ${expected} vs ${actual}`,
    });
  }

  return rows;
}

if (process.argv[1]?.includes('generalPianoMotifReturn77241.test')) {
  const rows = runGeneralPianoMotifReturn77241Tests();
  for (const item of rows) {
    console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
  }
  const failed = rows.filter((item) => !item.ok);
  console.log(`${rows.length - failed.length}/${rows.length}`);
  process.exit(failed.length === 0 ? 0 : 1);
}
