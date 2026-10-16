import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { act, create } from 'react-test-renderer';
import { beforeAll, describe, expect, it } from 'vitest';
import { PracticeStudioPage } from '../src/practice/PracticeStudioPage';
import { getScaleExplorerEntry, listScaleExplorerEntries } from '../src/practice/scaleExplorer';
import {
  generatePracticeExercise,
  nextPracticeSeed,
  type PracticeExerciseRequest,
} from '../src/practice/practiceExerciseGenerator';
import { guitarRange } from '@composer-os/core/pentatonic/motifTransform';
import { canonicalPitchSetId, mod12 } from '@composer-os/core/pentatonic/pitch';
import { intervalsFromRoot, transposeCollection } from '../src/practice/practiceFretboard';
import { openStringMidisForTuning } from '@composer-os/core/guitar/guitarGripLibrary';

const HIRAJOSHI = 397;
const MAJOR_PENTATONIC = (1 << 0) | (1 << 2) | (1 << 4) | (1 << 7) | (1 << 9);

function request(overrides: Partial<PracticeExerciseRequest> = {}): PracticeExerciseRequest {
  const entry = overrides.entry ?? getScaleExplorerEntry(HIRAJOSHI);
  return {
    entry,
    rootPc: 0,
    family: 'scale-pathways',
    difficulty: 'beginner',
    bars: 4,
    metreId: '4/4',
    tempoBpm: 96,
    seed: 1,
    tuning: {
      requestedId: 'standard',
      tuningId: 'standard',
      standardSolver: true,
      openMidi: openStringMidisForTuning('standard'),
      limitation: null,
    },
    position: null,
    ...overrides,
  };
}

function barLength(beats: number, beatType: number): number {
  return beats * (4 / beatType);
}

function expectTimed(result: ReturnType<typeof generatePracticeExercise>): void {
  expect(result.available, result.validationErrors.join(' ')).toBe(true);
  expect(result.events.filter((event) => event.bar === 1).length).toBeGreaterThan(0);
  const total = barLength(result.beats, result.beatType);
  for (let bar = 1; bar <= result.bars; bar += 1) {
    const events = result.events.filter((event) => event.bar === bar);
    const summed = events.reduce((sum, event) => sum + event.duration, 0);
    expect(summed).toBeCloseTo(total, 3);
  }
  const [low, high] = guitarRange();
  for (const event of result.events) {
    for (const pitch of event.pitches) {
      expect(pitch).toBeGreaterThanOrEqual(low);
      expect(pitch).toBeLessThanOrEqual(high);
      expect(result.scale.soundingPitchClassId.split(',').filter(Boolean).map(Number)).toContain(mod12(pitch));
    }
  }
}

beforeAll(() => {
  globalThis.requestAnimationFrame = (() => 0) as typeof requestAnimationFrame;
  globalThis.cancelAnimationFrame = () => undefined;
});

describe('practice exercise generator', () => {
  it('repeats a seed and changes another seed', () => {
    const first = generatePracticeExercise(request());
    const second = generatePracticeExercise(request());
    const other = generatePracticeExercise(request({ seed: nextPracticeSeed(1) }));
    expectTimed(first);
    expect(JSON.stringify(first.events)).toBe(JSON.stringify(second.events));
    expect(first.pitchSequence).not.toBe(other.pitchSequence);
    expect(other.seed).toBe(2);
    expect(other.scale.mask).toBe(first.scale.mask);
    expect(other.bars).toBe(first.bars);
  });

  it('keeps transposed pitch classes and the source row', () => {
    const entry = getScaleExplorerEntry(HIRAJOSHI);
    const before = entry.pitchClasses.join(',');
    const beforeStatus = entry.registrations.map((registration) => registration.status).join('|');
    const exercise = generatePracticeExercise(request({ rootPc: 7, bars: 8, metreId: '6/8' }));
    expectTimed(exercise);
    expect(entry.pitchClasses.join(',')).toBe(before);
    expect(entry.registrations.map((registration) => registration.status).join('|')).toBe(beforeStatus);
    expect(exercise.scale.soundingPitchClassId).toBe(canonicalPitchSetId(transposeCollection(entry.pitchClasses, 7)));
    expect(intervalsFromRoot(exercise.scale.soundingPitchClassId.split(',').map(Number), 7)).toEqual(
      intervalsFromRoot(entry.pitchClasses, 0)
    );
    expect(exercise.scale.status).toContain('hirajoshi');
    expect(exercise.bars).toBe(8);
    expect(exercise.metreId).toBe('6/8');
  });

  it('refuses an empty set and a pentatonic study on a non-colour', () => {
    const empty = generatePracticeExercise(request({ entry: getScaleExplorerEntry(0) }));
    expect(empty.available).toBe(false);
    expect(empty.unavailableReason).toMatch(/empty set/i);
    const mathematical = listScaleExplorerEntries().find(
      (entry) => entry.registrations.length === 0 && entry.cardinality === 4
    );
    expect(mathematical).toBeTruthy();
    const refused = generatePracticeExercise(request({ entry: mathematical!, family: 'pentatonic-studies' }));
    expect(refused.available).toBe(false);
    expect(refused.unavailableReason).toMatch(/20 colour/i);
    expect(refused.scale.status).toContain('MATHEMATICAL SET');
  });

  it('studies a registered pentatonic colour without changing its id', () => {
    const exercise = generatePracticeExercise(
      request({ entry: getScaleExplorerEntry(MAJOR_PENTATONIC), family: 'pentatonic-studies', seed: 4 })
    );
    expectTimed(exercise);
    expect(exercise.detail).toContain('major_pentatonic');
    expect(exercise.reused).toContain('generatePracticeExample');
    expect(exercise.scale.registrations.some((registration) => registration.id === 'major_pentatonic')).toBe(true);
  });

  it('uses vault grips only when a triad fits, including an alternate tuning', () => {
    const exercise = generatePracticeExercise(
      request({
        entry: getScaleExplorerEntry(MAJOR_PENTATONIC),
        family: 'triad-dyad-studies',
        difficulty: 'beginner',
        tuning: {
          requestedId: 'dadgad',
          tuningId: 'dadgad',
          standardSolver: false,
          openMidi: openStringMidisForTuning('dadgad'),
          limitation: null,
        },
        position: 5,
      })
    );
    expect(exercise.available, exercise.validationErrors.join(' ')).toBe(true);
    expectTimed(exercise);
    expect(exercise.positionApplied).toBe(false);
    expect(exercise.guitarNotes.join(' ')).toMatch(/standard open strings/i);
    expect(exercise.reused).toContain('buildGuitarGripLibrary');
    expect(exercise.events.some((event) => event.pitches.length === 2)).toBe(true);
  });

  it('keeps BHL colour on an established identity and refuses a provisional-only row', () => {
    const scalar = listScaleExplorerEntries().find((entry) =>
      entry.registrations.some((registration) => registration.registry === 'hexatonic-scalar')
    );
    expect(scalar).toBeTruthy();
    const colour = generatePracticeExercise(
      request({ entry: scalar!, family: 'bhl-colour-studies', difficulty: 'beginner', seed: 3 })
    );
    expectTimed(colour);
    expect(colour.detail).toMatch(/catalogue/);
    expect(colour.reused).toContain('applyHexatonicStrategy');
    expect(colour.guitarNotes.join(' ')).toMatch(/artisticApproval is false/);

    const provisionalOnly = listScaleExplorerEntries().find((entry) => {
      const registries = new Set(entry.registrations.map((registration) => registration.registry));
      return registries.has('hexatonic-provisional') && !registries.has('hexatonic-scalar') && !registries.has('hexatonic-wps');
    });
    expect(provisionalOnly).toBeTruthy();
    const statusBefore = provisionalOnly!.registrations.map((registration) => registration.status).join('|');
    const refused = generatePracticeExercise(request({ entry: provisionalOnly!, family: 'bhl-colour-studies' }));
    expect(refused.available).toBe(false);
    expect(refused.unavailableReason).toMatch(/established scalar or WPS/);
    expect(refused.scale.status).toContain('PROVISIONAL');
    expect(provisionalOnly!.registrations.map((registration) => registration.status).join('|')).toBe(statusBefore);
  });

  it('fills rhythmic studies from the BHL onset planner', () => {
    const exercise = generatePracticeExercise(
      request({ family: 'rhythmic-studies', difficulty: 'beginner', metreId: '7/8', bars: 4 })
    );
    expectTimed(exercise);
    expect(exercise.detail).toBe('state-onsets');
    expect(exercise.reused).toContain('planPhraseOnsets');
    expect(exercise.rhythmSummary).toContain('7/8');
  });

  it('builds melodic cells with transformCell and refuses a short set', () => {
    const cell = generatePracticeExercise(
      request({ entry: getScaleExplorerEntry(MAJOR_PENTATONIC), family: 'melodic-cells', difficulty: 'intermediate', seed: 2 })
    );
    expectTimed(cell);
    expect(cell.detail).toContain('4-note');
    expect(cell.reused).toContain('transformCell');
    const pair = listScaleExplorerEntries().find((entry) => entry.cardinality === 2);
    const refused = generatePracticeExercise(request({ entry: pair!, family: 'melodic-cells', difficulty: 'beginner' }));
    expect(refused.available).toBe(false);
    expect(refused.unavailableReason).toMatch(/3-note cell/);
  });

  it('does not add a second theory engine', () => {
    const source = fs.readFileSync(path.join(__dirname, '../src/practice/practiceExerciseGenerator.ts'), 'utf8');
    expect(source).toContain('transformCell');
    expect(source).toContain('generatePracticeExample');
    expect(source).toContain('buildGuitarGripLibrary');
    expect(source).toContain('planPhraseOnsets');
    expect(source).toContain('applyHexatonicStrategy');
    expect(source).toContain('sourceRhythmAfterTransform');
    expect(source).not.toMatch(/CAGED|renderScale|Ian Ring|Math\.random/);
    expect(source).not.toContain('exportGuitarMusicXml');
  });
});

describe('practice generator controls', () => {
  it('generates from the page and leaves the fretboard and session panels in place', () => {
    const tree = create(React.createElement(PracticeStudioPage));
    expect(textOf(tree)).toContain('Practice Session');
    expect(textOf(tree)).toContain('Save session');
    expect(textOf(tree)).toContain('Export MusicXML');
    act(() => {
      tree.root.findByProps({ 'aria-label': 'Search pitch classes, identifier, or name' }).props.onChange({
        target: { value: 'hirajoshi' },
      });
    });
    act(() => {
      tree.root.findByProps({ 'data-testid': 'explorer-mask-397' }).props.onClick();
    });
    act(() => {
      tree.root.findByProps({ 'data-testid': 'generate-exercise' }).props.onClick();
    });
    const result = textOf(tree);
    expect(result).toContain('Hirajoshi · descending pathway');
    expect(result).toContain('4/4');
    expect(result).toContain('No validation errors.');
    expect(result).toContain('Play');
    expect(result).toContain('Export MusicXML');
    const markers = Number(tree.root.findByProps({ 'data-testid': 'fret-marker-count' }).children?.[0]);
    expect(markers).toBeGreaterThan(0);
    act(() => {
      tree.root.findByProps({ 'data-testid': 'generate-another' }).props.onClick();
    });
    expect(textOf(tree)).toContain('seed ","2');
  });
});

function textOf(tree: ReturnType<typeof create>): string {
  return JSON.stringify(tree.toJSON());
}
