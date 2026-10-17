/**
 * Composer OS V3.3 fixtures. Analysis and opt-in behaviour.
 * Run from the smoke suite.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ingestCanonicalScore, roleOf } from '../core/musical-evaluation/canonicalScore';
import { buildIndependenceReport } from '../core/musical-evaluation/independenceReport';
import { buildCoherenceReport } from '../core/musical-evaluation/coherenceReport';
import { evaluateScore } from '../core/musical-evaluation/service';
import { discoverMotifs } from '../core/motif-ops/motifDiscovery';
import { voiceRadicalChordMelody } from '../core/chord-melody/radicalChordMelody';
import type { CanonicalEvaluationScore } from '../core/musical-evaluation/canonicalScore';
import { buildThemeGenome } from '../core/motif/themeGenomeBuilder';
import {
  applyBudgetOperators,
  applyOperator,
  buildChain,
  C_MAJOR_FIELD,
  motifOpsEnabled,
  OPERATOR_IDS,
} from '../core/motif-ops';
import type { Motif } from '../core/motif-ops';
import type { MotifCell2 as Cell } from '../core/motif/themeGenome';

const CELL: Motif = {
  id: 'm1',
  field: C_MAJOR_FIELD,
  events: [
    { onset: 0, duration: 1, midi: 60 },
    { onset: 1, duration: 0.5, midi: 62 },
    { onset: 1.5, duration: 0.5, midi: 64 },
    { onset: 2, duration: 2, midi: 67 },
  ],
};

function midis(motif: Motif): Array<number | null> {
  return motif.events.map((event) => event.midi);
}

function durations(motif: Motif): number[] {
  return motif.events.map((event) => event.duration);
}

function row(name: string, fn: () => void): { name: string; ok: boolean; detail?: string } {
  try {
    fn();
    return { name, ok: true };
  } catch (error) {
    return { name, ok: false, detail: error instanceof Error ? error.message : String(error) };
  }
}

const sampleCell: Cell = {
  id: 'cell',
  role: 'primary',
  intervals: [2, 2, 3],
  durations: [1, 0.5, 0.5, 2],
  contour: ['up', 'up', 'up'],
  accents: [1, 0, 0, 0],
  registerBand: [60, 72],
  harmonicMask: { chordTonesBias: 1, tensionBias: 0 },
  transformBudget: {
    transpose: true,
    invert: true,
    retrograde: true,
    augment: false,
    diminish: false,
    fragment: false,
    sequence: true,
    embedInnerVoice: false,
  },
  recallWeight: 1,
};

export function runV33AdvancedCompositionTests(): Array<{ name: string; ok: boolean; detail?: string }> {
  const rows: Array<{ name: string; ok: boolean; detail?: string }> = [];
  const check = (name: string, fn: () => void) => rows.push(row(name, fn));

  check('X7 barryHarrisChordMelodyUi.ts is UTF-8', () => {
    const root = fs.existsSync(path.join(process.cwd(), 'apps')) ? process.cwd() : path.resolve(process.cwd(), '../..');
    const file = path.join(root, 'apps/composer-os-app/src/components/mosaic-import/barryHarrisChordMelodyUi.ts');
    const buf = fs.readFileSync(file);
    assert.equal(buf[0], 0x2f);
    assert.notEqual(buf[1], 0x00);
    const text = buf.toString('utf8');
    assert.equal(text.includes('\u0000'), false);
    assert.match(text, /formatChordMelodyRungBreakdown/);
    assert.equal(createHash('sha256').update(text, 'utf8').digest('hex').length, 64);
  });

  check('X5 instrument roles keep guitar and bass and add chamber roles', () => {
    assert.equal(roleOf('Electric Guitar'), 'guitar');
    assert.equal(roleOf('Bass Guitar'), 'bass');
    assert.equal(roleOf('Upright Bass'), 'bass');
    assert.equal(roleOf('Contrabass'), 'bass');
    assert.equal(roleOf('Violin I'), 'violin');
    assert.equal(roleOf('Viola'), 'viola');
    assert.equal(roleOf('Cello'), 'cello');
    assert.equal(roleOf('Piano'), 'piano');
    assert.equal(roleOf('Soprano Voice'), 'voice');
    assert.equal(roleOf('Alto Sax'), 'saxophone');
    assert.equal(roleOf('Bassoon'), 'bassoon');
    assert.equal(roleOf('Tenor Trombone'), 'trombone');
    assert.equal(roleOf('Drum Kit'), 'percussion');
    assert.equal(roleOf('Flute'), 'flute');
    assert.equal(roleOf('Oboe'), 'oboe');
    assert.equal(roleOf('Clarinet'), 'clarinet');
    assert.equal(roleOf('Horn in F'), 'horn');
    assert.equal(roleOf('Trumpet'), 'trumpet');
    assert.equal(roleOf('Tuba'), 'tuba');
    assert.equal(roleOf('Harp'), 'harp');
    assert.equal(roleOf('Synth Pad'), 'synth');
    assert.equal(roleOf('English Horn'), 'wind');
  });

  check('N1 exposes 19 operators', () => {
    assert.equal(OPERATOR_IDS.length, 19);
  });

  check('F1 retrograde', () => {
    const result = applyOperator(CELL, 'retrograde');
    assert.deepEqual(midis(result.motif), [67, 64, 62, 60]);
    assert.deepEqual(durations(result.motif), [2, 0.5, 0.5, 1]);
  });

  check('F2 chromatic invert on axis 60', () => {
    const result = applyOperator(CELL, 'invert', { axis: 60 });
    assert.deepEqual(midis(result.motif), [60, 58, 56, 53]);
  });

  check('F3 retrograde-inversion', () => {
    const result = applyOperator(CELL, 'retrograde-inversion', { axis: 60 });
    assert.deepEqual(midis(result.motif), [53, 56, 58, 60]);
  });

  check('F4 invert-in-field C major', () => {
    const result = applyOperator(CELL, 'invert-in-field');
    assert.deepEqual(midis(result.motif), [60, 59, 57, 53]);
  });

  check('F5 sequence-real +2', () => {
    const result = applyOperator(CELL, 'sequence-real', { steps: 2, count: 1 });
    assert.deepEqual(midis(result.motif), [62, 64, 66, 69]);
  });

  check('F6 sequence-tonal +1 degree', () => {
    const result = applyOperator(CELL, 'sequence-tonal', { steps: 1, count: 1 });
    assert.deepEqual(midis(result.motif), [62, 64, 65, 69]);
  });

  check('F7 expand-intervals in field +1 degree', () => {
    const result = applyOperator(CELL, 'expand-intervals', { amount: 1, mode: 'field' });
    assert.deepEqual(midis(result.motif), [60, 64, 67, 72]);
  });

  check('F8 expand-intervals chromatic +1', () => {
    const result = applyOperator(CELL, 'expand-intervals', { amount: 1, mode: 'chromatic' });
    assert.deepEqual(midis(result.motif), [60, 63, 66, 70]);
  });

  check('F9 augment ×2', () => {
    const result = applyOperator(CELL, 'augment', { factor: 2 });
    assert.deepEqual(midis(result.motif), [60, 62, 64, 67]);
    assert.deepEqual(durations(result.motif), [2, 1, 1, 4]);
  });

  check('F10 fragment-head 2', () => {
    const result = applyOperator(CELL, 'fragment-head', { count: 2 });
    assert.deepEqual(midis(result.motif), [60, 62]);
  });

  check('F11 development chain lineage', () => {
    const chain = buildChain(CELL, [
      { op: 'retrograde' },
      { op: 'fragment-head', params: { count: 2 } },
    ]);
    assert.deepEqual(chain.lineageIds, ['m1', 'm1.r', 'm1.r.fh']);
    assert.deepEqual(midis(chain.results[1]!), [67, 64]);
  });

  check('out-of-field pitches are kept and named', () => {
    const motif: Motif = {
      id: 'm1',
      field: C_MAJOR_FIELD,
      events: [{ onset: 0, duration: 1, midi: 61 }],
    };
    const result = applyOperator(motif, 'transpose-in-field', { degrees: 1 });
    assert.deepEqual(midis(result.motif), [61]);
    assert.ok(result.warnings.includes('pitch left field'));
  });

  check('motifOps flag defaults off and does not rewrite a cell', () => {
    assert.equal(motifOpsEnabled(undefined), false);
    assert.equal(motifOpsEnabled({ enabled: false }), false);
    assert.equal(motifOpsEnabled({ enabled: true }), true);
    const same = applyBudgetOperators(sampleCell, false);
    assert.equal(same, sampleCell);
    const changed = applyBudgetOperators(sampleCell, true);
    assert.notDeepEqual(changed.intervals, sampleCell.intervals);
  });

  check('F13 parallel fifths are evidence without a verdict', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0"><part-list>
  <score-part id="P1"><part-name>Violin I</part-name></score-part>
  <score-part id="P2"><part-name>Viola</part-name></score-part>
</part-list>
<part id="P1"><measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
  <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note>
  <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note>
</measure></part>
<part id="P2"><measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
  <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note>
  <note><pitch><step>A</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note>
</measure></part></score-partwise>`;
    const score = ingestCanonicalScore(xml).score;
    assert.ok(score);
    const report = buildIndependenceReport(score!);
    assert.equal(report.musicalQualityScore, null);
    assert.equal(report.musicallyApproved, false);
    const pair = report.pairs[0]!;
    assert.equal(pair.motion.parallel, 1);
    assert.equal(pair.parallelPerfectRuns.length, 1);
    assert.equal(pair.parallelPerfectRuns[0]!.interval, 'P5');
    assert.equal(pair.parallelPerfectRuns[0]!.length, 2);
    assert.equal(report.notes.some((note) => /\b(good|weak|better)\b/i.test(note)), false);
  });

  check('F12 triad pair grips stay under the melody', () => {
    const result = voiceRadicalChordMelody({
      melody: [
        { onset: 0, duration: 1, midi: 64 },
        { onset: 1, duration: 1, midi: 66 },
      ],
      harmony: [{ onset: 0, triads: ['C', 'D'] }],
      source: 'triad-pair',
      tuningId: 'standard',
      maxVoices: 3,
      voiceEvery: 'each-note',
    });
    assert.equal(result.receipt.musicalQualityScore, null);
    assert.equal(result.receipt.musicallyApproved, false);
    assert.deepEqual([...result.grips[0]!.midis].sort((a, b) => a - b), [55, 60, 64]);
    assert.deepEqual([...result.grips[1]!.midis].sort((a, b) => a - b), [57, 62, 66]);
    assert.equal(result.grips[0]!.span, 0);
    assert.equal(result.grips[1]!.span, 0);
    assert.equal(result.grips[0]!.stretch, false);
    assert.equal(result.unvoiced.length, 0);
    assert.match(result.musicXml, /<voice>1<\/voice>/);
    assert.match(result.musicXml, /<voice>2<\/voice>/);
    assert.equal(result.musicXml.includes('<octave>4</octave>'), true);
  });

  check('F14 an impossible melody note stays in the score and in unvoiced', () => {
    const result = voiceRadicalChordMelody({
      melody: [{ onset: 0, duration: 1, midi: 100 }],
      harmony: [{ onset: 0, triads: ['C', 'D'] }],
      source: 'triad-pair',
      tuningId: 'standard',
      maxVoices: 3,
      maxSpan: 4,
      voiceEvery: 'each-note',
    });
    assert.equal(result.unvoiced.length, 1);
    assert.match(result.unvoiced[0]!.reason, /span 5|fretboard|playable|pitch class|collection/);
    assert.match(result.musicXml, /<step>E<\/step>/);
    assert.equal(result.musicXml.includes('<voice>2</voice>'), false);
    assert.equal(result.grips.length, 0);
  });

  check('motif discovery on 4000 events stays inside two seconds and twenty patterns', () => {
    const events = Array.from({ length: 4000 }, (_, index) => ({
      id: `e${index}`,
      partId: 'P1',
      partName: 'Violin',
      instrument: 'Violin',
      role: 'violin' as const,
      voice: '1',
      bar: Math.floor(index / 4) + 1,
      printedBar: String(Math.floor(index / 4) + 1),
      onset: { n: index, d: 1 },
      onsetInBar: { n: index % 4, d: 1 },
      duration: { n: 1, d: 1 },
      rest: false,
      chord: false,
      written: null,
      soundingMidi: 60 + (index % 5),
      transposition: { chromatic: 0, octaveChange: 0 },
      tieStart: false,
      tieStop: false,
      tuplet: null,
      staff: null,
      sourceEventIds: [`e${index}`],
    }));
    const score = {
      version: 'canonical-evaluation-score-1',
      sha256: 'fixture',
      partwise: true,
      parts: [{ id: 'P1', name: 'Violin', role: 'violin', transposition: { chromatic: 0, octaveChange: 0 } }],
      measures: [],
      sourceEvents: events,
      soundingEvents: events,
      directions: [],
      harmony: [],
      repeats: [],
      unsupported: [],
    } as CanonicalEvaluationScore;
    const started = Date.now();
    const found = discoverMotifs(score);
    const elapsed = Date.now() - started;
    assert.ok(elapsed < 2000, `discovery took ${elapsed}ms`);
    assert.ok(found.patterns.length <= 20);
    assert.equal(found.limits.windowCap, 64);
    assert.equal(found.limits.truncated, true);
    assert.equal(found.musicalQualityScore, null);
    assert.equal(found.musicallyApproved, false);
  });

  check('coherence receipt keeps a null quality score', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes><note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note></measure></part></score-partwise>`;
    const receipt = evaluateScore({ score: { label: 'coherence', xml } });
    assert.equal(receipt.receiptVersion, 'musical-evaluation-receipt-2');
    assert.equal(receipt.coherence?.musicalQualityScore, null);
    assert.equal(receipt.coherence?.musicallyApproved, false);
    assert.equal('musicalQualityScore' in receipt, false);
    const report = buildCoherenceReport({ xml });
    assert.equal(report.musicalQualityScore, null);
  });

  check('F15 theme genome fingerprint stays on the 8a50369b hash when the flag is off', () => {
    const genome = buildThemeGenome('bacharach', 3340);
    const hash = createHash('sha256').update(JSON.stringify(genome)).digest('hex');
    assert.equal(hash, 'c85f0e77cdd3eacfc5ea2df2e8901e3c39023f1e540936035b3f1181f92de3aa');
  });

  return rows;
}
