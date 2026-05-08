/**
 * MusicXML validator gate — element order + percussion displayOctave rules.
 * Imported by composer-os smoke (`runSmokeTests.ts`).
 */

import { validateMusicXml } from './musicXmlValidator';

function minimalScorePartwise(body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <work><work-title>Validator</work-title></work>
  <part-list>
    <score-part id="P1">
      <part-name>T</part-name>
      <score-instrument id="P1-I1"><instrument-name>T</instrument-name></score-instrument>
    </score-part>
  </part-list>
  ${body}
</score-partwise>`;
}

/** Valid unpitched note — canonical sibling order (same path exporter uses for percussion glyphs). */
function validUnpitchedNote(): string {
  return `
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>480</divisions>
        <key><fifths>0</fifths><mode>major</mode></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <staves>1</staves>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note>
        <unpitched>
          <display-step>C</display-step>
          <display-octave>4</display-octave>
        </unpitched>
        <duration>480</duration>
        <instrument id="P1-I1"/>
        <voice>1</voice>
        <type>quarter</type>
        <stem>up</stem>
        <notehead>x</notehead>
        <staff>1</staff>
      </note>
    </measure>
  </part>`;
}

export function runMusicXmlValidatorGateTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const goodOrder = validateMusicXml(minimalScorePartwise(validUnpitchedNote()), { silent: true });
  out.push({
    name: 'MusicXML validator: valid unpitched sibling order passes',
    ok: goodOrder.valid && goodOrder.errors.length === 0,
  });

  const badOrderXml = `
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>480</divisions>
        <key><fifths>0</fifths><mode>major</mode></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <staves>1</staves>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note>
        <unpitched>
          <display-step>C</display-step>
          <display-octave>4</display-octave>
        </unpitched>
        <voice>1</voice>
        <duration>480</duration>
        <instrument id="P1-I1"/>
        <type>quarter</type>
        <stem>up</stem>
        <notehead>x</notehead>
        <staff>1</staff>
      </note>
    </measure>
  </part>`;
  const badOrder = validateMusicXml(minimalScorePartwise(badOrderXml), { silent: true });
  out.push({
    name: 'MusicXML validator: voice/duration swap flagged',
    ok: !badOrder.valid && badOrder.errors.some((e) => /element order|sequence violated/i.test(e)),
  });

  const clefMeasure = `
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>480</divisions>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note>
        <pitch><step>C</step><octave>4</octave></pitch>
        <duration>480</duration>
        <voice>1</voice>
        <type>quarter</type>
      </note>
    </measure>
  </part>`;
  const clefOk = validateMusicXml(minimalScorePartwise(clefMeasure), { silent: true });
  out.push({
    name: 'MusicXML validator: clef inside attributes passes',
    ok: clefOk.valid,
  });

  const oct6 = validUnpitchedNote().replace('<display-octave>4</display-octave>', '<display-octave>6</display-octave>');
  const octBad = validateMusicXml(minimalScorePartwise(oct6), { silent: true });
  out.push({
    name: 'MusicXML validator: unpitched displayOctave 6 rejected',
    ok:
      !octBad.valid &&
      octBad.errors.some((e) => /displayOctave/i.test(e)),
  });

  return out;
}
