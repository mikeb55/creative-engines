/**
 * Big Band -> Mosaic thin mapper (V80a BB-M1).
 * Form slices -> mosaicSectionPlan entries; mirrors songModeToMosaicMapper pattern.
 */

import type { BigBandFormPhase, BigBandFormPlan, BigBandSectionPlan } from './bigBandPlanTypes';
import type { MosaicModeSectionPlanEntry } from '../mosaic-mode/precomputeMosaicEffectiveHarmonyBars';
import type { PhraseRole } from '../mosaic-mode/mosaicPhrasePlanner';

/** Planning bundle passed from runBigBandMode / runBigBandRealisation. */
export interface BigBandPlan {
  formPlan: BigBandFormPlan;
  sectionPlan: BigBandSectionPlan;
}

type BigBandSectionSliceExtended = BigBandSectionPlan['slices'][number] & {
  songwriterStyleId?: string;
};

function phraseRoleForFormPhase(phase: BigBandFormPhase): PhraseRole | undefined {
  switch (phase) {
    case 'intro':
    case 'melody_head':
      return 'statement';
    case 'background_figures':
    case 'head_out':
      return 'development';
    case 'solo_section':
      return 'release';
    case 'shout_chorus':
      return 'climax';
    case 'ending':
      return 'release';
    default: {
      const _exhaustive: never = phase;
      return _exhaustive;
    }
  }
}

function sectionLabelForPhase(phase: BigBandFormPhase, ordinal: number): string {
  return ordinal === 0 ? phase : `${phase}_${ordinal + 1}`;
}

/** Spine-protected head / shout / final sections — mosaic inject bypass when lift flag is on. */
function spineProtectedForFormPhase(phase: BigBandFormPhase): boolean {
  switch (phase) {
    case 'melody_head':
    case 'head_out':
    case 'shout_chorus':
    case 'ending':
      return true;
    case 'intro':
    case 'background_figures':
    case 'solo_section':
      return false;
    default: {
      const _exhaustive: never = phase;
      return _exhaustive;
    }
  }
}

function resolveSectionSongwriterStyleId(
  sectionSlice: BigBandSectionSliceExtended | undefined,
  defaultStyleId: string
): string {
  const explicit = sectionSlice?.songwriterStyleId?.trim();
  if (explicit) return explicit;
  return defaultStyleId;
}

export function mapBigBandToMosaicSectionPlan(
  bbPlan: BigBandPlan,
  options?: { songwriterStyleId?: string }
): MosaicModeSectionPlanEntry[] {
  const slices = bbPlan.formPlan.slices ?? [];
  if (slices.length < 2) return [];

  const defaultStyleId = options?.songwriterStyleId?.trim() ?? '';
  const phaseCounts: Partial<Record<BigBandFormPhase, number>> = {};
  const entries: MosaicModeSectionPlanEntry[] = [];

  for (const slice of slices) {
    const barLength = Math.max(1, slice.endBar - slice.startBar + 1);
    if (barLength < 1) continue;

    const ord = phaseCounts[slice.phase] ?? 0;
    phaseCounts[slice.phase] = ord + 1;
    const sectionLabel = sectionLabelForPhase(slice.phase, ord);
    const sectionSlice = bbPlan.sectionPlan.slices.find((s) => s.formSliceIndex === slice.index);

    const phraseRole = phraseRoleForFormPhase(slice.phase);

    entries.push({
      sectionLabel,
      startBar: slice.startBar,
      endBar: slice.endBar,
      songwriterStyleId: resolveSectionSongwriterStyleId(sectionSlice, defaultStyleId),
      ...(phraseRole ? { phraseRole } : {}),
      presetRole: 'big_band',
      spineProtected: spineProtectedForFormPhase(slice.phase),
      mosaicOwned: true,
      injectEligible: false,
    } as MosaicModeSectionPlanEntry & { presetRole: 'big_band' });
  }

  return entries.length >= 2 ? entries : [];
}
