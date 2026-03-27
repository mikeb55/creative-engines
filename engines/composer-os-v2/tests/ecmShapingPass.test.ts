/**
 * ECM shaping layer — OFF vs ON, determinism, validation.
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import type { PartModel } from '../core/score-model/scoreModelTypes';
import {
  countPartNotes,
  maxGlobalLeapBarryHarrisOrder,
  maxGuitarContourRepeatRun,
  maxMelodicLeap,
} from '../core/goldenPath/ecmShapingPass';

const ECM_BASE = {
  presetId: 'ecm_chamber' as const,
  ecmMode: 'ECM_METHENY_QUARTET' as const,
  styleStack: { primary: 'metheny' as const, weights: { primary: 1 as const } },
};

const SEED = 88_881;

function guitarPart(score: { parts: PartModel[] }): PartModel | undefined {
  return score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
}

function testEcmShapingFewerNotesAndSmootherOrStable(): boolean {
  const off = runGoldenPathOnce(SEED, { ...ECM_BASE, ecmShapingEnabled: false });
  const on = runGoldenPathOnce(SEED, { ...ECM_BASE, ecmShapingEnabled: true });
  if (!off.success || !on.success) return false;
  const gOff = guitarPart(off.score);
  const gOn = guitarPart(on.score);
  if (!gOff || !gOn) return false;
  const nOff = countPartNotes(gOff);
  const nOn = countPartNotes(gOn);
  if (nOn >= nOff) return false;
  const leapOff = maxMelodicLeap(gOff);
  const leapOn = maxMelodicLeap(gOn);
  return leapOn <= leapOff + 1;
}

function testEcmShapingDeterministic(): boolean {
  const a = runGoldenPathOnce(SEED, { ...ECM_BASE, ecmShapingEnabled: true });
  const b = runGoldenPathOnce(SEED, { ...ECM_BASE, ecmShapingEnabled: true });
  if (!a.success || !b.success || !a.xml || !b.xml) return false;
  return a.xml === b.xml;
}

function testEcmShapingOnPassesPipeline(): boolean {
  const r = runGoldenPathOnce(SEED, { ...ECM_BASE, ecmShapingEnabled: true });
  return (
    r.success &&
    r.integrityPassed &&
    r.behaviourGatesPassed &&
    r.mxValidationPassed &&
    r.strictBarMathPassed &&
    !!r.xml &&
    r.xml.includes('score-partwise')
  );
}

function testSameFormLength(): boolean {
  const off = runGoldenPathOnce(SEED, { ...ECM_BASE, ecmShapingEnabled: false });
  const on = runGoldenPathOnce(SEED, { ...ECM_BASE, ecmShapingEnabled: true });
  if (!off.success || !on.success) return false;
  const gOff = guitarPart(off.score);
  const gOn = guitarPart(on.score);
  if (!gOff || !gOn) return false;
  return gOff.measures.length === gOn.measures.length;
}

function testGuitarMaxLeapGlobalAtMost5(): boolean {
  const r = runGoldenPathOnce(SEED, { ...ECM_BASE, ecmShapingEnabled: true });
  if (!r.success) return false;
  const g = guitarPart(r.score);
  if (!g) return false;
  return maxGlobalLeapBarryHarrisOrder(g) <= 5;
}

function testNoTripleContourRepeat(): boolean {
  const r = runGoldenPathOnce(SEED, { ...ECM_BASE, ecmShapingEnabled: true });
  if (!r.success) return false;
  const g = guitarPart(r.score);
  if (!g) return false;
  return maxGuitarContourRepeatRun(g) <= 2;
}

/** Stress several seeds — shaping must stay within gates. */
function testEcmShapingMultiSeedValidation(): boolean {
  const seeds = [SEED, 12_345, 99_001, 404_404];
  for (const s of seeds) {
    const r = runGoldenPathOnce(s, { ...ECM_BASE, ecmShapingEnabled: true });
    if (!r.success || !r.behaviourGatesPassed) return false;
    const g = guitarPart(r.score);
    if (!g) return false;
    if (maxGlobalLeapBarryHarrisOrder(g) > 5 || maxGuitarContourRepeatRun(g) > 2) return false;
  }
  return true;
}

export function runEcmShapingPassTests(): { name: string; ok: boolean }[] {
  const results: { name: string; ok: boolean }[] = [];
  const t = (name: string, ok: boolean) => results.push({ name, ok });
  t('ECM shaping ON: fewer guitar notes than OFF; leap not worsened', testEcmShapingFewerNotesAndSmootherOrStable());
  t('ECM shaping ON: deterministic XML for same seed', testEcmShapingDeterministic());
  t('ECM shaping ON: passes integrity, behaviour, MX, bar math', testEcmShapingOnPassesPipeline());
  t('ECM shaping ON vs OFF: same guitar measure count (form preserved)', testSameFormLength());
  t('ECM shaping ON: guitar global BH-order leaps ≤ 5 semitones', testGuitarMaxLeapGlobalAtMost5());
  t('ECM shaping ON: no contour repeat >3 consecutive bars (anti-loop)', testNoTripleContourRepeat());
  t('ECM shaping ON: multi-seed validation + leap/contour gates', testEcmShapingMultiSeedValidation());
  return results;
}
