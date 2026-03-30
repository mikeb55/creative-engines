/**
 * Composer OS V2 — Export subsystem tests
 */

import { exportScoreModelToMusicXml, exportToMusicXml } from '../core/export/musicxmlExporter';
import { validateMusicXmlSchema, reParseMusicXml } from '../core/export/musicxmlValidation';
import { checkSibeliusSafe } from '../core/export/sibeliusSafeProfile';
import {
  formatChordSymbolForDisplay,
  parseChordRootAndMusicXmlKindText,
  parseChordForMusicXmlHarmony,
} from '../core/export/chordSymbolMusicXml';
import { validateExportedMusicXmlBarMath } from '../core/export/validateMusicXmlBarMath';
import { validateExportIntegrity } from '../core/export/exportHardening';
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
    a.kindText === 'm9' &&
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
  return d.kindText === 'm9' && g.kindText === '13' && alt.kindText === '7alt';
}

function testSlashChordPreservesBass(): boolean {
  const x = parseChordForMusicXmlHarmony('Cmaj7/E');
  return x.rootStep === 'C' && x.kindText === 'maj7' && x.bassStep === 'E' && x.bassAlter === 0;
}

function testLeadSheetChordKindSuffixFormatting(): boolean {
  const g = parseChordRootAndMusicXmlKindText('Gmajor');
  const slash = parseChordForMusicXmlHarmony('Dmajor/F#');
  const cm7 = parseChordRootAndMusicXmlKindText('Cmajor7');
  const dm7 = parseChordRootAndMusicXmlKindText('Dminor7');
  return (
    g.rootStep === 'G' &&
    g.kindText === '' &&
    slash.rootStep === 'D' &&
    slash.kindText === '' &&
    slash.bassStep === 'F' &&
    slash.bassAlter === 1 &&
    cm7.kindText === 'maj7' &&
    dm7.kindText === 'm7'
  );
}

function testFormatChordSymbolForDisplayLeadSheet(): boolean {
  return (
    formatChordSymbolForDisplay('Gmajor') === 'G' &&
    formatChordSymbolForDisplay('Dmajor/F#') === 'D/F#' &&
    formatChordSymbolForDisplay('Cmajor7') === 'Cmaj7' &&
    formatChordSymbolForDisplay('Dminor7') === 'Dm7' &&
    formatChordSymbolForDisplay('Cmaj7/E') === 'Cmaj7/E'
  );
}

function testExporterUsesEmptyKindForPlainMajor(): boolean {
  const m = createMeasure(1, 'Gmajor');
  addEvent(m, createNote(60, 0, 4));
  const score = createScore('Lead sheet major', [{
    id: 'p1',
    name: 'Part 1',
    instrumentIdentity: 'guitar',
    midiProgram: 27,
    clef: 'treble',
    measures: [m],
  }]);
  const r = exportScoreModelToMusicXml(score);
  const xml = r.xml ?? '';
  return (
    r.success &&
    xml.includes('<kind text="">major</kind>') &&
    !xml.includes('kind text="major"') &&
    !xml.includes('<kind text=""/>') &&
    !xml.includes('<kind text="" />')
  );
}

/** Regression: rounding each duration independently used to sum to 15 in some bars; span-based export must sum to 16. */
/** Validator must count `<note dynamics="…">` (regex used to miss these → false 15≠16). */
function testBarMathIncludesNotesWithAttributes(): boolean {
  // divisions=480 → full bar = 1920; same proportion as old 14+2=16 (rest + note)
  const inner = `<harmony/><note><rest/><duration>1680</duration><voice>1</voice></note>
        <note dynamics="30.00"><pitch><step>C</step><octave>4</octave></pitch><duration>240</duration><voice>1</voice></note>`;
  const v = validateExportedMusicXmlBarMath(
    `<?xml?><score-partwise><part id="guitar"><measure number="1"><attributes><divisions>480</divisions><time><beats>4</beats></time></attributes>${inner}</measure></part></score-partwise>`
  );
  return v.valid;
}

/** V3.4e — extract measure numbers in document order per part */
function measureNumbersByPartId(xml: string): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  const partBlocks = xml.match(/<part id="([^"]+)"[\s\S]*?<\/part>/g) ?? [];
  for (const pb of partBlocks) {
    const id = pb.match(/^<part id="([^"]+)"/)?.[1] ?? '';
    out[id] = [...pb.matchAll(/<measure[^>]*\snumber="(\d+)"/g)].map((m) => parseInt(m[1], 10));
  }
  return out;
}

function assertSequentialOneToN(nums: number[]): boolean {
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] !== i + 1) return false;
  }
  return nums.length > 0;
}

function makeMinimalDuoScore(measureCount: number, opts?: { rehearsal?: boolean }): ReturnType<typeof createScore> {
  const rot = ['Dmin9', 'G13', 'Cmaj9', 'A7alt'];
  const g: PartModel['measures'] = [];
  const b: PartModel['measures'] = [];
  for (let bar = 1; bar <= measureCount; bar++) {
    const ch = rot[(bar - 1) % rot.length]!;
    const rm =
      opts?.rehearsal && (bar === 1 || bar === 5 || bar === 9 || bar === 13 || bar === 17 || bar === 21 || bar === 25 || bar === 29)
        ? bar === 1 || bar === 9 || bar === 17 || bar === 25
          ? 'A'
          : 'B'
        : undefined;
    const gm = createMeasure(bar, ch, rm);
    const bm = createMeasure(bar, ch, rm);
    addEvent(gm, createNote(60, 0, 4));
    addEvent(bm, createNote(40, 0, 4));
    g.push(gm);
    b.push(bm);
  }
  const score = createScore(`V34e ${measureCount}b`, [
    {
      id: 'guitar',
      name: 'Guitar',
      instrumentIdentity: 'clean_electric_guitar',
      midiProgram: 27,
      clef: 'treble',
      measures: g,
    },
    {
      id: 'bass',
      name: 'Bass',
      instrumentIdentity: 'acoustic_upright_bass',
      midiProgram: 32,
      clef: 'bass',
      measures: b,
    },
  ]);
  score.keySignature = { fifths: -1, mode: 'major', hideKeySignature: false };
  return score;
}

/** V3.4e — 8-bar duo: consecutive measure numbers, integrity gate, bar math */
function testV34eEightBarDuoMeasureNumbers(): boolean {
  const score = makeMinimalDuoScore(8, { rehearsal: true });
  const r = exportScoreModelToMusicXml(score);
  if (!r.success || !r.xml) return false;
  const integ = validateExportIntegrity(r.xml);
  if (!integ.valid) return false;
  const byPart = measureNumbersByPartId(r.xml);
  const g = byPart['guitar'] ?? [];
  const bs = byPart['bass'] ?? [];
  if (g.length !== 8 || bs.length !== 8) return false;
  if (!assertSequentialOneToN(g) || !assertSequentialOneToN(bs)) return false;
  const mx = validateExportedMusicXmlBarMath(r.xml);
  return mx.valid;
}

/** V3.4e — 32-bar duo: same guarantees at long form length */
function testV34eThirtyTwoBarDuoMeasureNumbers(): boolean {
  const score = makeMinimalDuoScore(32, { rehearsal: true });
  const r = exportScoreModelToMusicXml(score);
  if (!r.success || !r.xml) return false;
  const integ = validateExportIntegrity(r.xml);
  if (!integ.valid) return false;
  const byPart = measureNumbersByPartId(r.xml);
  const g = byPart['guitar'] ?? [];
  const bs = byPart['bass'] ?? [];
  if (g.length !== 32 || bs.length !== 32) return false;
  if (!assertSequentialOneToN(g) || !assertSequentialOneToN(bs)) return false;
  return validateExportedMusicXmlBarMath(r.xml).valid;
}

/** V3.4e — model indices out of array order still export as measure 1..n in score order */
function testV34eExportSortsMeasuresThenNumbersSequentially(): boolean {
  const a = createMeasure(3, 'Cmaj7');
  const c = createMeasure(1, 'Dmin9');
  const b = createMeasure(2, 'G13');
  addEvent(a, createNote(60, 0, 4));
  addEvent(b, createNote(62, 0, 4));
  addEvent(c, createNote(64, 0, 4));
  const part: PartModel = {
    id: 'guitar',
    name: 'G',
    instrumentIdentity: 'clean_electric_guitar',
    midiProgram: 27,
    clef: 'treble',
    measures: [a, b, c],
  };
  const score = createScore('Order test', [part]);
  const r = exportScoreModelToMusicXml(score);
  if (!r.success || !r.xml) return false;
  const nums = measureNumbersByPartId(r.xml)['guitar'] ?? [];
  return nums.length === 3 && nums[0] === 1 && nums[1] === 2 && nums[2] === 3;
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
    ['Lead sheet chord kind suffix formatting (major/minor/maj7)', testLeadSheetChordKindSuffixFormatting],
    ['formatChordSymbolForDisplay lead-sheet strings', testFormatChordSymbolForDisplayLeadSheet],
    ['Exporter: plain major uses empty kind text (no "major")', testExporterUsesEmptyKindForPlainMajor],
    ['Bar math: notes with dynamics attribute counted', testBarMathIncludesNotesWithAttributes],
    ['Exporter round-trip divisions per voice (Bacharach-shaped bar)', testExporterRoundTripDivisionsPerVoice],
    ['V3.4e: 8-bar duo sequential measure numbers + integrity', testV34eEightBarDuoMeasureNumbers],
    ['V3.4e: 32-bar duo sequential measure numbers', testV34eThirtyTwoBarDuoMeasureNumbers],
    ['V3.4e: out-of-order measure indices export 1..n', testV34eExportSortsMeasuresThenNumbersSequentially],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
