// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  dominantPitchClassFromPitches,
  extractMelodyPcsForBarRange,
  normPitchClass,
} from '../src/utils/reharmMelodyPcsExtract';

const MINI_XML = `<?xml version="1.0"?>
<score-partwise>
  <part-list>
    <score-part id="P1"><part-name>Electric Guitar</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration></note>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration></note>
    </measure>
    <measure number="2">
      <note><rest/></note>
    </measure>
  </part>
</score-partwise>`;

describe('reharmMelodyPcsExtract', () => {
  it('normPitchClass wraps midi to 0-11', () => {
    expect(normPitchClass(60)).toBe(0);
    expect(normPitchClass(67)).toBe(7);
  });

  it('dominantPitchClassFromPitches picks most frequent pc', () => {
    expect(dominantPitchClassFromPitches([60, 60, 67])).toBe(0);
  });

  it('extractMelodyPcsForBarRange reads guitar lead and nulls empty bars', () => {
    const r = extractMelodyPcsForBarRange(MINI_XML, 1, 2, '4/4');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.partLabel.toLowerCase()).toContain('guitar');
    expect(r.melodyPcs).toEqual([0, null]);
    expect(r.barsWithNotes).toBe(1);
    expect(r.barsEmpty).toBe(1);
  });

  it('returns honest failure for empty xml', () => {
    expect(extractMelodyPcsForBarRange('', 1, 2).ok).toBe(false);
  });
});