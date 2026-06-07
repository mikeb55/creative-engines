/**
 * V80f - Build MosaicSqContrapuntalGuide entries from mosaicSectionMotifVariants.
 */

import type { CompositionContext } from '../compositionContext';
import type { VoiceRuleBundle } from '../composer/voiceRuleBundle';
import { getVoiceRuleBundle } from '../composer/voiceRuleBundles';
import type { CoreMotif } from '../motif/motifEngineTypes';
import type { MotifShape } from '../motif/motifShape';
import type { MosaicModeSectionPlanEntry } from '../mosaic-mode/precomputeMosaicEffectiveHarmonyBars';
import { buildMosaicTonicMap } from '../mosaic-mode/precomputeMosaicEffectiveHarmonyBars';
import type {
  MosaicSqAllowableTransform,
  MosaicSqContrapuntalGuide,
  MosaicSqContrapuntalGuideMap,
} from './mosaicSqContrapuntalGuide';

function isCoreMotif(m: CoreMotif | MotifShape): m is CoreMotif {
  return 'intervalPattern' in m && Array.isArray(m.intervalPattern);
}

function vrbPermitsInversion(bundle: VoiceRuleBundle | undefined): boolean {
  const types = bundle?.contrapuntalLinePolicy?.preferredImitationTypes ?? [];
  return types.includes('invertible') || types.includes('strict');
}

function vrbPermitsAugmentation(bundle: VoiceRuleBundle | undefined): boolean {
  return Boolean(bundle?.contrapuntalLinePolicy?.imitationStyle);
}

function vrbHandoffAllowed(bundle: VoiceRuleBundle | undefined): boolean {
  const pol = bundle?.contrapuntalLinePolicy;
  if (!pol) return false;
  if (pol.imitationStyle) return true;
  return (pol.preferredImitationTypes?.length ?? 0) > 0;
}

function defaultAllowableTransforms(bundle: VoiceRuleBundle | undefined): MosaicSqAllowableTransform[] {
  const out: MosaicSqAllowableTransform[] = [
    'registral_transfer',
    'fragmentation',
    'rhythmic_displacement',
  ];
  if (vrbPermitsInversion(bundle)) out.push('inversion');
  if (vrbPermitsAugmentation(bundle)) out.push('augmentation');
  return out;
}

function forbiddenRewritesFromBundle(bundle: VoiceRuleBundle | undefined): MosaicSqContrapuntalGuide['forbiddenRewrites'] {
  const dis = bundle?.contrapuntalLinePolicy?.dissonanceProfile;
  return {
    parallelOctaves: !(dis?.parallelOctavesAllowed ?? false),
    parallelFifths: !(dis?.parallelFifthsAllowed ?? false),
    voiceCrossing: true,
    retrograde: true,
  };
}

function motifPitchesForSection(
  core: CoreMotif,
  section: MosaicModeSectionPlanEntry,
  context: CompositionContext,
  plan: MosaicModeSectionPlanEntry[]
): number[] {
  const tonicMap = buildMosaicTonicMap(plan, context);
  const tonicPc = tonicMap[section.sectionLabel] ?? 0;
  const sourceLabel = plan[0]?.sectionLabel;
  const sourceTonic = sourceLabel ? (tonicMap[sourceLabel] ?? 0) : 0;
  let delta = tonicPc - sourceTonic;
  if (delta > 6) delta -= 12;
  if (delta < -6) delta += 12;
  let pitch = 72 + tonicPc + delta;
  const pitches: number[] = [pitch];
  for (const iv of core.intervalPattern) {
    pitch += iv;
    pitches.push(pitch);
  }
  return pitches;
}

function spineProtectedBarSet(plan: MosaicModeSectionPlanEntry[]): Set<number> {
  const out = new Set<number>();
  for (const section of plan) {
    if (section.spineProtected !== true) continue;
    for (let b = section.startBar; b <= section.endBar; b++) out.add(b);
  }
  return out;
}

export function isSqMosaicContrapuntalSectionEligible(section: MosaicModeSectionPlanEntry): boolean {
  const role = (section as MosaicModeSectionPlanEntry & { presetRole?: string }).presetRole;
  if (role !== 'string_quartet') return false;
  if (section.spineProtected === true) return false;
  if (section.injectEligible !== true) return false;
  return section.mosaicOwned === true;
}

export function isSqMosaicContrapuntalGuideGated(
  context: CompositionContext,
  sqMosaicEnabled?: boolean
): boolean {
  if (sqMosaicEnabled !== true) return false;
  if (context.generationMetadata?.allowMosaicPostFinalizeInject !== true) return false;
  const plan = context.generationMetadata?.mosaicSectionPlan ?? [];
  if (plan.length < 2) return false;
  return plan.some(
    (s) =>
      (s as MosaicModeSectionPlanEntry & { presetRole?: string }).presetRole === 'string_quartet' &&
      isSqMosaicContrapuntalSectionEligible(s as MosaicModeSectionPlanEntry)
  );
}

export function buildMosaicSqContrapuntalGuides(
  context: CompositionContext,
  variants: Record<string, CoreMotif | MotifShape>,
  plan: MosaicModeSectionPlanEntry[],
  primaryVrbId: string
): MosaicSqContrapuntalGuideMap {
  const bundle = getVoiceRuleBundle(primaryVrbId);
  const spineBars = spineProtectedBarSet(plan);
  const guides: MosaicSqContrapuntalGuideMap = {};

  for (const section of plan) {
    if (!isSqMosaicContrapuntalSectionEligible(section)) continue;
    const variant = variants[section.sectionLabel];
    if (!variant || !isCoreMotif(variant)) continue;

    const pitches = motifPitchesForSection(variant, section, context, plan);
    const rhythm = variant.rhythmPattern.map((r) => r.startBeat);
    const motifAnchors: MosaicSqContrapuntalGuide['motifAnchors'] = [];

    let pitchIdx = 0;
    for (let i = 0; i < variant.rhythmPattern.length; i++) {
      const rh = variant.rhythmPattern[i]!;
      const bar = section.startBar;
      const beat = rh.startBeat;
      const isDownbeat = Math.abs(beat) < 1e-6;
      const isCadenceBar = bar === section.endBar;
      const isHard = isDownbeat && (i === 0 || isCadenceBar);
      const pitchMidi = pitches[pitchIdx] ?? pitches[pitches.length - 1] ?? 72;
      motifAnchors.push({
        bar,
        beat,
        pitchMidi,
        pitchClass: ((pitchMidi % 12) + 12) % 12,
        durationBeats: rh.duration,
        weight: isHard ? 'hard' : 'soft',
      });
      if (i < variant.intervalPattern.length) pitchIdx++;
    }

    const protectedBars = [
      ...Array.from(spineBars),
      section.endBar,
    ].filter((b) => b >= section.startBar && b <= section.endBar);

    guides[section.sectionLabel] = {
      sectionLabel: section.sectionLabel,
      startBar: section.startBar,
      endBar: section.endBar,
      presetRole: 'string_quartet',
      motifAnchors,
      motifContour: [...variant.contourPattern],
      rhythmPattern: rhythm,
      protectedBars: [...new Set(protectedBars)],
      protectedOnsets: motifAnchors
        .filter((a) => a.weight === 'hard')
        .map((a) => ({ bar: a.bar, beat: a.beat })),
      allowableTransforms: defaultAllowableTransforms(bundle),
      forbiddenRewrites: forbiddenRewritesFromBundle(bundle),
      voiceAssignment: {
        leadPartId: 'sq_violin_1',
        handoffAllowed: vrbHandoffAllowed(bundle),
      },
    };
  }

  return guides;
}
