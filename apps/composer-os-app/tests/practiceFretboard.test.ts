import React from 'react';
import { act, create } from 'react-test-renderer';
import * as fs from 'fs';
import * as path from 'path';
import { beforeAll, describe, expect, it } from 'vitest';
import { openStringMidisForTuning } from '@composer-os/core/guitar/guitarGripLibrary';
import { canonicalPitchSetId } from '@composer-os/core/pentatonic/pitch';
import { FRET_MAX, SPAN_MAX, fingeringOptions } from '@composer-os/core/performance-composer/pcFretboard';
import {
  ALTERNATE_GUITAR_TUNING_PRESETS,
  ROADMAP_ZONE_TUNING_PRESET_IDS,
  getAlternateGuitarTuningPreset,
} from '@composer-os/core/song-mode/alternateGuitarTunings';
import { FretboardPanel } from '../src/components/music/FretboardPanel';
import { PracticeStudioPage } from '../src/practice/PracticeStudioPage';
import { getScaleExplorerEntry } from '../src/practice/scaleExplorer';
import {
  buildPracticeFretboard,
  collectionOrigin,
  inspectFretCell,
  intervalsFromRoot,
  possiblePositionsForFret,
  resolvePracticeTuning,
  roadmapTuningIdsInChoices,
  standardOpenMidiMatchesSolver,
  transposeCollection,
} from '../src/practice/practiceFretboard';

const STEP: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
};

function oracleMidi(scientific: string): number {
  const match = /^([A-G])([#b]?)(-?\d+)$/.exec(scientific);
  if (!match) throw new Error(scientific);
  const semi = STEP[`${match[1]}${match[2] ?? ''}`];
  if (semi === undefined) throw new Error(scientific);
  return (Number(match[3]) + 1) * 12 + semi;
}

function textOf(tree: ReturnType<typeof create>): string {
  return JSON.stringify(tree.toJSON());
}

beforeAll(() => {
  globalThis.requestAnimationFrame = (() => 0) as typeof requestAnimationFrame;
  globalThis.cancelAnimationFrame = () => undefined;
});

describe('practice fretboard pitch mapping', () => {
  it('maps standard-tuning pitch classes from the grip-library open MIDI', () => {
    expect(standardOpenMidiMatchesSolver()).toBe(true);
    const tuning = resolvePracticeTuning('standard');
    expect([...tuning.openMidi]).toEqual([40, 45, 50, 55, 59, 64]);
    const board = buildPracticeFretboard({
      pitchClasses: [0],
      rootPc: 0,
      tuningId: 'standard',
      fretFrom: 0,
      fretTo: 12,
      position: null,
      labelMode: 'pitch',
    });
    expect(board.notes.some((note) => note.stringIndex === 3 && note.fret === 5 && note.label === 'C')).toBe(true);
    expect(board.notes.find((note) => note.stringIndex === 3 && note.fret === 5)?.role).toBe('triadRoot');
    expect(new Set(board.locations.map((location) => location.pitchClass))).toEqual(new Set([0]));
  });

  it('uses catalog open-string MIDI for every roadmap tuning', () => {
    expect(roadmapTuningIdsInChoices()).toEqual([...ROADMAP_ZONE_TUNING_PRESET_IDS]);
    for (const preset of ALTERNATE_GUITAR_TUNING_PRESETS) {
      if (preset.id === 'custom') continue;
      const expected = preset.strings.map(oracleMidi);
      expect(openStringMidisForTuning(preset.id)).toEqual(expected);
      expect([...resolvePracticeTuning(preset.id).openMidi]).toEqual(expected);
    }
    const dropD = resolvePracticeTuning('drop_d');
    expect(dropD.openMidi[0]).toBe(38);
    expect(dropD.standardSolver).toBe(false);
    const dadgad = getAlternateGuitarTuningPreset('dadgad');
    expect(dadgad).not.toBeNull();
    expect([...resolvePracticeTuning('dadgad').openMidi]).toEqual(dadgad!.strings.map(oracleMidi));
    expect(resolvePracticeTuning('dadgad').openMidi[0]).not.toBe(40);
  });

  it('keeps an unknown tuning on standard and says so', () => {
    const tuning = resolvePracticeTuning('not-a-real-tuning');
    expect(tuning.tuningId).toBe('standard');
    expect(tuning.fallback).toBe('unknown-id');
    expect([...tuning.openMidi]).toEqual([40, 45, 50, 55, 59, 64]);
    expect(tuning.limitation).toContain('Unknown tuning');
    expect(tuning.standardSolver).toBe(true);
  });

  it('transposes pitch classes without changing intervals from the tonic', () => {
    const source = [0, 2, 4, 7, 9];
    const root = 2;
    const transposed = transposeCollection(source, root);
    expect(transposed).toEqual([2, 4, 6, 9, 11]);
    expect(intervalsFromRoot(transposed, root)).toEqual(intervalsFromRoot(source, collectionOrigin(source)!));
    expect(transposeCollection(source, 0)).toEqual(source);
    expect(transposeCollection([], 7)).toEqual([]);
    const board = buildPracticeFretboard({
      pitchClasses: source,
      rootPc: root,
      tuningId: 'standard',
      fretFrom: 0,
      fretTo: 12,
      position: null,
      labelMode: 'interval',
    });
    expect(canonicalPitchSetId(board.soundingPitchClasses)).toBe('2,4,6,9,11');
    expect(board.notes.every((note) => note.label === 'R' || note.label !== 'C')).toBe(true);
    expect(board.notes.some((note) => note.label === 'R' && note.role === 'triadRoot')).toBe(true);
    expect(board.notes.some((note) => note.label === '7')).toBe(true);
  });

  it('filters dots by fret range and by the pcFretboard span', () => {
    const narrow = buildPracticeFretboard({
      pitchClasses: [0],
      rootPc: 0,
      tuningId: 'standard',
      fretFrom: 5,
      fretTo: 7,
      position: null,
      labelMode: 'pitch',
    });
    expect(narrow.notes).toEqual([
      expect.objectContaining({ stringIndex: 3, fret: 5, label: 'C' }),
    ]);

    const positioned = buildPracticeFretboard({
      pitchClasses: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      rootPc: 0,
      tuningId: 'standard',
      fretFrom: 0,
      fretTo: 12,
      position: 5,
      labelMode: 'pitch',
    });
    expect(positioned.locations.every((location) => location.fret >= 5 && location.fret <= 5 + SPAN_MAX)).toBe(true);
    expect(positioned.locations.some((location) => location.fret === 4 || location.fret === 10)).toBe(false);
    expect(positioned.locations.every((location) => location.place === 'position-window')).toBe(true);
    expect(positioned.fingeringStatus).toContain('not solved');

    const open = buildPracticeFretboard({
      pitchClasses: [4],
      rootPc: 4,
      tuningId: 'standard',
      fretFrom: 0,
      fretTo: 12,
      position: 0,
      labelMode: 'pitch',
    });
    expect(open.locations.every((location) => location.fret === 0)).toBe(true);

    const unsupported = buildPracticeFretboard({
      pitchClasses: [0],
      rootPc: 0,
      tuningId: 'standard',
      fretFrom: 8,
      fretTo: 3,
      position: null,
      labelMode: 'pitch',
    });
    expect(unsupported.notes).toEqual([]);
    expect(unsupported.limitation).toContain('unsupported');
  });

  it('checks one standard-tuning cell and refuses the solver on an alternate tuning', () => {
    const standard = resolvePracticeTuning('standard');
    const lowE = inspectFretCell(standard, { stringIndex: 0, fret: 0 }, 0, [4], { from: 0, to: 12 });
    expect(lowE?.midi).toBe(40);
    expect(lowE?.spelling).toBe('E');
    expect(lowE?.intervalSemitones).toBe(4);
    expect(lowE?.fingering).toContain('Verified pitch location');
    expect(fingeringOptions([40]).some((option) => option[0]?.string === 6 && option[0]?.fret === 0)).toBe(true);

    const high = inspectFretCell(standard, { stringIndex: 0, fret: FRET_MAX + 1 }, 0, [], { from: 0, to: 24 });
    expect(high?.fingering).toContain('stops at fret 15');
    expect(possiblePositionsForFret(7).every((position) => position <= 7 && 7 <= position + SPAN_MAX)).toBe(true);
    expect(possiblePositionsForFret(0)).toEqual([]);

    const dadgad = resolvePracticeTuning('dadgad');
    const cell = inspectFretCell(dadgad, { stringIndex: 0, fret: 0 }, 0, [], { from: 0, to: 12 });
    expect(cell?.midi).toBe(38);
    expect(cell?.fingering).toContain('not solved');
    expect(cell?.fingering).not.toContain('Verified');
    expect(cell?.possiblePositions).toEqual([]);

    const filtered = buildPracticeFretboard({
      pitchClasses: [0, 2, 4, 7, 9],
      rootPc: 0,
      tuningId: 'dadgad',
      fretFrom: 0,
      fretTo: 12,
      position: 5,
      labelMode: 'pitch',
    });
    const unfiltered = buildPracticeFretboard({
      pitchClasses: [0, 2, 4, 7, 9],
      rootPc: 0,
      tuningId: 'dadgad',
      fretFrom: 0,
      fretTo: 12,
      position: null,
      labelMode: 'pitch',
    });
    expect(filtered.notes).toEqual(unfiltered.notes);
    expect(filtered.positionStatus).toContain('not applied');
  });

  it('matches the explorer mask after the root moves', () => {
    const entry = getScaleExplorerEntry(397);
    expect(entry.pitchClassId).toBe('0,2,3,7,8');
    const board = buildPracticeFretboard({
      pitchClasses: entry.pitchClasses,
      rootPc: 7,
      tuningId: 'standard',
      fretFrom: 0,
      fretTo: 12,
      position: null,
      labelMode: 'interval',
    });
    expect(board.soundingPitchClassId).toBe(canonicalPitchSetId(transposeCollection(entry.pitchClasses, 7)));
    expect(intervalsFromRoot(board.soundingPitchClasses, 7)).toEqual(intervalsFromRoot(entry.pitchClasses, 0));
    expect(new Set(board.locations.map((location) => location.pitchClass))).toEqual(new Set(board.soundingPitchClasses));
  });

  it('does not keep a second theory engine in the studio fretboard', () => {
    const binding = fs.readFileSync(path.join(__dirname, '../src/practice/practiceFretboard.ts'), 'utf8');
    const page = fs.readFileSync(path.join(__dirname, '../src/practice/PracticeStudioPage.tsx'), 'utf8');
    expect(binding).toContain('openStringMidisForTuning');
    expect(binding).toContain('fingeringOptions');
    expect(binding).toContain('PENTATONIC_NOTE_CHOICES');
    expect(binding).not.toMatch(/CAGED|renderScale|Ian Ring|ionian|NOTE_TO_SEMITONE/);
    expect(binding).not.toContain('(octave + 1) * 12');
    expect(page).not.toContain('fingeringOptions');
    expect(page).not.toContain('GUITAR_OPEN_STRING_MIDIS');
    expect(page).toContain('Inside the playable guitar range.');
    expect(page).not.toContain('Inside guitarRange()');
    expect(page).toContain('Play Scale');
  });
});

describe('practice studio fretboard controls', () => {
  it('updates the board from the explorer, the root, the tuning, and a clicked fret', () => {
    const tree = create(React.createElement(PracticeStudioPage));
    act(() => {
      tree.root.findByProps({ 'aria-label': 'Scale catalogue' }).props.onChange({
        target: { value: 'named' },
      });
    });
    act(() => {
      tree.root.findByProps({ 'aria-label': 'Search pitch classes, identifier, or name' }).props.onChange({
        target: { value: 'hirajoshi' },
      });
    });
    act(() => {
      tree.root.findByProps({ 'data-testid': 'explorer-mask-397' }).props.onClick();
    });
    const sounding = () => tree.root.findByProps({ 'data-testid': 'sounding-pitch-classes' }).children?.join('');
    expect(sounding()).toContain('0,4,5,9,11');
    act(() => {
      tree.root.findByProps({ 'aria-label': 'Fretboard root' }).props.onChange({ target: { value: '7' } });
    });
    expect(sounding()).toContain('2,3,7,9,10');
    act(() => {
      tree.root.findByType(FretboardPanel).props.onFretClick({ stringIndex: 0, fret: 0 });
    });
    expect(textOf(tree)).toContain('MIDI');
    expect(textOf(tree)).toContain('"40"');
    act(() => {
      tree.root.findByProps({ 'aria-label': 'Guitar tuning' }).props.onChange({ target: { value: 'dadgad' } });
    });
    const afterTuning = textOf(tree);
    expect(afterTuning).toContain('"38"');
    expect(afterTuning).not.toContain('"40"');
    expect(afterTuning).toContain('Fingering: not solved');
    expect(afterTuning).toContain('pcFretboard uses standard open strings only');
    act(() => {
      tree.root.findByProps({ 'aria-label': 'Fret range start' }).props.onChange({ target: { value: '5' } });
      tree.root.findByProps({ 'aria-label': 'Fret range end' }).props.onChange({ target: { value: '7' } });
    });
    const count = Number(tree.root.findByProps({ 'data-testid': 'fret-marker-count' }).children?.[0]);
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(
      buildPracticeFretboard({
        pitchClasses: getScaleExplorerEntry(397).pitchClasses,
        rootPc: 7,
        tuningId: 'dadgad',
        fretFrom: 0,
        fretTo: 12,
        position: null,
        labelMode: 'pitch',
      }).notes.length
    );
  });
});
