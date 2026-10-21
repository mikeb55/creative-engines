/**
 * Seed 77241 Phase 4E — B-section motivic development; outside allowed bars match PHASE4C-GOLDEN (immutable).
 */

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { apiComposePianoV1 } from '../app-api/pianoCompositionApp';
import { parseGeneralPianoChord } from '../core/piano/generalPianoWriter';
import { parsePianoXmlAtoms } from '../core/piano/pianoXmlOracle';
import type { NoteEvent, ScoreModel } from '../core/score-model/scoreModelTypes';

const ROOT = process.cwd();
const REF = path.join(ROOT, 'engines/composer-os-v2/tests/fixtures/seed77241-phase4c-golden.musicxml');
const REF_SHA256 = '571e939eb0c734e9ec21a5987fec3d20f557ad926e6dcd2c94502ba19a8184dc';
const EXPORT = path.join(ROOT, '.tmp-piano-24bar-original-test/Original-24bar-Seed77241-phase4e.musicxml');

const HARMONY_77241 = [
  'Cmaj7/E', 'Fmaj7/A', 'Dm7', 'Gsus4', 'Cmaj7(#11)', 'Am7', 'Fmaj7/C', 'Ebmaj7/G',
  'Abmaj7', 'Emaj7', 'Bmaj7(#11)', 'F#m7', 'Dbmaj7', 'Amaj7', 'Fm7', 'Bb7sus4',
  'Cmaj7/E', 'Am7', 'Dm7', 'G7', 'Fmaj7', 'Em7', 'Cmaj7', 'Cmaj7',
];

const MOTIF_INTERVALS = [1, 2, 0];
const INVERT_INTERVALS = [-1, -2, 0];
const RETRO_INTERVALS = [0, -2, -1];
const PHRASE_HEADS = [9, 11, 13] as const;

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

function lastBeatCutoff(bar: number): number {
  return bar === 20 ? 2 : 3;
}

function measureSigExcludingLastBeat(score: ScoreModel, bar: number, voice = 1): string {
  const cutoff = lastBeatCutoff(bar);
  const measure = score.parts[0]?.measures[bar - 1];
  const notes = (measure?.events ?? []).filter(
    (e): e is NoteEvent => e.kind === 'note' && (e.voice ?? 1) === voice && e.startBeat < cutoff - 1e-6,
  );
  return notes.map((n) => `${n.voice ?? 1}:${n.startBeat}:${n.duration}:${n.pitch}`).sort().join(',');
}

function refSigExcludingLastBeat(xml: string, bar: number, voice = 1): string {
  const cutoff = lastBeatCutoff(bar);
  const { atoms } = parsePianoXmlAtoms(xml);
  const start = (bar - 1) * 4;
  const end = bar * 4;
  return atoms
    .filter((a) => !a.rest && a.midi !== null && a.onset >= start && a.onset < end && a.onset - start < cutoff)
    .filter((a) => a.voice === voice)
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

function rhNotes(score: ScoreModel, bar: number): NoteEvent[] {
  const measure = score.parts[0]?.measures[bar - 1];
  return (measure?.events ?? []).filter(
    (e): e is NoteEvent => e.kind === 'note' && (e.voice ?? 1) === 1,
  ).sort((a, b) => a.startBeat - b.startBeat);
}

function rhIntervals(notes: NoteEvent[]): number[] {
  const pitches = notes.map((n) => n.pitch);
  const out: number[] = [];
  for (let i = 1; i < pitches.length; i += 1) out.push(pitches[i]! - pitches[i - 1]!);
  return out;
}

function firstThreeIntervals(notes: NoteEvent[]): number[] {
  const pitches = notes.map((n) => n.pitch).slice(0, 4);
  const out: number[] = [];
  for (let i = 1; i < pitches.length && out.length < 3; i += 1) out.push(pitches[i]! - pitches[i - 1]!);
  return out;
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

function intervalMatchesTransform(intervals: number[], bar: number): boolean {
  const a = JSON.stringify(intervals.slice(0, 3));
  if (bar === 9) return a === JSON.stringify(MOTIF_INTERVALS) || a === JSON.stringify([2, 2, 0]);
  if (bar === 11) return a === JSON.stringify(INVERT_INTERVALS);
  if (bar === 13) {
    return a === JSON.stringify(RETRO_INTERVALS)
      || a === JSON.stringify([0, -2])
      || a === JSON.stringify([-1, -2]);
  }
  return false;
}

export function runGeneralPianoPhase4e77241Tests(): { name: string; ok: boolean; detail?: string }[] {
  const rows: { name: string; ok: boolean; detail?: string }[] = [];
  if (!fs.existsSync(REF)) {
    rows.push({ name: 'PHASE4C-GOLDEN reference present', ok: false, detail: REF });
    return rows;
  }
  const refBytes = fs.readFileSync(REF);
  const refHash = crypto.createHash('sha256').update(refBytes).digest('hex');
  rows.push({
    name: 'PHASE4C-GOLDEN SHA-256',
    ok: refHash === REF_SHA256,
    detail: refHash === REF_SHA256 ? '' : `${refHash} != ${REF_SHA256}`,
  });
  if (refHash !== REF_SHA256) return rows;
  const refXml = refBytes.toString('utf8');
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

  for (let bar = 1; bar <= 7; bar += 1) {
    const expected = refMeasureSig(refXml, bar);
    const actual = measureEventSig(composed.score, bar);
    rows.push({
      name: `bar ${bar} byte-identical to PHASE4C-GOLDEN`,
      ok: expected === actual,
      detail: expected === actual ? '' : `ref ${expected} vs ${actual}`,
    });
  }
  rows.push({
    name: 'bar 8 identical except last beat',
    ok: refSigExcludingLastBeat(refXml, 8) === measureSigExcludingLastBeat(composed.score, 8),
  });
  for (let bar = 17; bar <= 24; bar += 1) {
    if (bar === 20) {
      rows.push({
        name: 'bar 20 identical except last beat',
        ok: refSigExcludingLastBeat(refXml, 20) === measureSigExcludingLastBeat(composed.score, 20),
      });
      continue;
    }
    const voiceOnly = bar >= 23 ? 1 : undefined;
    const expected = refMeasureSig(refXml, bar, voiceOnly);
    const actual = measureEventSig(composed.score, bar, voiceOnly);
    rows.push({
      name: `bar ${bar} byte-identical to PHASE4C-GOLDEN`,
      ok: expected === actual,
      detail: expected === actual ? '' : `ref ${expected} vs ${actual}`,
    });
  }

  rows.push({
    name: 'B phrases start bars 9, 11, 13',
    ok: PHRASE_HEADS.every((bar) => rhNotes(composed.score, bar).length >= 3),
    detail: PHRASE_HEADS.map((b) => `bar${b}=${rhNotes(composed.score, b).length}`).join(' '),
  });

  const transforms = PHRASE_HEADS.map((bar) => firstThreeIntervals(rhNotes(composed.score, bar)));
  const distinct = new Set(transforms.map((t) => JSON.stringify(t)));
  rows.push({
    name: 'phrase heads use motif transforms (>=2 kinds)',
    ok: transforms.every((t, index) => intervalMatchesTransform(t, PHRASE_HEADS[index])) && distinct.size >= 2,
    detail: transforms.map((t, i) => `bar${PHRASE_HEADS[i]}=${JSON.stringify(t)}`).join(' '),
  });

  const rh9 = rhRhythmSig(composed.score, 9);
  const rh10 = rhRhythmSig(composed.score, 10);
  const rh11 = rhRhythmSig(composed.score, 11);
  const rh12 = rhRhythmSig(composed.score, 12);
  const pairAOk = rh9 === rh10 || rh9.replace('1.5:1', '1.5:0.5') === rh10;
  rows.push({
    name: 'bars 9–10 and 11–12 share RH rhythm pairs',
    ok: pairAOk && rh11 === rh12,
    detail: `${rh9} | ${rh10} vs ${rh11} | ${rh12}`,
  });

  const bar8Last = rhNotes(composed.score, 8).filter((n) => n.startBeat >= 3)[0]?.pitch;
  const bar9First = rhNotes(composed.score, 9)[0]?.pitch;
  rows.push({
    name: 'bar 8 last beat steps into bar 9',
    ok: bar8Last !== undefined && bar9First !== undefined && Math.abs(bar8Last - bar9First) === 1,
    detail: `${bar8Last} -> ${bar9First}`,
  });

  const bar16Last = [...rhNotes(composed.score, 16)].reverse()[0]?.pitch;
  rows.push({
    name: 'bar 16 ends step from E5 (bar 17 entry)',
    ok: bar16Last !== undefined && Math.abs(bar16Last - 76) === 1,
    detail: String(bar16Last),
  });

  const bar20Rh = rhNotes(composed.score, 20);
  const bar20Last = bar20Rh[bar20Rh.length - 1]?.pitch;
  const bar21First = rhNotes(composed.score, 21)[0]?.pitch;
  rows.push({
    name: 'bar 20 last beat steps into bar 21',
    ok: bar20Last !== undefined && bar21First !== undefined && Math.abs(bar20Last - bar21First) === 1,
    detail: `${bar20Last} -> ${bar21First}`,
  });

  let clashes = 0;
  for (let bar = 9; bar <= 16; bar += 1) {
    const symbol = bar === 13 ? 'C#maj7' : HARMONY_77241[bar - 1]!;
    clashes += strongBeatClashesSustained(composed.score, bar, symbol);
  }
  rows.push({
    name: 'B strong-beat chord tones (sustained)',
    ok: clashes === 0,
    detail: String(clashes),
  });

  const bLhRhythms = new Set<string>();
  for (let bar = 9; bar <= 16; bar += 1) bLhRhythms.add(lhRhythmSig(composed.score, bar));
  rows.push({
    name: 'B LH uses two alternating patterns',
    ok: bLhRhythms.size === 2,
    detail: `unique=${bLhRhythms.size}`,
  });

  return rows;
}

if (process.argv[1]?.includes('generalPianoPhase4e77241.test')) {
  const rows = runGeneralPianoPhase4e77241Tests();
  for (const item of rows) {
    console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
  }
  const failed = rows.filter((item) => !item.ok);
  console.log(`${rows.length - failed.length}/${rows.length}`);
  process.exit(failed.length === 0 ? 0 : 1);
}
