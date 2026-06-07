/**
 * V80f - SQ mosaic contrapuntal precompute (motif soft-target into AbstractLineSet).
 * Runs after mosaic harmony dispatch, before buildQuartetScoreModel.
 */

import type { CompositionContext } from '../compositionContext';
import type { AbstractLineSet } from '../counterpoint/abstractLineSet';
import { ContrapuntalLineEngine } from '../counterpoint/ContrapuntalLineEngine';
import {
  buildMosaicMotifVariants,
  generateMosaicSourceMotif,
} from '../mosaic-mode/mosaicMotifEngine';
import { buildMosaicTonicMap } from '../mosaic-mode/precomputeMosaicEffectiveHarmonyBars';
import type { CoreMotif } from '../motif/motifEngineTypes';
import type { MotifShape } from '../motif/motifShape';
import {
  buildMosaicSqContrapuntalGuides,
  isSqMosaicContrapuntalGuideGated,
} from './mosaicSqContrapuntalGuideBuilder';
import type { MosaicSqContrapuntalGuideMap } from './mosaicSqContrapuntalGuide';

export { isSqMosaicContrapuntalGuideGated } from './mosaicSqContrapuntalGuideBuilder';

function ensureMosaicSectionMotifVariants(context: CompositionContext): void {
  const meta = context.generationMetadata;
  if (!meta) return;
  const existing = meta.mosaicSectionMotifVariants;
  if (existing && Object.keys(existing).length > 0) return;
  const plan = meta.mosaicSectionPlan ?? [];
  if (!plan.length) return;
  const totalBars = Math.max(...plan.map((s) => s.endBar), 1);
  const source = generateMosaicSourceMotif(context.seed, totalBars);
  const tonicMap = buildMosaicTonicMap(plan, context);
  meta.mosaicSourceMotif = source;
  meta.mosaicSectionMotifVariants = buildMosaicMotifVariants(source, plan, tonicMap);
}

export function resolveMosaicSqContrapuntalGuides(
  context: CompositionContext,
  primaryVrbId: string,
  sqMosaicEnabled?: boolean
): MosaicSqContrapuntalGuideMap | null {
  if (!isSqMosaicContrapuntalGuideGated(context, sqMosaicEnabled)) return null;
  ensureMosaicSectionMotifVariants(context);
  const variants = context.generationMetadata?.mosaicSectionMotifVariants;
  const plan = context.generationMetadata?.mosaicSectionPlan ?? [];
  if (!variants || !plan.length) return null;
  const guides = buildMosaicSqContrapuntalGuides(
    context,
    variants as Record<string, CoreMotif | MotifShape>,
    plan,
    primaryVrbId
  );
  if (Object.keys(guides).length === 0) return null;
  context.generationMetadata = {
    ...context.generationMetadata,
    mosaicSqContrapuntalGuides: guides,
  };
  return guides;
}

export function precomputeMosaicSqContrapuntalLines(
  context: CompositionContext,
  guides: MosaicSqContrapuntalGuideMap,
  primaryVrbId: string
): AbstractLineSet | null {
  const bundleId = (primaryVrbId || context.voiceBundle?.voiceId || 'bartok').trim();
  const engine = new ContrapuntalLineEngine(bundleId, context);
  const tb = Math.max(1, context.form.totalBars);
  const raw = engine.generateLines(tb, 'melody_plus_chords', { mosaicSqGuides: guides });
  const filtered = engine.applyVrbFilter(raw);
  context.generationMetadata = {
    ...context.generationMetadata,
    contrapuntalLineSet: filtered,
    mosaicSqContrapuntalGuides: guides,
  };
  return filtered;
}
