/**
 * Practice exercises become MusicXML through the existing guitar score exporter.
 * The exercise object is not rewritten. Tempo stamps are the only string edit, and they copy the XML.
 */

import { CLEAN_ELECTRIC_GUITAR } from '@composer-os/core/instrument-profiles/guitarProfile';
import { exportScoreModelToMusicXml } from '@composer-os/core/export/musicxmlExporter';
import { createNote, createPart, createRest, createScore } from '@composer-os/core/score-model/scoreEventBuilder';
import type { PracticeExercise } from './practiceExerciseGenerator';

export function withPracticeTempo(xml: string, tempoBpm: number): string {
  const tempo = String(Math.max(1, Math.round(tempoBpm)));
  const sound = xml.replace(/(<sound\b[^>]*\btempo=")[^"]*(")/i, `$1${tempo}$2`);
  return sound.replace(/(<per-minute>)\s*[^<]*(\s*<\/per-minute>)/i, `$1${tempo}$2`);
}

export function practiceExerciseToMusicXml(exercise: PracticeExercise): string {
  if (!exercise.available) {
    throw new Error(exercise.unavailableReason || 'This exercise is not available.');
  }
  const part = createPart(
    'guitar',
    'Electric Guitar',
    CLEAN_ELECTRIC_GUITAR.instrumentIdentity,
    CLEAN_ELECTRIC_GUITAR.midiProgram,
    'treble',
    exercise.bars,
    () => undefined,
    () => undefined
  );
  const span = exercise.beats * (4 / exercise.beatType);
  part.measures.forEach((measure, index) => {
    const bar = index + 1;
    measure.measureBeatSpanQuarters = span;
    const events = exercise.events.filter((event) => event.bar === bar);
    measure.events = events.map((event) => {
      if (event.kind === 'rest' || event.pitches.length === 0) return createRest(event.startBeat, event.duration, 1);
      const [first, ...rest] = event.pitches;
      return createNote(first!, event.startBeat, event.duration, 1, undefined, rest.length > 0 ? [first!, ...rest] : undefined);
    });
    if (measure.events.length === 0) measure.events = [createRest(0, span, 1)];
  });
  const score = createScore(exercise.title, [part], { tempo: exercise.tempoBpm });
  score.timeSignature = { beats: exercise.beats, beatType: exercise.beatType };
  score.barMeterMap = {};
  for (let bar = 1; bar <= exercise.bars; bar += 1) {
    score.barMeterMap[bar] = { numerator: exercise.beats, denominator: exercise.beatType };
  }
  score.keySignature = { fifths: 0, mode: 'major', hideKeySignature: false };
  const exported = exportScoreModelToMusicXml(score);
  if (!exported.success || !exported.xml) {
    throw new Error(exported.errors.join(' ') || 'MusicXML export failed.');
  }
  return exported.xml;
}
