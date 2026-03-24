/**
 * Composer OS V2 — Score model tests
 */

import {
  createMeasure,
  createNote,
  createRest,
  addEvent,
  createPart,
  createScore,
} from '../core/score-model/scoreEventBuilder';
import { validateScoreModel } from '../core/score-model/scoreModelValidation';
import type { ScoreEvent } from '../core/score-model/scoreModelTypes';

function testMeasureCanContainNotes(): boolean {
  const m = createMeasure(1);
  addEvent(m, createNote(60, 0, 2));
  addEvent(m, createNote(62, 2, 2));
  return m.events.length === 2 && m.events[0].kind === 'note';
}

function testMeasureCanContainRests(): boolean {
  const m = createMeasure(2);
  addEvent(m, createRest(0, 4));
  return m.events.length === 1 && m.events[0].kind === 'rest';
}

function testMeasureCanHaveChordAndRehearsal(): boolean {
  const m = createMeasure(1, 'Cmaj7', 'A');
  return m.chord === 'Cmaj7' && m.rehearsalMark === 'A';
}

function testEventTyping(): boolean {
  const n = createNote(60, 0, 1);
  const r = createRest(0, 1);
  return n.kind === 'note' && (n as any).pitch === 60 && r.kind === 'rest';
}

function testPartCreation(): boolean {
  const p = createPart(
    'guitar',
    'Guitar',
    'clean_electric_guitar',
    27,
    'treble',
    4,
    (i) => (i <= 2 ? 'Dm7' : 'G7'),
    (i) => (i === 1 ? 'A' : undefined)
  );
  return p.measures.length === 4 && p.measures[0].chord === 'Dm7' && p.measures[0].rehearsalMark === 'A';
}

function testScoreValidationPassesWhenValid(): boolean {
  const m = createMeasure(1);
  addEvent(m, createNote(60, 0, 4));
  const score = createScore('Test', [{ id: 'p1', name: 'P1', instrumentIdentity: 'guitar', midiProgram: 27, clef: 'treble', measures: [m] }]);
  const r = validateScoreModel(score);
  return r.valid;
}

function testScoreValidationFailsWhenDurationWrong(): boolean {
  const m = createMeasure(1);
  addEvent(m, createNote(60, 0, 2)); // only 2 beats
  const score = createScore('Test', [{ id: 'p1', name: 'P1', instrumentIdentity: 'guitar', midiProgram: 27, clef: 'treble', measures: [m] }]);
  const r = validateScoreModel(score);
  return !r.valid;
}

export function runScoreModelTests(): { name: string; ok: boolean }[] {
  return [
    ['Measure can contain notes', testMeasureCanContainNotes],
    ['Measure can contain rests', testMeasureCanContainRests],
    ['Measure can have chord and rehearsal mark', testMeasureCanHaveChordAndRehearsal],
    ['Event typing works correctly', testEventTyping],
    ['Part creation works', testPartCreation],
    ['Score validation passes when valid', testScoreValidationPassesWhenValid],
    ['Score validation fails when duration wrong', testScoreValidationFailsWhenDurationWrong],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
