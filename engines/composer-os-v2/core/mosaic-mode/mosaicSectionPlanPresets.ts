/**
 * Mosaic Mode - reusable section-plan presets (curated voice/bar maps).
 * Inline plan shape mirrors runThreeMirrorsSmoke.ts / mixedPresetAssembly.test.ts.
 */

import { getDispatchEntry } from './mosaicComposerDispatch';
import type { MosaicModeSectionPlanEntry } from './precomputeMosaicEffectiveHarmonyBars';

export const TELEVISION_FIELD_SUITE_PRESET_ID = 'television_field_suite' as const;

export type MosaicSectionPlanPresetId = typeof TELEVISION_FIELD_SUITE_PRESET_ID;

export interface MosaicSectionPlanPreset {
  id: MosaicSectionPlanPresetId;
  name: string;
  description: string;
  totalBars: number;
  plan: MosaicModeSectionPlanEntry[];
}

/** Plan A - Television Field Suite (40 bars, duo, art-rock arc). */
export const TELEVISION_FIELD_SUITE_PLAN: MosaicModeSectionPlanEntry[] = [
  {
    sectionLabel: 'intro',
    startBar: 1,
    endBar: 8,
    songwriterStyleId: 'verlaine',
    presetRole: 'duo',
  },
  {
    sectionLabel: 'build',
    startBar: 9,
    endBar: 20,
    songwriterStyleId: 'marr',
    presetRole: 'duo',
  },
  {
    sectionLabel: 'peak',
    startBar: 21,
    endBar: 28,
    songwriterStyleId: 'fripp',
    presetRole: 'duo',
  },
  {
    sectionLabel: 'tail',
    startBar: 29,
    endBar: 40,
    songwriterStyleId: 'verlaine',
    presetRole: 'duo',
  },
];

export const TELEVISION_FIELD_SUITE_PRESET: MosaicSectionPlanPreset = {
  id: TELEVISION_FIELD_SUITE_PRESET_ID,
  name: 'Television Field Suite',
  description:
    'Art Rock mosaic arc - sparse Verlaine intro, Marr build, Fripp peak, Verlaine unresolved tail (40 bars, duo).',
  totalBars: 40,
  plan: TELEVISION_FIELD_SUITE_PLAN,
};

const MOSAIC_SECTION_PLAN_PRESETS: Readonly<Record<MosaicSectionPlanPresetId, MosaicSectionPlanPreset>> = {
  [TELEVISION_FIELD_SUITE_PRESET_ID]: TELEVISION_FIELD_SUITE_PRESET,
};

export function getMosaicSectionPlanPreset(id: string): MosaicSectionPlanPreset | undefined {
  return MOSAIC_SECTION_PLAN_PRESETS[id as MosaicSectionPlanPresetId];
}

export function listMosaicSectionPlanPresetIds(): MosaicSectionPlanPresetId[] {
  return Object.keys(MOSAIC_SECTION_PLAN_PRESETS) as MosaicSectionPlanPresetId[];
}

export function listMosaicSectionPlanPresets(): MosaicSectionPlanPreset[] {
  return listMosaicSectionPlanPresetIds().map((id) => MOSAIC_SECTION_PLAN_PRESETS[id]);
}

export function cloneMosaicSectionPlanPresetPlan(id: string): MosaicModeSectionPlanEntry[] {
  const preset = getMosaicSectionPlanPreset(id);
  if (!preset) {
    throw new Error(`mosaicSectionPlanPresets: unknown preset id "${id}"`);
  }
  return preset.plan.map((entry) => ({ ...entry }));
}

export function assertMosaicSectionPlanPresetVoicesValid(preset: MosaicSectionPlanPreset): void {
  for (const section of preset.plan) {
    if (!getDispatchEntry(section.songwriterStyleId)) {
      throw new Error(
        `mosaicSectionPlanPresets: invalid songwriterStyleId "${section.songwriterStyleId}" in section "${section.sectionLabel}"`,
      );
    }
  }
}