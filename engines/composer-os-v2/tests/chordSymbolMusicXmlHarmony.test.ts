/**
 * MusicXML harmony export regression: kind/@text, kind body, hidden degrees, slash bass.
 */

import {
  buildHarmonyXmlLine,
  harmonyDegreeXmlFromKindText,
  musicXmlKindContentFromKindText,
} from '../../core/chordSymbolMusicXml';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

export function runChordSymbolMusicXmlHarmonyTests(): { name: string; ok: boolean }[] {
  const tests: { name: string; ok: boolean }[] = [];

  tests.push({
    name: 'harmony: no standalone <text> element',
    ok: (() => {
      const x = buildHarmonyXmlLine('Fmaj7#11', { staffNumber: 1 });
      return !x.includes('<text>');
    })(),
  });

  tests.push({
    name: 'Fmaj7#11: kind@text maj7#11, other, hidden #11 degree',
    ok: (() => {
      const x = buildHarmonyXmlLine('Fmaj7#11');
      assert(x.includes('kind text="maj7#11"'), 'kind text');
      assert(x.includes('>other<') && x.includes('</kind>'), 'kind body');
      assert(x.includes('print-object="no"'), 'print-object');
      assert(x.includes('<degree-value>11</degree-value>'), 'degree 11');
      assert(x.includes('<degree-alter>1</degree-alter>'), 'alter 11');
      return true;
    })(),
  });

  tests.push({
    name: 'G13sus: other, 13sus text, subtract/add 4, degree 13, no <text>',
    ok: (() => {
      const x = buildHarmonyXmlLine('G13sus');
      assert(x.includes('kind text="13sus"'), 'kind text');
      assert(x.includes('>other<'), 'kind');
      assert(x.includes('<degree-type>subtract</degree-type>'), 'subtract');
      assert(x.includes('<degree-value>4</degree-value>'), 'add 4');
      assert(x.includes('<degree-value>13</degree-value>'), 'degree 13');
      assert(!x.includes('<text>'), 'no text');
      return true;
    })(),
  });

  tests.push({
    name: 'C6/9: kind text 6/9, other, hidden add 9',
    ok: (() => {
      const x = buildHarmonyXmlLine('C6/9');
      assert(x.includes('kind text="6/9"'), 'kind text');
      assert(x.includes('>other<'), 'kind');
      assert(x.includes('<degree-value>9</degree-value>'), 'degree 9');
      assert(x.includes('print-object="no"'), 'hidden');
      return true;
    })(),
  });

  tests.push({
    name: 'A7alt: other, 7alt text, b5/#5/b9/#9 degrees',
    ok: (() => {
      const x = buildHarmonyXmlLine('A7alt');
      assert(x.includes('kind text="7alt"'), 'kind text');
      assert(x.includes('>other<'), 'kind');
      assert(x.includes('<degree-value>9</degree-value>'), '9');
      assert(x.includes('<degree-value>5</degree-value>'), '5');
      const deg = harmonyDegreeXmlFromKindText('7alt');
      assert(deg.includes('degree-type>alter'), 'alter');
      return true;
    })(),
  });

  tests.push({
    name: 'Dm9/A: slash bass, minor-ninth, m9 kind text',
    ok: (() => {
      const x = buildHarmonyXmlLine('Dm9/A');
      assert(x.includes('<bass-step>A</bass-step>'), 'bass');
      assert(x.includes('kind text="m9"'), 'kind text');
      assert(x.includes('>minor-ninth<') || x.includes('minor-ninth'), 'minor-ninth');
      return true;
    })(),
  });

  tests.push({
    name: 'musicXmlKindContentFromKindText: maj9 -> major-ninth',
    ok: musicXmlKindContentFromKindText('maj9') === 'major-ninth',
  });

  tests.push({
    name: 'musicXmlKindContentFromKindText: m7b5 -> half-diminished',
    ok: musicXmlKindContentFromKindText('m7b5') === 'half-diminished',
  });

  return tests;
}
