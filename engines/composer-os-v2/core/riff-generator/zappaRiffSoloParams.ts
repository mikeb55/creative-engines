/**
 * Zappa riff solo controls — era / phrase / symmetry / chain depth (5b API).
 */

import type {
  GenerationMetadata,
  ZappaChainDepth,
  ZappaEraPreset,
  ZappaPhraseCharacter,
  ZappaRiffSoloControls,
  ZappaStyleMode,
  ZappaSymmetryBias,
} from '../compositionContext';
import type { RiffSoloGeneratorProfile } from '../composer/riffProfileTypes';
import type { RiffGeneratorParams } from './riffTypes';

export type {
  ZappaChainDepth,
  ZappaEraPreset,
  ZappaPhraseCharacter,
  ZappaRiffSoloControls,
  ZappaSymmetryBias,
};

/** Era → default 7/8-style eighth grouping (before chain repeat). */
export const ZAPPA_ERA_CELL_EIGHTHS: Record<ZappaEraPreset, readonly number[]> = {
  broad: [3, 3, 2],
  mothers_66: [2, 2, 3],
  rio_73: [3, 2, 2],
  synclavier_84: [2, 3, 2],
};

const ERA_SET = new Set<string>(['broad', 'mothers_66', 'rio_73', 'synclavier_84']);
const PHRASE_SET = new Set<string>(['balanced', 'fragmented', 'extended']);
const SYMMETRY_SET = new Set<string>(['low', 'medium', 'high']);
const CHAIN_SET = new Set<number>([1, 2, 3]);

export function parseZappaEraPreset(v: unknown): ZappaEraPreset | undefined {
  return typeof v === 'string' && ERA_SET.has(v) ? (v as ZappaEraPreset) : undefined;
}

export function parseZappaPhraseCharacter(v: unknown): ZappaPhraseCharacter | undefined {
  return typeof v === 'string' && PHRASE_SET.has(v) ? (v as ZappaPhraseCharacter) : undefined;
}

export function parseZappaSymmetryBias(v: unknown): ZappaSymmetryBias | undefined {
  return typeof v === 'string' && SYMMETRY_SET.has(v) ? (v as ZappaSymmetryBias) : undefined;
}

export function parseZappaChainDepth(v: unknown): ZappaChainDepth | undefined {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return CHAIN_SET.has(n) ? (n as ZappaChainDepth) : undefined;
}

export function phraseBarsForCharacter(c: ZappaPhraseCharacter | undefined): number | undefined {
  switch (c) {
    case 'fragmented':
      return 2;
    case 'balanced':
      return 4;
    case 'extended':
      return 8;
    default:
      return undefined;
  }
}

export function chromaticBudgetForSymmetry(bias: ZappaSymmetryBias, base: number): number {
  switch (bias) {
    case 'low':
      return Math.min(base, 0.24);
    case 'high':
      return Math.max(base, 0.62);
    default:
      return base;
  }
}

/** Repeat era cell pattern up to `depth` chains (observable in golden tests). */
export function chainCellEighths(base: readonly number[], depth: ZappaChainDepth): number[] {
  const d = Math.max(1, Math.min(3, depth));
  const out: number[] = [];
  for (let i = 0; i < d; i++) out.push(...base);
  return out;
}

export function zappaRiffSoloControlsFrom(
  src?:
    | Partial<ZappaRiffSoloControls>
    | Pick<
        GenerationMetadata,
        | 'zappaStyleMode'
        | 'zappaEraPreset'
        | 'zappaPhraseCharacter'
        | 'zappaSymmetryBias'
        | 'zappaChainDepth'
      >
    | Pick<
        RiffGeneratorParams,
        | 'zappaStyleMode'
        | 'zappaEraPreset'
        | 'zappaPhraseCharacter'
        | 'zappaSymmetryBias'
        | 'zappaChainDepth'
      >
    | null
): ZappaRiffSoloControls | undefined {
  if (!src) return undefined;
  const out: ZappaRiffSoloControls = {};
  if (src.zappaStyleMode === 'compositional' || src.zappaStyleMode === 'bluesrockFerocious') {
    out.zappaStyleMode = src.zappaStyleMode;
  }
  const era = parseZappaEraPreset(src.zappaEraPreset);
  if (era) out.zappaEraPreset = era;
  const phrase = parseZappaPhraseCharacter(src.zappaPhraseCharacter);
  if (phrase) out.zappaPhraseCharacter = phrase;
  const sym = parseZappaSymmetryBias(src.zappaSymmetryBias);
  if (sym) out.zappaSymmetryBias = sym;
  const chain = parseZappaChainDepth(src.zappaChainDepth);
  if (chain) out.zappaChainDepth = chain;
  return Object.keys(out).length > 0 ? out : undefined;
}

export function mergeZappaControlsOntoSoloProfile(
  profile: RiffSoloGeneratorProfile,
  controls?: ZappaRiffSoloControls
): RiffSoloGeneratorProfile {
  if (!controls) return profile;
  let p: RiffSoloGeneratorProfile = { ...profile };
  if (controls.zappaStyleMode) {
    p = { ...p, styleMode: controls.zappaStyleMode };
  }
  const era = controls.zappaEraPreset;
  const depth = controls.zappaChainDepth ?? 1;
  if (era) {
    p.rhythmicCellEighths = chainCellEighths(ZAPPA_ERA_CELL_EIGHTHS[era], depth);
    p.zappaEraPreset = era;
    p.zappaChainDepth = depth;
  } else if (controls.zappaChainDepth && controls.zappaChainDepth > 1) {
    const base = p.rhythmicCellEighths ?? [...ZAPPA_ERA_CELL_EIGHTHS.broad];
    p.rhythmicCellEighths = chainCellEighths(base, controls.zappaChainDepth);
    p.zappaChainDepth = controls.zappaChainDepth;
  }
  const pb = phraseBarsForCharacter(controls.zappaPhraseCharacter);
  if (pb != null) {
    p.phraseBars = pb;
    p.zappaPhraseCharacter = controls.zappaPhraseCharacter;
  }
  if (controls.zappaSymmetryBias) {
    p.chromaticBudget = chromaticBudgetForSymmetry(controls.zappaSymmetryBias, p.chromaticBudget);
    p.zappaSymmetryBias = controls.zappaSymmetryBias;
  }
  return p;
}
