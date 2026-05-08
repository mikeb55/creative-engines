/**
 * Product `metadata.duoIntent` (conversational | supportive) vs Slonimsky `duoIntent` parameter ({@link PhraseIntent}).
 */

import { duoGoldenPathPhraseIntentAtBar } from '../core/phrase/phraseBuilder';

/** Fixed seed known to produce ≥1 phrase-intent mismatch between product intents over 32 bars. */
const INTENT_DIFF_SEED = 77231;

export function runDuoIntentTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const maxBar = 32;
  let diffBars = 0;
  for (let b = 1; b <= maxBar; b++) {
    const conv = duoGoldenPathPhraseIntentAtBar(INTENT_DIFF_SEED, b, 'conversational');
    const sup = duoGoldenPathPhraseIntentAtBar(INTENT_DIFF_SEED, b, 'supportive');
    if (conv !== sup) diffBars++;
  }
  out.push({
    ok: diffBars >= 1,
    name: `duoIntent product: conversational vs supportive differ on ≥1 bar (seed=${INTENT_DIFF_SEED}, 1–${maxBar})`,
  });

  let regOk = true;
  const regSeed = 50021;
  for (let b = 1; b <= maxBar; b++) {
    const baseline = duoGoldenPathPhraseIntentAtBar(regSeed, b);
    const explicitUndefined = duoGoldenPathPhraseIntentAtBar(regSeed, b, undefined);
    if (baseline !== explicitUndefined) {
      regOk = false;
      break;
    }
  }
  out.push({
    ok: regOk,
    name: 'duoIntent product: omitted third arg matches explicit undefined (no regression vs pre–Batch-B)',
  });

  return out;
}
