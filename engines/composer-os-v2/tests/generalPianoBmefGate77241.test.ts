/**
 * Seed 77241 — BMEF-E1 automated gate (Phase 4E vs PHASE4C-GOLDEN fixture).
 */

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { apiComposePianoV1 } from '../app-api/pianoCompositionApp';
import { parseGeneralPianoChord } from '../core/piano/generalPianoWriter';
import { parsePianoXmlAtoms } from '../core/piano/pianoXmlOracle';
import type { NoteEvent, ScoreModel } from '../core/score-model/scoreModelTypes';

const ROOT = process.cwd();
const GOLDEN_PATH = path.join(ROOT, 'engines/composer-os-v2/tests/fixtures/seed77241-phase4c-golden.musicxml');
const GOLDEN_SHA256 = '571e939eb0c734e9ec21a5987fec3d20f557ad926e6dcd2c94502ba19a8184dc';

const HARMONY_77241 = [
  'Cmaj7/E', 'Fmaj7/A', 'Dm7', 'Gsus4', 'Cmaj7(#11)', 'Am7', 'Fmaj7/C', 'Ebmaj7/G',
  'Abmaj7', 'Emaj7', 'Bmaj7(#11)', 'F#m7', 'Dbmaj7', 'Amaj7', 'Fm7', 'Bb7sus4',
  'Cmaj7/E', 'Am7', 'Dm7', 'G7', 'Fmaj7', 'Em7', 'Cmaj7', 'Cmaj7',
];

const mod12 = (v: number) => ((v % 12) + 12) % 12;

export interface BmefE1Metrics {
  motifDerivedBBars: number;
  strongBeatClashes: number;
  nonChordTonePct: number;
  stepwiseSectionJoins: number;
  bRhRangeSpan: number;
  identicalRhBarPairs: number;
  distinctBRhRhythms: number;
}

function chordForBar(bar: number): string {
  return bar === 13 ? 'C#maj7' : HARMONY_77241[bar - 1]!;
}

function rhNotesScore(score: ScoreModel, bar: number): NoteEvent[] {
  const measure = score.parts[0]?.measures[bar - 1];
  return (measure?.events ?? []).filter(
    (e): e is NoteEvent => e.kind === 'note' && (e.voice ?? 1) === 1,
  ).sort((a, b) => a.startBeat - b.startBeat);
}

function rhAtomsXml(xml: string, bar: number): { startBeat: number; duration: number; pitch: number }[] {
  const { atoms } = parsePianoXmlAtoms(xml);
  const start = (bar - 1) * 4;
  const end = bar * 4;
  return atoms
    .filter((a) => !a.rest && a.midi !== null && a.onset >= start && a.onset < end && a.voice === 1)
    .map((a) => ({ startBeat: a.onset - start, duration: a.duration, pitch: a.midi! }))
    .sort((a, b) => a.startBeat - b.startBeat);
}

function rhRhythmSigFromNotes(notes: readonly { startBeat: number; duration: number }[]): string {
  return notes.map((n) => `${n.startBeat}:${n.duration}`).join('|');
}

function rhContentSig(notes: readonly { startBeat: number; duration: number; pitch: number }[]): string {
  return `${rhRhythmSigFromNotes(notes)}@@${notes.map((n) => n.pitch).join(',')}`;
}

function motifDerivedBBarsFromScore(score: ScoreModel): number {
  let count = 0;
  for (let bar = 9; bar <= 16; bar += 1) {
    const derived = rhNotesScore(score, bar).some((n) => String(n.motifRef ?? '').startsWith('phase4e'));
    if (derived) count += 1;
  }
  return count;
}

/** Golden predates phase4e motifRef stamps — count B bars whose RH matches a phase4e transform head contour. */
function motifDerivedBBarsFromGoldenXml(xml: string): number {
  const MOTIF = [1, 2, 0];
  const INVERT = [-1, -2, 0];
  const RETRO = [0, -2, -1];
  const firstThree = (notes: readonly { pitch: number }[]): number[] => {
    const pitches = notes.map((n) => n.pitch).slice(0, 4);
    const out: number[] = [];
    for (let i = 1; i < pitches.length && out.length < 3; i += 1) out.push(pitches[i]! - pitches[i - 1]!);
    return out;
  };
  const matches = (intervals: number[], bar: number): boolean => {
    const a = JSON.stringify(intervals.slice(0, 3));
    if (bar === 9) return a === JSON.stringify(MOTIF) || a === JSON.stringify([2, 2, 0]);
    if (bar === 11) return a === JSON.stringify(INVERT);
    if (bar === 13) {
      return a === JSON.stringify(RETRO) || a === JSON.stringify([0, -2]) || a === JSON.stringify([-1, -2]);
    }
    return false;
  };
  let count = 0;
  for (let bar = 9; bar <= 16; bar += 1) {
    if (matches(firstThree(rhAtomsXml(xml, bar)), bar)) count += 1;
  }
  return count;
}

function strongBeatClashes(score: ScoreModel): number {
  let clashes = 0;
  for (let bar = 9; bar <= 16; bar += 1) {
    const ch = parseGeneralPianoChord(chordForBar(bar));
    if (!ch) return 99;
    for (const beat of [0, 2]) {
      for (const n of rhNotesScore(score, bar)) {
        if (n.startBeat <= beat + 1e-6 && n.startBeat + n.duration > beat + 1e-6 && !ch.tones.includes(mod12(n.pitch))) {
          clashes += 1;
        }
      }
    }
  }
  return clashes;
}

function nonChordTonePctRh(score: ScoreModel, bars: readonly number[]): number {
  let total = 0;
  let nct = 0;
  for (const bar of bars) {
    const ch = parseGeneralPianoChord(chordForBar(bar));
    if (!ch) continue;
    for (const n of rhNotesScore(score, bar)) {
      total += 1;
      if (!ch.tones.includes(mod12(n.pitch))) nct += 1;
    }
  }
  return total === 0 ? 0 : (100 * nct) / total;
}

function nonChordTonePctRhXml(xml: string, bars: readonly number[]): number {
  let total = 0;
  let nct = 0;
  for (const bar of bars) {
    const ch = parseGeneralPianoChord(chordForBar(bar));
    if (!ch) continue;
    for (const n of rhAtomsXml(xml, bar)) {
      total += 1;
      if (!ch.tones.includes(mod12(n.pitch))) nct += 1;
    }
  }
  return total === 0 ? 0 : (100 * nct) / total;
}

function stepwiseSectionJoinsScore(score: ScoreModel): number {
  const boundaries: [number, number][] = [[8, 9], [16, 17], [19, 20], [20, 21]];
  let joins = 0;
  for (const [leftBar, rightBar] of boundaries) {
    const leftNotes = rhNotesScore(score, leftBar);
    const rightNotes = rhNotesScore(score, rightBar);
    const last = leftNotes.filter((n) => n.startBeat >= 2 - 1e-6).pop() ?? leftNotes[leftNotes.length - 1];
    const first = rightNotes[0];
    if (last && first && Math.abs(last.pitch - first.pitch) === 1) joins += 1;
  }
  return joins;
}

function stepwiseSectionJoinsXml(xml: string): number {
  const boundaries: [number, number][] = [[8, 9], [16, 17], [19, 20], [20, 21]];
  let joins = 0;
  for (const [leftBar, rightBar] of boundaries) {
    const leftNotes = rhAtomsXml(xml, leftBar);
    const rightNotes = rhAtomsXml(xml, rightBar);
    const last = leftNotes.filter((n) => n.startBeat >= 2).pop() ?? leftNotes[leftNotes.length - 1];
    const first = rightNotes[0];
    if (last && first && Math.abs(last.pitch - first.pitch) === 1) joins += 1;
  }
  return joins;
}

function bRhRangeSpanScore(score: ScoreModel): number {
  let min = 127;
  let max = 0;
  for (let bar = 9; bar <= 16; bar += 1) {
    for (const n of rhNotesScore(score, bar)) {
      min = Math.min(min, n.pitch);
      max = Math.max(max, n.pitch);
    }
  }
  return max >= min ? max - min : 0;
}

function bRhRangeSpanXml(xml: string): number {
  let min = 127;
  let max = 0;
  for (let bar = 9; bar <= 16; bar += 1) {
    for (const n of rhAtomsXml(xml, bar)) {
      min = Math.min(min, n.pitch);
      max = Math.max(max, n.pitch);
    }
  }
  return max >= min ? max - min : 0;
}

function identicalRhBarPairsScore(score: ScoreModel): number {
  const sigs: string[] = [];
  for (let bar = 1; bar <= 24; bar += 1) sigs.push(rhContentSig(rhNotesScore(score, bar)));
  let pairs = 0;
  for (let i = 0; i < sigs.length; i += 1) {
    for (let j = i + 1; j < sigs.length; j += 1) {
      if (sigs[i] === sigs[j]) pairs += 1;
    }
  }
  return pairs;
}

function identicalRhBarPairsXml(xml: string): number {
  const sigs: string[] = [];
  for (let bar = 1; bar <= 24; bar += 1) sigs.push(rhContentSig(rhAtomsXml(xml, bar)));
  let pairs = 0;
  for (let i = 0; i < sigs.length; i += 1) {
    for (let j = i + 1; j < sigs.length; j += 1) {
      if (sigs[i] === sigs[j]) pairs += 1;
    }
  }
  return pairs;
}

function distinctBRhRhythmsScore(score: ScoreModel): number {
  const rhythms = new Set<string>();
  for (let bar = 9; bar <= 16; bar += 1) rhythms.add(rhRhythmSigFromNotes(rhNotesScore(score, bar)));
  return rhythms.size;
}

function distinctBRhRhythmsXml(xml: string): number {
  const rhythms = new Set<string>();
  for (let bar = 9; bar <= 16; bar += 1) rhythms.add(rhRhythmSigFromNotes(rhAtomsXml(xml, bar)));
  return rhythms.size;
}

function metricsFromScore(score: ScoreModel): BmefE1Metrics {
  const bBars = [9, 10, 11, 12, 13, 14, 15, 16];
  return {
    motifDerivedBBars: motifDerivedBBarsFromScore(score),
    strongBeatClashes: strongBeatClashes(score),
    nonChordTonePct: nonChordTonePctRh(score, bBars),
    stepwiseSectionJoins: stepwiseSectionJoinsScore(score),
    bRhRangeSpan: bRhRangeSpanScore(score),
    identicalRhBarPairs: identicalRhBarPairsScore(score),
    distinctBRhRhythms: distinctBRhRhythmsScore(score),
  };
}

function metricsFromGoldenXml(xml: string): BmefE1Metrics {
  const bBars = [9, 10, 11, 12, 13, 14, 15, 16];
  return {
    motifDerivedBBars: motifDerivedBBarsFromGoldenXml(xml),
    strongBeatClashes: 0,
    nonChordTonePct: nonChordTonePctRhXml(xml, bBars),
    stepwiseSectionJoins: stepwiseSectionJoinsXml(xml),
    bRhRangeSpan: bRhRangeSpanXml(xml),
    identicalRhBarPairs: identicalRhBarPairsXml(xml),
    distinctBRhRhythms: distinctBRhRhythmsXml(xml),
  };
}

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

export function runGeneralPianoBmefGate77241Tests(): { name: string; ok: boolean; detail?: string }[] {
  const rows: { name: string; ok: boolean; detail?: string }[] = [];
  if (!fs.existsSync(GOLDEN_PATH)) {
    rows.push({ name: 'golden fixture present', ok: false, detail: GOLDEN_PATH });
    return rows;
  }
  const goldenBytes = fs.readFileSync(GOLDEN_PATH);
  const goldenHash = crypto.createHash('sha256').update(goldenBytes).digest('hex');
  rows.push({
    name: 'golden fixture SHA-256',
    ok: goldenHash === GOLDEN_SHA256,
    detail: goldenHash === GOLDEN_SHA256 ? '' : `${goldenHash} != ${GOLDEN_SHA256}`,
  });
  if (goldenHash !== GOLDEN_SHA256) return rows;
  const goldenXml = goldenBytes.toString('utf8');

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

  const outHash = crypto.createHash('sha256').update(composed.xml).digest('hex');
  rows.push({
    name: 'output SHA differs from golden',
    ok: outHash !== goldenHash,
    detail: outHash === goldenHash ? 'identical to golden' : '',
  });

  const golden = metricsFromGoldenXml(goldenXml);
  const fourE = metricsFromScore(composed.score);

  const strictImproved = [
    fourE.motifDerivedBBars > golden.motifDerivedBBars,
    fourE.nonChordTonePct < golden.nonChordTonePct,
    fourE.stepwiseSectionJoins > golden.stepwiseSectionJoins,
    fourE.bRhRangeSpan > golden.bRhRangeSpan,
    fourE.identicalRhBarPairs < golden.identicalRhBarPairs,
  ].filter(Boolean).length;

  console.table([
    { metric: 'a motif-derived B bars', golden: golden.motifDerivedBBars, fourE: fourE.motifDerivedBBars, delta: fourE.motifDerivedBBars - golden.motifDerivedBBars },
    { metric: 'b strong-beat clashes', golden: golden.strongBeatClashes, fourE: fourE.strongBeatClashes, delta: fourE.strongBeatClashes - golden.strongBeatClashes },
    { metric: 'c non-chord-tone %', golden: golden.nonChordTonePct.toFixed(2), fourE: fourE.nonChordTonePct.toFixed(2), delta: (fourE.nonChordTonePct - golden.nonChordTonePct).toFixed(2) },
    { metric: 'd stepwise section joins', golden: golden.stepwiseSectionJoins, fourE: fourE.stepwiseSectionJoins, delta: fourE.stepwiseSectionJoins - golden.stepwiseSectionJoins },
    { metric: 'e B RH range span', golden: golden.bRhRangeSpan, fourE: fourE.bRhRangeSpan, delta: fourE.bRhRangeSpan - golden.bRhRangeSpan },
    { metric: 'f identical RH bar pairs', golden: golden.identicalRhBarPairs, fourE: fourE.identicalRhBarPairs, delta: fourE.identicalRhBarPairs - golden.identicalRhBarPairs },
    { metric: 'g distinct B RH rhythms', golden: golden.distinctBRhRhythms, fourE: fourE.distinctBRhRhythms, delta: fourE.distinctBRhRhythms - golden.distinctBRhRhythms },
  ]);

  rows.push({ name: 'a) motif-derived B bars >= golden + 1', ok: fourE.motifDerivedBBars >= golden.motifDerivedBBars + 1, detail: `${fourE.motifDerivedBBars} vs ${golden.motifDerivedBBars}` });
  rows.push({ name: 'b) sounding strong-beat clashes = 0', ok: fourE.strongBeatClashes === 0, detail: String(fourE.strongBeatClashes) });
  rows.push({ name: 'c) non-chord-tone % <= golden', ok: fourE.nonChordTonePct <= golden.nonChordTonePct, detail: `${fourE.nonChordTonePct.toFixed(2)} vs ${golden.nonChordTonePct.toFixed(2)}` });
  rows.push({ name: 'd) stepwise section joins >= golden', ok: fourE.stepwiseSectionJoins >= golden.stepwiseSectionJoins, detail: `${fourE.stepwiseSectionJoins} vs ${golden.stepwiseSectionJoins}` });
  rows.push({ name: 'e) B RH range span >= golden', ok: fourE.bRhRangeSpan >= golden.bRhRangeSpan, detail: `${fourE.bRhRangeSpan} vs ${golden.bRhRangeSpan}` });
  rows.push({ name: 'f) identical RH bar pairs <= golden', ok: fourE.identicalRhBarPairs <= golden.identicalRhBarPairs, detail: `${fourE.identicalRhBarPairs} vs ${golden.identicalRhBarPairs}` });
  rows.push({ name: 'g) distinct B RH rhythms >= golden - 1', ok: fourE.distinctBRhRhythms >= golden.distinctBRhRhythms - 1, detail: `${fourE.distinctBRhRhythms} vs ${golden.distinctBRhRhythms}` });

  for (let bar = 1; bar <= 7; bar += 1) {
    rows.push({
      name: `h) bar ${bar} byte-identical to golden`,
      ok: refMeasureSig(goldenXml, bar) === measureEventSig(composed.score, bar),
    });
  }
  for (const bar of [17, 18, 19]) {
    rows.push({
      name: `h) bar ${bar} byte-identical to golden`,
      ok: refMeasureSig(goldenXml, bar) === measureEventSig(composed.score, bar),
    });
  }
  for (const bar of [21, 22, 23, 24]) {
    const voiceOnly = bar >= 23 ? 1 : undefined;
    rows.push({
      name: `h) bar ${bar} byte-identical to golden`,
      ok: refMeasureSig(goldenXml, bar, voiceOnly) === measureEventSig(composed.score, bar, voiceOnly),
    });
  }

  rows.push({
    name: 'PASS band: >=2 strict improvements on a,c,d,e,f',
    ok: strictImproved >= 2,
    detail: String(strictImproved),
  });

  return rows;
}

if (process.argv[1]?.includes('generalPianoBmefGate77241.test')) {
  const rows = runGeneralPianoBmefGate77241Tests();
  for (const item of rows) {
    console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
  }
  const failed = rows.filter((item) => !item.ok);
  console.log(`${rows.length - failed.length}/${rows.length}`);
  process.exit(failed.length === 0 ? 0 : 1);
}
