import { readFileSync } from 'fs';
import { describe, expect, it } from 'vitest';
import { CORE_LABORATORY_STATUS } from '@composer-os/core/hexatonic/coreLaboratory';
import { ADVANCED_STATUS } from '@composer-os/core/hexatonic/advancedCollections';
import {
  filterScaleExplorer,
  getScaleExplorerEntry,
  listScaleExplorerEntries,
} from '../src/practice/scaleExplorer';
import {
  computePitchClassSetMath,
  glossaryNameRecords,
  glossaryNamesForMask,
  normaliseScaleName,
  parseScaleSearch,
  reversePitchClassBits,
  transposeMask,
} from '../src/practice/scaleGlossary';
import fixturesFile from './fixtures/master-scale-glossary-fixtures.json';

interface FixtureRow {
  label_for_test_only: string;
  pitchClasses: number[];
  mask: number;
  ianRingId: number;
  ianRingUrl: string;
  rootMsbNumber_ZeitlerTonal: number;
  stepPattern: number[];
  modeMasks: number[];
  distinctModeCount: number;
  tnClassMask: number;
  tniPrimeMask_RahnRing: number;
  forteNumber_music21: string;
  forteInversion_music21: 'A' | 'B' | null;
  hasZRelation: boolean;
  zeitlerMaxStep4: boolean;
}

const fixtures = fixturesFile as {
  invariants: {
    maskCount: number;
    tonicFixedCount: number;
    zeitlerRuleTonicFixedCount: number;
    zeitlerRuleByCardinality: Record<string, number>;
    tnClassesInclEmpty: number;
    tniClassesInclEmpty: number;
    forteVsRahnPrimeDisagreements: { rahnRingPrime: number; fortePrimeMask: number }[];
  };
  fixtures: FixtureRow[];
};

describe('master scale glossary', () => {
  const entries = listScaleExplorerEntries();

  it('matches the researched counts, including the maximum-step filter', () => {
    expect(entries).toHaveLength(fixtures.invariants.maskCount);
    expect(entries.filter((entry) => entry.tonicFixed)).toHaveLength(fixtures.invariants.tonicFixedCount);
    const zeitler = entries.filter((entry) => entry.math.zeitlerMaxStep4);
    expect(zeitler).toHaveLength(fixtures.invariants.zeitlerRuleTonicFixedCount);
    for (const [cardinality, count] of Object.entries(fixtures.invariants.zeitlerRuleByCardinality)) {
      expect(zeitler.filter((entry) => entry.cardinality === Number(cardinality))).toHaveLength(count);
    }
    expect(new Set(entries.map((entry) => entry.math.tnClassMask)).size).toBe(fixtures.invariants.tnClassesInclEmpty);
    expect(new Set(entries.map((entry) => entry.math.primeMaskRahn)).size).toBe(fixtures.invariants.tniClassesInclEmpty);
    expect(new Set(entries.map((entry) => entry.math.computedForte.number)).size).toBe(224);
  });

  it('round-trips every mask and keeps the Ian Ring id equal to that mask', () => {
    for (const entry of entries) {
      expect(entry.math.ianRing === null || entry.math.ianRing.id === entry.mask).toBe(true);
      const again = computePitchClassSetMath(entry.mask);
      expect(again.primeMaskRahn).toBe(entry.math.primeMaskRahn);
      expect(again.primeMaskForte).toBe(entry.math.primeMaskForte);
    }
    expect(entries.filter((entry) => entry.math.ianRing === null)).toHaveLength(2048);
    expect(entries.filter((entry) => entry.mask % 2 === 0).every((entry) => entry.math.ianRing === null)).toBe(true);
    const major = getScaleExplorerEntry(2741);
    expect(major.math.ianRing).toEqual({
      id: 2741,
      url: 'https://ianring.com/musictheory/scales/2741',
    });
  });

  it('matches the music21 fixture rows and keeps transposition apart from mode rotation', () => {
    for (const row of fixtures.fixtures) {
      const entry = getScaleExplorerEntry(row.mask);
      expect(entry.pitchClasses).toEqual(row.pitchClasses);
      expect(entry.math.ianRing?.id).toBe(row.ianRingId);
      expect(entry.math.ianRing?.url).toBe(row.ianRingUrl);
      expect(entry.math.rootMsbNumber).toBe(row.rootMsbNumber_ZeitlerTonal);
      expect(entry.math.rootMsbNumber).toBe(reversePitchClassBits(row.mask));
      expect(entry.math.stepPattern).toEqual(row.stepPattern);
      expect(entry.math.modeMasks).toEqual(row.modeMasks);
      expect(new Set(row.modeMasks).size).toBe(row.distinctModeCount);
      expect(entry.math.tnClassMask).toBe(row.tnClassMask);
      expect(entry.math.primeMaskRahn).toBe(row.tniPrimeMask_RahnRing);
      expect(entry.math.zeitlerMaxStep4).toBe(row.zeitlerMaxStep4);
      const music21Number = row.hasZRelation ? row.forteNumber_music21.replace('-', '-Z') : row.forteNumber_music21;
      expect(entry.math.computedForte.number).toBe(music21Number);
      expect(entry.math.computedForte.z).toBe(row.hasZRelation);
      expect(entry.math.computedForte.inversion).toBe(row.forteInversion_music21);
    }
    const major = getScaleExplorerEntry(2741);
    expect(major.math.modeMasks).toEqual([2741, 1709, 1451, 2773, 1717, 1453, 1387]);
    expect(transposeMask(2741, 1)).toBe(1387);
    expect(major.math.modeMasks[1]).not.toBe(transposeMask(2741, 1));
  });

  it('finds the six Forte and Rahn prime disagreements and no others', () => {
    const disagreements = new Map<number, number>();
    for (const entry of entries) {
      if (entry.math.primeMaskForte !== entry.math.primeMaskRahn) {
        disagreements.set(entry.math.primeMaskRahn, entry.math.primeMaskForte);
      }
    }
    expect(disagreements.size).toBe(fixtures.invariants.forteVsRahnPrimeDisagreements.length);
    for (const row of fixtures.invariants.forteVsRahnPrimeDisagreements) {
      expect(disagreements.get(row.rahnRingPrime)).toBe(row.fortePrimeMask);
    }
    const blues = getScaleExplorerEntry(1257);
    expect(blues.math.computedForte).toEqual({ number: '6-Z47', z: true, inversion: 'B' });
    expect(blues.forte?.forte).toBe('6-47');
  });

  it('keeps Zeitler bit order from labelling Lydian as Ionian', () => {
    expect(parseScaleSearch('zeitler:2773')).toEqual({ kind: 'mask', mask: 2741, convention: 'zeitler' });
    expect(parseScaleSearch('ir:2741')).toEqual({ kind: 'mask', mask: 2741, convention: 'ian-ring' });
    expect(parseScaleSearch('hex:0xAB5')).toEqual({ kind: 'mask', mask: 2741, convention: 'hex' });
    const byZeitler = filterScaleExplorer({ view: 'all', cardinality: null, family: null, status: null, search: 'zeitler:2773' });
    expect(byZeitler.map((entry) => entry.mask)).toEqual([2741]);
    const lydian = getScaleExplorerEntry(2773);
    const labels = [
      ...lydian.registrations.map((row) => row.displayName),
      ...glossaryNamesForMask(2773).flatMap((record) => [record.primaryName, ...record.aliases]),
    ].map(normaliseScaleName);
    expect(labels.some((label) => label === 'ionian' || label.includes('ionian'))).toBe(false);
    const ionian = filterScaleExplorer({ view: 'all', cardinality: null, family: null, status: null, search: 'ionian' });
    expect(ionian.map((entry) => entry.mask)).toContain(2741);
    expect(ionian.map((entry) => entry.mask)).not.toContain(2773);
  });

  it('stores Tonal names with sources and leaves registry status untouched', () => {
    const records = glossaryNameRecords();
    expect(records.length).toBe(85);
    expect(records.every((record) => record.licenceBasis === 'MIT' && record.sourceUrl.length > 0)).toBe(true);
    expect(records.some((record) => record.kind === 'systematic-coined')).toBe(false);
    const diminished = records.find((record) => record.primaryName === 'diminished');
    expect(diminished?.mask).toBe(2925);
    expect(diminished?.conflicts).toContain('half-whole');
    expect(glossaryNamesForMask(1755).some((record) => normaliseScaleName(record.primaryName) === 'diminished')).toBe(false);
    const provisional = getScaleExplorerEntry(
      filterScaleExplorer({ view: 'all', cardinality: null, family: null, status: CORE_LABORATORY_STATUS, search: '' })[0]!.mask
    );
    expect(provisional.registrations.some((row) => row.status === CORE_LABORATORY_STATUS)).toBe(true);
    expect(provisional.registrations.filter((row) => row.registry === 'glossary-named').every((row) => row.status === null)).toBe(true);
    const advanced = filterScaleExplorer({ view: 'all', cardinality: null, family: 'advanced', status: ADVANCED_STATUS, search: '' });
    expect(advanced.every((entry) => entry.registrations.some((row) => row.status === ADVANCED_STATUS))).toBe(true);
    expect(normaliseScaleName('Rāga')).toBe('raga');
    const source = readFileSync(new URL('../src/practice/data/named-scales.json', import.meta.url), 'utf8');
    expect(source).not.toMatch(/ianring\.com|allthescales\.org|zeitler/i);
  });
});
