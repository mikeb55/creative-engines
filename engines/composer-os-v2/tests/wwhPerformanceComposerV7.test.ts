/**
 * WWH Performance Composer V7.0
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/wwhPerformanceComposerV7.test.ts
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { pitchFingerprint } from '../core/wwh/wwhDuoImport';
import { importWwhDuoMusicXml } from '../core/wwh/wwhDuoImport';
import { composeWwhPerformance, developedInsertLength } from '../core/wwh/wwhPerformanceComposerV7';
import { auditWwhMusicXml } from '../core/wwh/wwhValidate';

const SOURCE =
  '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/00 - WWH DUO LEADSHEETS/01-Black-Aura-Duo-Leadsheet-V1.1.musicxml';

function syntheticOddForm(): string {
  const guitar = (bars: string) => bars;
  const note = (step: string, octave: number, dur: number, type: string) =>
    `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch><duration>${dur}</duration><voice>1</voice><type>${type}</type></note>`;
  const rest = (dur: number, type: string) =>
    `<note><rest/><duration>${dur}</duration><voice>1</voice><type>${type}</type></note>`;
  const bar4 = (body: string, extra = '') => `<measure>${extra}${note('C', 5, 256, 'quarter')}${rest(768, 'half')}${body}</measure>`;
  void guitar;
  void bar4;
  const gBars: string[] = [];
  const bBars: string[] = [];
  for (let i = 1; i <= 12; i++) {
    const three = i >= 8;
    const ticks = three ? 768 : 1024;
    const time = i === 1 || i === 8 ? `<attributes><divisions>256</divisions><key><fifths>0</fifths></key><time><beats>${three ? 3 : 4}</beats><beat-type>4</beat-type></time><clef><sign>${'G'}</sign><line>2</line></clef></attributes>` : '';
    const timeB = i === 1 || i === 8 ? time.replace('<sign>G</sign><line>2</line>', '<sign>F</sign><line>4</line>') : '';
    const mark = i === 1 ? '<direction><direction-type><rehearsal>A</rehearsal></direction-type></direction>' : i === 8 ? '<direction><direction-type><rehearsal>B</rehearsal></direction-type></direction>' : '';
    const gRest = three ? rest(512, 'half') : rest(768, 'half');
    const bDur = three ? 768 : 1024;
    gBars.push(
      `<measure number="${i}">${time}${mark}${note(i % 2 === 0 ? 'E' : 'C', 5, 256, 'quarter')}${gRest}</measure>`
    );
    bBars.push(
      `<measure number="${i}">${timeB}${note('F', 3, Math.min(512, bDur), 'half')}${rest(bDur - Math.min(512, bDur), bDur - Math.min(512, bDur) === 256 ? 'quarter' : 'half')}</measure>`
    );
    void ticks;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
 <work><work-title>Synthetic Odd Duo</work-title></work>
 <part-list>
  <score-part id="P1"><part-name>Electric Guitar</part-name></score-part>
  <score-part id="P2"><part-name>Upright Bass</part-name></score-part>
 </part-list>
 <part id="P1">${gBars.join('')}</part>
 <part id="P2">${bBars.join('')}</part>
</score-partwise>`;
}

function fileOf(files: { name: string; contents: string }[], suffix: string): string {
  const file = files.find((item) => item.name.endsWith(suffix));
  assert.ok(file, `missing ${suffix}`);
  return file.contents;
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

  check('insert lengths stay off the 8/16/32 grid', () => {
    assert.equal(developedInsertLength(7), 5);
    assert.equal(developedInsertLength(5), 3);
    assert.equal(developedInsertLength(8), 3);
    assert.equal(developedInsertLength(16), 3);
    assert.ok(![8, 16, 32].includes(developedInsertLength(39)));
  });

  check('Black Aura V1.1 imports both parts and 39 bars', () => {
    const xml = fs.readFileSync(SOURCE, 'utf8');
    const score = importWwhDuoMusicXml(xml);
    assert.equal(score.guitar.measures.length, 39);
    assert.equal(score.bass.measures.length, 39);
    assert.match(score.guitar.name, /Guitar/);
    assert.match(score.bass.name, /Bass/);
    assert.ok(score.guitar.measures[0]?.rehearsal.includes('A'));
    assert.equal(score.guitar.measures[16]?.harmony[0]?.startsWith('B'), true);
  });

  const before = fs.readFileSync(SOURCE);
  const beforeSha = createHash('sha256').update(before).digest('hex');
  const composed = composeWwhPerformance({
    xml: before.toString('utf8'),
    sourcePath: SOURCE,
    seed: 7,
    output: 'all',
  });

  check('source file bytes stay put', () => {
    assert.equal(createHash('sha256').update(fs.readFileSync(SOURCE)).digest('hex'), beforeSha);
    assert.equal(composed.plan.sourceSha256, beforeSha);
  });

  check('four MusicXML outputs plus plan', () => {
    for (const suffix of ['-PERFORMANCE.musicxml', '-RECORDING-LEADSHEET.musicxml', '-GUITAR-STUDY.musicxml', '-BASS-PARTNER.musicxml', '-PERFORMANCE-PLAN.json']) {
      assert.ok(composed.files.some((file) => file.name.endsWith(suffix)), suffix);
    }
  });

  check('performance, leadsheet, study, and bass partner validate', () => {
    const performance = fileOf(composed.files, '-PERFORMANCE.musicxml');
    const lead = fileOf(composed.files, '-RECORDING-LEADSHEET.musicxml');
    const study = fileOf(composed.files, '-GUITAR-STUDY.musicxml');
    const bass = fileOf(composed.files, '-BASS-PARTNER.musicxml');
    for (const [label, xml, bars] of [
      ['performance', performance, 92],
      ['leadsheet', lead, 39],
      ['study', study, 52],
      ['bass', bass, 39],
    ] as const) {
      const audit = auditWwhMusicXml(xml, label);
      assert.equal(audit.ok, true, audit.lines.join('; '));
      assert.equal(audit.barCount, bars, label);
      assert.doesNotMatch(xml, /<technical>|tablature/);
    }
    assert.match(performance, /<rehearsal>N<\/rehearsal>/);
    assert.match(performance, /<rehearsal>O<\/rehearsal>/);
    assert.match(performance, /<rehearsal>Q<\/rehearsal>/);
    assert.match(performance, /<rehearsal>T<\/rehearsal>/);
    assert.match(performance, /<rehearsal>S<\/rehearsal>/);
    assert.match(study, /M1-min/);
    assert.match(study, /M1-lyr/);
    assert.match(study, /M1-adv/);
    assert.match(bass, /BP-min/);
    assert.match(bass, /BP-lyr/);
    assert.match(bass, /BP-adv/);
  });

  check('locked theme matches the source and the new guitar line does not', () => {
    const performance = importWwhDuoMusicXml(fileOf(composed.files, '-PERFORMANCE.musicxml'));
    const source = composed.score;
    const locked = composed.plan.sections.filter((section) => section.outputType === 'performance' && section.sourceLocks);
    assert.equal(locked.reduce((sum, section) => sum + section.barCount, 0), 39);
    for (const section of locked) {
      const got = pitchFingerprint(performance.guitar.measures.slice(section.barStart - 1, section.barStart - 1 + section.barCount));
      const expected = pitchFingerprint(source.guitar.measures.slice((section.sourceBarStart ?? 1) - 1, (section.sourceBarStart ?? 1) - 1 + section.barCount));
      assert.equal(got, expected, section.id);
    }
    const answer = composed.plan.sections.find((section) => section.id === 'n-guitar-answer');
    assert.ok(answer);
    const fresh = pitchFingerprint(performance.guitar.measures.slice(answer.barStart - 1, answer.barStart - 1 + answer.barCount));
    const opening = pitchFingerprint(source.guitar.measures.slice(0, answer.barCount));
    assert.notEqual(fresh, opening);
    assert.match(fresh, /C0?5|C05|C5/);
  });

  check('seed moves new performance guitar and leaves the leadsheet notes', () => {
    const other = composeWwhPerformance({ xml: before.toString('utf8'), sourcePath: SOURCE, seed: 8, output: 'all' });
    const leadA = importWwhDuoMusicXml(fileOf(composed.files, '-RECORDING-LEADSHEET.musicxml'));
    const leadB = importWwhDuoMusicXml(fileOf(other.files, '-RECORDING-LEADSHEET.musicxml'));
    assert.equal(pitchFingerprint(leadA.guitar.measures), pitchFingerprint(leadB.guitar.measures));
    assert.equal(pitchFingerprint(leadA.bass.measures), pitchFingerprint(composed.score.bass.measures));
    assert.notEqual(fileOf(composed.files, '-PERFORMANCE.musicxml'), fileOf(other.files, '-PERFORMANCE.musicxml'));
  });

  check('leadsheet keeps rehearsal marks and maps cues without adding bars', () => {
    const lead = importWwhDuoMusicXml(fileOf(composed.files, '-RECORDING-LEADSHEET.musicxml'));
    assert.equal(lead.guitar.measures.length, 39);
    assert.ok(lead.guitar.measures.some((measure) => measure.rehearsal.includes('A')));
    assert.ok(lead.guitar.measures.some((measure) => measure.rehearsal.includes('I')));
    assert.ok(lead.guitar.measures[7]?.words.some((words) => words.includes('perf N')));
    assert.equal(composed.plan.leadsheetCues.length >= 5, true);
    assert.equal(composed.plan.naturalLanguageParsing, false);
  });

  check('39-bar source is not forced onto an 8/16/32 performance', () => {
    const total = composed.plan.sections
      .filter((section) => section.outputType === 'performance')
      .reduce((sum, section) => sum + section.barCount, 0);
    assert.equal(total, 92);
    assert.equal([8, 16, 32, 64].includes(total), false);
    const fresh = composed.plan.sections.filter((section) => section.outputType === 'performance' && !section.sourceLocks);
    assert.ok(fresh.some((section) => section.barCount === 5));
    assert.ok(fresh.some((section) => section.barCount === 7));
    assert.ok(fresh.some((section) => section.barCount === 15));
  });

  check('V7.1 keeps the 39-bar leadsheet and adds dyads without touching V7.0 files', () => {
    const v71 = composeWwhPerformance({
      xml: before.toString('utf8'),
      sourcePath: SOURCE,
      seed: 7,
      output: 'all',
      edition: '7.1',
    });
    assert.equal(v71.plan.version, '7.1');
    assert.ok(v71.files.every((file) => file.name.includes('V7.1')));
    const lead = importWwhDuoMusicXml(fileOf(v71.files, '-RECORDING-LEADSHEET.musicxml'));
    assert.equal(pitchFingerprint(lead.guitar.measures), pitchFingerprint(composed.score.guitar.measures));
    assert.equal(pitchFingerprint(lead.bass.measures), pitchFingerprint(composed.score.bass.measures));
    const performance = fileOf(v71.files, '-PERFORMANCE.musicxml');
    const study = fileOf(v71.files, '-GUITAR-STUDY.musicxml');
    assert.match(performance, /<chord\/>/);
    assert.match(study, /<chord\/>/);
    assert.equal(auditWwhMusicXml(performance, 'v71-performance').ok, true);
    assert.equal(auditWwhMusicXml(study, 'v71-study').ok, true);
    assert.equal(auditWwhMusicXml(fileOf(v71.files, '-BASS-PARTNER.musicxml'), 'v71-bass').ok, true);
    assert.equal(auditWwhMusicXml(fileOf(v71.files, '-RECORDING-LEADSHEET.musicxml'), 'v71-lead').barCount, 39);
    const perfScore = importWwhDuoMusicXml(performance);
    const liquid = v71.plan.sections.find((section) => section.id === 'p-liquid');
    assert.ok(liquid);
    const liquidXmlBars = perfScore.guitar.measures.slice(liquid.barStart - 1, liquid.barStart - 1 + liquid.barCount);
    const chordBars = liquidXmlBars.filter((measure) => measure.notes.some((note) => note.chord)).length;
    assert.ok(chordBars >= 3, `liquid chord bars ${chordBars}`);
    const dir = '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/WWH-PERFORMANCE-MOCKUPS/V7';
    const expected: Record<string, string> = {
      '01-Black-Aura-V7-PERFORMANCE.musicxml': 'bd352f9af02932253cd564a0bc67b6044e758d94ea59284d8751c7059744f1d5',
      '01-Black-Aura-V7-RECORDING-LEADSHEET.musicxml': '820cbda504a73e63583588ac8ecec5bad387a4e8b714e0d951c37e3b697ed511',
      '01-Black-Aura-V7-GUITAR-STUDY.musicxml': '939daf15650039c720fd7a50b021fd20e37d51e81b99f4b42cf5777b7409d6f6',
      '01-Black-Aura-V7-BASS-PARTNER.musicxml': '7be8b23c8c5f164dbaae97b1e959e0c0682fd99fea8beca86a4015cab46ac172',
    };
    for (const [name, sha] of Object.entries(expected)) {
      assert.equal(createHash('sha256').update(fs.readFileSync(`${dir}/${name}`)).digest('hex'), sha, name);
    }
  });

  check('odd 7-bar and 5-bar sections, meter change, bass cue, three alternatives', () => {
    const xml = syntheticOddForm();
    const result = composeWwhPerformance({
      xml,
      sourcePath: '/tmp/__generic__/synthetic-odd-duo.musicxml',
      seed: 7,
      output: 'all',
    });
    const performance = importWwhDuoMusicXml(fileOf(result.files, '-PERFORMANCE.musicxml'));
    assert.equal(performance.guitar.measures.length, 20);
    assert.equal(performance.bass.measures.length, 20);
    const audit = auditWwhMusicXml(fileOf(result.files, '-PERFORMANCE.musicxml'), 'synthetic');
    assert.equal(audit.ok, true, audit.lines.join('; '));
    assert.equal(performance.guitar.measures[12]?.beats, 3);
    assert.equal(performance.guitar.measures[12]?.beatType, 4);
    assert.ok(performance.guitar.measures.some((measure) => measure.rehearsal.includes('A')));
    assert.ok(performance.guitar.measures.some((measure) => measure.rehearsal.includes('B')));
    assert.ok(performance.guitar.measures.some((measure) => measure.words.some((words) => /bass maintains motif/i.test(words))));
    const study = fileOf(result.files, '-GUITAR-STUDY.musicxml');
    assert.match(study, /G-minimal/);
    assert.match(study, /G-lyrical/);
    assert.match(study, /G-adventurous/);
    const studyAudit = auditWwhMusicXml(study, 'synthetic-study');
    assert.equal(studyAudit.ok, true, studyAudit.lines.join('; '));
    const bassAudit = auditWwhMusicXml(fileOf(result.files, '-BASS-PARTNER.musicxml'), 'synthetic-bass');
    assert.equal(bassAudit.ok, true, bassAudit.lines.join('; '));
  });

  return rows;
}

const rows = run();
const failed = rows.filter((row) => !row.ok);
for (const row of rows) console.log(`${row.ok ? 'PASS' : 'FAIL'} ${row.name}`);
if (failed.length) {
  console.error(`${failed.length} failed`);
  process.exit(1);
}
console.log(`Passed: ${rows.length}`);
