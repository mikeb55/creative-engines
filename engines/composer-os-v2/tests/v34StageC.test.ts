/**
 * Composer OS V3.4 Stage C — chamber orchestration.
 * Fixtures T9–T13 plus generated duo arrangements.
 */

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { apiOrchestrate } from '../app-api/orchestrateApp';
import { buildBigBandScoreModel } from '../core/big-band/bigBandScoreBuilder';
import type { BigBandFormPlan, BigBandSectionPlan } from '../core/big-band/bigBandPlanTypes';
import type { BigBandInstrumentSection } from '../core/big-band/bigBandSectionTypes';
import type { BigBandRoleType } from '../core/big-band/bigBandTypes';
import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import { resolveCatalogueInstrument } from '../core/orchestrate/ensembleTemplates';
import { orchestrate, soundingLine } from '../core/orchestrate/orchestrate';
import type { OrchestrateRequest, SectionColourPlan } from '../core/orchestrate/types';
import { getEnsembleFamilyProfile, listEnsembleFamilies } from '../core/orchestration/ensembleFamilyProfiles';
import { buildOrchestrationReport } from '../core/musical-evaluation/orchestrationReport';
import type { PartModel, ScoreEvent, ScoreModel } from '../core/score-model/scoreModelTypes';

const OUT = path.resolve(__dirname, '../../../docs/v3.4-stage-c');
const BASELINE = {
  string_quartet: '2d7f15b4cd1f8b6438674c8b811ecbefb5f41135dba98be467e2592e2505289a',
  big_band: '2d7f15b4cd1f8b6438674c8b811ecbefb5f41135dba98be467e2592e2505289a',
  ecm: 'ff2a8d7dfd5466df366d2fdbc044e47e1338c8f10569169ac99d5d88aeca24a2',
} as const;

function sha(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function topLine(events: Array<{ midi: number; onset: number; duration: number }>): Array<{ midi: number; onset: number; duration: number }> {
  const sorted = [...events].sort((a, b) => a.onset - b.onset || b.midi - a.midi);
  const kept: typeof sorted = [];
  for (const note of sorted) {
    const overlaps = kept.some((item) => note.onset < item.onset + item.duration - 0.001 && item.onset < note.onset + note.duration - 0.001);
    if (!overlaps) kept.push(note);
  }
  return kept.sort((a, b) => a.onset - b.onset);
}

function phrasePitches(events: Array<{ midi: number; onset: number; duration: number }>): number[][] {
  const phrases: Array<Array<{ midi: number; onset: number; duration: number }>> = [];
  for (const note of topLine(events)) {
    const current = phrases[phrases.length - 1];
    const previous = current?.[current.length - 1];
    if (!current || !previous || note.onset >= previous.onset + previous.duration + 4) phrases.push([note]);
    else current.push(note);
  }
  return phrases.map((phrase) => phrase.map((note) => note.midi));
}

function intervals(pitches: readonly number[]): number[] {
  const out: number[] = [];
  for (let index = 1; index < pitches.length; index += 1) out.push(pitches[index]! - pitches[index - 1]!);
  return out;
}

function pack(events: Array<{ midi: number | null; duration: number }>): ScoreEvent[][] {
  const measures: ScoreEvent[][] = [[]];
  let cursor = 0;
  const push = (event: ScoreEvent) => {
    measures[measures.length - 1]!.push(event);
  };
  for (const event of events) {
    let left = event.duration;
    while (left > 0.001) {
      const room = 4 - cursor;
      const take = Math.min(left, room);
      if (event.midi === null) push({ kind: 'rest', startBeat: cursor, duration: take, voice: 1 });
      else push({ kind: 'note', pitch: event.midi, startBeat: cursor, duration: take, voice: 1 });
      cursor += take;
      left -= take;
      if (cursor >= 3.999) {
        measures.push([]);
        cursor = 0;
      }
    }
  }
  if (measures[measures.length - 1]?.length === 0) measures.pop();
  const last = measures[measures.length - 1];
  if (last) {
    const used = last.reduce((sum, event) => sum + event.duration, 0);
    if (used < 3.999) last.push({ kind: 'rest', startBeat: used, duration: 4 - used, voice: 1 });
  }
  return measures;
}

function sourceXml(parts: Array<{ id: string; name: string; events: Array<{ midi: number | null; duration: number }> }>): string {
  const score: ScoreModel = {
    title: 'Stage C source',
    tempo: 96,
    timeSignature: { beats: 4, beatType: 4 },
    parts: parts.map((part): PartModel => ({
      id: part.id,
      name: part.name,
      instrumentIdentity: part.id === 'bass' ? 'acoustic_upright_bass' : part.id === 'gtr' ? 'clean_electric_guitar' : 'violin',
      midiProgram: 0,
      clef: part.name === 'Bass' ? 'bass' : 'treble',
      measures: pack(part.events).map((events, index) => ({ index: index + 1, events })),
    })),
  };
  const exported = exportScoreModelToMusicXml(score);
  if (!exported.success || !exported.xml) throw new Error(exported.errors.join('; '));
  return exported.xml;
}

function colour(overrides: Partial<SectionColourPlan> & Pick<SectionColourPlan, 'melodyCarriers' | 'endBar'>): SectionColourPlan {
  return {
    section: 'A',
    startBar: 1,
    density: 'medium',
    registerCentre: 67,
    doubling: 'none',
    maxDoublingBars: 4,
    harmonySource: 'source',
    segmentalDevice: 'none',
    ...overrides,
  };
}

function request(xml: string, template: OrchestrateRequest['template'], plan: SectionColourPlan[], seed = 11): OrchestrateRequest {
  return { enabled: true, sourceMusicXml: xml, template, plan, seed, preserveMelody: true };
}

function save(name: string, xml: string): string {
  mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, name);
  writeFileSync(file, xml, 'utf8');
  return file;
}

function bigBandPlans(totalBars: number): { formPlan: BigBandFormPlan; sectionPlan: BigBandSectionPlan } {
  const roles: Record<BigBandInstrumentSection, BigBandRoleType> = {
    saxes: 'lead_melody',
    trumpets: 'lead_melody',
    trombones: 'backgrounds',
    rhythm_section: 'rhythm_anchor',
  };
  return {
    formPlan: { totalBars, slices: [{ index: 0, phase: 'melody_head', startBar: 1, endBar: totalBars }] },
    sectionPlan: { slices: [{ formSliceIndex: 0, phase: 'melody_head', rolesBySection: roles }] },
  };
}

export function runV34StageCTests(): Array<{ name: string; ok: boolean; detail?: string }> {
  const rows: Array<{ name: string; ok: boolean; detail?: string }> = [];
  const check = (name: string, fn: () => void) => {
    try {
      fn();
      rows.push({ name, ok: true });
    } catch (error) {
      rows.push({ name, ok: false, detail: error instanceof Error ? error.message : String(error) });
    }
  };

  const melody = [
    { midi: 72, duration: 1 },
    { midi: 74, duration: 1 },
    { midi: 76, duration: 1 },
    { midi: 79, duration: 1 },
  ];

  check('ensemble templates resolve catalogue parts and report piano', () => {
    assert.equal(getEnsembleFamilyProfile('pierrot').family, 'pierrot');
    assert.equal(getEnsembleFamilyProfile('wind_quintet').compatiblePresetIds.length, 0);
    assert.ok(listEnsembleFamilies().includes('chamber_orchestra'));
    const missing = resolveCatalogueInstrument('english_horn');
    assert.equal(missing.spec, null);
    assert.match(missing.omission ?? '', /no V3.4 catalogue entry/);
    assert.doesNotMatch(missing.omission ?? '', /\d+\s*[–-]\s*\d+/);
    const piano = resolveCatalogueInstrument('piano');
    assert.equal(piano.spec, null);
    assert.match(piano.omission ?? '', /No range was invented/);
  });

  check('T9 melody octave shift onto double bass', () => {
    const xml = sourceXml([{ id: 'lead', name: 'Melody', events: melody }]);
    const result = orchestrate(request(xml, 'chamber_orchestra', [colour({ melodyCarriers: ['db'], endBar: 1, density: 'sparse' })]));
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const line = soundingLine(result.musicXml, 'db');
    assert.deepEqual(line.map((note) => note.midi), [60, 62, 64, 67]);
    assert.deepEqual(intervals(line.map((note) => note.midi)), [2, 2, 3]);
    assert.ok(result.receipt.layerAssignments.filter((row) => row.partId === 'db').every((row) => row.octaveShift === -12));
    assert.match(result.musicXml, /<part-name>Double Bass<\/part-name>/);
    assert.match(result.musicXml, /<octave-change>-1<\/octave-change>/);
    assert.equal(result.receipt.musicalQualityScore, null);
    assert.equal(result.receipt.musicallyApproved, false);
    save('t9-double-bass.musicxml', result.musicXml);
  });

  check('T10 melody stays on flute and cello', () => {
    const xml = sourceXml([{ id: 'lead', name: 'Melody', events: melody }]);
    const flute = orchestrate(request(xml, 'wind_quintet', [colour({ melodyCarriers: ['fl'], endBar: 1, density: 'sparse' })]));
    const cello = orchestrate(request(xml, 'string_quartet', [colour({ melodyCarriers: ['vc'], endBar: 1, density: 'sparse' })]));
    assert.equal(flute.ok && cello.ok, true);
    if (!flute.ok || !cello.ok) return;
    assert.deepEqual(soundingLine(flute.musicXml, 'fl').map((note) => note.midi), [72, 74, 76, 79]);
    assert.deepEqual(soundingLine(cello.musicXml, 'vc').map((note) => note.midi), [72, 74, 76, 79]);
    assert.ok(flute.receipt.layerAssignments.every((row) => row.role !== 'melody' || row.octaveShift === 0));
    assert.ok(cello.receipt.layerAssignments.every((row) => row.role !== 'melody' || row.octaveShift === 0));
    assert.equal(flute.receipt.flagged.filter((flag) => flag.partId === 'fl' && flag.kind === 'outside_hard_range').length, 0);
    assert.equal(cello.receipt.flagged.filter((flag) => flag.partId === 'vc' && flag.kind === 'outside_hard_range').length, 0);
    save('t10-flute.musicxml', flute.musicXml);
    save('t10-cello.musicxml', cello.musicXml);
  });

  check('T11 doubling cap', () => {
    const events = Array.from({ length: 8 }, () => ({ midi: 72, duration: 4 }));
    const xml = sourceXml([{ id: 'lead', name: 'Melody', events }]);
    const result = orchestrate(request(xml, 'string_quartet', [colour({
      melodyCarriers: ['vn1'],
      endBar: 8,
      doubling: 'octave',
      maxDoublingBars: 4,
      density: 'sparse',
    })]));
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.receipt.doublingRuns, [{ parts: ['vn2', 'vn1'], interval: 'octave', startBar: 1, bars: 4 }]);
    const second = soundingLine(result.musicXml, 'vn2');
    assert.equal(second.length, 4);
    assert.ok(second.every((note) => note.midi === 60));
    const report = buildOrchestrationReport({ xml: result.musicXml });
    const run = report.doublingRuns.find((row) => row.parts.includes('vn1') && row.parts.includes('vn2') && row.interval === 'octave');
    assert.equal(run?.bars, 4);
    assert.equal(report.musicalQualityScore, null);
    save('t11-doubling.musicxml', result.musicXml);
  });

  check('T12 derived counterline', () => {
    const xml = sourceXml([{
      id: 'lead',
      name: 'Melody',
      events: [
        { midi: 60, duration: 1 },
        { midi: 62, duration: 0.5 },
        { midi: 64, duration: 0.5 },
        { midi: 67, duration: 2 },
      ],
    }]);
    const result = orchestrate(request(xml, 'string_quartet', [colour({
      melodyCarriers: ['vn1'],
      endBar: 4,
      density: 'sparse',
      roles: { va: 'countermelody' },
      counterlineFrom: { motifId: 'm1', chain: ['invert', 'augment:2'], offsetBeats: 1 },
    })]));
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const derived = result.receipt.derivedLines[0];
    assert.ok(derived);
    assert.equal(derived?.lineageId, 'm1.i.aug2');
    assert.deepEqual(derived?.ops, ['invert', 'augment']);
    assert.deepEqual(derived?.events.map((event) => event.sounding), [60, 58, 56, 53]);
    assert.deepEqual(derived?.events.map((event) => event.duration), [2, 1, 1, 4]);
    assert.equal(derived?.events[0]?.onset, 1);
    const viola = soundingLine(result.musicXml, 'va');
    assert.deepEqual(viola.map((note) => note.midi), [60, 58, 56, 53]);
    assert.equal(viola[3]?.duration, 4);
    assert.match(result.musicXml, /<clef><sign>C<\/sign><line>3<\/line><\/clef>/);
    assert.equal(result.receipt.omittedLines.length, 0);
    assert.ok(result.receipt.voiceLeadingScores.length > 0);
    assert.ok(result.receipt.independence.some((row) => row.pair.includes('va')));
    save('t12-counterline.musicxml', result.musicXml);
  });

  check('T13 duo to string quartet preserves melody and bass', () => {
    const xml = sourceXml([
      { id: 'gtr', name: 'Guitar', events: melody },
      { id: 'bass', name: 'Bass', events: [{ midi: 48, duration: 2 }, { midi: 43, duration: 2 }] },
    ]);
    const result = orchestrate(request(xml, 'string_quartet', [colour({ melodyCarriers: ['vn1'], endBar: 1, harmonySource: 'source' })]));
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(soundingLine(result.musicXml, 'vn1').map((note) => note.midi), [72, 74, 76, 79]);
    assert.deepEqual(soundingLine(result.musicXml, 'vc').map((note) => note.midi), [48, 43]);
    assert.equal(result.receipt.flagged.length, 0);
    assert.ok(soundingLine(result.musicXml, 'vn2').length > 0);
    assert.ok(soundingLine(result.musicXml, 'va').length > 0);
    const report = buildOrchestrationReport({ xml: result.musicXml });
    assert.equal(report.rangeUse.length, 4);
    assert.equal(report.musicalQualityScore, null);
    assert.equal(report.musicallyApproved, false);
    save('t13-string-quartet.musicxml', result.musicXml);
  });

  check('harmonic engines influence inner notes', () => {
    const xml = sourceXml([{ id: 'lead', name: 'Melody', events: melody }]);
    const bhl = orchestrate(request(xml, 'string_quartet', [colour({ melodyCarriers: ['vn1'], endBar: 1, harmonySource: 'bhl_world', harmonyParam: 'A' })]));
    const pentatonic = orchestrate(request(xml, 'string_quartet', [colour({ melodyCarriers: ['vn1'], endBar: 1, harmonySource: 'pentatonic', harmonyParam: 'major_pentatonic' })]));
    const hexatonic = orchestrate(request(xml, 'string_quartet', [colour({ melodyCarriers: ['vn1'], endBar: 1, harmonySource: 'hexatonic', harmonyParam: 'hex_major_omit_seventh' })]));
    const vrb = orchestrate(request(xml, 'string_quartet', [colour({ melodyCarriers: ['vn1'], endBar: 1, harmonySource: 'sq_vrb', harmonyParam: 'sq_vrb_bartok' })]));
    for (const result of [bhl, pentatonic, hexatonic, vrb]) {
      assert.equal(result.ok, true);
      if (!result.ok) return;
      const row = result.receipt.provenance[0];
      assert.equal(row?.invoked, true);
      assert.equal(row?.influenced, true);
      const inner = soundingLine(result.musicXml, 'vn2').map((note) => ((note.midi % 12) + 12) % 12);
      assert.ok(inner.length > 0);
      assert.ok(inner.every((pc) => row?.pitchClasses.includes(pc)));
    }
    if (!bhl.ok || !vrb.ok) return;
    assert.match(bhl.receipt.provenance[0]?.detail ?? '', /buildBhlWorldField/);
    assert.match(vrb.receipt.provenance[0]?.detail ?? '', /preferredIntervalSets 1 2 5 6 7/);
  });

  check('density doubling limits roles and sectional contrast', () => {
    const xml = sourceXml([{ id: 'lead', name: 'Melody', events: [...melody, ...melody] }]);
    const sparse = orchestrate(request(xml, 'string_quartet', [colour({ melodyCarriers: ['vn1'], endBar: 2, density: 'sparse' })], 21));
    const dense = orchestrate(request(xml, 'string_quartet', [colour({ melodyCarriers: ['vn1'], endBar: 2, density: 'very_dense' })], 21));
    assert.equal(sparse.ok && dense.ok, true);
    if (!sparse.ok || !dense.ok) return;
    assert.ok(soundingLine(sparse.musicXml, 'va').length < soundingLine(dense.musicXml, 'va').length);
    assert.equal(sparse.receipt.planners.density[0]?.planner, 'sparse');
    assert.ok((sparse.receipt.planners.guitarZone?.[1] ?? 0) > (sparse.receipt.planners.guitarZone?.[0] ?? 0));
    assert.ok(sparse.receipt.planners.ownershipEntries > 0);
    const shift = orchestrate(request(xml, 'wind_quintet', [colour({
      melodyCarriers: ['fl'],
      endBar: 4,
      density: 'medium',
      segmentalDevice: 'timbral_shift',
      harmonySource: 'pentatonic',
      harmonyParam: 'major_pentatonic',
    })]));
    assert.equal(shift.ok, true);
    if (!shift.ok) return;
    const oboe = soundingLine(shift.musicXml, 'ob');
    const clarinet = soundingLine(shift.musicXml, 'cl');
    assert.ok(oboe.length > 0 && clarinet.length > 0);
    assert.ok(Math.min(...oboe.map((note) => note.onset)) !== Math.min(...clarinet.map((note) => note.onset)));
    assert.match(shift.musicXml, /<transpose><diatonic>-4<\/diatonic><chromatic>-7<\/chromatic><octave-change>0<\/octave-change><\/transpose>/);
    const flutter = orchestrate(request(xml, 'string_quartet', [colour({
      melodyCarriers: ['vn1'],
      endBar: 1,
      techniques: { vn2: 'flutter' },
    })]));
    assert.equal(flutter.ok, true);
    if (!flutter.ok) return;
    assert.ok(flutter.receipt.flagged.some((flag) => flag.kind === 'technique_not_allowed'));
  });

  check('same seed is deterministic and the api stays off', () => {
    const xml = sourceXml([{ id: 'lead', name: 'Melody', events: melody }]);
    const plan = [colour({ melodyCarriers: ['vn1'], endBar: 1, harmonySource: 'bhl_world', harmonyParam: 'F' })];
    const left = orchestrate(request(xml, 'pierrot', plan, 44));
    const right = orchestrate(request(xml, 'pierrot', plan, 44));
    assert.equal(left.ok && right.ok, true);
    if (!left.ok || !right.ok) return;
    assert.equal(left.musicXml, right.musicXml);
    assert.ok(left.receipt.omissions.some((row) => row.instrumentId === 'piano'));
    assert.doesNotMatch(left.musicXml, /<part-name>Piano<\/part-name>/);
    assert.equal(apiOrchestrate({ enabled: false, sourceMusicXml: xml, template: 'pierrot', plan, seed: 44, preserveMelody: true }).ok, false);
    const api = apiOrchestrate(request(xml, 'pierrot', plan, 44));
    assert.equal(api.ok, true);
    if (!api.ok) return;
    assert.equal(api.musicXml, left.musicXml);
    save('pierrot-fixture.musicxml', left.musicXml);
  });

  check('generated duo arrangements, stage B evidence, and legacy fingerprints', () => {
    const duo = runGoldenPathOnce(3340, { presetId: 'guitar_bass_duo', totalBars: 4 });
    assert.ok(duo.xml);
    const source = duo.xml ?? '';
    save('generated-duo-source.musicxml', source);
    const plan = [colour({
      melodyCarriers: [],
      endBar: 4,
      density: 'medium',
      harmonySource: 'bhl_world',
      harmonyParam: 'C',
      counterlineFrom: { motifId: 'm1', chain: ['invert', 'augment:2'], offsetBeats: 1 },
    })];
    const templates = ['string_quartet', 'pierrot', 'wind_quintet', 'chamber_orchestra'] as const;
    for (const template of templates) {
      const result = orchestrate(request(source, template, plan, 3340));
      assert.equal(result.ok, true, result.ok ? '' : result.error);
      if (!result.ok) return;
      const file = save(`generated-${template}.musicxml`, result.musicXml);
      assert.ok(file.endsWith('.musicxml'));
      const carrier = result.receipt.layerAssignments.find((row) => row.role === 'melody')?.partId;
      assert.ok(carrier);
      const arranged = soundingLine(result.musicXml, carrier!);
      const sourcePhrases = phrasePitches(soundingLine(source, 'guitar'));
      const arrangedPhrases = phrasePitches(arranged);
      assert.equal(arrangedPhrases.length, sourcePhrases.length);
      sourcePhrases.forEach((phrase, index) => {
        const shift = arrangedPhrases[index]![0]! - phrase[0]!;
        assert.equal(shift % 12, 0);
        assert.deepEqual(arrangedPhrases[index], phrase.map((midi) => midi + shift));
        assert.deepEqual(intervals(arrangedPhrases[index]!), intervals(phrase));
      });
      assert.ok(result.receipt.layerAssignments.filter((row) => row.role === 'melody').every((row) => row.octaveShift % 12 === 0));
      assert.ok(result.receipt.provenance.some((row) => row.source === 'bhl_world' && row.invoked && row.influenced));
      if (result.receipt.derivedLines[0]) {
        assert.match(result.receipt.derivedLines[0].lineageId, /m1\.i\.aug2/);
      }
      const evidence = buildOrchestrationReport({ xml: result.musicXml });
      assert.equal(evidence.musicalQualityScore, null);
      assert.equal(evidence.musicallyApproved, false);
      assert.ok(evidence.rangeUse.length >= 4);
      const again = orchestrate(request(source, template, plan, 3340));
      assert.equal(again.ok, true);
      if (!again.ok) return;
      assert.equal(result.musicXml, again.musicXml);
    }
    const quartet = runGoldenPathOnce(3340, { presetId: 'string_quartet', totalBars: 8 });
    const band = runGoldenPathOnce(3340, { presetId: 'big_band', totalBars: 8 });
    const ecm = runGoldenPathOnce(3340, { presetId: 'ecm_chamber', totalBars: 8 });
    assert.equal(sha(quartet.xml ?? ''), BASELINE.string_quartet);
    assert.equal(sha(band.xml ?? ''), BASELINE.big_band);
    assert.equal(sha(ecm.xml ?? ''), BASELINE.ecm);
    const built = exportScoreModelToMusicXml(buildBigBandScoreModel({ title: 'Stage C big band witness', seed: 19, ...bigBandPlans(4) }));
    assert.equal(built.success, true);
    const witness = buildOrchestrationReport({ xml: built.xml ?? '' });
    assert.ok(witness.transpositionChecks.some((row) => row.declared === null && row.matches === false && row.expected.chromatic === -2));
  });

  return rows;
}

const direct = process.argv[1]?.includes('v34StageC');
if (direct) {
  const rows = runV34StageCTests();
  for (const row of rows) console.log(`${row.ok ? 'PASS' : 'FAIL'} ${row.name}${row.detail ? ` — ${row.detail}` : ''}`);
  const failed = rows.filter((row) => !row.ok).length;
  console.log(`${rows.length - failed}/${rows.length}`);
  process.exit(failed === 0 ? 0 : 1);
}
