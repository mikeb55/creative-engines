/**
 * D1 minimal self-test: 4 MusicXML files + 3-line summary (no UI, no receipt plumbing).
 */

import * as fs from 'fs';
import * as path from 'path';
import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';

const SEED = 50021;
const OUT_DIR = path.join(__dirname, '../../../outputs/d1-selftest');

const BASE = {
  presetId: 'guitar_bass_duo' as const,
  songModeHookFirstIdentity: true,
  totalBars: 32,
  longFormEnabled: true,
  creativeControlLevel: 'balanced' as const,
};

const NEUTRAL = { pattern: 0.35, expression: 0.35 };
const FIXED_SURPRISE = 0.5;

function writeXml(rel: string, xml: string | undefined): boolean {
  if (!xml) return false;
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, rel), xml, 'utf-8');
  return true;
}

function bufEqual(a: string, b: string): boolean {
  return Buffer.from(a, 'utf-8').equals(Buffer.from(b, 'utf-8'));
}

function main(): void {
  const baseline = runGoldenPathOnce(SEED, { ...BASE });
  const baseline2 = runGoldenPathOnce(SEED, { ...BASE });
  const groove = runGoldenPathOnce(SEED, {
    ...BASE,
    intent: { ...NEUTRAL, groove: 0.92, space: 0.08, surprise: FIXED_SURPRISE },
  });
  const space = runGoldenPathOnce(SEED, {
    ...BASE,
    intent: { ...NEUTRAL, groove: 0.08, space: 0.92, surprise: FIXED_SURPRISE },
  });

  const w1 = writeXml('baseline.musicxml', baseline.xml);
  const w2 = writeXml('baseline2.musicxml', baseline2.xml);
  const wg = writeXml('groove.musicxml', groove.xml);
  const ws = writeXml('space.musicxml', space.xml);

  /** Non-empty MusicXML + strict bar math (structural export sanity). */
  const exportOk = (r: typeof baseline) => Boolean(r.xml?.length && r.strictBarMathPassed);
  const exportsValid =
    exportOk(baseline) && exportOk(baseline2) && exportOk(groove) && exportOk(space) && w1 && w2 && wg && ws;

  const b1 = baseline.xml ?? '';
  const b2 = baseline2.xml ?? '';
  const gx = groove.xml ?? '';
  const sx = space.xml ?? '';

  const baselinePair = b1 && b2 ? (bufEqual(b1, b2) ? 'SAME' : 'DIFFERENT') : 'DIFFERENT';
  const grooveSpacePair = gx && sx ? (bufEqual(gx, sx) ? 'NOT DIFFERENT' : 'DIFFERENT') : 'NOT DIFFERENT';

  console.log(`baseline vs baseline2: ${baselinePair}`);
  console.log(`groove vs space: ${grooveSpacePair}`);
  console.log(`exports valid: ${exportsValid ? 'YES' : 'NO'}`);
}

main();
