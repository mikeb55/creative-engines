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
import { compareScores } from '../core/musical-evaluation/service';
import { runTechnicalChecks } from '../core/musical-evaluation/technicalChecks';

const FIXTURE_DIR = path.resolve(__dirname, '../resources/test-fixtures/wwh-dual-part');
const FIXTURE = path.join(FIXTURE_DIR, 'duo-8bar-fixture.musicxml');
const FIXTURE_78 = path.join(FIXTURE_DIR, 'duo-7-8-only-fixture.musicxml');
const FIXTURE_MIXED = path.join(FIXTURE_DIR, 'duo-mixed-metre-fixture.musicxml');

/** MORPH M1 Black Aura authoritative duo leadsheet (immutable master). */
const BLACK_AURA_V20 =
  '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/00 - WWH DUO LEADSHEETS/01-Black-Aura-Duo-Leadsheet-V2.0.musicxml';
const BLACK_AURA_V20_SHA =
  'b85f7731f0232c02ae588c63f2950037a340f62af64fe42b74b03157da4fccfd';

const SOFT_RANGES = {
  guitarMidi: { min: 40, max: 76 },
  bassMidi: { min: 28, max: 55 },
};

/** Ordered P2 note stream: pitch (or rest), duration — order-sensitive. */
function bassStreamFingerprint(xml: string): string {
  const doc = parseMusicXml(xml);
  const parts = Array.from(doc.getElementsByTagName('part'));
  const bass = parts.find((p) => p.getAttribute('id') === 'P2');
  if (!bass) throw new Error('P2 bass part missing');
  return Array.from(bass.getElementsByTagName('note'))
    .map((n) => {
      const duration = n.getElementsByTagName('duration')[0]?.textContent ?? '';
      if (n.getElementsByTagName('rest').length) return `R:${duration}`;
      const step = n.getElementsByTagName('step')[0]?.textContent ?? '';
      const alter = n.getElementsByTagName('alter')[0]?.textContent ?? '0';
      const octave = n.getElementsByTagName('octave')[0]?.textContent ?? '';
      return `${step}|${alter}|${octave}|${duration}`;
    })
    .join(';');
}

/** Metre, tempo and rehearsal markers by part/bar — structural lock surface. */
function metreTempoRehearsalFingerprint(xml: string): string {
  const doc = parseMusicXml(xml);
  const chunks: string[] = [];
  for (const part of Array.from(doc.getElementsByTagName('part'))) {
    const pid = part.getAttribute('id') ?? '?';
    for (const measure of Array.from(part.getElementsByTagName('measure'))) {
      const num = measure.getAttribute('number') ?? '?';
      const beats = measure.getElementsByTagName('beats')[0]?.textContent;
      const beatType = measure.getElementsByTagName('beat-type')[0]?.textContent;
      if (beats && beatType) chunks.push(`${pid}|${num}|time:${beats}/${beatType}`);
      for (const reh of Array.from(measure.getElementsByTagName('rehearsal'))) {
        chunks.push(`${pid}|${num}|reh:${reh.textContent ?? ''}`);
      }
      for (const pm of Array.from(measure.getElementsByTagName('per-minute'))) {
        chunks.push(`${pid}|${num}|tempo:${pm.textContent ?? ''}`);
      }
      for (const sound of Array.from(measure.getElementsByTagName('sound'))) {
        const tempo = sound.getAttribute('tempo');
        if (tempo) chunks.push(`${pid}|${num}|soundTempo:${tempo}`);
      }
    }
  }
  return chunks.join(';');
}

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

  test('lockBass=true preserves bass pitch, duration, rests and order on harmonic', () => {
    const sourceXml = fs.readFileSync(FIXTURE, 'utf8');
    const sourceBass = bassStreamFingerprint(sourceXml);
    const result = runDualPartTransform({
      sourcePath: FIXTURE,
      outDir,
      profiles: ['harmonic'],
      lockBass: true,
      motifBars: [1, 2],
      title: 'LockBass True',
      stem: 'lockbass-true',
      seed: 24024,
      bhlWorld: 'F',
      minHarmonyCount: 4,
    });
    expect(result.outputs).toHaveLength(1);
    expect(bassStreamFingerprint(result.outputs[0]!.xml)).toBe(sourceBass);
  });

  test('lockBass=false retains harmonic bass rewriting', () => {
    const sourceXml = fs.readFileSync(FIXTURE, 'utf8');
    const sourceBass = bassStreamFingerprint(sourceXml);
    const result = runDualPartTransform({
      sourcePath: FIXTURE,
      outDir,
      profiles: ['harmonic'],
      lockBass: false,
      motifBars: [1, 2],
      title: 'LockBass False',
      stem: 'lockbass-false',
      seed: 24024,
      bhlWorld: 'F',
      minHarmonyCount: 4,
    });
    expect(result.outputs).toHaveLength(1);
    expect(bassStreamFingerprint(result.outputs[0]!.xml)).not.toBe(sourceBass);
  });

  test('bassOnly + lockBass=true is rejected', () => {
    expect(() =>
      runDualPartTransform({
        sourcePath: FIXTURE,
        outDir,
        mode: 'bassOnly',
        lockGuitar: true,
        preserveHarmony: true,
        lockBass: true,
      }),
    ).toThrow(/bassOnly.*lockBass|lockBass.*bassOnly|conflicting options/);
  });

  test('lockBass=true preserves source SHA and writes output separately', () => {
    const before = sha256File(FIXTURE);
    const result = runDualPartTransform({
      sourcePath: FIXTURE,
      outDir,
      profiles: ['harmonic'],
      lockBass: true,
      motifBars: [1, 2],
      title: 'LockBass SHA',
      stem: 'lockbass-sha',
      seed: 24024,
      bhlWorld: 'F',
      minHarmonyCount: 4,
    });
    expect(result.outputs).toHaveLength(1);
    const out = result.outputs[0]!;
    expect(sha256File(FIXTURE)).toBe(before);
    expect(sha256File(FIXTURE)).toBe(result.sourceSha256);
    expect(out.path.startsWith(outDir)).toBe(true);
    expect(path.resolve(out.path)).not.toBe(path.resolve(FIXTURE));
    expect(fs.existsSync(out.path)).toBe(true);
    expect(fs.readFileSync(out.path, 'utf8')).toBe(out.xml);
  });

  test('Black Aura M1 harmonic lockBass keeps structural locks and separate output', () => {
    expect(fs.existsSync(BLACK_AURA_V20)).toBe(true);
    const beforeSha = sha256File(BLACK_AURA_V20);
    expect(beforeSha).toBe(BLACK_AURA_V20_SHA);

    const sourceXml = fs.readFileSync(BLACK_AURA_V20, 'utf8');
    const sourceBass = bassStreamFingerprint(sourceXml);
    const sourceStructure = metreTempoRehearsalFingerprint(sourceXml);

    const result = runDualPartTransform({
      sourcePath: BLACK_AURA_V20,
      outDir,
      profiles: ['harmonic'],
      lockBass: true,
      expectedSha256: BLACK_AURA_V20_SHA,
      motifBars: [9, 11],
      title: 'Black Aura',
      stem: 'Black-Aura-M1-lockBass',
      seed: 24024,
      bhlWorld: 'F',
    });

    expect(result.barCount).toBe(39);
    expect(result.outputs).toHaveLength(1);
    const out = result.outputs[0]!;
    expect(countBars(out.xml)).toBe(39);
    expect(bassStreamFingerprint(out.xml)).toBe(sourceBass);
    expect(metreTempoRehearsalFingerprint(out.xml)).toBe(sourceStructure);

    expect(sha256File(BLACK_AURA_V20)).toBe(beforeSha);
    expect(sha256File(BLACK_AURA_V20)).toBe(result.sourceSha256);
    expect(out.path.startsWith(outDir)).toBe(true);
    expect(path.resolve(out.path)).not.toBe(path.resolve(BLACK_AURA_V20));
    expect(fs.existsSync(out.path)).toBe(true);
    expect(fs.readFileSync(out.path, 'utf8')).toBe(out.xml);

    const receipt = compareScores({
      scores: [
        { label: 'Black-Aura-original', xml: sourceXml },
        { label: 'Black-Aura-M1-harmonic-lockBass', xml: out.xml },
      ],
    });
    expect(receipt.comparison).not.toBeNull();
    expect(receipt.comparison!.differences.length).toBeGreaterThan(0);
    expect(receipt.comparison!.rank).toBeNull();
    expect(receipt.comparison!.musicalQualityScore).toBeNull();
    expect(receipt.bmef.machineRatings).toBeNull();
    expect(receipt.bmef.machineDecision).toBeNull();
    expect(receipt.humanJudgement).toBeNull();

    const tech = runTechnicalChecks({
      xml: out.xml,
      lock: {
        sourceXml,
        spec: {
          span: { from: 1, to: 39 },
          bassPartId: 'P2',
          guitarPartId: 'P1',
          protectedGuitarBars: [],
        },
      },
    });
    expect(tech.summary.parse).toBe('pass');
    expect(tech.summary['source-lock']).toBe('pass');
  });
});
