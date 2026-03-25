/**
 * Composer OS V2 — Export subsystem tests
 */

import { exportScoreModelToMusicXml, exportToMusicXml } from '../core/export/musicxmlExporter';
import { validateMusicXmlSchema, reParseMusicXml } from '../core/export/musicxmlValidation';
import { checkSibeliusSafe } from '../core/export/sibeliusSafeProfile';
import { parseChordRootAndMusicXmlKindText } from '../core/export/chordSymbolMusicXml';
import { validateExportedMusicXmlBarMath } from '../core/export/validateMusicXmlBarMath';
import { createMeasure, createNote, createRest, addEvent, createScore } from '../core/score-model/scoreEventBuilder';
import type { PartModel } from '../core/score-model/scoreModelTypes';
import { MEASURE_DIVISIONS } from '../core/score-model/scoreModelTypes';

function testMusicXmlExporterReturnsXml(): boolean {
  const m = createMeasure(1, 'Cmaj7');
  addEvent(m, createNote(60, 0, 4));
  const score = createScore('Minimal', [{
    id: 'p1',
    name: 'Part 1',
    instrumentIdentity: 'guitar',
    midiProgram: 27,
    clef: 'treble',
    measures: [m],
  }]);
  const r = exportScoreModelToMusicXml(score);
  return r.success && r.xml !== undefined && r.xml.includes('score-partwise');
}

/** GM Acoustic Bass = 0-based 32 → MusicXML midi-program 33 */
function testBassMusicXmlUsesAcousticBassMidi(): boolean {
  const m = createMeasure(1, 'Cmaj7');
  addEvent(m, createNote(40, 0, 4));
  const score = createScore('Bass test', [{
    id: 'bass',
    name: 'Acoustic Upright Bass',
    instrumentIdentity: 'acoustic_upright_bass',
    midiProgram: 32,
    clef: 'bass',
    measures: [m],
  }]);
  const r = exportScoreModelToMusicXml(score);
  const xml = r.xml ?? '';
  const bassPartList = xml.match(/<score-part id="bass"[\s\S]*?<\/score-part>/)?.[0] ?? '';
  return (
    r.success &&
    bassPartList.includes('<midi-program>33</midi-program>') &&
    !bassPartList.toLowerCase().includes('choir')
  );
}

function testSchemaValidationPassesForValid(): boolean {
  const xml = '<?xml?><score-partwise version="3.1"/>';
  const r = validateMusicXmlSchema(xml);
  return r.valid;
}

function testSchemaValidationFailsForInvalid(): boolean {
  const xml = '<?xml?><invalid-root/>';
  const r = validateMusicXmlSchema(xml);
  return !r.valid;
}

function testReParseReturnsResult(): boolean {
  const xml = '<?xml?><score-partwise><part/><measure/></score-partwise>';
  const r = reParseMusicXml(xml);
  return typeof r.valid === 'boolean';
}

function testSibeliusSafePassesForValid(): boolean {
  const xml = '<?xml?><score-partwise/>';
  const r = checkSibeliusSafe(xml);
  return r.safe;
}

function testSibeliusSafeFailsForInvalid(): boolean {
  const xml = '<?xml?><invalid/>';
  const r = checkSibeliusSafe(xml);
  return !r.safe;
}

function testChordKindTextIsSuffixNotFullSymbol(): boolean {
  const a = parseChordRootAndMusicXmlKindText('Dmin9');
  const b = parseChordRootAndMusicXmlKindText('G13');
  const c = parseChordRootAndMusicXmlKindText('A7alt');
  const bb = parseChordRootAndMusicXmlKindText('Bbm7');
  return (
    a.rootStep === 'D' &&
    a.kindText === 'min9' &&
    b.rootStep === 'G' &&
    b.kindText === '13' &&
    c.rootStep === 'A' &&
    c.kindText === '7alt' &&
    bb.rootStep === 'B' &&
    bb.rootAlter === -1 &&
    bb.kindText === 'm7'
  );
}

function testDuplicateChordRootStripped(): boolean {
  const d = parseChordRootAndMusicXmlKindText('DDmin9');
  const g = parseChordRootAndMusicXmlKindText('GG13');
  const alt = parseChordRootAndMusicXmlKindText('AA7alt');
  return d.kindText === 'min9' && g.kindText === '13' && alt.kindText === '7alt';
}

function testSlashChordPreservesBass(): boolean {
  const x = parseChordRootAndMusicXmlKindText('Cmaj7/E');
  return x.rootStep === 'C' && x.kindText === 'maj7/E';
}

/** Regression: rounding each duration independently used to sum to 15 in some bars; span-based export must sum to 16. */
/** Validator must count `<note dynamics="…">` (regex used to miss these → false 15≠16). */
function testBarMathIncludesNotesWithAttributes(): boolean {
  const inner = `<harmony/><note><rest/><duration>14</duration><voice>1</voice></note>
        <note dynamics="30.00"><pitch><step>C</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice></note>`;
  const v = validateExportedMusicXmlBarMath(
    `<?xml?><score-partwise><part id="guitar"><measure number="1"><attributes><divisions>4</divisions><time><beats>4</beats></time></attributes>${inner}</measure></part></score-partwise>`
  );
  return v.valid;
}

function testExporterRoundTripDivisionsPerVoice(): boolean {
  const m = createMeasure(1, 'Dmin9');
  addEvent(m, createNote(60, 0, 0.5));
  addEvent(m, createNote(62, 0.5, 0.25));
  addEvent(m, createNote(64, 0.75, 1.25));
  addEvent(m, createRest(2, 0.5));
  addEvent(m, createNote(65, 2.5, 1.5));
  const part: PartModel = {
    id: 'guitar',
    name: 'Guitar',
    instrumentIdentity: 'clean_electric_guitar',
    midiProgram: 27,
    clef: 'treble',
    measures: [m],
  };
  const score = createScore('Span test', [part], {});
  const r = exportScoreModelToMusicXml(score);
  if (!r.success || !r.xml) return false;
  const v = validateExportedMusicXmlBarMath(r.xml);
  if (!v.valid || !v.sums) return false;
  return v.sums['guitar']?.[1]?.[1] === MEASURE_DIVISIONS;
}

export function runExportTests(): { name: string; ok: boolean }[] {
  return [
    ['MusicXML exporter returns XML', testMusicXmlExporterReturnsXml],
    ['Bass MusicXML uses acoustic bass MIDI (not vocal)', testBassMusicXmlUsesAcousticBassMidi],
    ['Schema validation passes for valid', testSchemaValidationPassesForValid],
    ['Schema validation fails for invalid', testSchemaValidationFailsForInvalid],
    ['Re-parse returns result', testReParseReturnsResult],
    ['Sibelius safe passes for valid', testSibeliusSafePassesForValid],
    ['Sibelius safe fails for invalid', testSibeliusSafeFailsForInvalid],
    ['Chord kind text is suffix (root once)', testChordKindTextIsSuffixNotFullSymbol],
    ['Duplicate chord root stripped for kind text', testDuplicateChordRootStripped],
    ['Slash chord bass preserved in kind text', testSlashChordPreservesBass],
    ['Bar math: notes with dynamics attribute counted', testBarMathIncludesNotesWithAttributes],
    ['Exporter round-trip divisions per voice (Bacharach-shaped bar)', testExporterRoundTripDivisionsPerVoice],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
