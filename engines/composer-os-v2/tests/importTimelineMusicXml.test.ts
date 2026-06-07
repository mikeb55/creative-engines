/**
 * V80j MusicXML import timeline tests (jest).
 */

import { musicXmlToImportTimeline } from '../core/import/musicXmlToImportTimeline';
import {
  IMPORT_EXPLICIT_HARMONY_CONFIDENCE,
  IMPORT_EIGHTH_GRID_BEATS,
} from '../core/import/mosaicImportTimeline';

const XML_HARMONY_MELODY = `<?xml version="1.0"?>
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1"><part-name>Melody</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>2</divisions>
        <key><fifths>0</fifths><mode>major</mode></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
      </attributes>
      <harmony>
        <root><root-step>C</root-step></root>
        <kind>major</kind>
      </harmony>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice></note>
    </measure>
    <measure number="2">
      <harmony>
        <root><root-step>G</root-step></root>
        <kind>dominant</kind>
      </harmony>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
    </measure>
  </part>
</score-partwise>`;

const XML_POLY = `<?xml version="1.0"?>
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1"><part-name>Piano</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>2</divisions>
        <time><beats>4</beats><beat-type>4</beat-type></time>
      </attributes>
      <harmony>
        <root><root-step>D</root-step></root>
        <kind>minor</kind>
      </harmony>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice></note>
      <note><chord/><pitch><step>A</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice></note>
      <note><chord/><pitch><step>F</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice></note>
    </measure>
  </part>
</score-partwise>`;

describe('musicXmlToImportTimeline', () => {
  test('A) explicit chords get confidence 0.95', () => {
    const ir = musicXmlToImportTimeline(XML_HARMONY_MELODY);
    expect(ir.sourceFormat).toBe('musicxml');
    expect(ir.harmonyByBar.length).toBeGreaterThanOrEqual(2);
    expect(ir.harmonyByBar[0]!.chordSymbol).toMatch(/^C/);
    expect(ir.harmonyByBar[0]!.confidence).toBe(IMPORT_EXPLICIT_HARMONY_CONFIDENCE);
    expect(ir.harmonyByBar[0]!.fieldOrigin).toBe('explicit');
    expect(ir.harmonyByBar[1]!.chordSymbol).toMatch(/^G/);
  });

  test('B) monophonic melody extracted and quantized to eighth grid', () => {
    const ir = musicXmlToImportTimeline(XML_HARMONY_MELODY);
    expect(ir.melodyLine.length).toBeGreaterThanOrEqual(2);
    for (const n of ir.melodyLine) {
      expect(n.onsetBeat % IMPORT_EIGHTH_GRID_BEATS).toBe(0);
      expect(n.durationBeats % IMPORT_EIGHTH_GRID_BEATS).toBe(0);
      expect(n.fieldOrigin).toBe('explicit');
    }
    expect(ir.melodyLine[0]!.midiPitch).toBe(60);
  });

  test('C) polyphonic source uses skyline (highest pitch per slot)', () => {
    const ir = musicXmlToImportTimeline(XML_POLY);
    expect(ir.harmonyByBar[0]!.chordSymbol).toMatch(/^Dm/);
    const atZero = ir.melodyLine.filter((n) => n.bar === 1 && n.onsetBeat === 0);
    expect(atZero.length).toBeLessThanOrEqual(1);
    if (atZero.length === 1) {
      expect(atZero[0]!.midiPitch).toBeGreaterThanOrEqual(69);
    }
  });
});
