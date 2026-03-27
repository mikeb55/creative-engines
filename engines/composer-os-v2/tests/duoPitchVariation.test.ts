/**
 * Duo pitch variation — OFF vs ON, determinism, validation (variationEnabled pipeline).
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import {
  extractGuitarPitchSequence,
  extractGuitarRhythmFingerprint,
} from '../core/goldenPath/duoPitchVariationPass';

const SEED = 424242;
const BASE_OPTS = {
  presetId: 'guitar_bass_duo' as const,
  styleStack: { primary: 'barry_harris' as const, weights: { primary: 1 as const } },
};

function testOffVsOnDifferentPitchesSameRhythm(): boolean {
  const off = runGoldenPathOnce(SEED, { ...BASE_OPTS });
  const on = runGoldenPathOnce(SEED, { ...BASE_OPTS, variationEnabled: true });
  if (!off.success || !on.success) return false;
  const pOff = extractGuitarPitchSequence(off.score);
  const pOn = extractGuitarPitchSequence(on.score);
  const rOff = extractGuitarRhythmFingerprint(off.score);
  const rOn = extractGuitarRhythmFingerprint(on.score);
  if (pOff.length === 0 || pOff.length !== pOn.length) return false;
  if (rOff !== rOn) return false;
  return pOff.join(',') !== pOn.join(',');
}

function testOnDeterministic(): boolean {
  const a = runGoldenPathOnce(SEED, { ...BASE_OPTS, variationEnabled: true });
  const b = runGoldenPathOnce(SEED, { ...BASE_OPTS, variationEnabled: true });
  if (!a.success || !b.success) return false;
  return (
    extractGuitarPitchSequence(a.score).join(',') === extractGuitarPitchSequence(b.score).join(',') &&
    a.xml === b.xml
  );
}

function testOnPassesGoldenPathGates(): boolean {
  const r = runGoldenPathOnce(SEED, { ...BASE_OPTS, variationEnabled: true });
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

function testOffBaselineStable(): boolean {
  const a = runGoldenPathOnce(SEED, { ...BASE_OPTS });
  const b = runGoldenPathOnce(SEED, { ...BASE_OPTS, variationEnabled: false });
  if (!a.success || !b.success) return false;
  return extractGuitarPitchSequence(a.score).join(',') === extractGuitarPitchSequence(b.score).join(',');
}

function testOffMatchesExplicitUndefined(): boolean {
  const a = runGoldenPathOnce(SEED, { ...BASE_OPTS });
  const b = runGoldenPathOnce(SEED, { ...BASE_OPTS, variationEnabled: undefined });
  if (!a.success || !b.success) return false;
  return extractGuitarPitchSequence(a.score).join(',') === extractGuitarPitchSequence(b.score).join(',');
}

export function runDuoPitchVariationTests(): { name: string; ok: boolean }[] {
  const results: { name: string; ok: boolean }[] = [];
  const t = (name: string, ok: boolean) => results.push({ name, ok });
  t('Variation ON vs OFF: different guitar pitches, identical rhythm fingerprint', testOffVsOnDifferentPitchesSameRhythm());
  t('Variation ON: deterministic pitches + XML for same seed', testOnDeterministic());
  t('Variation ON: passes integrity, behaviour, MX, bar math + valid MusicXML', testOnPassesGoldenPathGates());
  t('Variation OFF: baseline stable (two runs)', testOffBaselineStable());
  t('Variation OFF: undefined matches false', testOffMatchesExplicitUndefined());
  return results;
}
