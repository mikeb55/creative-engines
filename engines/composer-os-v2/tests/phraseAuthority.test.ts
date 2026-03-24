/**
 * Phrase authority + duo dialogue gates (guitar contour, handoffs, section contrast).
 */

import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import { validateDuoPhraseAuthority } from '../core/score-integrity/phraseAuthorityValidation';

function testPhraseAuthorityMultiSeed(): boolean {
  for (const seed of [0, 7, 24, 101, 202]) {
    const r = runGoldenPath(seed);
    if (!r.success) return false;
    const v = validateDuoPhraseAuthority(r.score);
    if (!v.valid) return false;
  }
  return true;
}

function testPhraseAuthorityBacharachPrimary(): boolean {
  const r = runGoldenPath(11, {
    styleStack: { primary: 'bacharach', weights: { primary: 1 } },
  });
  if (!r.success) return false;
  return validateDuoPhraseAuthority(r.score).valid;
}

export function runPhraseAuthorityTests(): { name: string; ok: boolean }[] {
  return [
    ['Phrase authority passes multi-seed golden path', testPhraseAuthorityMultiSeed],
    ['Phrase authority passes with Bacharach primary', testPhraseAuthorityBacharachPrimary],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
