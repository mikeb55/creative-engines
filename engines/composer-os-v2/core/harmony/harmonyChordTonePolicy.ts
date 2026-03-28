/**
 * Single policy for chord-tone derivation: builtin golden-path canonical vs user-parsed (no silent substitution).
 */

import type { CompositionContext } from '../compositionContext';
import type { ChordToneSet } from '../goldenPath/guitarBassDuoHarmony';
import { chordTonesForChordSymbol } from './chordSymbolAnalysis';

/** When true, skip golden-path canonical rewrites (G7→G13, C→Cmaj9, etc.) and use heuristic chord tones from the symbol string. */
export function shouldUseUserChordSemanticsForTones(context: CompositionContext): boolean {
  const m = context.generationMetadata;
  if (m.harmonySource !== 'custom') return false;
  if (m.builtInHarmonyFallbackOccurred === true) return false;
  return true;
}

/**
 * Chord tones for generation / analysis — one entry point for duo + locked paths.
 * User custom harmony: same string as score/export; builtin: legacy golden canonical where applicable.
 */
export function chordTonesForChordSymbolWithContext(chord: string, context: CompositionContext): ChordToneSet {
  const locked = shouldUseUserChordSemanticsForTones(context);
  return chordTonesForChordSymbol(chord, { lockedHarmony: locked });
}
