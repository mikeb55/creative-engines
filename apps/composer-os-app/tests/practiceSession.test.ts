import { describe, expect, it } from 'vitest';
import { ensureMusicXmlDomParserPolyfill } from '@composer-os/core/musicXmlImportDomPolyfill';
import { openStringMidisForTuning } from '@composer-os/core/guitar/guitarGripLibrary';
import { mod12 } from '@composer-os/core/pentatonic/pitch';
import { planPlayback } from '../src/playback/playbackEngine';
import { playbackSequenceFromMusicXml, tempoFromMusicXml } from '../src/score/playbackSequenceFromMusicXml';
import { generatePracticeExercise } from '../src/practice/practiceExerciseGenerator';
import { practiceExerciseToMusicXml, withPracticeTempo } from '../src/practice/practiceExerciseMusicXml';
import { readPracticeSession, sealPracticeSession } from '../src/practice/practiceSession';
import { getScaleExplorerEntry } from '../src/practice/scaleExplorer';

const HIRAJOSHI = 397;

function exercise(metreId: '4/4' | '6/8' = '4/4', tempoBpm = 96) {
  return generatePracticeExercise({
    entry: getScaleExplorerEntry(HIRAJOSHI),
    rootPc: 2,
    family: 'scale-pathways',
    difficulty: 'beginner',
    bars: 4,
    metreId,
    tempoBpm,
    seed: 1,
    tuning: {
      requestedId: 'standard',
      tuningId: 'standard',
      standardSolver: true,
      openMidi: openStringMidisForTuning('standard'),
      limitation: null,
    },
    position: null,
  });
}

describe('practice session playback and MusicXML', () => {
  it('keeps bar length, tempo, pitch classes, and repeat spacing', async () => {
    ensureMusicXmlDomParserPolyfill();
    const generated = exercise();
    expect(generated.available).toBe(true);
    const xml = practiceExerciseToMusicXml(generated);
    expect(xml).toContain('<beats>4</beats>');
    expect(xml).toContain('<beat-type>4</beat-type>');
    expect(xml).not.toMatch(/percussion|woodblock/i);
    expect(tempoFromMusicXml(xml)).toBe(96);
    const loaded = playbackSequenceFromMusicXml(xml);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok || !loaded.sequence) return;
    expect(loaded.sequence.bpm).toBe(96);
    expect(loaded.sequence.barQuarters).toBe(4);
    expect(loaded.sequence.totalBars).toBe(4);
    const allowed = new Set(generated.scale.soundingPitchClassId.split(',').filter(Boolean).map(Number));
    for (const note of loaded.sequence.notes) {
      expect(allowed.has(mod12(note.pitch))).toBe(true);
      expect(note.startBeat + note.duration).toBeLessThanOrEqual(4 + 1e-6);
    }
    const once = planPlayback(loaded.sequence, { repeat: 1, metronome: true });
    const twice = planPlayback(loaded.sequence, { repeat: 2, metronome: true });
    expect(twice.notes).toHaveLength(once.notes.length * 2);
    expect(twice.clicks).toHaveLength(4 * 4 * 2);
    const pass = 4 * 4 * (60 / 96);
    expect(twice.notes[once.notes.length]!.startSec - twice.notes[0]!.startSec).toBeCloseTo(pass, 5);
    const faster = playbackSequenceFromMusicXml(withPracticeTempo(xml, 120));
    expect(tempoFromMusicXml(withPracticeTempo(xml, 120))).toBe(120);
    expect(faster.ok && faster.sequence?.bpm).toBe(120);
    if (faster.ok && faster.sequence) {
      const fastPlan = planPlayback(faster.sequence, { repeat: 1 });
      expect(fastPlan.notes[0]!.startSec).toBeCloseTo(once.notes[0]!.startSec * (96 / 120), 5);
    }
  });

  it('uses a three-quarter bar for 6/8', () => {
    ensureMusicXmlDomParserPolyfill();
    const xml = practiceExerciseToMusicXml(exercise('6/8'));
    expect(xml).toContain('<beats>6</beats>');
    expect(xml).toContain('<beat-type>8</beat-type>');
    const loaded = playbackSequenceFromMusicXml(xml);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok || !loaded.sequence) return;
    expect(loaded.sequence.barQuarters).toBe(3);
    expect(loaded.sequence.beatsPerBar).toBe(6);
    const planned = planPlayback(loaded.sequence, { metronome: true, repeat: 1 });
    expect(planned.clicks).toHaveLength(4 * 6);
    expect(planned.clicks[1]!.startSec - planned.clicks[0]!.startSec).toBeCloseTo(0.5 * (60 / 96), 5);
  });

  it('saves and reopens without regenerating, and rejects a changed score', async () => {
    ensureMusicXmlDomParserPolyfill();
    const generated = exercise();
    const xml = practiceExerciseToMusicXml(generated);
    const sealed = await sealPracticeSession({
      id: 'practice-1',
      title: generated.title,
      savedAt: '2026-10-16T00:00:00.000Z',
      notes: 'keep',
      sourceSha256: null,
      scale: { mask: HIRAJOSHI, rootPc: 2, status: generated.scale.status, name: generated.scale.name },
      guitar: { tuningId: 'standard', openMidi: [...generated.events[0] ? openStringMidisForTuning('standard') : []], fretFrom: 0, fretTo: 12 },
      exercise: {
        family: generated.family,
        difficulty: generated.difficulty,
        seed: generated.seed,
        bars: generated.bars,
        metreId: generated.metreId,
        tempoBpm: generated.tempoBpm,
        loop: false,
        repeat: 2,
        metronome: true,
      },
      musicXml: xml,
    });
    const opened = await readPracticeSession(JSON.stringify(sealed));
    expect(opened.musicXml).toBe(xml);
    expect(opened.scale.mask).toBe(HIRAJOSHI);
    expect(JSON.stringify(opened)).not.toMatch(/WWH|\.sib/i);
    const tampered = { ...sealed, musicXml: xml.replace('96', '80') };
    await expect(readPracticeSession(JSON.stringify(tampered))).rejects.toThrow(/hash/i);
  });
});
