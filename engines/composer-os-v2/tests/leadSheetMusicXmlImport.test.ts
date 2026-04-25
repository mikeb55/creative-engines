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

/** Stage 2 — P1 melody only, P2 `<harmony>` merged; P2 notes ignored for melody. */
const MELODY_P1_HARMONY_P2_XML = `<?xml version="1.0"?>
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1"><part-name>Lead</part-name></score-part>
    <score-part id="P2"><part-name>Comp</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>4</divisions><key><fifths>0</fifths><mode>major</mode></key><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>16</duration><voice>1</voice></note>
    </measure>
    <measure number="2">
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>16</duration><voice>1</voice></note>
    </measure>
  </part>
  <part id="P2">
    <measure number="1">
      <attributes><divisions>4</divisions></attributes>
      <harmony><root><root-step>F</root-step></root><kind>major</kind></harmony>
      <note><pitch><step>E</step><octave>3</octave></pitch><duration>16</duration><voice>1</voice></note>
    </measure>
    <measure number="2">
      <harmony><root><root-step>G</root-step></root><kind>major</kind></harmony>
      <note><pitch><step>F</step><octave>3</octave></pitch><duration>16</duration><voice>1</voice></note>
    </measure>
  </part>
</score-partwise>`;

/** Stage 2 regression — harmony only on P1; P2 notes-only should match one-part import of the same P1 slice. */
const HARMONY_P1_ONLY_SINGLE_PART_REFERENCE_XML = `<?xml version="1.0"?>
<score-partwise version="3.1">
  <part-list><score-part id="P1"><part-name>Lead</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>4</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <harmony><root><root-step>C</root-step></root><kind text="maj7">major-seventh</kind></harmony>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>16</duration><voice>1</voice></note>
    </measure>
  </part>
</score-partwise>`;

const HARMONY_P1_EMPTY_P2_XML = `<?xml version="1.0"?>
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1"><part-name>Lead</part-name></score-part>
    <score-part id="P2"><part-name>Comp</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>4</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <harmony><root><root-step>C</root-step></root><kind text="maj7">major-seventh</kind></harmony>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>16</duration><voice>1</voice></note>
    </measure>
  </part>
  <part id="P2">
    <measure number="1">
      <attributes><divisions>4</divisions></attributes>
      <note><pitch><step>B</step><octave>3</octave></pitch><duration>16</duration><voice>1</voice></note>
    </measure>
  </part>
</score-partwise>`;

/** Stage 2 edge — P2 longer than P1: extra measures ignored + warning; P2 bar-1 offset harmony. */
const P2_LONGER_AND_OFFSET_XML = `<?xml version="1.0"?>
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1"><part-name>Lead</part-name></score-part>
    <score-part id="P2"><part-name>Comp</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>4</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>16</duration><voice>1</voice></note>
    </measure>
  </part>
  <part id="P2">
    <measure number="1">
      <attributes><divisions>4</divisions></attributes>
      <harmony><root><root-step>D</root-step></root><kind>minor</kind><offset>8</offset></harmony>
      <note><pitch><step>C</step><octave>3</octave></pitch><duration>16</duration><voice>1</voice></note>
    </measure>
    <measure number="2">
      <harmony><root><root-step>E</root-step></root><kind>major</kind></harmony>
      <note><pitch><step>C</step><octave>3</octave></pitch><duration>16</duration><voice>1</voice></note>
    </measure>
  </part>
</score-partwise>`;

/** Stage 2 edge — duplicate same bar/beat/symbol on P1 and P2 (both tolerated). */
const DUPLICATE_HARMONY_P1_P2_XML = `<?xml version="1.0"?>
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1"><part-name>Lead</part-name></score-part>
    <score-part id="P2"><part-name>Comp</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>4</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <harmony><root><root-step>C</root-step></root><kind>major</kind></harmony>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>16</duration><voice>1</voice></note>
    </measure>
  </part>
  <part id="P2">
    <measure number="1">
      <attributes><divisions>4</divisions></attributes>
      <harmony><root><root-step>C</root-step></root><kind>major</kind></harmony>
      <note><pitch><step>E</step><octave>3</octave></pitch><duration>16</duration><voice>1</voice></note>
    </measure>
  </part>
</score-partwise>`;

const PHRASE_EXPRESSION_XML = `<?xml version="1.0"?>
<score-partwise version="3.1">
  <part-list><score-part id="P1"><part-name>Lead</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>4</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <direction><direction-type><wedge type="crescendo"/></direction-type></direction>
      <direction><direction-type><words>rit.</words></direction-type><offset>8</offset></direction>
      <note>
        <pitch><step>C</step><octave>4</octave></pitch><duration>8</duration><voice>1</voice>
        <tie type="start"/>
        <notations><tied type="start"/><slur type="start" number="1"/></notations>
      </note>
    </measure>
    <measure number="2">
      <direction><direction-type><wedge type="stop"/></direction-type></direction>
      <direction><sound tempo="88"/></direction>
      <note>
        <pitch><step>C</step><octave>4</octave></pitch><duration>8</duration><voice>1</voice>
        <tie type="stop"/>
        <notations><tied type="stop"/><slur type="stop" number="1"/><fermata/></notations>
      </note>
    </measure>
  </part>
</score-partwise>`;

const HARMONY_TIMELINE_XML = `<?xml version="1.0"?>
<score-partwise version="3.1">
  <part-list><score-part id="P1"><part-name>Lead</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>4</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <harmony>
        <root><root-step>C</root-step></root>
        <kind text="maj7">major-seventh</kind>
        <degree><degree-value>9</degree-value><degree-alter>0</degree-alter><degree-type>add</degree-type></degree>
      </harmony>
      <harmony>
        <offset>8</offset>
        <function>V</function>
        <kind>dominant</kind>
        <bass><bass-step>B</bass-step></bass>
      </harmony>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>16</duration><voice>1</voice></note>
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
    r.warnings.some((w) => /Scoped LeadSheet import|first-part voice 1 staff 1/i.test(w)) &&
    r.warnings.some((w) => /non-voice-1/i.test(w)) &&
    r.warnings.some((w) => /lyrics/i.test(w))
  );
}

/** Stage 2 — merge P2 harmony; melody and totalBars from P1 only. */
function testMelodyP1HarmonyP2Merged(): boolean {
  const r = importLeadSheetFromMusicXml(MELODY_P1_HARMONY_P2_XML);
  if (!r.ok || !r.leadSheet) return false;
  const ls = r.leadSheet;
  const midis = ls.melodyEvents.map((e) => e.midi).sort((a, b) => a - b);
  const p2OnlyMidi = 52;
  return (
    ls.totalBars === 2 &&
    ls.melodyEvents.length === 2 &&
    !midis.includes(p2OnlyMidi) &&
    ls.chordEvents.length === 2 &&
    ls.chordEvents.some((c) => c.bar === 1 && c.symbol === 'F' && c.beat === 0) &&
    ls.chordEvents.some((c) => c.bar === 2 && c.symbol === 'G' && c.beat === 0) &&
    (ls.importedHarmonyTimeline?.events.length ?? 0) === 2
  );
}

/** Stage 2 regression — P1-only harmony counts unchanged when P2 has no harmony. */
function testHarmonyP1EmptyP2MatchesSinglePartShape(): boolean {
  const ref = importLeadSheetFromMusicXml(HARMONY_P1_ONLY_SINGLE_PART_REFERENCE_XML);
  const dual = importLeadSheetFromMusicXml(HARMONY_P1_EMPTY_P2_XML);
  if (!ref.ok || !ref.leadSheet || !dual.ok || !dual.leadSheet) return false;
  return (
    dual.leadSheet.totalBars === ref.leadSheet.totalBars &&
    dual.leadSheet.chordEvents.length === ref.leadSheet.chordEvents.length &&
    dual.leadSheet.melodyEvents.length === ref.leadSheet.melodyEvents.length &&
    (dual.leadSheet.importedHarmonyTimeline?.events.length ?? 0) ===
      (ref.leadSheet.importedHarmonyTimeline?.events.length ?? 0)
  );
}

/** Stage 2 edge — extra P2 measures beyond P1 length ignored; `<offset>` on P2 harmony. */
function testP2LongerIgnoredAndOffsetHarmony(): boolean {
  const r = importLeadSheetFromMusicXml(P2_LONGER_AND_OFFSET_XML);
  if (!r.ok || !r.leadSheet) return false;
  const ls = r.leadSheet;
  const dm = ls.chordEvents.find((c) => c.symbol === 'Dm');
  return (
    ls.totalBars === 1 &&
    ls.chordEvents.length === 1 &&
    dm !== undefined &&
    Math.abs(dm.beat - 2) < 1e-6 &&
    r.warnings.some((w) => /Ignored non-first-part harmony past first-part length/i.test(w))
  );
}

/** Stage 2 edge — duplicate harmony on P1 and P2 yields two chord events (deterministic sort). */
function testDuplicateHarmonyP1P2BothPresent(): boolean {
  const r = importLeadSheetFromMusicXml(DUPLICATE_HARMONY_P1_P2_XML);
  if (!r.ok || !r.leadSheet) return false;
  return r.leadSheet.chordEvents.length === 2 && r.leadSheet.chordEvents.every((c) => c.symbol === 'C');
}

function testDeterministicImportShape(): boolean {
  const a = importLeadSheetFromMusicXml(SIMPLE_LEAD_SHEET_XML);
  const b = importLeadSheetFromMusicXml(SIMPLE_LEAD_SHEET_XML);
  if (!a.ok || !b.ok || !a.leadSheet || !b.leadSheet) return false;
  return JSON.stringify(a.leadSheet) === JSON.stringify(b.leadSheet);
}

function testParsesPhraseExpressionTimeline(): boolean {
  const r = importLeadSheetFromMusicXml(PHRASE_EXPRESSION_XML);
  if (!r.ok || !r.leadSheet) return false;
  const mergedTie = r.leadSheet.melodyEvents.length === 1 && Math.abs(r.leadSheet.melodyEvents[0]!.durationBeats - 4) < 1e-6;
  const hasSlurAndFermata = r.leadSheet.melodyEvents[0]?.slurStart === true && r.leadSheet.melodyEvents[0]?.fermata === true;
  const hasHairpin = (r.leadSheet.dynamicSpans?.length ?? 0) > 0 && r.leadSheet.dynamicSpans?.[0]?.kind === 'crescendo';
  const hasTempoDirections = (r.leadSheet.tempoDirections?.length ?? 0) >= 2;
  return mergedTie && hasSlurAndFermata && hasHairpin && hasTempoDirections;
}

function testParsesImportedHarmonyTimelineStorage(): boolean {
  const r = importLeadSheetFromMusicXml(HARMONY_TIMELINE_XML);
  if (!r.ok || !r.leadSheet) return false;
  const tl = r.leadSheet.importedHarmonyTimeline;
  if (!tl || tl.events.length !== 2) return false;
  const first = tl.events[0]!;
  const second = tl.events[1]!;
  return (
    first.time.bar === 1 &&
    Math.abs(first.time.beat - 0) < 1e-6 &&
    first.time.eventIndexInBar === 0 &&
    first.sourceMarker === 'root_based' &&
    first.kind.value === 'major-seventh' &&
    first.root?.step === 'C' &&
    first.degrees?.[0]?.type === 'add' &&
    second.time.bar === 1 &&
    Math.abs(second.time.beat - 2) < 1e-6 &&
    second.time.eventIndexInBar === 1 &&
    second.sourceMarker === 'numeral_based' &&
    second.root?.numeral === 'V' &&
    second.bass?.step === 'B'
  );
}

export function runLeadSheetMusicXmlImportTests(): { ok: boolean; name: string }[] {
  return [
    { ok: testParsesValidLeadSheetXml(), name: 'lead sheet import: parses valid MusicXML lead sheet' },
    { ok: testMissingOptionalFieldsStillImports(), name: 'lead sheet import: missing optional fields handled' },
    { ok: testUnsupportedComplexityHandledSafely(), name: 'lead sheet import: unsupported complexity safe warnings' },
    { ok: testDeterministicImportShape(), name: 'lead sheet import: deterministic parse result' },
    { ok: testParsesPhraseExpressionTimeline(), name: 'lead sheet import: ties/slurs/hairpins/tempo parsed to phrase timeline' },
    { ok: testParsesImportedHarmonyTimelineStorage(), name: 'lead sheet import: stores imported harmony timeline deterministically' },
    { ok: testMelodyP1HarmonyP2Merged(), name: 'lead sheet import (Stage 2): P1 melody + P2 harmony merged by measure index' },
    { ok: testHarmonyP1EmptyP2MatchesSinglePartShape(), name: 'lead sheet import (Stage 2): P1-only harmony unchanged with empty P2 harmony' },
    { ok: testP2LongerIgnoredAndOffsetHarmony(), name: 'lead sheet import (Stage 2): P2 longer than P1 ignored; P2 harmony offset uses P1 divisions' },
    { ok: testDuplicateHarmonyP1P2BothPresent(), name: 'lead sheet import (Stage 2): duplicate P1/P2 harmony both appear in chordEvents' },
  ];
}

