import { importLeadSheetFromMusicXml } from '../core/lead-sheet/leadSheetMusicXmlImport';

const SIMPLE_LEAD_SHEET_XML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <work><work-title>Simple Lead</work-title></work>
  <identification><creator type="composer">Test Composer</creator></identification>
  <part-list><score-part id="P1"><part-name>Lead</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <key><fifths>0</fifths><mode>major</mode></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
      </attributes>
      <direction><sound tempo="120"/></direction>
      <harmony>
        <root><root-step>C</root-step></root>
        <kind text="maj7">major-seventh</kind>
      </harmony>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>8</duration><voice>1</voice></note>
    </measure>
    <measure number="2">
      <harmony>
        <root><root-step>F</root-step></root>
        <kind text="7">dominant</kind>
      </harmony>
      <barline location="left"><repeat direction="forward"/></barline>
      <barline location="right"><repeat direction="backward"/></barline>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>16</duration><voice>1</voice></note>
    </measure>
  </part>
</score-partwise>`;

const MINIMAL_OPTIONALS_MISSING_XML = `<?xml version="1.0"?>
<score-partwise version="3.1">
  <part-list><score-part id="P1"><part-name>Lead</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>2</divisions><time><beats>3</beats><beat-type>4</beat-type></time></attributes>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice></note>
    </measure>
  </part>
</score-partwise>`;

const UNSUPPORTED_COMPLEXITY_XML = `<?xml version="1.0"?>
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1"><part-name>Lead</part-name></score-part>
    <score-part id="P2"><part-name>Piano</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>4</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>2</voice></note>
      <note><lyric><text>la</text></lyric><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
    </measure>
  </part>
  <part id="P2">
    <measure number="1">
      <note><pitch><step>C</step><octave>3</octave></pitch><duration>16</duration><voice>1</voice></note>
    </measure>
  </part>
</score-partwise>`;

function testParsesValidLeadSheetXml(): boolean {
  const r = importLeadSheetFromMusicXml(SIMPLE_LEAD_SHEET_XML);
  if (!r.ok || !r.leadSheet) return false;
  return (
    r.leadSheet.title === 'Simple Lead' &&
    r.leadSheet.composer === 'Test Composer' &&
    r.leadSheet.tempoBpm === 120 &&
    r.leadSheet.timeSignature?.beats === 4 &&
    r.leadSheet.chordEvents.length === 2 &&
    r.leadSheet.chordEvents[0].symbol === 'Cmaj7' &&
    r.leadSheet.melodyEvents.length === 4 &&
    r.leadSheet.repeatMarkers.length >= 2
  );
}

function testMissingOptionalFieldsStillImports(): boolean {
  const r = importLeadSheetFromMusicXml(MINIMAL_OPTIONALS_MISSING_XML);
  if (!r.ok || !r.leadSheet) return false;
  return (
    r.leadSheet.title === undefined &&
    r.leadSheet.composer === undefined &&
    r.leadSheet.tempoBpm === undefined &&
    r.leadSheet.totalBars === 1 &&
    r.leadSheet.melodyEvents.length === 1
  );
}

function testUnsupportedComplexityHandledSafely(): boolean {
  const r = importLeadSheetFromMusicXml(UNSUPPORTED_COMPLEXITY_XML);
  if (!r.ok || !r.leadSheet) return false;
  return (
    r.leadSheet.totalBars === 1 &&
    r.leadSheet.melodyEvents.length === 1 &&
    r.warnings.some((w) => /extra parts\/staves/i.test(w)) &&
    r.warnings.some((w) => /non-voice-1/i.test(w)) &&
    r.warnings.some((w) => /lyrics/i.test(w))
  );
}

function testDeterministicImportShape(): boolean {
  const a = importLeadSheetFromMusicXml(SIMPLE_LEAD_SHEET_XML);
  const b = importLeadSheetFromMusicXml(SIMPLE_LEAD_SHEET_XML);
  if (!a.ok || !b.ok || !a.leadSheet || !b.leadSheet) return false;
  return JSON.stringify(a.leadSheet) === JSON.stringify(b.leadSheet);
}

export function runLeadSheetMusicXmlImportTests(): { ok: boolean; name: string }[] {
  return [
    { ok: testParsesValidLeadSheetXml(), name: 'lead sheet import: parses valid MusicXML lead sheet' },
    { ok: testMissingOptionalFieldsStillImports(), name: 'lead sheet import: missing optional fields handled' },
    { ok: testUnsupportedComplexityHandledSafely(), name: 'lead sheet import: unsupported complexity safe warnings' },
    { ok: testDeterministicImportShape(), name: 'lead sheet import: deterministic parse result' },
  ];
}

