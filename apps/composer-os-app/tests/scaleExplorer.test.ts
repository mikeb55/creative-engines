import React from 'react';
import { act, create } from 'react-test-renderer';
import * as fs from 'fs';
import * as path from 'path';
import { beforeAll, describe, expect, it } from 'vitest';
import { CORE_CANDIDATES, CORE_LABORATORY_STATUS } from '@composer-os/core/hexatonic/coreLaboratory';
import { listAdvancedColours, ADVANCED_STATUS, listExplorerCatalogue } from '@composer-os/core/hexatonic/advancedCollections';
import { listHexatonicScalars } from '@composer-os/core/hexatonic/collections';
import { classifyPitchClassSet } from '@composer-os/core/hexatonic/setClass';
import { listHexatonicWpsPairs } from '@composer-os/core/hexatonic/triadPairs';
import { listPentatonicColourResources } from '@composer-os/core/pentatonic/colourRegistry';
import { canonicalPitchSet, canonicalPitchSetId } from '@composer-os/core/pentatonic/pitch';
import { listPentatonicArchetypes } from '@composer-os/core/pentatonic/registry';
import { hashForRoute, routeFromLocation, routeNavLabel } from '../src/router/appRouter';
import { PracticeStudioPage } from '../src/practice/PracticeStudioPage';
import {
  CHROMATIC_MASK_COUNT,
  CHROMATIC_SET_MASK,
  EMPTY_SET_MASK,
  MATHEMATICAL_SET_STATUS,
  SCALE_EXPLORER_PAGE_SIZE,
  TONIC_FIXED_MASK_COUNT,
  filterScaleBrowse,
  filterScaleExplorer,
  forteClassForExplorer,
  getScaleExplorerEntry,
  listScaleExplorerEntries,
  pageScaleExplorer,
} from '../src/practice/scaleExplorer';
import { standardTuningPitchClassMarkers } from '../src/practice/standardFretMarkers';

function textOf(tree: ReturnType<typeof create>): string {
  return JSON.stringify(tree.toJSON());
}

beforeAll(() => {
  globalThis.requestAnimationFrame = (() => 0) as typeof requestAnimationFrame;
  globalThis.cancelAnimationFrame = () => undefined;
});

describe('scale explorer masks', () => {
  const entries = listScaleExplorerEntries();

  it('enumerates 4096 unique masks and 2048 tonic-fixed masks', () => {
    expect(entries).toHaveLength(CHROMATIC_MASK_COUNT);
    expect(new Set(entries.map((entry) => entry.mask)).size).toBe(CHROMATIC_MASK_COUNT);
    entries.forEach((entry, index) => expect(entry.mask).toBe(index));
    const tonicFixed = entries.filter((entry) => entry.tonicFixed);
    expect(tonicFixed).toHaveLength(TONIC_FIXED_MASK_COUNT);
    expect(tonicFixed.some((entry) => entry.mask === EMPTY_SET_MASK)).toBe(false);
    expect(tonicFixed.some((entry) => entry.mask === CHROMATIC_SET_MASK)).toBe(true);
    expect(tonicFixed.some((entry) => entry.mask === 1)).toBe(true);
  });

  it('keeps the empty set and the chromatic set unnamed', () => {
    const empty = getScaleExplorerEntry(EMPTY_SET_MASK);
    const chromatic = getScaleExplorerEntry(CHROMATIC_SET_MASK);
    expect(empty.cardinality).toBe(0);
    expect(empty.pitchClasses).toEqual([]);
    expect(empty.registrations).toEqual([]);
    expect(empty.forte).toBeNull();
    expect(empty.tonicFixed).toBe(false);
    expect(chromatic.cardinality).toBe(12);
    expect(chromatic.pitchClasses).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(chromatic.registrations.map((row) => row.registry)).toEqual(['glossary-named']);
    expect(chromatic.registrations[0]?.status).toBeNull();
    expect(chromatic.tonicFixed).toBe(true);
    expect(chromatic.forte).toBeNull();
  });

  it('filters by cardinality without duplicating a mask', () => {
    expect(filterScaleExplorer({ view: 'all', cardinality: 0, family: null, status: null, search: '' })).toEqual([
      getScaleExplorerEntry(EMPTY_SET_MASK),
    ]);
    expect(filterScaleExplorer({ view: 'all', cardinality: 12, family: null, status: null, search: '' })).toEqual([
      getScaleExplorerEntry(CHROMATIC_SET_MASK),
    ]);
    const five = filterScaleExplorer({ view: 'all', cardinality: 5, family: null, status: null, search: '' });
    expect(five).toHaveLength(792);
    expect(new Set(five.map((entry) => entry.mask)).size).toBe(792);
    const tonicFive = filterScaleExplorer({ view: 'tonic-fixed', cardinality: 5, family: null, status: null, search: '' });
    expect(tonicFive).toHaveLength(330);
    expect(tonicFive.every((entry) => entry.pitchClasses[0] === 0)).toBe(true);
  });

  it('searches pitch classes and registry identifiers', () => {
    const major = listPentatonicColourResources().find((row) => row.id === 'major_pentatonic');
    expect(major).toBeTruthy();
    const byNotes = filterScaleExplorer({
      view: 'all',
      cardinality: null,
      family: null,
      status: null,
      search: 'C D E G A',
    });
    expect(byNotes.map((entry) => entry.pitchClassId)).toContain(canonicalPitchSetId(major!.intervals));
    const byId = filterScaleExplorer({
      view: 'all',
      cardinality: null,
      family: null,
      status: null,
      search: 'hirajoshi',
    });
    expect(byId).toHaveLength(1);
    expect(byId[0]?.registrations.some((row) => row.id === 'hirajoshi')).toBe(true);
    expect(filterScaleExplorer({ view: 'all', cardinality: null, family: null, status: null, search: '4095' })).toEqual([
      getScaleExplorerEntry(CHROMATIC_SET_MASK),
    ]);
  });

  it('keeps one mathematical row when several registries share a pitch-class set', () => {
    const majorMask = getScaleExplorerEntry(
      listScaleExplorerEntries().find((entry) =>
        entry.registrations.some((row) => row.registry === 'pentatonic-colour' && row.id === 'major_pentatonic')
      )!.mask
    );
    const registries = majorMask.registrations.map((row) => row.registry);
    expect(registries).toContain('pentatonic-path');
    expect(registries).toContain('pentatonic-colour');
    expect(majorMask.registrations.filter((row) => row.id === 'major_pentatonic')).toHaveLength(2);

    const omitFourth = listHexatonicScalars().find((row) => row.id === 'hex_major_omit_fourth');
    const maj9 = listHexatonicWpsPairs().find((row) => row.id === 'maj9');
    expect(canonicalPitchSetId(omitFourth!.pitchClasses)).toBe(canonicalPitchSetId(maj9!.pitchClasses));
    const shared = entries.filter(
      (entry) =>
        entry.registrations.some((row) => row.id === 'hex_major_omit_fourth') &&
        entry.registrations.some((row) => row.id === 'maj9')
    );
    expect(shared).toHaveLength(1);
    const ids = shared[0]!.registrations.map((row) => row.id);
    expect(ids).toContain('hex_major_omit_fourth');
    expect(ids).toContain('maj9');
  });

  it('copies registry status and does not invent a Forte label off the hexachord table', () => {
    expect(listPentatonicColourResources()).toHaveLength(20);
    expect(listPentatonicArchetypes()).toHaveLength(2);
    expect(listHexatonicScalars()).toHaveLength(11);
    expect(listHexatonicWpsPairs()).toHaveLength(16);
    expect(CORE_CANDIDATES).toHaveLength(12);
    expect(listAdvancedColours()).toHaveLength(3);
    expect(listExplorerCatalogue()).toHaveLength(50);

    const provisional = filterScaleExplorer({
      view: 'all',
      cardinality: null,
      family: null,
      status: CORE_LABORATORY_STATUS,
      search: 'cm-dbm',
    });
    expect(provisional).toHaveLength(1);
    expect(provisional[0]?.registrations.find((row) => row.id === 'cm-dbm')?.status).toBe(CORE_LABORATORY_STATUS);

    const advanced = filterScaleExplorer({
      view: 'all',
      cardinality: null,
      family: 'advanced',
      status: ADVANCED_STATUS,
      search: '',
    });
    expect(advanced).toHaveLength(3);
    expect(advanced.every((entry) => entry.registrations.every((row) => row.status === ADVANCED_STATUS))).toBe(true);

    const five = getScaleExplorerEntry(
      filterScaleExplorer({ view: 'all', cardinality: 5, family: null, status: null, search: 'major_pentatonic' })[0]!.mask
    );
    expect(five.cardinality).toBe(5);
    expect(five.forte).toBeNull();
    expect(forteClassForExplorer(five.pitchClasses)).toBeNull();
    expect(() => classifyPitchClassSet(five.pitchClasses)).toThrow();

    const six = listHexatonicScalars().find((row) => row.id === 'hex_major_omit_seventh')!;
    const labelled = getScaleExplorerEntry(
      filterScaleExplorer({ view: 'all', cardinality: 6, family: null, status: null, search: six.id })[0]!.mask
    );
    expect(labelled.forte?.forte).toBe(classifyPitchClassSet(six.pitchClasses).forte);
    expect(labelled.intervalsFromC.map((interval) => interval.semitones)).toEqual([...labelled.pitchClasses]);
  });

  it('pages the full power set', () => {
    const paged = pageScaleExplorer(entries, 0);
    expect(paged.rows).toHaveLength(SCALE_EXPLORER_PAGE_SIZE);
    expect(paged.pageCount).toBe(CHROMATIC_MASK_COUNT / SCALE_EXPLORER_PAGE_SIZE);
    expect(pageScaleExplorer(entries, 999).page).toBe(paged.pageCount - 1);
  });
});

describe('standard tuning markers', () => {
  it('places selected pitch classes on frets 0–12 and invents no grip', () => {
    const entry = getScaleExplorerEntry(1);
    const markers = standardTuningPitchClassMarkers(entry.pitchClasses);
    expect(markers.length).toBeGreaterThan(0);
    expect(markers.every((note) => note.fret >= 0 && note.fret <= 12)).toBe(true);
    expect(markers.every((note) => note.stringIndex >= 0 && note.stringIndex <= 5)).toBe(true);
    expect(new Set(markers.map((note) => (40 + [0, 5, 10, 15, 19, 24][note.stringIndex]! + note.fret) % 12))).toEqual(
      new Set(entry.pitchClasses)
    );
    expect(standardTuningPitchClassMarkers([])).toEqual([]);
  });
});

describe('practice studio route', () => {
  it('opens and leaves the studio by hash without replacing other routes', () => {
    expect(routeNavLabel('practice')).toBe('Practice & Scales Studio');
    expect(hashForRoute('practice')).toBe('#/practice');
    expect(routeFromLocation({ hash: '#/practice', pathname: '/index.html' })).toBe('practice');
    expect(routeFromLocation({ hash: '#/pentatonic', pathname: '/practice' })).toBe('pentatonic');
    expect(routeFromLocation({ hash: '#/hexatonic', pathname: '/practice' })).toBe('hexatonic');
    expect(routeFromLocation({ hash: '#/bhl', pathname: '/practice' })).toBe('bhl');
    expect(routeFromLocation({ hash: '#/', pathname: '/practice' })).toBe('home');

    const appTs = fs.readFileSync(path.join(__dirname, '../src/App.tsx'), 'utf-8');
    expect(appTs).toContain("goToTab('practice')");
    expect(appTs).toContain("tab === 'practice' && <PracticeStudioPage />");
    expect(appTs).toContain("tab === 'home' && <HomeGenerate");
    expect(appTs).toContain("tab === 'arranger' && <ArrangerTab />");
    expect(appTs).toContain("tab === 'pentatonic' && <PentatonicEnginePage />");
    expect(appTs).toContain("tab === 'hexatonic' && <HexatonicEnginePage />");
    expect(appTs).toContain("tab === 'bhl' && <BhlComposerPage />");
  });

  it('renders the explorer, detail, fretboard, and unavailable panels', () => {
    const tree = create(React.createElement(PracticeStudioPage));
    const text = textOf(tree);
    expect(text).toContain('A Dorian');
    expect(text).toContain('1 2 b3 4 5 6 b7');
    expect(text).toContain('Play Scale');
    expect(text).toContain('Practice Generator');
    expect(text).toContain('Save session');
    expect(text).toContain('Practice Session');
    expect(text).toContain('About this scale');
    expect(text).toContain('https://ianring.com/musictheory/scales/1709');
    expect(text).not.toContain('Use in Generate');
    const markerCount = Number(tree.root.findByProps({ 'data-testid': 'fret-marker-count' }).children?.[0]);
    expect(markerCount).toBeGreaterThan(0);
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
    const selected = textOf(tree);
    expect(selected).toContain('hirajoshi');
    expect(selected).toContain('0,2,3,7,8');
    expect(selected).toContain('Open Pentatonic page');
    expect(selected).not.toContain('Open Hexatonic page');
    const hirajoshiMarkers = Number(tree.root.findByProps({ 'data-testid': 'fret-marker-count' }).children?.[0]);
    expect(hirajoshiMarkers).toBeGreaterThan(0);
  });
});

describe('scale catalogue groups', () => {
  it('keeps essentials musical and leaves hirajoshi in the named list', () => {
    const essentials = filterScaleBrowse({
      group: 'essentials',
      view: 'all',
      cardinality: null,
      family: null,
      status: null,
      search: '',
    });
    expect(essentials.map((entry) => entry.registrations.find((row) => row.registry === 'glossary-named')?.displayName)).toContain('dorian');
    expect(essentials.some((entry) => entry.mask === 397)).toBe(false);
    const named = filterScaleBrowse({
      group: 'named',
      view: 'all',
      cardinality: null,
      family: null,
      status: null,
      search: 'hirajoshi',
    });
    expect(named.map((entry) => entry.mask)).toEqual([397]);
    const theory = filterScaleBrowse({
      group: 'set-theory',
      view: 'all',
      cardinality: 0,
      family: null,
      status: null,
      search: '',
    });
    expect(theory.map((entry) => entry.mask)).toEqual([0]);
  });
});
