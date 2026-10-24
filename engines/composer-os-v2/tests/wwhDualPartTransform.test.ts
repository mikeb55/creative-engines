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
  motifIntact,
  parseMusicXml,
  runDualPartTransform,
  sha256File,
  validateDualPartXml,
} from '../core/duo/wwhDualPartTransform';

const FIXTURE = path.resolve(
  __dirname,
  '../resources/test-fixtures/wwh-dual-part/duo-8bar-fixture.musicxml',
);

describe('wwhDualPartTransform', () => {
  let outDir: string;

  beforeAll(() => {
    expect(fs.existsSync(FIXTURE)).toBe(true);
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
});
