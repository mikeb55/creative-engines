/**
 * Immutable canonical harmony timeline for Song Mode / duo routing (Frank Zappa primary).
 * Built once before score generation; `getChordForBar` and validators read the same snapshot.
 *
 * Construction (`attachFrankZappaHarmonyContext`) lives in `song-mode/frankZappaSlice.ts` to avoid
 * importing this module from `harmonyResolution.ts` while `frankZappaSlice` imports `getChordForBar`.
 */

import { createHash } from 'crypto';
import type { CompositionContext } from '../compositionContext';
import type { ScoreModel } from '../score-model/scoreModelTypes';
import { lockedHarmonyChordSymbolsEquivalent } from './chordProgressionParser';

export type HarmonyContextSource = 'frank_zappa_effective' | 'locked' | 'generated';

export type HarmonyContext = Readonly<{
  styleId: string;
  source: HarmonyContextSource;
  bars: readonly string[];
  checksum: string;
}>;

export function computeHarmonyChecksum(bars: readonly string[]): string {
  return createHash('sha256').update(bars.join('\u0001'), 'utf8').digest('hex');
}

/** Guitar part measure chords must match the immutable timeline (any drift ⇒ named pass failed). */
export function assertGuitarScoreMatchesHarmonyContext(
  score: ScoreModel,
  context: CompositionContext,
  passName: string
): void {
  const hc = context.harmonyContext;
  if (!hc) return;
  const tb = context.form.totalBars;
  if (hc.bars.length !== tb) return;
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!g) {
    throw new Error(`[${passName}] HARMONY_CONTEXT_INVARIANT: missing clean_electric_guitar part`);
  }
  for (let b = 1; b <= tb; b++) {
    const exp = hc.bars[b - 1] ?? '';
    const got = g.measures.find((m) => m.index === b)?.chord ?? '';
    if (!lockedHarmonyChordSymbolsEquivalent(got, exp)) {
      throw new Error(
        `[${passName}] HARMONY_CONTEXT_VIOLATION: bar ${b} guitar chord "${got}" !== canonical "${exp}" ` +
          `(source=${hc.source}, checksum=${hc.checksum})`
      );
    }
  }
}

export function logHarmonyProvenance(params: {
  barIndex: number;
  canonical: string;
  scoreChordWritten?: string;
  source: HarmonyContextSource;
  checksum: string;
}): void {
  if (typeof process === 'undefined' || process.env?.COMPOSER_OS_HARMONY_PROVENANCE !== '1') return;
  console.log(
    '[HARMONY_PROVENANCE]',
    JSON.stringify({
      barIndex: params.barIndex,
      canonical: params.canonical,
      scoreChordWritten: params.scoreChordWritten ?? null,
      source: params.source,
      checksum: params.checksum,
    })
  );
}
