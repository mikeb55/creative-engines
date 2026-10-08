/**
 * WWH Performance Director V7.3A.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/wwhPerformanceDirectorV73a.test.ts
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { compareLockedSpan } from '../core/wwh/wwhSourceCompare';
import { importWwhDuoMusicXml } from '../core/wwh/wwhDuoImport';
import { compilePerformancePlan } from '../core/wwh/director/compilePerformancePlan';
import { executePerformancePlan } from '../core/wwh/director/executePerformancePlan';
import { readFormDuoAdvice } from '../core/wwh/director/formDuoAdviceAdapter';
import { parsePerformancePlan, PerformancePlanSchemaError } from '../core/wwh/director/performancePlanSchema';
import { assertBlackAuraSource, proposeLedDeparture, proposeSourceClosePlan } from '../core/wwh/director/proposePerformancePlan';
import { indexSource } from '../core/wwh/director/sourceIndexAdapter';
import { bindAndValidatePlan, PerformancePlanBindError } from '../core/wwh/director/validatePerformancePlan';

const BLACK_AURA =
  '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/00 - WWH DUO LEADSHEETS/01-Black-Aura-Duo-Leadsheet-V1.1.musicxml';

function note(step: string, octave: number, dur: number, type: string, tie?: 'start' | 'stop'): string {
  const tied = tie ? `<tie type="${tie}"/><notations><tied type="${tie}"/></notations>` : '';
  return `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch><duration>${dur}</duration><voice>1</voice><type>${type}</type>${tied}</note>`;
}

function rest(dur: number, type: string): string {
  return `<note><rest/><duration>${dur}</duration><voice>1</voice><type>${type}</type></note>`;
}

function duo(bars: Array<{ guitar: string; bass: string; guitarAttrs?: string; bassAttrs?: string }>): string {
  const part = (clef: 'guitar' | 'bass') =>
    bars
      .map((bar, index) => {
        const attrs = clef === 'guitar' ? bar.guitarAttrs ?? '' : bar.bassAttrs ?? '';
        const body = clef === 'guitar' ? bar.guitar : bar.bass;
        return `<measure number="${index + 1}">${attrs}${body}</measure>`;
      })
      .join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
 <work><work-title>Director Fixture</work-title></work>
 <part-list>
  <score-part id="P1"><part-name>Electric Guitar</part-name></score-part>
  <score-part id="P2"><part-name>Upright Bass</part-name></score-part>
 </part-list>
 <part id="P1">${part('guitar')}</part>
 <part id="P2">${part('bass')}</part>
</score-partwise>`;
}

function attrs(clef: 'G' | 'F'): string {
  const sign = clef;
  const line = clef === 'G' ? 2 : 4;
  return `<attributes><divisions>256</divisions><key><fifths>0</fifths><mode>major</mode></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>${sign}</sign><line>${line}</line></clef><transpose><diatonic>0</diatonic><chromatic>0</chromatic><octave-change>-1</octave-change></transpose></attributes>`;
}

function fullBar(step: string, octave: number): string {
  return `${note(step, octave, 1024, 'whole')}`;
}

function fourBars(): string {
  const headG = attrs('G');
  const headF = attrs('F');
  return duo([
    { guitar: fullBar('C', 4), bass: fullBar('C', 3), guitarAttrs: headG, bassAttrs: headF },
    { guitar: fullBar('D', 4), bass: fullBar('D', 3) },
    { guitar: fullBar('E', 4), bass: fullBar('E', 3) },
    { guitar: fullBar('F', 4), bass: fullBar('F', 3) },
  ]);
}

function tiedPair(): string {
  return duo([
    {
      guitar: `${note('C', 4, 1024, 'whole', 'start')}`,
      bass: fullBar('C', 3),
      guitarAttrs: attrs('G'),
      bassAttrs: attrs('F'),
    },
    { guitar: `${note('C', 4, 1024, 'whole', 'stop')}`, bass: rest(1024, 'whole') },
  ]);
}

function partMeasures(xml: string, partId: string): string[] {
  const chunk = xml.split(`<part id="${partId}">`)[1]?.split('</part>')[0] ?? '';
  return chunk.split('<measure ').slice(1).map((piece) => `<measure ${piece}`);
}

function run(): { ok: boolean; name: string }[] {
  const rows: { ok: boolean; name: string }[] = [];
  const check = (name: string, fn: () => void) => {
    try {
      fn();
      rows.push({ ok: true, name });
    } catch (error) {
      rows.push({ ok: false, name: `${name} — ${error instanceof Error ? error.message : String(error)}` });
    }
  };

  check('unknown plan fields fail', () => {
    assert.throws(() => parsePerformancePlan({ schemaVersion: '1.0', engineEdition: '7.3', extra: true }), PerformancePlanSchemaError);
  });

  check('zero length and bad enum fail', () => {
    const xml = fourBars();
    const index = indexSource(xml);
    const plan = proposeSourceClosePlan(index, 'close');
    const broken = structuredClone(plan) as unknown as { sections: Array<{ length: { bars: number } }> };
    broken.sections[0]!.length = { kind: 'fixed', bars: 0 } as unknown as { bars: number };
    assert.throws(() => bindAndValidatePlan(broken, index), PerformancePlanBindError);
  });

  check('source hash mismatch fails', () => {
    const index = indexSource(fourBars());
    const plan = proposeSourceClosePlan(index, 'close');
    plan.source.sha256 = '0'.repeat(64);
    assert.throws(() => bindAndValidatePlan(plan, index), (error: unknown) => {
      assert.ok(error instanceof PerformancePlanBindError);
      assert.ok(error.errors.some((item) => item.code === 'SOURCE_HASH'));
      return true;
    });
  });

  check('guitar-led and bass-led directions differ', () => {
    const xml = fourBars();
    const index = indexSource(xml);
    const bass = proposeLedDeparture(index, { id: 'bass-led', afterOrder: 1, leader: 'bass', yieldBars: 1, answerBars: 1, rejoinBars: 1 });
    const guitar = proposeLedDeparture(index, { id: 'guitar-led', afterOrder: 1, leader: 'guitar', yieldBars: 1, answerBars: 1, rejoinBars: 1 });
    const bassXml = executePerformancePlan(xml, bass).scores.performance;
    const guitarXml = executePerformancePlan(xml, guitar).scores.performance;
    assert.notEqual(bassXml, guitarXml);
    assert.match(bassXml, /BASS LEADS/);
    assert.match(guitarXml, /GUITAR LEADS/);
    assert.doesNotMatch(bassXml, /GUITAR LEADS/);
    assert.doesNotMatch(guitarXml, /BASS LEADS/);
  });

  check('added sections change the bar count', () => {
    const xml = fourBars();
    const index = indexSource(xml);
    const close = executePerformancePlan(xml, proposeSourceClosePlan(index, 'close'));
    const led = executePerformancePlan(xml, proposeLedDeparture(index, { id: 'led', afterOrder: 1, leader: 'bass', yieldBars: 2, answerBars: 2, rejoinBars: 1 }));
    assert.equal(close.compiled.bars.length, 4);
    assert.equal(led.compiled.bars.length, 9);
    assert.equal(importWwhDuoMusicXml(led.scores.performance).guitar.measures.length, 9);
    assert.equal(importWwhDuoMusicXml(led.scores.leadsheet).guitar.measures.length, 4);
  });

  check('reordering a permitted insert moves it and keeps source order', () => {
    const xml = fourBars();
    const index = indexSource(xml);
    const early = executePerformancePlan(xml, proposeLedDeparture(index, { id: 'early', afterOrder: 0, leader: 'bass', yieldBars: 1, answerBars: 1, rejoinBars: 1 }));
    const late = executePerformancePlan(xml, proposeLedDeparture(index, { id: 'late', afterOrder: 2, leader: 'bass', yieldBars: 1, answerBars: 1, rejoinBars: 1 }));
    assert.notEqual(early.scores.performance, late.scores.performance);
    const earlyReturn = early.compiled.receipt.sourceMap.find((row) => row.player === 'guitar' && row.sourceMeasureId?.endsWith(':m002'));
    const lateReturn = late.compiled.receipt.sourceMap.find((row) => row.player === 'guitar' && row.sourceMeasureId?.endsWith(':m002'));
    assert.ok(earlyReturn && lateReturn);
    assert.notEqual(earlyReturn.outputBar, lateReturn.outputBar);
    const primary = late.compiled.receipt.sourceMap.filter((row) => row.player === 'guitar' && row.use === 'primary').map((row) => row.sourceMeasureId);
    assert.deepEqual(primary, index.measures.map((measure) => measure.id));
  });

  check('a tie blocks the insert', () => {
    const xml = tiedPair();
    const index = indexSource(xml);
    assert.throws(() => proposeLedDeparture(index, { id: 'tied', afterOrder: 0, leader: 'bass', yieldBars: 1, answerBars: 1, rejoinBars: 1 }), /tie/i);
  });

  check('open improvisation is slash notation and tacet is a rest', () => {
    const xml = fourBars();
    const index = indexSource(xml);
    const runPlan = executePerformancePlan(xml, proposeLedDeparture(index, { id: 'open', afterOrder: 1, leader: 'bass', yieldBars: 1, answerBars: 1, rejoinBars: 1 }));
    const measures = partMeasures(runPlan.scores.performance, 'P1');
    const yieldBar = runPlan.compiled.bars.find((bar) => bar.sectionId === 'depart-yield')!;
    const answerBar = runPlan.compiled.bars.find((bar) => bar.sectionId === 'depart-answer')!;
    assert.match(measures[yieldBar.outputBar - 1]!, /TACET — yield/);
    assert.doesNotMatch(measures[yieldBar.outputBar - 1]!, /<slash /);
    assert.match(measures[answerBar.outputBar - 1]!, /<slash type="start">/);
    assert.match(measures[answerBar.outputBar - 1]!, /OPEN IMPROVISATION/);
    assert.doesNotMatch(measures[answerBar.outputBar - 1]!, /<pitch>/);
    assert.equal(runPlan.compiled.receipt.playbackStatus, 'SOURCE_AND_RESTS_ONLY');
  });

  check('the same plan compiles twice to the same score', () => {
    const xml = fourBars();
    const index = indexSource(xml);
    const plan = proposeLedDeparture(index, { id: 'same', afterOrder: 1, leader: 'bass', yieldBars: 1, answerBars: 1, rejoinBars: 1 });
    const left = executePerformancePlan(xml, plan);
    const right = executePerformancePlan(xml, JSON.parse(JSON.stringify(plan)));
    assert.equal(left.scores.performance, right.scores.performance);
    assert.equal(left.bound.planSha256, right.bound.planSha256);
  });

  check('editing the plan JSON changes the score', () => {
    const xml = fourBars();
    const index = indexSource(xml);
    const plan = proposeLedDeparture(index, { id: 'edit', afterOrder: 1, leader: 'bass', yieldBars: 1, answerBars: 1, rejoinBars: 1 });
    const before = executePerformancePlan(xml, plan).scores.performance;
    const edited = structuredClone(plan);
    const answer = edited.sections.find((section) => section.id === 'depart-answer')!;
    assert.equal(answer.voices.guitar.material.kind, 'performer');
    if (answer.voices.guitar.material.kind === 'performer') answer.voices.guitar.material.instruction = 'Guitar stays with one long answer.';
    const after = executePerformancePlan(xml, edited).scores.performance;
    assert.notEqual(before, after);
    assert.match(after, /Guitar stays with one long answer/);
  });

  check('director does not consult pentatonic advice', () => {
    assert.equal(readFormDuoAdvice().consulted, false);
    const source = fs.readFileSync(new URL('../core/wwh/director/compilePerformancePlan.ts', import.meta.url), 'utf8');
    assert.doesNotMatch(source, /pentatonic|reharm|liquidHarmony|generateVault/i);
  });

  if (fs.existsSync(BLACK_AURA)) {
    const bytes = fs.readFileSync(BLACK_AURA);
    const sha = createHash('sha256').update(bytes).digest('hex');
    const xml = bytes.toString('utf8');
    const index = indexSource(xml, sha);

    check('Black Aura source matches the pilot facts', () => {
      assertBlackAuraSource(index);
      assert.equal(index.measures.length, 39);
    });

    check('Plan A keeps all 39 bars, the ending, and the tempo', () => {
      const runPlan = executePerformancePlan(xml, proposeSourceClosePlan(index, 'black-aura-v73a-source-close'), sha);
      assert.equal(runPlan.compiled.bars.length, 39);
      assert.equal(runPlan.compiled.receipt.playbackStatus, 'ALL_NOTATED');
      const score = importWwhDuoMusicXml(runPlan.scores.performance);
      assert.equal(score.guitar.measures.length, 39);
      assert.equal(score.guitar.measures[0]?.beats, 4);
      assert.equal(score.guitar.measures[0]?.tempo.perMinute, '92');
      assert.equal(score.guitar.measures[38]?.tempo.perMinute, '92');
      const errors = [
        ...compareLockedSpan(index.score.guitar.measures, score.guitar.measures, 'guitar'),
        ...compareLockedSpan(index.score.bass.measures, score.bass.measures, 'bass'),
      ];
      assert.deepEqual(errors, []);
      for (const name of ['performance', 'leadsheet', 'guitar_study', 'bass_partner'] as const) {
        assert.match(runPlan.scores[name], /src-all/);
      }
      assert.equal(importWwhDuoMusicXml(runPlan.scores.leadsheet).guitar.measures.length, 39);
    });

    check('Plan B keeps 39 source bars in order and adds five', () => {
      const plan = proposeLedDeparture(index, {
        id: 'black-aura-v73a-bass-led',
        afterOrder: 7,
        leader: 'bass',
        yieldBars: 2,
        answerBars: 2,
        rejoinBars: 1,
      });
      const runPlan = executePerformancePlan(xml, plan, sha);
      assert.equal(runPlan.compiled.bars.length, 44);
      assert.equal(importWwhDuoMusicXml(runPlan.scores.leadsheet).guitar.measures.length, 39);
      const score = importWwhDuoMusicXml(runPlan.scores.performance);
      const primary = runPlan.compiled.receipt.sourceMap.filter((row) => row.player === 'guitar' && row.use === 'primary');
      assert.equal(primary.length, 39);
      assert.deepEqual(
        primary.map((row) => row.sourceMeasureId),
        index.measures.map((measure) => measure.id)
      );
      const guitarErrors = compareLockedSpan(
        index.score.guitar.measures,
        primary.map((row) => score.guitar.measures[row.outputBar - 1]!),
        'guitar'
      );
      const bassPrimary = runPlan.compiled.receipt.sourceMap.filter((row) => row.player === 'bass' && row.use === 'primary');
      const bassErrors = compareLockedSpan(
        index.score.bass.measures,
        bassPrimary.map((row) => score.bass.measures[row.outputBar - 1]!),
        'bass'
      );
      assert.deepEqual(guitarErrors, []);
      assert.deepEqual(bassErrors, []);
      assert.equal(score.guitar.measures[0]?.tempo.perMinute, '92');
      assert.equal(score.guitar.measures[43]?.tempo.perMinute, '92');
      assert.ok(score.bass.measures[43]?.notes.some((item) => item.tieStop));
      assert.match(runPlan.scores.performance, /BASS LEADS/);
      assert.match(runPlan.scores.performance, /OPEN IMPROVISATION/);
      assert.match(runPlan.scores.performance, /TACET — yield/);
      for (const name of ['performance', 'leadsheet', 'guitar_study', 'bass_partner'] as const) {
        assert.match(runPlan.scores[name], /depart-yield/);
        assert.match(runPlan.scores[name], /depart-answer/);
        assert.match(runPlan.scores[name], /src-return/);
        assert.match(runPlan.scores[name], /black-aura-v73a-bass-led/);
      }
      const moved = structuredClone(plan);
      const yieldSection = moved.sections.find((section) => section.id === 'depart-yield')!;
      assert.equal(yieldSection.length.kind, 'fixed');
      if (yieldSection.length.kind === 'fixed') yieldSection.length.bars = 3;
      const again = executePerformancePlan(xml, moved, sha);
      assert.equal(again.compiled.bars.length, 45);
      assert.notEqual(again.scores.performance, runPlan.scores.performance);
      const againPrimary = again.compiled.receipt.sourceMap.filter((row) => row.player === 'guitar' && row.use === 'primary');
      assert.deepEqual(
        againPrimary.map((row) => row.sourceMeasureId),
        index.measures.map((measure) => measure.id)
      );
    });

    check('compiling the bound plan does not call a pitch generator', () => {
      const plan = proposeSourceClosePlan(index, 'black-aura-v73a-source-close');
      const bound = bindAndValidatePlan(plan, index);
      const compiled = compilePerformancePlan(bound, index);
      assert.equal(compiled.bars.length, 39);
      assert.ok(compiled.bars.every((bar) => bar.guitar.kind === 'source' && bar.bass.kind === 'source'));
    });
  }

  return rows;
}

const rows = run();
for (const row of rows) console.log(`${row.ok ? 'PASS' : 'FAIL'} ${row.name}`);
const failed = rows.filter((row) => !row.ok);
console.log(`${rows.length - failed.length}/${rows.length}`);
if (failed.length) process.exit(1);
