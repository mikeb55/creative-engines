/**
 * {@link parseMusicXml} unit coverage (Node-safe DOM). Full harness chunk 4 — not smoke.
 */

import type { ParsedChart } from '../core/irealpro/parsedChart';
import { parseMusicXml, parsedChartToLeadSheet } from '../core/musicXmlImport';

const XML_META = `<?xml version="1.0"?>
<score-partwise version="3.1">
  <work><work-title>Fixture One</work-title></work>
  <identification>
    <creator type="composer">Fixture Composer</creator>
  </identification>
  <part-list><score-part id="P1"><part-name>P</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key><fifths>2</fifths><mode>major</mode></key>
        <time><beats>3</beats><beat-type>4</beat-type></time>
      </attributes>
    </measure>
  </part>
</score-partwise>`;

const XML_ONE_HARMONY = `<?xml version="1.0"?>
<score-partwise version="3.1">
  <part-list><score-part id="P1"><part-name>P</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key><fifths>0</fifths><mode>major</mode></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
      </attributes>
      <harmony>
        <root><root-step>F</root-step></root>
        <kind>dominant</kind>
      </harmony>
    </measure>
  </part>
</score-partwise>`;

const XML_MULTI_HARMONY = `<?xml version="1.0"?>
<score-partwise version="3.1">
  <part-list><score-part id="P1"><part-name>P</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
      </attributes>
      <harmony>
        <root><root-step>C</root-step></root>
        <kind>major</kind>
      </harmony>
    </measure>
    <measure number="2">
      <harmony>
        <root><root-step>G</root-step></root>
        <kind>dominant</kind>
      </harmony>
    </measure>
  </part>
</score-partwise>`;

function testMetadataAndMeter(): boolean {
  const c = parseMusicXml(XML_META);
  return (
    c.title === 'Fixture One' &&
    c.composer === 'Fixture Composer' &&
    c.key === 'D' &&
    c.meter !== null &&
    c.meter.num === 3 &&
    c.meter.den === 4 &&
    c.timeSignature !== null &&
    c.timeSignature.num === 3 &&
    c.timeSignature.den === 4 &&
    c.meter === c.timeSignature &&
    c.harmonies.length === 1 &&
    c.harmonies[0] === 'N.C.' &&
    c.barMeterMap &&
    Object.keys(c.barMeterMap).length === 0 &&
    c.tempo === null &&
    c.style === null &&
    c.sections.length === 0 &&
    c.repeatMarkers.length === 0 &&
    c.repeats.length === 0 &&
    c.measures.length === 1 &&
    c.measures[0]!.length === 0
  );
}

function testSingleHarmonyBar(): boolean {
  const c = parseMusicXml(XML_ONE_HARMONY);
  if (c.measures.length !== 1) return false;
  if (c.harmonies.length !== 1 || c.harmonies[0] !== 'F7') return false;
  const row = c.measures[0]!;
  if (row.length !== 1) return false;
  const [ch] = row;
  return (
    c.key === 'C' &&
    ch.symbol === 'F7' &&
    ch.rootNote === 'f' &&
    ch.chordQuality === '7' &&
    ch.barIndex === 0 &&
    ch.beatIndex === 0 &&
    ch.duration === 1
  );
}

function testMultiBarHarmonySequence(): boolean {
  const c = parseMusicXml(XML_MULTI_HARMONY);
  if (c.measures.length !== 2) return false;
  if (c.harmonies.join('|') !== 'C|G7') return false;
  const m0 = c.measures[0]!;
  const m1 = c.measures[1]!;
  if (m0.length !== 1 || m1.length !== 1) return false;
  const [a] = m0;
  const [b] = m1;
  return (
    a.symbol === 'C' &&
    a.rootNote === 'c' &&
    a.barIndex === 0 &&
    b.symbol === 'G7' &&
    b.rootNote === 'g' &&
    b.barIndex === 1
  );
}

function testParsedChartToLeadSheetStub(): boolean {
  try {
    parsedChartToLeadSheet({} as ParsedChart);
    return false;
  } catch (e) {
    return e instanceof Error && e.message === 'parsedChartToLeadSheet: not yet implemented';
  }
}

export function runMusicXmlImportTests(): { name: string; ok: boolean }[] {
  return [
    { name: 'MusicXML import: title / composer / key / meter', ok: testMetadataAndMeter() },
    { name: 'MusicXML import: single harmony bar', ok: testSingleHarmonyBar() },
    { name: 'MusicXML import: multi-bar harmony sequence', ok: testMultiBarHarmonySequence() },
    { name: 'MusicXML import: parsedChartToLeadSheet stub', ok: testParsedChartToLeadSheetStub() },
  ];
}
