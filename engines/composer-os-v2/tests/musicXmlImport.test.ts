/**
 * {@link parseMusicXml} unit coverage (Node-safe DOM). Full harness chunk 4 — not smoke.
 */

import { parseMusicXml, parsedChartToLeadSheet } from '../core/musicXmlImport';
import { importMusicXmlToImportedSong } from '../core/musicXmlDeepImport';
import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';

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

function testParsedChartToLeadSheet(): boolean {
  const c = parseMusicXml(XML_META);
  const ls = parsedChartToLeadSheet(c);
  return (
    ls.sourceFormat === 'musicxml' &&
    ls.title === 'Fixture One' &&
    ls.composer === 'Fixture Composer' &&
    ls.keySignature?.fifths === 2 &&
    ls.keySignature?.mode === 'major' &&
    ls.timeSignature?.beats === 3 &&
    ls.timeSignature?.beatType === 4 &&
    ls.totalBars === 1 &&
    ls.chordEvents.length === 1 &&
    ls.chordEvents[0]!.symbol === 'N.C.' &&
    ls.chordEvents[0]!.bar === 1
  );
}

export function runMusicXmlImportTests(): { name: string; ok: boolean }[] {
  return [
    { name: 'MusicXML import: title / composer / key / meter', ok: testMetadataAndMeter() },
    { name: 'MusicXML import: single harmony bar', ok: testSingleHarmonyBar() },
    { name: 'MusicXML import: multi-bar harmony sequence', ok: testMultiBarHarmonySequence() },
    { name: 'MusicXML import: parsedChartToLeadSheet', ok: testParsedChartToLeadSheet() },
  ];
}

const V65_P3_DEEP_IMPORT_XML = `<?xml version="1.0"?>
<score-partwise version="3.1">
  <work><work-title>V65 P3 Deep Import Fixture</work-title></work>
  <part-list>
    <score-part id="P1"><part-name>Guitar</part-name></score-part>
    <score-part id="P2"><part-name>Double Bass</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>4</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <direction><direction-type><rehearsal>Intro</rehearsal></direction-type><sound tempo="132"/></direction>
      <harmony><root><root-step>C</root-step></root><kind text="maj7">major-seventh</kind></harmony>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>16</duration><voice>1</voice></note>
    </measure>
    <measure number="2">
      <harmony><root><root-step>D</root-step></root><kind text="m7">minor-seventh</kind></harmony>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>16</duration><voice>1</voice></note>
    </measure>
    <measure number="3">
      <harmony><root><root-step>G</root-step></root><kind text="7">dominant</kind></harmony>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>16</duration><voice>1</voice></note>
    </measure>
    <measure number="4">
      <harmony><root><root-step>C</root-step></root><kind text="maj7">major-seventh</kind></harmony>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>16</duration><voice>1</voice></note>
    </measure>
    <measure number="5">
      <attributes><time><beats>7</beats><beat-type>8</beat-type></time></attributes>
      <direction><direction-type><rehearsal>Bridge</rehearsal></direction-type></direction>
      <harmony><root><root-step>F</root-step></root><kind text="maj7">major-seventh</kind></harmony>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>14</duration><voice>1</voice></note>
    </measure>
    <measure number="6">
      <harmony><root><root-step>B</root-step><root-alter>-1</root-alter></root><kind text="7">dominant</kind></harmony>
      <note><pitch><step>B</step><alter>-1</alter><octave>4</octave></pitch><duration>14</duration><voice>1</voice></note>
    </measure>
    <measure number="7">
      <harmony><root><root-step>E</root-step><root-alter>-1</root-alter></root><kind text="maj7">major-seventh</kind></harmony>
      <note><pitch><step>E</step><alter>-1</alter><octave>4</octave></pitch><duration>14</duration><voice>1</voice></note>
    </measure>
    <measure number="8">
      <harmony><root><root-step>A</root-step><root-alter>-1</root-alter></root><kind text="7">dominant</kind></harmony>
      <note><pitch><step>A</step><alter>-1</alter><octave>4</octave></pitch><duration>14</duration><voice>1</voice></note>
    </measure>
  </part>
  <part id="P2">
    ${Array.from({ length: 8 }, (_, i) => `<measure number="${i + 1}"><note><pitch><step>C</step><octave>2</octave></pitch><duration>16</duration><voice>1</voice></note></measure>`).join('\n    ')}
  </part>
</score-partwise>`;

function testV65P3DeepImportToSongModeGolden82001(): boolean {
  const imported = importMusicXmlToImportedSong(V65_P3_DEEP_IMPORT_XML, {
    id: 'v65_p3_82001',
    title: 'V65 P3 82001',
  });
  if (imported.lockedHarmonyBars.join('|') !== 'Cmaj7|Dm7|G7|Cmaj7|Fmaj7|Bb7|Ebmaj7|Ab7') return false;
  if (imported.song.sections.length !== 2) return false;
  if (imported.song.sections[0]?.label !== 'Intro' || imported.song.sections[1]?.label !== 'Bridge') return false;
  if (imported.song.sections[1]?.meterMap?.[0]?.meter !== '7/8') return false;
  if (imported.song.globalDefaults.tempo !== 132) return false;

  const result = runGoldenPathOnce(82001, {
    presetId: 'guitar_bass_duo',
    scoreTitle: 'V65 P3 Deep Import Golden',
    totalBars: 8,
    harmonyMode: 'custom_locked',
    chordProgressionText: imported.lockedHarmonyBars.join('|'),
    lockedHarmonyBarsRaw: imported.lockedHarmonyBars,
    parsedChordBars: imported.lockedHarmonyBars,
    song: imported.song,
  });
  if (!result.score || !result.context.generationMetadata.sectionArchitectureWired) return false;
  const guitar = result.score.parts.find((p) => p.id === 'guitar');
  const scoreChords = guitar?.measures.map((m) => m.chord ?? '').join('|');
  return scoreChords === imported.lockedHarmonyBars.join('|');
}

export function runMusicXmlDeepImportV65P3GoldenTests(): { name: string; ok: boolean }[] {
  return [
    {
      name: 'V65 P3 — MusicXML deep import drives Song Mode seed 82001',
      ok: testV65P3DeepImportToSongModeGolden82001(),
    },
  ];
}
