/**
 * String Quartet -> Mosaic thin mapper (V80e SQ-M1).
 * Form slices -> mosaicSectionPlan entries; mirrors bigBandToMosaicMapper pattern.
 */

import type { MosaicModeSectionPlanEntry } from '../mosaic-mode/precomputeMosaicEffectiveHarmonyBars';
import type { PhraseRole } from '../mosaic-mode/mosaicPhrasePlanner';
import type { QuartetFormPhase, QuartetFormPlan, QuartetTexturePlan } from './quartetPlanTypes';

/** Planning bundle passed from runStringQuartetMode / runQuartetRealisation. */
export interface StringQuartetPlan {
  formPlan: QuartetFormPlan;
  texturePlan: QuartetTexturePlan;
}

type QuartetTextureSliceExtended = QuartetTexturePlan['slices'][number] & {
  songwriterStyleId?: string;
};

function phraseRoleForFormPhase(phase: QuartetFormPhase): PhraseRole | undefined {
  switch (phase) {
    case 'statement':
      return 'statement';
    case 'development':
    case 'return':
      return 'development';
    case 'contrast':
      return 'climax';
    case 'coda':
      return 'release';
    default: {
      const _exhaustive: never = phase;
      return _exhaustive;
    }
  }
}

function sectionLabelForPhase(phase: QuartetFormPhase, ordinal: number): string {
  return ordinal === 0 ? phase : `${phase}_${ordinal + 1}`;
}

/** Spine-protected head / recap / coda - mosaic inject bypass when lift flag is on (V80g). */
function spineProtectedForFormPhase(phase: QuartetFormPhase): boolean {
  switch (phase) {
    case 'statement':
    case 'return':
    case 'coda':
      return true;
    case 'development':
    case 'contrast':
      return false;
    default: {
      const _exhaustive: never = phase;
      return _exhaustive;
    }
  }
}

function resolveSectionSongwriterStyleId(
  textureSlice: QuartetTextureSliceExtended | undefined,
  defaultStyleId: string
): string {
  const explicit = textureSlice?.songwriterStyleId?.trim();
  if (explicit) return explicit;
  return defaultStyleId;
}

export function mapStringQuartetToMosaicSectionPlan(
  sqPlan: StringQuartetPlan,
  options?: { songwriterStyleId?: string }
): MosaicModeSectionPlanEntry[] {
  const slices = sqPlan.formPlan.slices ?? [];
  if (slices.length < 2) return [];

  const defaultStyleId = options?.songwriterStyleId?.trim() ?? '';
  const phaseCounts: Partial<Record<QuartetFormPhase, number>> = {};
  const entries: MosaicModeSectionPlanEntry[] = [];

  for (const slice of slices) {
    const barLength = Math.max(1, slice.endBar - slice.startBar + 1);
    if (barLength < 1) continue;

    const ord = phaseCounts[slice.phase] ?? 0;
    phaseCounts[slice.phase] = ord + 1;
    const sectionLabel = sectionLabelForPhase(slice.phase, ord);
    const textureSlice = sqPlan.texturePlan.slices.find((s) => s.formSliceIndex === slice.index);

    const phraseRole = phraseRoleForFormPhase(slice.phase);

    entries.push({
      sectionLabel,
      startBar: slice.startBar,
      endBar: slice.endBar,
      songwriterStyleId: resolveSectionSongwriterStyleId(textureSlice, defaultStyleId),
      ...(phraseRole ? { phraseRole } : {}),
      presetRole: 'string_quartet',
      spineProtected: spineProtectedForFormPhase(slice.phase),
      mosaicOwned: true,
      injectEligible: false,
    } as MosaicModeSectionPlanEntry & { presetRole: 'string_quartet' });
  }

  return entries.length >= 2 ? entries : [];
}
export { buildMosaicSqContrapuntalGuides } from './mosaicSqContrapuntalGuideBuilder';

