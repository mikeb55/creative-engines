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
 *
 * `shorterMode` remaps ChordToneSet field roles onto upper extensions (7→root slot, 9→third, …).
 * That bias is for Wayne Shorter / Andrew Hill language only. Locked/custom symbols must keep
 * true root/3rd/5th/7th (or 6th) roles so bass melodic motion tracks the sounding chord —
 * otherwise e.g. Bb6/9 feeds C (9th) as “third” and the line camps on one PC.
 */
export function chordTonesForChordSymbolWithContext(chord: string, context: CompositionContext): ChordToneSet {
  const locked = shouldUseUserChordSemanticsForTones(context);
  const primaryStyle = (context.generationMetadata as any)?.songwriterStyleId ?? '';
  const styleProfile = (context.generationMetadata as any)?.styleProfile ?? '';
  /** Never remap tone roles under locked/custom harmony — bass + LOCK need sounding chord tones. */
  const shorterMode =
    !locked &&
    (primaryStyle === 'wayne_shorter' ||
      primaryStyle === 'andrew_hill' ||
      styleProfile === 'STYLE_SHORTER_POST_BOP');
  return chordTonesForChordSymbol(chord, { lockedHarmony: locked, shorterMode });
}
