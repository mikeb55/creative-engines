/**
 * V80j Import IR round-trip tests (jest).
 */

import { musicXmlToImportTimeline } from '../core/import/musicXmlToImportTimeline';
import {
  evaluateImportHarmonyLock,
  importTimelineToLockedHarmony,
  importTimelineToMotifSeed,
} from '../core/import/importTimelineAdapters';
import {
  IMPORT_EXPLICIT_HARMONY_CONFIDENCE,
  IMPORT_EIGHTH_GRID_BEATS,
} from '../core/import/mosaicImportTimeline';

const ROUND_TRIP_XML = `<?xml version="1.0"?>
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1"><part-name>Lead</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <key><fifths>-1</fifths><mode>major</mode></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
      </attributes>
      <harmony>
        <root><root-step>F</root-step></root>
        <kind>major</kind>
      </harmony>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
    </measure>
    <measure number="2">
      <harmony>
        <root><root-step>B</root-step><root-alter>-1</root-alter></root>
        <kind>major</kind>
      </harmony>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>8</duration><voice>1</voice></note>
    </measure>
  </part>
</score-partwise>`;

describe('import IR round-trip', () => {
  test('lossless: bars, meter, explicit chords, melody grid, key', () => {
    const ir = musicXmlToImportTimeline(ROUND_TRIP_XML);
    expect(ir.bars).toBe(2);
    expect(ir.timeSig).toEqual({ num: 4, den: 4 });
    expect(ir.keyEstimate.tonic).toBe('F');
    expect(ir.keyEstimate.fieldOrigin).toBe('explicit');

    expect(ir.harmonyByBar[0]!.chordSymbol).toMatch(/^F/);
    expect(ir.harmonyByBar[0]!.confidence).toBe(IMPORT_EXPLICIT_HARMONY_CONFIDENCE);
    expect(ir.harmonyByBar[1]!.chordSymbol).toMatch(/Bb/);

    for (const n of ir.melodyLine) {
      expect(n.onsetBeat % IMPORT_EIGHTH_GRID_BEATS).toBe(0);
      expect(n.durationBeats % IMPORT_EIGHTH_GRID_BEATS).toBe(0);
    }

    const locked = importTimelineToLockedHarmony(ir);
    expect(locked.length).toBe(2);
    expect(locked[0]).toMatch(/^F/);
  });

  test('adapters: lock only when importHarmonyMode lock_harmony', () => {
    const ir = musicXmlToImportTimeline(ROUND_TRIP_XML);
    const free = evaluateImportHarmonyLock(ir, 'free_harmony');
    expect(free.customHarmonyLocked).toBe(false);

    const lock = evaluateImportHarmonyLock(ir, 'lock_harmony');
    expect(lock.customHarmonyLocked).toBe(true);
    expect(lock.lockedHarmonyBarsRaw.length).toBe(ir.bars);
  });

  test('motif seed retains full melody line for IMP-4', () => {
    const ir = musicXmlToImportTimeline(ROUND_TRIP_XML);
    const seed = importTimelineToMotifSeed(ir);
    expect(seed.coreMotif.id).toBe('import_motif_seed');
    expect(seed.coreMotif.intervalPattern.length).toBeGreaterThan(0);
    expect(seed.fullMelodyLine.length).toBe(ir.melodyLine.length);
  });
});
