import type { GenerateRequest } from '@composer-os/app-api/appApiTypes';
import { THESAURUS_REGISTRY, type ThesaurusPattern } from '@composer-os/core/slonimsky/thesaurusRegistry';
import type { SlonimskySourcePreset } from './slonimskyMacroState';
import {
  isConfirmedHarmonicVoiceBundle,
  isSlonimskyGbdStubWriter,
} from '../constants/slonimskyHarmonicVoices';
import { SLONIMSKY_FLAVOR_DISPLAY } from '../constants/slonimskyUxCopy';

export type SlonimskyAdvancedOverrides = {
  pinnedCellIds: string[];
  forbiddenCellIds: string[];
};

export const DEFAULT_SLONIMSKY_ADVANCED_OVERRIDES: SlonimskyAdvancedOverrides = {
  pinnedCellIds: [],
  forbiddenCellIds: [],
};

function scoreFlavor(pattern: ThesaurusPattern, flavor: SlonimskySourcePreset): number {
  const name = pattern.name.toLowerCase();
  let score = 0;
  if (flavor === 'chromatic') {
    if (name.includes('chromatic') || pattern.section === 'semitone_progression') score += 4;
    if (pattern.tensionLevel >= 2) score += 1;
  }
  if (flavor === 'lyrical') {
    if (pattern.tensionLevel === 1) score += 3;
    if (pattern.symmetryType === 'equalDivision' && pattern.defaultLength >= 4) score += 2;
    if (pattern.playerAffinity.includes('ecm')) score += 1;
  }
  if (flavor === 'angular') {
    if (pattern.symmetryType === 'asymmetric') score += 3;
    if (pattern.tensionLevel >= 3) score += 2;
    if (name.includes('asym') || name.includes('expanding')) score += 1;
  }
  if (flavor === 'symmetric') {
    if (pattern.symmetryType === 'equalDivision') score += 3;
    if (pattern.tensionLevel === 2) score += 1;
    if (pattern.baseDivision != null) score += 1;
  }
  if (flavor === 'riff') {
    if (pattern.defaultLength <= 4) score += 2;
    if (pattern.tensionLevel >= 2 && pattern.symmetryType === 'equalDivision') score += 2;
    if (name.includes('cell') || name.includes('cycle')) score += 1;
  }
  return score;
}

function primaryFlavorForPattern(pattern: ThesaurusPattern): SlonimskySourcePreset {
  const flavors: SlonimskySourcePreset[] = ['lyrical', 'angular', 'symmetric', 'chromatic', 'riff'];
  let best: SlonimskySourcePreset = 'lyrical';
  let bestScore = -1;
  for (const f of flavors) {
    const s = scoreFlavor(pattern, f);
    if (s > bestScore) {
      bestScore = s;
      best = f;
    }
  }
  return best;
}

function flavorsForPattern(pattern: ThesaurusPattern): SlonimskySourcePreset[] {
  const flavors: SlonimskySourcePreset[] = ['lyrical', 'angular', 'symmetric', 'chromatic', 'riff'];
  const primary = primaryFlavorForPattern(pattern);
  const secondary = flavors.filter((f) => f !== primary && scoreFlavor(pattern, f) >= 2);
  return [primary, ...secondary];
}

const ENGINE_CELLS = THESAURUS_REGISTRY.filter((p) => p.inEngine);

export const SLONIMSKY_CELL_FAMILIES: {
  flavor: SlonimskySourcePreset;
  label: string;
  cells: ThesaurusPattern[];
}[] = (['lyrical', 'angular', 'symmetric', 'chromatic', 'riff'] as const).map((flavor) => ({
  flavor,
  label: SLONIMSKY_FLAVOR_DISPLAY[flavor],
  cells: ENGINE_CELLS.filter((p) => primaryFlavorForPattern(p) === flavor),
}));

/** Default engine catalogue pattern for a Slonimsky cell family (etude preset). */
export function slonimskyPatternIdForCellFamily(flavor: SlonimskySourcePreset): string {
  const family = SLONIMSKY_CELL_FAMILIES.find((f) => f.flavor === flavor);
  const id = family?.cells[0]?.id;
  if (!id) {
    throw new Error(`No in-engine Slonimsky cell for family ${flavor}`);
  }
  return id;
}

export function dualUseFlavorsForCell(cellId: string): SlonimskySourcePreset[] {
  const row = ENGINE_CELLS.find((p) => p.id === cellId);
  if (!row) return [];
  const flavors = flavorsForPattern(row);
  return flavors.length > 1 ? flavors.slice(1) : [];
}

export function slonimskyAdvancedOverridesToContextKeys(
  overrides: SlonimskyAdvancedOverrides
): string[] {
  const keys: string[] = [];
  for (const id of overrides.pinnedCellIds) {
    keys.push(`slonimsky:pin:cell=${id}`);
  }
  for (const id of overrides.forbiddenCellIds) {
    keys.push(`slonimsky:forbid:cell=${id}`);
  }
  return keys;
}

export function mergeStyleContextKeys(
  base: string[] | undefined,
  extra: string[]
): string[] | undefined {
  if (!base?.length && !extra.length) return undefined;
  return [...(base ?? []), ...extra];
}

export type SlonimskyUiGenerateExtras = Pick<
  GenerateRequest,
  'chromaticStrength' | 'blendStrength' | 'duoIntent' | 'styleGenerationContextKeys' | 'harmonicVoice'
> & {
  /** sonic_youth selected — warn in UI; carried as metadata only. */
  slonimskyGenericHarmonicVoice?: string;
};

export function slonimskyUiExtrasFromAdvanced(
  overrides: SlonimskyAdvancedOverrides,
  harmonicVoiceId: string | null,
  baseStyleKeys?: string[]
): SlonimskyUiGenerateExtras {
  const advancedKeys = slonimskyAdvancedOverridesToContextKeys(overrides);
  const option = harmonicVoiceId?.trim() ?? '';
  if (option === 'sonic_youth') {
    advancedKeys.push('slonimsky:harmonic_voice=sonic_youth_generic');
  } else if (isSlonimskyGbdStubWriter(option)) {
    advancedKeys.push(`slonimsky:harmonic_voice=${option}_stub`);
  }
  const mergedKeys = mergeStyleContextKeys(baseStyleKeys, advancedKeys);
  const generic =
    option === 'sonic_youth'
      ? { slonimskyGenericHarmonicVoice: 'sonic_youth' as const }
      : isSlonimskyGbdStubWriter(option)
        ? { slonimskyGenericHarmonicVoice: option }
        : {};
  const harmonicVoice =
    option &&
    option !== 'sonic_youth' &&
    !isSlonimskyGbdStubWriter(option) &&
    isConfirmedHarmonicVoiceBundle(option)
      ? option
      : undefined;
  return {
    ...(mergedKeys?.length ? { styleGenerationContextKeys: mergedKeys } : {}),
    ...(harmonicVoice ? { harmonicVoice } : {}),
    ...generic,
  };
}
