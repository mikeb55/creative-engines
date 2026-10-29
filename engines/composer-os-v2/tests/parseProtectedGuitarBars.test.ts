/**
 * MORPH M1 protected-guitar-bars: parser + developApp GUI forward.
 * Run:
 *   npx jest --config engines/composer-os-v2/jest.config.cjs \
 *     engines/composer-os-v2/tests/parseProtectedGuitarBars.test.ts --no-coverage
 */

import fs from 'node:fs';
import path from 'node:path';
import { parseProtectedGuitarBarSpec } from '../core/duo/parseProtectedGuitarBars';

jest.mock('../core/duo/wwhDualPartTransform', () => {
  const actual = jest.requireActual('../core/duo/wwhDualPartTransform') as typeof import('../core/duo/wwhDualPartTransform');
  return {
    ...actual,
    runDualPartTransform: jest.fn(),
  };
});

import { runDualPartTransform } from '../core/duo/wwhDualPartTransform';
import { apiDevelopDualPart } from '../app-api/developApp';

const FIXTURE = path.resolve(
  __dirname,
  '../resources/test-fixtures/wwh-dual-part/duo-8bar-fixture.musicxml',
);

const mockedRun = runDualPartTransform as jest.MockedFunction<typeof runDualPartTransform>;

describe('parseProtectedGuitarBarSpec', () => {
  const barCount = 39;

  test('empty input → no protected bars', () => {
    expect(parseProtectedGuitarBarSpec('', barCount)).toEqual({ ok: true, bars: [] });
    expect(parseProtectedGuitarBarSpec('   ', barCount)).toEqual({ ok: true, bars: [] });
    expect(parseProtectedGuitarBarSpec(undefined, barCount)).toEqual({ ok: true, bars: [] });
    expect(parseProtectedGuitarBarSpec(null, barCount)).toEqual({ ok: true, bars: [] });
  });

  test('"28-29, 33, 36-39" → correct individual bars', () => {
    const r = parseProtectedGuitarBarSpec('28-29, 33, 36-39', barCount);
    expect(r).toEqual({ ok: true, bars: [28, 29, 33, 36, 37, 38, 39] });
  });

  test('duplicate/overlapping ranges → unique bars', () => {
    const r = parseProtectedGuitarBarSpec('28, 28-29, 29, 36-38, 37-39', barCount);
    expect(r).toEqual({ ok: true, bars: [28, 29, 36, 37, 38, 39] });
  });

  test('rejects zero, negative, reversed, malformed and out-of-score', () => {
    expect(parseProtectedGuitarBarSpec('0', barCount).ok).toBe(false);
    expect(parseProtectedGuitarBarSpec('-1', barCount).ok).toBe(false);
    expect(parseProtectedGuitarBarSpec('29-28', barCount).ok).toBe(false);
    expect(parseProtectedGuitarBarSpec('abc', barCount).ok).toBe(false);
    expect(parseProtectedGuitarBarSpec('28-29x', barCount).ok).toBe(false);
    expect(parseProtectedGuitarBarSpec('40', barCount).ok).toBe(false);
    expect(parseProtectedGuitarBarSpec('38-40', barCount).ok).toBe(false);
  });
});

function stubTransform(xml: string): void {
  const { sha256Text } = jest.requireActual(
    '../core/duo/wwhDualPartTransform',
  ) as typeof import('../core/duo/wwhDualPartTransform');
  mockedRun.mockReturnValue({
    sourcePath: '/tmp/source.musicxml',
    sourceSha256: sha256Text(xml),
    barCount: 8,
    outDir: '/tmp/out',
    motifOk: true,
    validation: [],
    outputs: [
      {
        id: 'harmonic',
        profile: 'harmonic',
        xml: '<score-partwise/>',
        sha256: 'out',
        note: 'mock',
        file: 'out.musicxml',
        path: '/tmp/out.musicxml',
      },
    ],
  });
}

describe('apiDevelopDualPart protectedGuitarBars forward', () => {
  beforeEach(() => {
    mockedRun.mockReset();
  });

  test('forwards parsed string bars with lockBass + motifBars intact', () => {
    expect(fs.existsSync(FIXTURE)).toBe(true);
    const xml = fs.readFileSync(FIXTURE, 'utf8');
    stubTransform(xml);

    const res = apiDevelopDualPart({
      xml,
      motifBars: [1, 2],
      lockBass: true,
      protectedGuitarBars: '2-3, 5, 5-6',
    });

    expect(res.ok).toBe(true);
    expect(mockedRun).toHaveBeenCalledTimes(1);
    const args = mockedRun.mock.calls[0]![0];
    expect(args.lockBass).toBe(true);
    expect(args.motifBars).toEqual([1, 2]);
    expect(args.protectedGuitarBars).toEqual([2, 3, 5, 6]);
    expect(args.profiles).toEqual(['harmonic']);
    if (res.ok) {
      expect(res.result.lockBass).toBe(true);
      expect(res.result.motifBars).toEqual([1, 2]);
      expect(res.result.protectedGuitarBars).toEqual([2, 3, 5, 6]);
    }
  });

  test('omits protectedGuitarBars when empty; keeps bass/motif locks', () => {
    const xml = fs.readFileSync(FIXTURE, 'utf8');
    stubTransform(xml);

    const res = apiDevelopDualPart({
      xml,
      motifBars: [3],
      lockBass: true,
      protectedGuitarBars: '  ',
    });

    expect(res.ok).toBe(true);
    const args = mockedRun.mock.calls[0]![0];
    expect(args.lockBass).toBe(true);
    expect(args.motifBars).toEqual([3]);
    expect(args.protectedGuitarBars).toBeUndefined();
  });
});
