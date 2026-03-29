/**
 * D1 — Resolve RhythmIntentControl → per-phrase records (deterministic, pure where possible).
 */

import type { GenerationMetadata } from './compositionContext';
import type { RhythmIntentControl, RhythmIntentResolvedPhrase, RhythmIntentPrimaryFamily } from './rhythmIntentTypes';
import { seededUnit } from './goldenPath/guitarBassDuoHarmony';
import { songModePhraseSegments } from './goldenPath/songModePhraseEngineV1';

export function clampIntentComponent(x: number): number {
  if (Number.isNaN(x) || !Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

export function clampIntent(raw: RhythmIntentControl): RhythmIntentControl {
  return {
    groove: clampIntentComponent(raw.groove),
    pattern: clampIntentComponent(raw.pattern),
    expression: clampIntentComponent(raw.expression),
    space: clampIntentComponent(raw.space),
    surprise: clampIntentComponent(raw.surprise),
  };
}

function familyFromKey(k: keyof RhythmIntentControl): RhythmIntentPrimaryFamily {
  if (k === 'groove') return 'groove_weighted';
  if (k === 'pattern') return 'pattern_weighted';
  if (k === 'expression') return 'expression_weighted';
  return 'space_weighted';
}

function normalizeWeights(g: number, p: number, e: number, s: number): RhythmIntentResolvedPhrase['layer_weights'] {
  const sum = g + p + e + s;
  if (sum < 1e-9) return { groove: 0.25, pattern: 0.25, expression: 0.25, space: 0.25 };
  return {
    groove: g / sum,
    pattern: p / sum,
    expression: e / sum,
    space: s / sum,
  };
}

/**
 * Spec conflict order: space vs density first; then pattern reduction when space high.
 */
function applyConflictResolution(
  g: number,
  p: number,
  e: number,
  sp: number,
  su: number,
  seed: number,
  phraseIndex: number
): { g: number; p: number; e: number; sp: number; su: number; flags: string[] } {
  const flags: string[] = [];
  let p1 = p;
  if (sp > 0.55 && p1 > 0.55) {
    p1 *= 0.65;
    flags.push('conflict:pattern_reduced_for_space');
  }
  const tie = seededUnit(seed, phraseIndex, 98731);
  if (g > 0.7 && sp > 0.7 && e > 0.7 && tie < 0.3) {
    flags.push('conflict:expression_yield_to_space_groove');
  }
  return { g, p: p1, e, sp, su, flags };
}

function pickPrimarySecondary(
  w: RhythmIntentResolvedPhrase['layer_weights']
): { primary: RhythmIntentPrimaryFamily; secondary: RhythmIntentPrimaryFamily | null } {
  const entries = [
    ['groove', w.groove] as const,
    ['pattern', w.pattern] as const,
    ['expression', w.expression] as const,
    ['space', w.space] as const,
  ];
  entries.sort((a, b) => b[1] - a[1]);
  const primary = familyFromKey(entries[0]![0]);
  const secVal = entries[1]![1];
  const secondary = secVal >= 0.18 ? familyFromKey(entries[1]![0]) : null;
  if (secondary === primary) return { primary, secondary: null };
  return { primary, secondary };
}

export function resolveRhythmIntentPhrase(
  phraseIndex: number,
  raw: RhythmIntentControl | undefined,
  legacyStrength: 'stable' | 'balanced' | 'surprise',
  seed: number
): RhythmIntentResolvedPhrase {
  if (raw === undefined) {
    const surprise_scale =
      legacyStrength === 'stable' ? 0.33 : legacyStrength === 'surprise' ? 0.88 : 0.55;
    return {
      phraseIndex,
      primary_family: 'balanced',
      secondary_family: null,
      influence_budget: 0.5,
      layer_weights: { groove: 0.25, pattern: 0.25, expression: 0.25, space: 0.25 },
      surprise_scale,
      yield_flags: [`legacy:rhythmMode:${legacyStrength}`],
    };
  }

  const c = clampIntent(raw);
  const adj = applyConflictResolution(
    c.groove,
    c.pattern,
    c.expression,
    c.space,
    c.surprise,
    seed,
    phraseIndex
  );
  const { g, p, e, sp, su, flags } = adj;
  const layer_weights = normalizeWeights(g, p, e, sp);
  const { primary, secondary } = pickPrimarySecondary(layer_weights);
  const influence_budget = Math.min(1, (g + p + e + sp) / 4);

  return {
    phraseIndex,
    primary_family: primary,
    secondary_family: secondary,
    influence_budget,
    layer_weights,
    surprise_scale: clampIntentComponent(su),
    yield_flags: flags,
  };
}

export function strengthModeFromSurpriseScale(scale: number): 'stable' | 'balanced' | 'surprise' {
  if (scale < 0.4) return 'stable';
  if (scale < 0.7) return 'balanced';
  return 'surprise';
}

/** Normalized groove − space; when |margin| is large, phrase strength nudges without changing surprise_scale. */
const GROOVE_SPACE_STRENGTH_MARGIN = 0.12;

function bumpRhythmStrengthUp(m: 'stable' | 'balanced' | 'surprise'): 'stable' | 'balanced' | 'surprise' {
  if (m === 'stable') return 'balanced';
  if (m === 'balanced') return 'surprise';
  return 'surprise';
}

function bumpRhythmStrengthDown(m: 'stable' | 'balanced' | 'surprise'): 'stable' | 'balanced' | 'surprise' {
  if (m === 'surprise') return 'balanced';
  if (m === 'balanced') return 'stable';
  return 'stable';
}

/**
 * Effective Stable/Balanced/Surprise for C4/C6/C7/C5 tie-break — never reads raw intent; uses resolved phrase only.
 * For non-legacy intent, groove- vs space-led mixes (layer_weights) shift strength one step so groove/space matter even when surprise_scale is fixed.
 */
export function getEffectiveRhythmStrength(
  meta: GenerationMetadata,
  phraseIndex: number
): 'stable' | 'balanced' | 'surprise' {
  const fallback = meta.songModeRhythmStrength ?? 'balanced';
  const r = meta.rhythmIntentResolvedByPhrase?.[phraseIndex];
  if (!r) return fallback;
  const legacy = r.yield_flags.find((f) => f.startsWith('legacy:rhythmMode:'));
  if (legacy) {
    const m = legacy.split(':')[2];
    if (m === 'stable' || m === 'balanced' || m === 'surprise') return m;
  }
  const base = strengthModeFromSurpriseScale(r.surprise_scale);
  const margin = r.layer_weights.groove - r.layer_weights.space;
  if (margin > GROOVE_SPACE_STRENGTH_MARGIN) {
    return bumpRhythmStrengthUp(base);
  }
  if (margin < -GROOVE_SPACE_STRENGTH_MARGIN) {
    return bumpRhythmStrengthDown(base);
  }
  return base;
}

/**
 * Ensure `rhythmIntentResolvedByPhrase` is populated. Idempotent. Only C5 path should call `rhythmIntentRaw` indirectly via this.
 */
export function ensureRhythmIntentResolvedIntoMetadata(meta: GenerationMetadata, seed: number): void {
  if (meta.rhythmIntentResolvedByPhrase?.length) return;
  const segments = songModePhraseSegments();
  const legacy = meta.songModeRhythmStrength ?? 'balanced';
  const raw = meta.rhythmIntentRaw;
  const rows: RhythmIntentResolvedPhrase[] = segments.map((_, pi) =>
    resolveRhythmIntentPhrase(pi, raw, legacy, seed)
  );
  meta.rhythmIntentResolvedByPhrase = rows;
  meta.rhythmIntentResolutionLog = {
    rawEcho: raw,
    clampApplied: raw !== undefined ? clampIntent(raw) : undefined,
    phraseCount: rows.length,
  };
}
