// @vitest-environment jsdom
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { planPlayback, sequenceFromTimedNotes } from '../src/playback/playbackEngine';
import { playbackSequenceFromMusicXml } from '../src/score/playbackSequenceFromMusicXml';

const MELODY = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Guitar</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <direction><sound tempo="120"/></direction>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration></note>
    </measure>
  </part>
</score-partwise>`;

const MOTIF = [
  { onset: 0, duration: 1, midi: 60 },
  { onset: 1, duration: 0.5, midi: 62 },
  { onset: 1.5, duration: 0.5, midi: 64 },
  { onset: 2, duration: 2, midi: 67 },
];

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, '..');

describe('shared playback schedule', () => {
  it('plans a short melody on the transport, with every note at or after zero', () => {
    const loaded = playbackSequenceFromMusicXml(MELODY);
    expect(loaded.ok).toBe(true);
    const planned = planPlayback(loaded.sequence!);
    expect(planned.notes).toHaveLength(4);
    expect(planned.notes.map((note) => note.startSec)).toEqual([0, 0.5, 1, 1.5]);
    expect(planned.endSec).toBeGreaterThan(1.5);
    const again = planPlayback(loaded.sequence!);
    expect(again.notes).toHaveLength(planned.notes.length);
  });

  it('places a development motif after the downbeat', () => {
    const broken = planPlayback({
      notes: MOTIF.map((event) => ({
        pitch: event.midi,
        startBeat: event.onset,
        duration: event.duration,
        barIndex: Math.floor(event.onset / 4),
      })),
      bpm: 96,
      beatsPerBar: 4,
      totalBars: 1,
    });
    expect(broken.notes.every((note) => note.startSec < 0)).toBe(true);

    const planned = planPlayback(sequenceFromTimedNotes(MOTIF, 96, 4));
    expect(planned.notes.map((note) => note.startSec)).toEqual([0, 0.625, 0.9375, 1.25]);
    expect(planned.notes.every((note) => note.startSec >= 0)).toBe(true);
  });

  it('Practice Studio and Development Studio use the one player', () => {
    const practice = fs.readFileSync(path.join(appRoot, 'src/practice/PracticeStudioPage.tsx'), 'utf8');
    const develop = fs.readFileSync(path.join(appRoot, 'src/develop/DevelopmentStudioPage.tsx'), 'utf8');
    const audition = fs.readFileSync(path.join(appRoot, 'src/score/ScoreAudition.tsx'), 'utf8');
    expect(practice).toContain('ScoreAudition');
    expect(develop).toContain('sequenceFromTimedNotes');
    expect(develop).toContain('ScoreAudition');
    expect(audition).toContain("from '../playback/playbackEngine'");
    expect(audition).not.toContain('new Tone.Transport');
    expect(develop).not.toContain('new Tone.Transport');
  });
});
