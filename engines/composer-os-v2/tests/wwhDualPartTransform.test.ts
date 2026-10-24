/**
 * Focused tests: MusicXML import, three dual-part profiles, export, validation.
 * Run:
 *   npx jest --config engines/composer-os-v2/jest.config.cjs \
 *     engines/composer-os-v2/tests/wwhDualPartTransform.test.ts --no-coverage
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  countBars,
  deliberatelyMutateGuitarPitch,
  deliberatelyMutateHarmonyRoot,
  expectedBarTicks,
  motifIntact,
  parseMusicXml,
  runDualPartTransform,
  sha256File,
  validateDualPartXml,
  verifyBassOnlyLocks,
} from '../core/duo/wwhDualPartTransform';

const FIXTURE_DIR = path.resolve(__dirname, '../resources/test-fixtures/wwh-dual-part');
const FIXTURE = path.join(FIXTURE_DIR, 'duo-8bar-fixture.musicxml');
const FIXTURE_78 = path.join(FIXTURE_DIR, 'duo-7-8-only-fixture.musicxml');
const FIXTURE_MIXED = path.join(FIXTURE_DIR, 'duo-mixed-metre-fixture.musicxml');

const SOFT_RANGES = {
  guitarMidi: { min: 40, max: 76 },
  bassMidi: { min: 28, max: 55 },
};

describe('wwhDualPartTransform', () => {
  let outDir: string;

  beforeAll(() => {
    expect(fs.existsSync(FIXTURE)).toBe(true);
    expect(fs.existsSync(FIXTURE_78)).toBe(true);
    expect(fs.existsSync(FIXTURE_MIXED)).toBe(true);
  });

  beforeEach(() => {
    outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wwh-dual-part-'));
  });

  afterEach(() => {
    fs.rmSync(outDir, { recursive: true, force: true });
  });

  test('imports MusicXML and reports bar count', () => {
    const xml = fs.readFileSync(FIXTURE, 'utf8');
    const doc = parseMusicXml(xml);
    expect(doc.getElementsByTagName('part').length).toBe(2);
    expect(countBars(xml)).toBe(8);
    expect(sha256File(FIXTURE)).toMatch(/^[a-f0-9]{64}$/);
  });

  test('exports all three profiles with motif lock and validation', () => {
    const sourceXml = fs.readFileSync(FIXTURE, 'utf8');
    const result = runDualPartTransform({
      sourcePath: FIXTURE,
      outDir,
      profiles: ['harmonic', 'contrapuntal', 'rhythmic'],
      motifBars: [1, 2],
      title: 'Fixture Duo',
      stem: 'fixture-8bar',
      seed: 24024,
      bhlWorld: 'F',
      minHarmonyCount: 4,
    });

    expect(result.barCount).toBe(8);
    expect(result.outputs).toHaveLength(3);
    expect(result.motifOk).toBe(true);
    expect(result.validation).toEqual([]);

    for (const o of result.outputs) {
      expect(fs.existsSync(o.path)).toBe(true);
      expect(o.xml.length).toBeGreaterThan(500);
      expect(motifIntact(sourceXml, o.xml, [1, 2])).toBe(true);
      const issues = validateDualPartXml(o.id, o.xml, {
        expectedBars: 8,
        guitarMidi: { min: 40, max: 76 },
        bassMidi: { min: 28, max: 55 },
        minHarmonyCount: 4,
      });
      expect(issues).toEqual([]);
    }

    // Source untouched
    expect(sha256File(FIXTURE)).toBe(result.sourceSha256);

    // Profiles produce distinct pitch surfaces (not identical to each other)
    const bodies = result.outputs.map((o) => o.xml.replace(/\s+/g, ' '));
    expect(bodies[0]).not.toEqual(bodies[1]);
    expect(bodies[1]).not.toEqual(bodies[2]);
  });

  test('contrapuntal and rhythmic alone do not require BHL side effects on source', () => {
    const before = sha256File(FIXTURE);
    const result = runDualPartTransform({
      sourcePath: FIXTURE,
      outDir,
      profiles: ['contrapuntal', 'rhythmic'],
      motifBars: [1],
      title: 'Fixture',
      stem: 'fixture',
      minHarmonyCount: 4,
    });
    expect(result.outputs).toHaveLength(2);
    expect(result.motifOk).toBe(true);
    expect(result.validation).toEqual([]);
    expect(sha256File(FIXTURE)).toBe(before);
  });

  test('expectedBarTicks preserves 4/4 and supports 7/8', () => {
    expect(expectedBarTicks(4, 4, 4)).toBe(16);
    expect(expectedBarTicks(4, 7, 8)).toBe(14);
    expect(expectedBarTicks(8, 7, 8)).toBe(28);
  });

  test('validateDualPartXml accepts 4/4 fixture durations', () => {
    const xml = fs.readFileSync(FIXTURE, 'utf8');
    expect(
      validateDualPartXml('4/4', xml, {
        expectedBars: 8,
        ...SOFT_RANGES,
        minHarmonyCount: 4,
      }),
    ).toEqual([]);
  });

  test('validateDualPartXml accepts pure 7/8 durations', () => {
    const xml = fs.readFileSync(FIXTURE_78, 'utf8');
    expect(countBars(xml)).toBe(2);
    expect(
      validateDualPartXml('7/8', xml, {
        expectedBars: 2,
        ...SOFT_RANGES,
        minHarmonyCount: 2,
      }),
    ).toEqual([]);
  });

  test('validateDualPartXml accepts 4/4 → 7/8 → 4/4 metre changes', () => {
    const xml = fs.readFileSync(FIXTURE_MIXED, 'utf8');
    expect(countBars(xml)).toBe(3);
    expect(
      validateDualPartXml('mixed', xml, {
        expectedBars: 3,
        ...SOFT_RANGES,
        minHarmonyCount: 3,
      }),
    ).toEqual([]);
  });

  test('validateDualPartXml flags underfilled 7/8 bar', () => {
    const xml = fs.readFileSync(FIXTURE_78, 'utf8').replace(
      /(<measure number="2">[\s\S]*?<duration>)2(<\/duration>[\s\S]*?<\/note><\/measure>)/,
      '$11$2',
    );
    const issues = validateDualPartXml('bad-7/8', xml, {
      expectedBars: 2,
      ...SOFT_RANGES,
      minHarmonyCount: 1,
    });
    expect(issues.some((i) => /bar 2 ticks .* != 14 \(7\/8\)/.test(i))).toBe(true);
  });

  test('bassOnly preserves guitar + harmony and rejects deliberate mutations', () => {
    const sourceXml = fs.readFileSync(FIXTURE, 'utf8');
    const before = sha256File(FIXTURE);
    const result = runDualPartTransform({
      sourcePath: FIXTURE,
      outDir,
      mode: 'bassOnly',
      lockGuitar: true,
      preserveHarmony: true,
      bassOnlyProfiles: ['lyrical', 'contrapuntal', 'rhythmic'],
      title: 'Fixture Duo',
      stem: 'fixture-8bar',
      seed: 11011,
      minHarmonyCount: 4,
    });

    expect(result.barCount).toBe(8);
    expect(result.outputs).toHaveLength(3);
    expect(result.motifOk).toBe(true);
    expect(result.validation).toEqual([]);
    expect(sha256File(FIXTURE)).toBe(before);

    for (const o of result.outputs) {
      expect(
        verifyBassOnlyLocks(sourceXml, o.xml, {
          lockGuitar: true,
          preserveHarmony: true,
        }),
      ).toEqual([]);
      expect(
        validateDualPartXml(o.id, o.xml, {
          expectedBars: 8,
          ...SOFT_RANGES,
          minHarmonyCount: 4,
        }),
      ).toEqual([]);
    }

    const bodies = result.outputs.map((o) => o.xml.replace(/\s+/g, ' '));
    expect(bodies[0]).not.toEqual(bodies[1]);
    expect(bodies[1]).not.toEqual(bodies[2]);

    const mutatedGuitar = deliberatelyMutateGuitarPitch(result.outputs[0]!.xml, 3, 2);
    const guitarIssues = verifyBassOnlyLocks(sourceXml, mutatedGuitar, {
      lockGuitar: true,
      preserveHarmony: true,
    });
    expect(guitarIssues.some((i) => /lockGuitar/.test(i))).toBe(true);

    const mutatedHarmony = deliberatelyMutateHarmonyRoot(result.outputs[0]!.xml, 1);
    const harmonyIssues = verifyBassOnlyLocks(sourceXml, mutatedHarmony, {
      lockGuitar: true,
      preserveHarmony: true,
    });
    expect(harmonyIssues.some((i) => /preserveHarmony/.test(i))).toBe(true);
  });

  test('bassOnly refuses to run without locks', () => {
    expect(() =>
      runDualPartTransform({
        sourcePath: FIXTURE,
        outDir,
        mode: 'bassOnly',
        lockGuitar: false,
        preserveHarmony: true,
      }),
    ).toThrow(/lockGuitar/);
  });
});
