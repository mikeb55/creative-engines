/**
 * Composer OS V3.4 Stage B — orchestration evidence.
 * The report describes a score. It does not rewrite one.
 */

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { apiEvaluateMusicalScore } from '../app-api/evaluationApp';
import { buildBigBandScoreModel } from '../core/big-band/bigBandScoreBuilder';
import type { BigBandFormPlan, BigBandSectionPlan } from '../core/big-band/bigBandPlanTypes';
import type { BigBandInstrumentSection } from '../core/big-band/bigBandSectionTypes';
import type { BigBandRoleType } from '../core/big-band/bigBandTypes';
import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import { buildQuartetScoreModel } from '../core/string-quartet/quartetScoreBuilder';
import type { QuartetFormPlan, QuartetTexturePlan } from '../core/string-quartet/quartetPlanTypes';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';
import { evaluateScore } from '../core/musical-evaluation/service';
import {
  buildOrchestrationReport,
  orchestrationReportSha256,
} from '../core/musical-evaluation/orchestrationReport';

const BASELINE = {
  string_quartet: '2d7f15b4cd1f8b6438674c8b811ecbefb5f41135dba98be467e2592e2505289a',
  big_band: '2d7f15b4cd1f8b6438674c8b811ecbefb5f41135dba98be467e2592e2505289a',
  ecm: 'ff2a8d7dfd5466df366d2fdbc044e47e1338c8f10569169ac99d5d88aeca24a2',
} as const;

function sha(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function whole(step: string, octave: number, alter?: number): string {
  const alt = alter === undefined ? '' : `<alter>${alter}</alter>`;
  return `<note><pitch><step>${step}</step>${alt}<octave>${octave}</octave></pitch><duration>4</duration><voice>1</voice></note>`;
}

function bar(number: number, inner: string, attributes?: string): string {
  const head = attributes ?? '<attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>';
  return `<measure number="${number}">${head}${inner}</measure>`;
}

function dyn(mark: string): string {
  return `<direction><direction-type><dynamics><${mark}/></dynamics></direction-type></direction>`;
}

function score(parts: Array<{ id: string; name: string; measures: string[] }>): string {
  const list = parts.map((part) => `<score-part id="${part.id}"><part-name>${part.name}</part-name></score-part>`).join('');
  const body = parts.map((part) => `<part id="${part.id}">${part.measures.join('')}</part>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><part-list>${list}</part-list>${body}</score-partwise>`;
}

function t15(): string {
  const trumpet = [
    bar(1, `${dyn('f')}${whole('C', 5)}`),
    bar(2, `${dyn('p')}${whole('C', 5)}`, ''),
  ];
  const hornHigh = [bar(1, whole('G', 4)), bar(2, whole('G', 4), '')];
  const hornLow = [bar(1, whole('E', 4)), bar(2, whole('E', 4), '')];
  const flute = [bar(1, whole('D', 4)), bar(2, whole('D', 4), '')];
  const clarinet = [bar(1, whole('B', 3)), bar(2, whole('B', 3), '')];
  const bassoon = [bar(1, whole('A', 3)), bar(2, whole('A', 3), '')];
  return score([
    { id: 'Tpt', name: 'Trumpet', measures: trumpet },
    { id: 'Hn1', name: 'Horn in F', measures: hornHigh },
    { id: 'Hn2', name: 'Horn in F', measures: hornLow },
    { id: 'Fl', name: 'Flute', measures: flute },
    { id: 'Ob', name: 'Oboe', measures: [bar(1, whole('F', 4)), bar(2, whole('F', 4), '')] },
    { id: 'Cl', name: 'Clarinet', measures: clarinet },
    { id: 'Bn', name: 'Bassoon', measures: bassoon },
  ]);
}

export function runV34StageBTests(): Array<{ name: string; ok: boolean; detail?: string }> {
  const rows: Array<{ name: string; ok: boolean; detail?: string }> = [];
  const check = (name: string, fn: () => void) => {
    try {
      fn();
      rows.push({ name, ok: true });
    } catch (error) {
      rows.push({ name, ok: false, detail: error instanceof Error ? error.message : String(error) });
    }
  };

  check('T15 loud and soft balance weights', () => {
    const xml = t15();
    const before = sha(xml);
    const report = buildOrchestrationReport({ xml });
    assert.equal(sha(xml), before);
    assert.equal(report.version, 'orchestration-evidence-1');
    assert.equal(report.musicalQualityScore, null);
    assert.equal(report.musicallyApproved, false);
    const loud = report.balanceByBar.find((row) => row.bar === 1);
    const soft = report.balanceByBar.find((row) => row.bar === 2);
    assert.equal(loud?.dynamicBand, 'loud');
    assert.equal(loud?.melodyWeight, 2);
    assert.equal(loud?.accompanimentWeight, 4);
    assert.equal(soft?.dynamicBand, 'soft');
    assert.equal(soft?.melodyWeight, 1);
    assert.equal(soft?.accompanimentWeight, 6);
    assert.equal(orchestrationReportSha256(report), orchestrationReportSha256(buildOrchestrationReport({ xml })));
    assert.match(report.notes.join('\n'), /Rimsky-Korsakov/);
    assert.match(report.notes.join('\n'), /Inference:/);
  });

  check('range and transposition reporting', () => {
    const lowViolin = score([{
      id: 'Vn',
      name: 'Violin',
      measures: [bar(1, `${whole('F', 3, 1)}${whole('C', 5)}`.replace('</note><note>', '</note><note><chord/>'))],
    }]);
    const violin = buildOrchestrationReport({ xml: lowViolin });
    const range = violin.rangeUse.find((row) => row.partId === 'Vn');
    assert.equal(range?.lowest, 54);
    assert.equal(range?.highest, 72);
    assert.equal(range?.outsideHard, 1);
    assert.match(violin.notes.join('\n'), /were not moved/);

    const highClarinet = score([{
      id: 'Cl',
      name: 'Clarinet',
      measures: [bar(1, whole('G', 6, 1))],
    }]);
    const clarinet = buildOrchestrationReport({ xml: highClarinet });
    const clarinetRange = clarinet.rangeUse[0];
    assert.equal(clarinetRange?.outsideHard, 0);
    assert.equal(clarinetRange?.outsideComfort, 1);

    const written = bar(1, whole('D', 5), '<attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time><transpose><diatonic>-1</diatonic><chromatic>-2</chromatic><octave-change>0</octave-change></transpose></attributes>');
    const trumpet = buildOrchestrationReport({
      xml: score([{ id: 'Tpt', name: 'Trumpet', measures: [written] }]),
    });
    assert.equal(trumpet.rangeUse[0]?.lowest, 72);
    assert.equal(trumpet.transpositionChecks[0]?.matches, true);
    assert.equal(trumpet.transpositionChecks[0]?.declared?.chromatic, -2);

    const bare = buildOrchestrationReport({
      xml: score([{ id: 'Tpt', name: 'Trumpet', measures: [bar(1, whole('C', 5))] }]),
    });
    assert.equal(bare.transpositionChecks[0]?.declared, null);
    assert.equal(bare.transpositionChecks[0]?.matches, false);

    const bass = buildOrchestrationReport({
      xml: score([{ id: 'Db', name: 'Double Bass', measures: [bar(1, whole('E', 2))] }]),
    });
    assert.equal(bass.transpositionChecks[0]?.expected.octaveChange, -1);
    assert.equal(bass.transpositionChecks[0]?.matches, false);
  });

  check('unison doubling run', () => {
    const xml = score([
      { id: 'V1', name: 'Violin I', measures: [1, 2, 3, 4].map((number) => bar(number, whole('C', 5), number === 1 ? undefined : '')) },
      { id: 'V2', name: 'Violin II', measures: [1, 2, 3, 4].map((number) => bar(number, number === 4 ? whole('E', 5) : whole('C', 5), number === 1 ? undefined : '')) },
    ]);
    const report = buildOrchestrationReport({ xml });
    assert.deepEqual(report.doublingRuns, [{ parts: ['V1', 'V2'], interval: 'unison', startBar: 1, bars: 3 }]);
  });

  check('empty missing and unsupported instruments', () => {
    const empty = buildOrchestrationReport({ xml: '   ' });
    assert.equal(empty.rangeUse.length, 0);
    assert.equal(empty.musicalQualityScore, null);
    assert.match(empty.notes.join('\n'), /did not parse/);
    const broken = buildOrchestrationReport({ xml: '<nope></nope>' });
    assert.equal(broken.balanceByBar.length, 0);
    const missing = buildOrchestrationReport({
      xml: score([
        { id: 'P1', name: 'Flute', measures: [bar(1, whole('C', 5))] },
      ]).replace('</part-list>', '<score-part id="P2"><part-name>Oboe</part-name></score-part></part-list>'),
    });
    assert.match(missing.notes.join('\n'), /P2 has no part body/);
    const piano = buildOrchestrationReport({
      xml: score([{ id: 'Pn', name: 'Piano', measures: [bar(1, whole('C', 4))] }]),
    });
    assert.equal(piano.rangeUse.length, 0);
    assert.match(piano.notes.join('\n'), /no V3.4 catalogue entry/);
    assert.equal(piano.transpositionChecks[0]?.matches, false);
    assert.equal(piano.balanceByBar[0]?.melodyWeight, 0);
    assert.equal(piano.balanceByBar[0]?.accompanimentWeight, 0);
  });

  check('evaluation keeps prior reports and adds orchestration', () => {
    const xml = t15();
    const receipt = evaluateScore({ score: { label: 't15', xml } });
    assert.equal(receipt.receiptVersion, 'musical-evaluation-receipt-2');
    assert.equal('musicalQualityScore' in receipt, false);
    assert.equal(receipt.humanJudgement, null);
    assert.ok(receipt.technical[0]);
    assert.ok(receipt.coherence);
    assert.equal(receipt.coherence?.musicalQualityScore, null);
    assert.equal(receipt.orchestration?.musicalQualityScore, null);
    assert.equal(receipt.orchestration?.musicallyApproved, false);
    assert.equal(receipt.orchestration?.balanceByBar[0]?.melodyWeight, 2);
    const api = apiEvaluateMusicalScore({ label: 't15', xml });
    assert.equal(api.ok, true);
    if (!api.ok) return;
    assert.equal(api.sourceWritten, false);
    assert.equal(api.receipt.orchestration?.balanceByBar[1]?.accompanimentWeight, 6);
    assert.equal(api.receipt.technical[0]?.summary.parse, 'pass');
  });

  check('string quartet and big band reports are deterministic', () => {
    const sqXmlA = xmlOf(buildQuartetScoreModel({ title: 'Stage B quartet', seed: 3340, ...quartetPlans(8) }));
    const sqXmlB = xmlOf(buildQuartetScoreModel({ title: 'Stage B quartet', seed: 3340, ...quartetPlans(8) }));
    const bbXmlA = xmlOf(buildBigBandScoreModel({ title: 'Stage B big band', seed: 3340, ...bigBandPlans(8) }));
    const bbXmlB = xmlOf(buildBigBandScoreModel({ title: 'Stage B big band', seed: 3340, ...bigBandPlans(8) }));
    assert.equal(sha(sqXmlA), sha(sqXmlB));
    assert.equal(sha(bbXmlA), sha(bbXmlB));
    const sqReportA = buildOrchestrationReport({ xml: sqXmlA });
    const sqReportB = buildOrchestrationReport({ xml: sqXmlB });
    const bbReportA = buildOrchestrationReport({ xml: bbXmlA });
    const bbReportB = buildOrchestrationReport({ xml: bbXmlB });
    assert.equal(orchestrationReportSha256(sqReportA), orchestrationReportSha256(sqReportB));
    assert.equal(orchestrationReportSha256(bbReportA), orchestrationReportSha256(bbReportB));
    assert.equal(sqReportA.musicalQualityScore, null);
    assert.equal(bbReportA.musicallyApproved, false);
    assert.equal(sqReportA.rangeUse.length, 4);
    assert.equal(bbReportA.activity.length, 7);
    const pathSq = runGoldenPathOnce(3340, { presetId: 'string_quartet', totalBars: 8 });
    const pathBb = runGoldenPathOnce(3340, { presetId: 'big_band', totalBars: 8 });
    const pathEcm = runGoldenPathOnce(3340, { presetId: 'ecm_chamber', totalBars: 8 });
    assert.equal(sha(pathSq.xml ?? ''), BASELINE.string_quartet);
    assert.equal(sha(pathBb.xml ?? ''), BASELINE.big_band);
    assert.equal(sha(pathEcm.xml ?? ''), BASELINE.ecm);
    const ecmReport = buildOrchestrationReport({ xml: pathEcm.xml ?? '' });
    assert.equal(orchestrationReportSha256(ecmReport), orchestrationReportSha256(buildOrchestrationReport({ xml: pathEcm.xml ?? '' })));
    console.log(`SQ_SHA ${orchestrationReportSha256(sqReportA)}`);
    console.log(`BB_SHA ${orchestrationReportSha256(bbReportA)}`);
    console.log(`SQ_FINDINGS ${JSON.stringify(findings(sqReportA))}`);
    console.log(`BB_FINDINGS ${JSON.stringify(findings(bbReportA))}`);
  });

  return rows;
}

function xmlOf(model: ScoreModel): string {
  const result = exportScoreModelToMusicXml(model);
  if (!result.success || !result.xml) throw new Error(result.errors.join('; '));
  return result.xml;
}

function quartetPlans(totalBars: number): { formPlan: QuartetFormPlan; texturePlan: QuartetTexturePlan } {
  return {
    formPlan: { totalBars, slices: [{ index: 0, phase: 'statement', startBar: 1, endBar: totalBars }] },
    texturePlan: {
      slices: [{
        formSliceIndex: 0,
        phase: 'statement',
        rolesByInstrument: { violin_1: 'lead', violin_2: 'counterline', viola: 'inner_motion', cello: 'bass_anchor' },
      }],
    },
  };
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

function findings(report: ReturnType<typeof buildOrchestrationReport>) {
  return {
    ranges: report.rangeUse,
    transposition: report.transpositionChecks.map((row) => ({ partId: row.partId, matches: row.matches, declared: row.declared, expected: row.expected })),
    balance: report.balanceByBar,
    doubling: report.doublingRuns,
    textures: report.textureStates,
    concurrent: report.concurrentTextures,
    segmental: report.segmentalEvents,
    warnings: report.notes.filter((note) => note.startsWith('Warning')),
  };
}

const direct = process.argv[1]?.includes('v34StageB');
if (direct) {
  const rows = runV34StageBTests();
  for (const row of rows) {
    console.log(`${row.ok ? 'PASS' : 'FAIL'} ${row.name}${row.detail ? ` — ${row.detail}` : ''}`);
  }
  const failed = rows.filter((row) => !row.ok).length;
  console.log(`${rows.length - failed}/${rows.length}`);
  process.exit(failed === 0 ? 0 : 1);
}
