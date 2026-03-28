/**
 * Song Mode / custom_locked: single routing path for pasted harmony — fail fast if layers drift.
 */

import type { CompositionContext } from '../compositionContext';
import type { ScoreModel } from '../score-model/scoreModelTypes';
import { normalizeChordToken } from '../harmony/chordProgressionParser';

/** Subset of golden-path options — avoids circular import with runGoldenPath.ts */
export interface CustomLockedRoutingWire {
  harmonyMode?: 'builtin' | 'custom' | 'custom_locked';
  chordProgressionText?: string;
  parsedChordBars?: string[];
  lockedHarmonyBarsRaw?: string[];
}

const DEBUG = () =>
  typeof process !== 'undefined' && process.env?.COMPOSER_OS_DEBUG_SONG_MODE_HARMONY === '1';

export function logSongModeHarmonyDebug(payload: Record<string, unknown>): void {
  if (!DEBUG()) return;
  console.log('[SONG_MODE_HARMONY]', JSON.stringify(payload));
}

export function assertCustomLockedRouting(
  layer: string,
  options: CustomLockedRoutingWire | undefined,
  parsedBars: string[] | undefined,
  opts?: { requireFirstBar?: string }
): void {
  const hm = options?.harmonyMode ?? (options?.chordProgressionText?.trim() ? 'custom' : 'builtin');
  const treatAsLocked32 =
    hm === 'custom_locked' || (parsedBars?.length === 32 && options?.lockedHarmonyBarsRaw?.length === 32);
  if (!treatAsLocked32) return;
  if (!parsedBars || parsedBars.length !== 32) {
    throw new Error(
      `CUSTOM HARMONY ROUTING FAILURE at ${layer}: expected 32 parsed bars for locked long-form (got ${parsedBars?.length ?? 0}).`
    );
  }
  const locked = options?.lockedHarmonyBarsRaw;
  if (locked && locked.length === 32) {
    for (let i = 0; i < 32; i++) {
      if ((locked[i] ?? '') !== (parsedBars[i] ?? '')) {
        throw new Error(`CUSTOM HARMONY ROUTING FAILURE at ${layer}: lockedHarmonyBarsRaw[${i}] !== parsedChordBars[${i}].`);
      }
    }
  }
  if (opts?.requireFirstBar != null && parsedBars[0] !== opts.requireFirstBar) {
    throw new Error(
      `CUSTOM HARMONY ROUTING FAILURE at ${layer}: expected first bar "${opts.requireFirstBar}", got "${parsedBars[0]}".`
    );
  }
}

/** Immediately before `generateGoldenPathDuoScore` — custom_locked is absolute authority */
/** After score build: every guitar measure chord must match locked wire (custom_locked only). */
export function assertScoreMatchesLockedHarmonyWire(
  score: ScoreModel,
  options: CustomLockedRoutingWire | undefined
): void {
  const wire = options?.lockedHarmonyBarsRaw ?? options?.parsedChordBars;
  if (!wire || wire.length !== 32) return;
  /** Full 32-bar paste: score chords must match wire (custom_locked Song Mode, or Guitar–Bass Duo long-form custom). */
  if (options?.harmonyMode !== 'custom_locked' && options?.harmonyMode !== 'custom') return;
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!g) {
    throw new Error('CUSTOM HARMONY NOT REACHING GOLDEN PATH: missing guitar part for chord check.');
  }
  for (let i = 1; i <= 32; i++) {
    const m = g.measures.find((x) => x.index === i);
    const exp = wire[i - 1];
    const got = m?.chord ?? '';
    if (normalizeChordToken(got) !== normalizeChordToken(exp ?? '')) {
      throw new Error(
        `CUSTOM HARMONY NOT REACHING GOLDEN PATH: score bar ${i} chord "${got}" !== locked "${exp}"`
      );
    }
  }
}

export function assertCustomLockedBeforeScoreGeneration(
  context: CompositionContext,
  options: CustomLockedRoutingWire | undefined
): void {
  if (options?.harmonyMode !== 'custom_locked') return;
  const locked = context.lockedHarmonyBarsRaw;
  const wire = options.lockedHarmonyBarsRaw ?? options.parsedChordBars;
  if (!locked || locked.length !== 32 || !wire || wire.length !== 32) {
    throw new Error(
      'CUSTOM HARMONY NOT REACHING GOLDEN PATH: custom_locked requires 32 bars in both context.lockedHarmonyBarsRaw and options.'
    );
  }
  for (let i = 0; i < 32; i++) {
    if ((locked[i] ?? '') !== (wire[i] ?? '')) {
      throw new Error(`CUSTOM HARMONY NOT REACHING GOLDEN PATH: options vs context locked mismatch at bar ${i + 1}.`);
    }
  }
  if (context.generationMetadata.customHarmonyLocked !== true) {
    throw new Error('CUSTOM HARMONY NOT REACHING GOLDEN PATH: generationMetadata.customHarmonyLocked must be true.');
  }
  if (context.form.totalBars !== 32) {
    throw new Error('CUSTOM HARMONY NOT REACHING GOLDEN PATH: form.totalBars must be 32 for custom_locked.');
  }
  if (typeof process !== 'undefined' && process.env?.COMPOSER_OS_LOCKED_REGRESSION_FIRST === '1') {
    if (locked[0] !== 'Cmaj9') {
      throw new Error('CUSTOM HARMONY NOT REACHING GOLDEN PATH: regression expects first bar Cmaj9.');
    }
  }
}

export function assertContextMatchesLocked32(
  layer: string,
  context: CompositionContext,
  options: CustomLockedRoutingWire | undefined
): void {
  if (context.presetId !== 'guitar_bass_duo' || context.form.totalBars !== 32) return;
  const locked = context.lockedHarmonyBarsRaw;
  if (!locked || locked.length !== 32) return;
  /** 32-bar long-form can also use built-in tiled harmony — only assert pasted/custom locked paths */
  if (context.generationMetadata.harmonySource !== 'custom') return;
  if (context.generationMetadata.customHarmonyLocked !== true) return;
  const parsed = options?.parsedChordBars ?? options?.lockedHarmonyBarsRaw;
  if (parsed && parsed.length === 32) {
    for (let i = 0; i < 32; i++) {
      if ((locked[i] ?? '') !== (parsed[i] ?? '')) {
        throw new Error(
          `CUSTOM HARMONY ROUTING FAILURE at ${layer}: lockedHarmonyBarsRaw diverges from parsedChordBars at bar ${i + 1}.`
        );
      }
    }
  }
}
