/**
 * Composer OS V2 — Performance pass tests
 */

import { applyPerformancePass } from '../core/performance/performancePass';
import { validatePerformanceIntegrity } from '../core/performance/performanceValidation';
import { createMeasure, createNote, addEvent, createScore } from '../core/score-model/scoreEventBuilder';

function testArticulationAdded(): boolean {
  const m = createMeasure(1, 'Cmaj7');
  addEvent(m, createNote(60, 0, 0.5));
  addEvent(m, createNote(62, 1, 3));
  const score = createScore('T', [{
    id: 'guitar',
    name: 'G',
    instrumentIdentity: 'clean_electric_guitar',
    midiProgram: 27,
    clef: 'treble',
    measures: [m],
  }]);
  const out = applyPerformancePass(score);
  const note1 = out.parts[0].measures[0].events[0];
  const note2 = out.parts[0].measures[0].events[1];
  return (note1 as { articulation?: string }).articulation === 'staccato' &&
    (note2 as { articulation?: string }).articulation === 'tenuto';
}

function testNoPitchChanges(): boolean {
  const m = createMeasure(1, 'Cmaj7');
  addEvent(m, createNote(60, 0, 2));
  addEvent(m, createNote(64, 2, 2));
  const score = createScore('T', [{
    id: 'guitar',
    name: 'G',
    instrumentIdentity: 'clean_electric_guitar',
    midiProgram: 27,
    clef: 'treble',
    measures: [m],
  }]);
  const out = applyPerformancePass(score);
  const valid = validatePerformanceIntegrity(score, out);
  return valid.valid;
}

function testBarMathPreserved(): boolean {
  const m = createMeasure(1, 'Cmaj7');
  addEvent(m, createNote(60, 0, 2));
  addEvent(m, createNote(62, 2, 2));
  const score = createScore('T', [{
    id: 'guitar',
    name: 'G',
    instrumentIdentity: 'clean_electric_guitar',
    midiProgram: 27,
    clef: 'treble',
    measures: [m],
  }]);
  const out = applyPerformancePass(score);
  const measure = out.parts[0].measures[0];
  const total = measure.events.reduce((s, e) => s + e.duration, 0);
  return Math.abs(total - 4) < 0.01;
}

function testPitchDriftFails(): boolean {
  const m = createMeasure(1, 'Cmaj7');
  addEvent(m, createNote(60, 0, 1));
  const before = createScore('B', [{
    id: 'guitar',
    name: 'G',
    instrumentIdentity: 'clean_electric_guitar',
    midiProgram: 27,
    clef: 'treble',
    measures: [m],
  }]);
  const m2 = createMeasure(1, 'Cmaj7');
  addEvent(m2, createNote(62, 0, 1));
  const after = createScore('A', [{
    id: 'guitar',
    name: 'G',
    instrumentIdentity: 'clean_electric_guitar',
    midiProgram: 27,
    clef: 'treble',
    measures: [m2],
  }]);
  const valid = validatePerformanceIntegrity(before, after);
  return !valid.valid;
}

export function runPerformanceTests(): { name: string; ok: boolean }[] {
  return [
    ['Articulation added', testArticulationAdded],
    ['No pitch changes', testNoPitchChanges],
    ['Bar math preserved', testBarMathPreserved],
    ['Pitch drift fails validation', testPitchDriftFails],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
