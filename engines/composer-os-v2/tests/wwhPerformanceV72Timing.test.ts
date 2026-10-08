/**
 * WWH Performance Composer V7.2 portable timing.
 * Synthetic scores only. Album files are not required.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/wwhPerformanceV72Timing.test.ts
 */
import assert from 'node:assert/strict';
import { importWwhDuoMusicXml } from '../core/wwh/wwhDuoImport';
import { composeWwhPerformance } from '../core/wwh/wwhPerformanceComposerV7';
import { compareLockedSpan } from '../core/wwh/wwhSourceCompare';
import { quarterPerMinute } from '../core/wwh/wwhTiming';
import { auditWwhMusicXml } from '../core/wwh/wwhValidate';

function note(step: string, octave: number, dur: number, type: string, dots = 0): string {
  return `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch><duration>${dur}</duration><voice>1</voice><type>${type}</type>${'<dot/>'.repeat(dots)}</note>`;
}
function rest(dur: number, type: string, dots = 0): string {
  return `<note><rest/><duration>${dur}</duration><voice>1</voice><type>${type}</type>${'<dot/>'.repeat(dots)}</note>`;
}

function duo(title: string, bars: number, barXml: (index: number, clef: 'G' | 'F') => string): string {
  const part = (clef: 'G' | 'F') =>
    Array.from({ length: bars }, (_, index) => `<measure number="${index + 1}">${barXml(index, clef)}</measure>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
 <work><work-title>${title}</work-title></work>
 <part-list>
  <score-part id="P1"><part-name>Electric Guitar</part-name></score-part>
  <score-part id="P2"><part-name>Upright Bass</part-name></score-part>
 </part-list>
 <part id="P1">${part('G')}</part>
 <part id="P2">${part('F')}</part>
</score-partwise>`;
}

function attrs(clef: 'G' | 'F', divisions: number, beats: number, beatType: number, fifths = 0): string {
  const line = clef === 'G' ? 2 : 4;
  const sign = clef === 'G' ? 'G' : 'F';
  return `<attributes><divisions>${divisions}</divisions><key><fifths>${fifths}</fifths><mode>major</mode></key><time><beats>${beats}</beats><beat-type>${beatType}</beat-type></time><clef><sign>${sign}</sign><line>${line}</line></clef><transpose><diatonic>0</diatonic><chromatic>0</chromatic><octave-change>-1</octave-change></transpose></attributes>`;
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

  check('dotted-quarter 78 stays dotted and sounds at 117', () => {
    assert.equal(quarterPerMinute({ beatUnit: 'quarter', dots: 1, perMinute: '78', soundTempo: '78' }), '117');
    assert.equal(quarterPerMinute({ beatUnit: 'quarter', dots: 1, perMinute: '78', soundTempo: '117' }), '117');
    assert.equal(quarterPerMinute({ beatUnit: 'quarter', dots: 0, perMinute: '92', soundTempo: '92' }), '92');
  });

  check('4/4 and 3/4 at 256 divisions keep metre and locked notes', () => {
    const xml = duo('Metre 256', 6, (index, clef) => {
      const three = index >= 4;
      const head = index === 0 || index === 4 ? attrs(clef, 256, three ? 3 : 4, 4, -1) : '';
      const mark = clef === 'G' && index === 0 ? '<direction><direction-type><rehearsal>A</rehearsal></direction-type></direction>' : '';
      const markB = clef === 'G' && index === 4 ? '<direction><direction-type><rehearsal>B</rehearsal></direction-type></direction>' : '';
      const body = three
        ? `${note('D', clef === 'G' ? 4 : 3, 256, 'quarter')}${rest(512, 'half')}`
        : `${note('C', clef === 'G' ? 4 : 3, 256, 'quarter')}${rest(512, 'half')}${rest(256, 'quarter')}`;
      return `${head}${mark}${markB}${body}`;
    });
    const result = composeWwhPerformance({ xml, sourcePath: '/tmp/metre-256.musicxml', seed: 3, output: 'all', edition: '7.2' });
    const performance = importWwhDuoMusicXml(result.files.find((file) => file.name.endsWith('-PERFORMANCE.musicxml'))!.contents);
    const audit = auditWwhMusicXml(result.files.find((file) => file.name.endsWith('-PERFORMANCE.musicxml'))!.contents, 'metre-256');
    assert.equal(audit.ok, true, audit.lines.join('; '));
    const bee = result.plan.sections.find((section) => section.id === 'src-B');
    assert.ok(bee);
    assert.equal(performance.guitar.measures[0]?.beats, 4);
    assert.equal(performance.guitar.measures[bee.barStart - 1]?.beats, 3);
    assert.equal(performance.guitar.measures[bee.barStart - 1]?.divisions, 256);
    assert.equal(performance.bass.measures[bee.barStart - 1]?.clefSign, 'F');
    const locked = result.plan.sections.filter((section) => section.outputType === 'performance' && section.sourceLocks);
    for (const section of locked) {
      for (const [part, name] of [
        [performance.guitar, result.score.guitar],
        [performance.bass, result.score.bass],
      ] as const) {
        const errors = compareLockedSpan(
          name.measures.slice((section.sourceBarStart ?? 1) - 1, (section.sourceBarStart ?? 1) - 1 + section.barCount),
          part.measures.slice(section.barStart - 1, section.barStart - 1 + section.barCount),
          name.name
        );
        assert.deepEqual(errors, [], section.id);
      }
    }
  });

  check('6/8 at 480 divisions uses a dotted quarter, not a 256-tick quarter', () => {
    const xml = duo('Compound 480', 4, (index, clef) => {
      const head = index === 0 ? attrs(clef, 480, 6, 8, -2) : '';
      const mark = clef === 'G' && index === 0 ? '<direction><direction-type><rehearsal>A</rehearsal></direction-type></direction><sound tempo="90"/>' : '';
      return `${head}${mark}${note('E', clef === 'G' ? 4 : 3, 720, 'quarter', 1)}${rest(720, 'quarter', 1)}`;
    });
    const result = composeWwhPerformance({ xml, sourcePath: '/tmp/compound-480.musicxml', seed: 4, output: 'all', edition: '7.2' });
    const file = result.files.find((item) => item.name.endsWith('-PERFORMANCE.musicxml'))!.contents;
    const audit = auditWwhMusicXml(file, 'compound-480');
    assert.equal(audit.ok, true, audit.lines.join('; '));
    assert.match(file, /<divisions>480<\/divisions>/);
    assert.match(file, /<duration>720<\/duration>/);
    assert.doesNotMatch(file, /<duration>256<\/duration>/);
    const performance = importWwhDuoMusicXml(file);
    const generated = result.plan.sections.find((section) => section.id === 'dev-A');
    assert.ok(generated);
    const bar = performance.guitar.measures[generated.barStart - 1]!;
    assert.equal(bar.beats, 6);
    assert.equal(bar.beatType, 8);
    assert.equal(bar.divisions, 480);
    assert.equal(bar.fifths, -2);
    assert.equal(bar.notes[0]?.dots, 1);
    assert.equal(bar.notes[0]?.duration, 720);
    assert.equal(performance.bass.measures[generated.barStart - 1]?.clefSign, 'F');
  });

  check('pickup stays short and the next generated bar is a full bar', () => {
    const xml = duo('Pickup 480', 3, (index, clef) => {
      const head = index === 0 ? attrs(clef, 480, 4, 4) : '';
      const implicit = index === 0 ? ' implicit="yes"' : '';
      const body = index === 0 ? note('G', clef === 'G' ? 4 : 3, 480, 'quarter') : `${note('A', clef === 'G' ? 4 : 3, 480, 'quarter')}${rest(1440, 'half', 1)}`;
      return `${head}${body}`.replace('<measure', '<measure'); 
      void implicit;
    }).replace('<measure number="1">', '<measure number="1" implicit="yes">').replace('<measure number="1">', '<measure number="1" implicit="yes">');
    const guitarPickup = duo('Pickup 480', 3, (index, clef) => {
      const head = index === 0 ? attrs(clef, 480, 4, 4, 0) : '';
      const mark = clef === 'G' && index === 0 ? '<direction><direction-type><rehearsal>A</rehearsal></direction-type></direction>' : '';
      const body =
        index === 0
          ? note('G', clef === 'G' ? 4 : 3, 480, 'quarter')
          : `${note('A', clef === 'G' ? 4 : 3, 1920, 'whole')}`;
      return `${head}${mark}${body}`;
    }).replace(/<measure number="1">/g, '<measure number="1" implicit="yes">');
    void xml;
    const result = composeWwhPerformance({
      xml: guitarPickup,
      sourcePath: '/tmp/pickup-480.musicxml',
      seed: 1,
      output: 'performance',
      edition: '7.2',
    });
    const file = result.files.find((item) => item.name.endsWith('-PERFORMANCE.musicxml'))!.contents;
    const audit = auditWwhMusicXml(file, 'pickup');
    assert.equal(audit.ok, true, audit.lines.join('; '));
    assert.ok(audit.pickupBars >= 2);
    const performance = importWwhDuoMusicXml(file);
    assert.equal(performance.guitar.measures[0]?.implicit, true);
    assert.equal(performance.guitar.measures[0]?.notes[0]?.duration, 480);
    assert.equal(performance.bass.measures[0]?.notes[0]?.duration, 480);
    const generated = result.plan.sections.find((section) => section.outputType === 'performance' && !section.sourceLocks);
    assert.ok(generated);
    const full = performance.guitar.measures[generated.barStart - 1]!;
    assert.equal(full.implicit, false);
    assert.equal(full.specTicks, 1920);
    assert.equal(full.notes.reduce((sum, item) => (item.chord ? sum : sum + item.duration), 0), 1920);
  });

  check('tempo change keeps dotted-quarter 78 and does not write quarter 78', () => {
    const xml = duo('Tempo Change', 4, (index, clef) => {
      const head = index === 0 ? attrs(clef, 256, 4, 4) : index === 2 ? attrs(clef, 256, 4, 4) : '';
      let tempo = '';
      if (clef === 'G' && index === 0) {
        tempo =
          '<direction><direction-type><rehearsal>A</rehearsal></direction-type></direction><direction><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>60</per-minute></metronome></direction-type><sound tempo="60"/></direction>';
      }
      if (clef === 'G' && index === 2) {
        tempo =
          '<direction><direction-type><rehearsal>B</rehearsal></direction-type></direction><direction><direction-type><metronome><beat-unit>quarter</beat-unit><beat-unit-dot/><per-minute>78</per-minute></metronome></direction-type><sound tempo="117"/></direction>';
      }
      return `${head}${tempo}${note('C', clef === 'G' ? 4 : 3, 1024, 'whole')}`;
    });
    const result = composeWwhPerformance({
      xml,
      sourcePath: '/tmp/tempo-change.musicxml',
      seed: 2,
      output: 'performance',
      edition: '7.2',
    });
    const file = result.files.find((item) => item.name.endsWith('-PERFORMANCE.musicxml'))!.contents;
    const audit = auditWwhMusicXml(file, 'tempo');
    assert.equal(audit.ok, true, audit.lines.join('; '));
    const metros = file.match(/<metronome>[\s\S]*?<\/metronome>/g) ?? [];
    assert.ok(metros.some((metro) => metro.includes('<beat-unit-dot/>') && metro.includes('<per-minute>78</per-minute>')));
    for (const metro of metros) {
      if (metro.includes('>78<')) assert.match(metro, /<beat-unit-dot\/>/);
    }
    assert.doesNotMatch(file, /<sound tempo="78"/);
    const performance = importWwhDuoMusicXml(file);
    const bee = result.plan.sections.find((section) => section.id === 'src-B');
    assert.ok(bee);
    assert.equal(performance.guitar.measures[bee.barStart - 1]?.tempo.perMinute, '78');
    assert.equal(performance.guitar.measures[bee.barStart - 1]?.tempo.dots, 1);
    assert.equal(performance.guitar.measures[bee.barStart - 1]?.tempo.soundTempo, '117');
    const errors = compareLockedSpan(
      result.score.guitar.measures.slice(2, 4),
      performance.guitar.measures.slice(bee.barStart - 1, bee.barStart - 1 + bee.barCount),
      'guitar B'
    ).concat(
      compareLockedSpan(
        result.score.bass.measures.slice(2, 4),
        performance.bass.measures.slice(bee.barStart - 1, bee.barStart - 1 + bee.barCount),
        'bass B'
      )
    );
    assert.deepEqual(errors, []);
  });

  check('title Black Aura does not select the curated V7.1 sketch', () => {
    const xml = duo('Black Aura', 4, (index, clef) => {
      const head = index === 0 ? attrs(clef, 480, 4, 4) : '';
      const mark = clef === 'G' && index === 0 ? '<direction><direction-type><rehearsal>A</rehearsal></direction-type></direction>' : '';
      return `${head}${mark}${note('C', clef === 'G' ? 4 : 3, 1920, 'whole')}`;
    });
    const result = composeWwhPerformance({
      xml,
      sourcePath: '/tmp/Black-Aura-portable.musicxml',
      seed: 7,
      output: 'all',
      edition: '7.2',
    });
    assert.equal(result.plan.version, '7.2');
    assert.equal(result.plan.experimentalSketch, true);
    assert.equal(result.plan.sections.some((section) => section.id === 'p-liquid'), false);
    assert.ok(result.files.every((file) => file.name.includes('V7.2')));
    assert.ok(result.files.some((file) => file.name === 'Black-Aura-portable-V7.2-RECORDING-LEADSHEET.musicxml'));
    const performance = result.files.find((file) => file.name.endsWith('-PERFORMANCE.musicxml'))!.contents;
    assert.match(performance, /EXPERIMENTAL TECHNICAL SKETCH/);
    assert.doesNotMatch(performance, /<duration>256<\/duration>/);
    const audit = auditWwhMusicXml(performance, 'named-black-aura');
    assert.equal(audit.ok, true, audit.lines.join('; '));
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
