/**
 * Bacharach reference mining — chord aggregation from MusicXML (no full generation).
 */

import {
  aggregateChordRatios,
  mineMusicXmlString,
} from '../scripts/mining/bacharachReferenceMining';

const MINIMAL_SCORE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Guitar</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <harmony>
        <root><root-step>C</root-step></root>
        <kind text="maj7">major-seventh</kind>
      </harmony>
      <note><rest/><duration>16</duration></note>
    </measure>
    <measure number="2">
      <harmony>
        <root><root-step>F</root-step></root>
        <kind text="maj7">major-seventh</kind>
      </harmony>
      <note><rest/><duration>16</duration></note>
    </measure>
    <measure number="3">
      <harmony>
        <root><root-step>G</root-step></root>
        <kind text="7">dominant</kind>
      </harmony>
      <note><rest/><duration>16</duration></note>
    </measure>
    <measure number="4">
      <harmony>
        <root><root-step>A</root-step></root>
        <kind text="m7">minor-seventh</kind>
      </harmony>
      <note><rest/><duration>16</duration></note>
    </measure>
  </part>
</score-partwise>`;

describe('bacharachReferenceMining', () => {
  it('mines harmony from score-partwise XML', () => {
    const r = mineMusicXmlString(MINIMAL_SCORE_XML, 'test.musicxml');
    expect(r.chords.length).toBe(4);
    expect(r.ratios.maj7Family).toBeGreaterThan(0.4);
    expect(r.measureCount).toBe(4);
  });

  it('aggregateChordRatios handles empty', () => {
    const z = aggregateChordRatios([]);
    expect(z.maj7Family).toBe(0);
  });
});
