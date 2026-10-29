/**
 * MORPH M1 Black Aura — Development Studio API end-to-end (unmocked).
 * Source: contract V2.0 leadsheet. Writes candidate MusicXML under a temp dir.
 *
 *   npx jest --config engines/composer-os-v2/jest.config.cjs \
 *     engines/composer-os-v2/tests/morphM1BlackAuraApiE2e.test.ts --no-coverage
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { apiDevelopDualPart } from '../app-api/developApp';
import {
  countBars,
  guitarBarsStreamFingerprint,
  motifIntact,
  parseMusicXml,
  protectedGuitarIntact,
  sha256File,
  sha256Text,
  validateDualPartXml,
} from '../core/duo/wwhDualPartTransform';
import { runTechnicalChecks } from '../core/musical-evaluation/technicalChecks';

const BLACK_AURA_V20 =
  '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/00 - WWH DUO LEADSHEETS/01-Black-Aura-Duo-Leadsheet-V2.0.musicxml';
const BLACK_AURA_V20_SHA =
  'b85f7731f0232c02ae588c63f2950037a340f62af64fe42b74b03157da4fccfd';

const MOTIF_BARS = [9, 11] as const;
const PROTECTED_GUITAR_BARS = [28, 29] as const;

const SOFT_RANGES = {
  guitarMidi: { min: 40, max: 76 },
  bassMidi: { min: 28, max: 55 },
};

function unprotectedGuitarBars(barCount: number): number[] {
  const locked = new Set<number>([...MOTIF_BARS, ...PROTECTED_GUITAR_BARS]);
  const bars: number[] = [];
  for (let b = 1; b <= barCount; b += 1) {
    if (!locked.has(b)) bars.push(b);
  }
  return bars;
}

describe('MORPH M1 Black Aura Development Studio API e2e', () => {
  let outDir: string;
  let outPath: string;

  beforeAll(() => {
    expect(fs.existsSync(BLACK_AURA_V20)).toBe(true);
    outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'morph-m1-ba-e2e-'));
  });

  test('apiDevelopDualPart harmonic lockBass + protected 28–29', () => {
    const beforeSha = sha256File(BLACK_AURA_V20);
    expect(beforeSha).toBe(BLACK_AURA_V20_SHA);

    const sourceXml = fs.readFileSync(BLACK_AURA_V20, 'utf8');
    const barCount = countBars(sourceXml);
    expect(barCount).toBe(39);

    const res = apiDevelopDualPart({
      xml: sourceXml,
      motifBars: [...MOTIF_BARS],
      lockBass: true,
      protectedGuitarBars: [...PROTECTED_GUITAR_BARS],
      title: 'Black Aura',
      stem: 'Black-Aura-M1-api-e2e',
      label: '01-Black-Aura-Duo-Leadsheet-V2.0.musicxml',
      selectedCellId: 'e2e-motif-9-11',
      seed: 24024,
      bhlWorld: 'F',
    });

    expect(res.ok).toBe(true);
    if (!res.ok) {
      throw new Error(res.error);
    }

    expect(res.result.lockBass).toBe(true);
    expect(res.result.motifBars).toEqual([...MOTIF_BARS]);
    expect(res.result.protectedGuitarBars).toEqual([...PROTECTED_GUITAR_BARS]);
    expect(res.result.barCount).toBe(39);
    expect(res.result.sourceSha256).toBe(BLACK_AURA_V20_SHA);
    expect(res.result.motifOk).toBe(true);

    outPath = path.join(outDir, res.result.file || 'Black-Aura-M1-api-e2e.musicxml');
    fs.writeFileSync(outPath, res.result.musicXml, 'utf8');
    fs.writeFileSync(path.join(outDir, 'lineage.txt'), res.result.lineage, 'utf8');
    fs.writeFileSync(
      path.join(outDir, 'RESULT.txt'),
      [
        `outPath=${outPath}`,
        `sourceSha=${beforeSha}`,
        `outputSha=${res.result.outputSha256}`,
        `outputShaFile=${sha256File(outPath)}`,
      ].join('\n'),
      'utf8',
    );

    expect(sha256Text(res.result.musicXml)).toBe(res.result.outputSha256);
    expect(sha256File(outPath)).toBe(res.result.outputSha256);

    // 2. MusicXML parses
    const doc = parseMusicXml(res.result.musicXml);
    expect(doc.getElementsByTagName('part').length).toBe(2);
    expect(countBars(res.result.musicXml)).toBe(39);

    const parseIssues = validateDualPartXml('M1-api-e2e', res.result.musicXml, {
      expectedBars: 39,
      ...SOFT_RANGES,
      minHarmonyCount: 1,
    });
    expect(parseIssues.filter((i) => /bar count/.test(i))).toHaveLength(0);

    // 3–5. Protected guitar, bass (via BHL lock), motif locks
    expect(
      protectedGuitarIntact(sourceXml, res.result.musicXml, PROTECTED_GUITAR_BARS),
    ).toBe(true);
    expect(motifIntact(sourceXml, res.result.musicXml, MOTIF_BARS)).toBe(true);

    const tech = runTechnicalChecks({
      xml: res.result.musicXml,
      lock: {
        sourceXml,
        spec: {
          span: { from: 1, to: 39 },
          bassPartId: 'P2',
          guitarPartId: 'P1',
          protectedGuitarBars: [...PROTECTED_GUITAR_BARS],
        },
      },
    });
    expect(tech.summary.parse).toBe('pass');
    expect(tech.summary['source-lock']).toBe('pass');

    // 6. Source MusicXML unchanged on disk
    expect(sha256File(BLACK_AURA_V20)).toBe(beforeSha);
    expect(sha256File(BLACK_AURA_V20)).toBe(BLACK_AURA_V20_SHA);

    // 7. Unprotected guitar material transformed
    const unprotected = unprotectedGuitarBars(39);
    expect(unprotected.length).toBeGreaterThan(0);
    expect(guitarBarsStreamFingerprint(res.result.musicXml, unprotected)).not.toBe(
      guitarBarsStreamFingerprint(sourceXml, unprotected),
    );

    // eslint-disable-next-line no-console
    console.log(`MORPH_M1_E2E_OUT=${outPath}`);
  });
});
