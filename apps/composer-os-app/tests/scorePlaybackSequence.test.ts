// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { CORE_CANDIDATES, coreCandidateAuditionMusicXml } from '@composer-os/core/hexatonic';
import { apiBhlCandidates, bhlWrongTurningPath } from '@composer-os/app-api/bhlApp';
import { playbackSequenceFromMusicXml, tempoFromMusicXml } from '../src/score/playbackSequenceFromMusicXml';

const DUO_XML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1"><part-name>Electric Guitar</part-name></score-part>
    <score-part id="P2"><part-name>Upright Bass</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <time><beats>4</beats><beat-type>4</beat-type></time>
      </attributes>
      <direction><sound tempo="92"/></direction>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>2</duration></note>
      <note><chord/><pitch><step>G</step><octave>4</octave></pitch><duration>2</duration></note>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>2</duration></note>
    </measure>
  </part>
  <part id="P2">
    <measure number="1">
      <note><pitch><step>E</step><octave>2</octave></pitch><duration>4</duration></note>
    </measure>
  </part>
</score-partwise>`;

describe('playbackSequenceFromMusicXml', () => {
  it('reads every provisional hexatonic audition as notes at the printed tempo', () => {
    expect(CORE_CANDIDATES).toHaveLength(12);
    for (const candidate of CORE_CANDIDATES) {
      const xml = coreCandidateAuditionMusicXml(candidate.id);
      expect(xml).toContain('Electric Guitar');
      expect(xml).toContain('Upright Bass');
      expect(xml).not.toMatch(/<staff-type>\s*tab\s*<\/staff-type>/i);
      expect(xml).toMatch(/provisional/i);
      const loaded = playbackSequenceFromMusicXml(xml);
      expect(loaded.ok, candidate.id).toBe(true);
      if (!loaded.ok) continue;
      expect(loaded.sequence.notes.length, candidate.id).toBeGreaterThan(0);
      expect(loaded.sequence.bpm).toBe(tempoFromMusicXml(xml));
      expect(loaded.sequence.bpm).toBe(72);
    }
  });

  it('reads a generated BHL candidate without an empty sequence', () => {
    const made = apiBhlCandidates({
      sourcePath: bhlWrongTurningPath(),
      span: { from: 33, to: 40 },
      seed: 3340,
      world: 'A',
      rhythm: 'derived',
      phraseArc: 'derived',
    });
    expect(made.ok).toBe(true);
    if (!made.ok) return;
    expect(made.candidates).toHaveLength(3);
    const xmls = made.candidates.map((candidate) => candidate.xml);
    expect(new Set(xmls).size).toBe(3);
    for (const candidate of made.candidates) {
      expect(candidate.xml).toContain('Guitar');
      expect(candidate.xml).toContain('Bass');
      const loaded = playbackSequenceFromMusicXml(candidate.xml);
      expect(loaded.ok, candidate.id).toBe(true);
      if (!loaded.ok) continue;
      expect(loaded.sequence.notes.length).toBeGreaterThan(0);
    }
  });

  it('reads guitar and bass pitches from a duo score', () => {
    const loaded = playbackSequenceFromMusicXml(DUO_XML);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const pitches = loaded.sequence.notes.map((note) => note.pitch).sort((a, b) => a - b);
    expect(pitches).toEqual([40, 64, 67, 71]);
    expect(loaded.sequence.bpm).toBe(92);
  });

  it('reports invalid MusicXML instead of throwing', () => {
    const loaded = playbackSequenceFromMusicXml('<score-partwise><note></score>');
    expect(loaded.ok).toBe(false);
    if (loaded.ok) return;
    expect(loaded.error).toMatch(/could not be parsed/i);
    expect(playbackSequenceFromMusicXml('').ok).toBe(false);
    expect(playbackSequenceFromMusicXml(null).ok).toBe(false);
  });
});
