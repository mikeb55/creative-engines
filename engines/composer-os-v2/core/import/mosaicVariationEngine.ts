/**
 * IMP-4 - Mosaic import variation engine: N evaluated candidates per section from IR seed.
 */

import type { CompositionContext } from '../compositionContext';
import type { CoreMotif } from '../motif/motifEngineTypes';
import {
  generateGoldenPathDuoScore,
  regenerateMosaicSectionForRetry,
  type GoldenPathPlans,
} from '../goldenPath/generateGoldenPathDuoScore';
import { getDispatchEntry } from '../mosaic-mode/mosaicComposerDispatch';
import { buildMosaicMotifVariants } from '../mosaic-mode/mosaicMotifEngine';
import {
  buildMosaicTonicMap,
  cloneDuoSectionContext,
  type MosaicModeSectionPlanEntry,
  type MosaicTonicMap,
} from '../mosaic-mode/precomputeMosaicEffectiveHarmonyBars';
import {
  evaluateMosaicSections,
  type DuoSectionEvalResult,
} from '../mosaic-mode/evaluateMosaicSections';
import type { ScoreModel } from '../score-model/scoreModelTypes';
import type { ImportMelodyNote, MosaicImportTimeline } from './mosaicImportTimeline';
import { importTimelineToLockedHarmony, importTimelineToMotifSeed } from './importTimelineAdapters';

export type MosaicSectionEvalResult = DuoSectionEvalResult;

export type VariationMode = 'harmonic' | 'melodic' | 'rhythmic' | 'full';

export interface VariationRequest {
  importTimeline: MosaicImportTimeline;
  sectionPlan: MosaicModeSectionPlanEntry[];
  variationCount?: number;
  variationMode?: VariationMode;
  /** true = lock spine; vary melody/rhythm only */
  preserveImportHarmony?: boolean;
}

export interface VariationCandidate {
  variationIndex: number;
  sectionLabel: string;
  scoreFragment: ScoreModel;
  evalResult: MosaicSectionEvalResult;
  motifVariant: CoreMotif;
  /** bars where harmony differs from import (empty if locked) */
  harmonyDelta: string[];
}

export interface VariationResult {
  candidates: VariationCandidate[];
  /** index into candidates with highest eval overall score */
  autoSelected: number;
  /** import played straight - always candidates[0] */
  importBaseline: VariationCandidate;
}

export interface GenerateVariationsDeps {
  context: CompositionContext;
  plans: GoldenPathPlans;
}

const DEFAULT_VARIATION_COUNT = 4;

function contourFromIntervals(intervals: number[]): number[] {
  return intervals.map((iv) => (iv > 0 ? 1 : iv < 0 ? -1 : 0));
}

/** Slice IR melody for a section bar span into CoreMotif seed. */
export function buildSectionMotifSeedFromIr(
  melodyLine: readonly ImportMelodyNote[],
  startBar: number,
  endBar: number
): CoreMotif {
  const notes = melodyLine.filter((n) => n.bar >= startBar && n.bar <= endBar);
  const window = notes.slice(0, Math.min(8, notes.length));

  if (window.length === 0) {
    return {
      id: 'import_section_motif_empty',
      intervalPattern: [],
      rhythmPattern: [],
      contourPattern: [],
      roleTags: ['chord-tone'],
      registerTags: ['mid'],
    };
  }

  const intervalPattern: number[] = [];
  for (let i = 1; i < window.length; i++) {
    intervalPattern.push(window[i]!.midiPitch - window[i - 1]!.midiPitch);
  }

  const rhythmPattern = window.map((n) => ({
    startBeat: n.onsetBeat,
    duration: n.durationBeats,
  }));

  return {
    id: `import_section_motif_${startBar}_${endBar}`,
    intervalPattern,
    rhythmPattern,
    contourPattern: contourFromIntervals(intervalPattern),
    roleTags: ['chord-tone'],
    registerTags: ['mid'],
  };
}

function cloneMotif(m: CoreMotif): CoreMotif {
  return {
    ...m,
    intervalPattern: [...m.intervalPattern],
    rhythmPattern: m.rhythmPattern.map((r) => ({ ...r })),
    contourPattern: [...m.contourPattern],
    roleTags: [...m.roleTags],
    registerTags: [...m.registerTags],
  };
}

function applyMelodicVariation(motif: CoreMotif, variationIndex: number): CoreMotif {
  const out = cloneMotif(motif);
  if (out.intervalPattern.length === 0) return out;
  const idx = variationIndex % out.intervalPattern.length;
  const nudge = ((variationIndex % 3) + 1) * (variationIndex % 2 === 0 ? 1 : -1);
  out.intervalPattern[idx] = out.intervalPattern[idx]! + nudge;
  out.contourPattern = contourFromIntervals(out.intervalPattern);
  return out;
}

function applyRhythmicVariation(motif: CoreMotif, variationIndex: number): CoreMotif {
  const out = cloneMotif(motif);
  if (out.rhythmPattern.length === 0) return out;
  const idx = Math.min(1, out.rhythmPattern.length - 1);
  const r = out.rhythmPattern[idx]!;
  const displace = 0.5 * (variationIndex % 2 === 0 ? 1 : -1);
  out.rhythmPattern[idx] = {
    startBeat: Math.max(0, r.startBeat + displace),
    duration: r.duration,
  };
  return out;
}

function shiftedTonicMap(base: MosaicTonicMap, sectionLabel: string, variationIndex: number): MosaicTonicMap {
  const out = { ...base };
  const pc = out[sectionLabel] ?? 0;
  out[sectionLabel] = (pc + variationIndex * 2) % 12;
  return out;
}

function harmonyBarsForSection(importHarmony: string[], section: MosaicModeSectionPlanEntry): string[] {
  return importHarmony.slice(section.startBar - 1, section.endBar);
}

function harmonyDeltaFromImport(
  importBars: string[],
  score: ScoreModel,
  startBar: number,
  endBar: number
): string[] {
  const guitar = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!guitar) return [];
  const delta: string[] = [];
  for (let bar = startBar; bar <= endBar; bar++) {
    const importSym = importBars[bar - startBar] ?? '';
    const genSym = guitar.measures.find((m) => m.index === bar)?.chord ?? '';
    if (importSym.trim() && genSym.trim() && importSym.trim() !== genSym.trim()) {
      delta.push(`bar${bar}:${importSym}->${genSym}`);
    }
  }
  return delta;
}

function buildSectionLockRegistry(
  section: MosaicModeSectionPlanEntry,
  expectedHarmony: string[]
): NonNullable<CompositionContext['generationMetadata']['mosaicLockRegistry']> {
  return [
    {
      sectionLabel: section.sectionLabel,
      startBar: 1,
      endBar: section.endBar - section.startBar + 1,
      composerId: section.songwriterStyleId,
      expectedHarmonyBars: expectedHarmony,
    },
  ];
}

function evalOverall(result: MosaicSectionEvalResult): number {
  return result.scores.overall ?? 0;
}

function generateSectionFragment(
  parentContext: CompositionContext,
  plans: GoldenPathPlans,
  section: MosaicModeSectionPlanEntry,
  sourceMotif: CoreMotif,
  sectionMotifVariants: Record<string, CoreMotif>,
  seedOffset: number
): ScoreModel | null {
  const retryOrdinal = seedOffset > 0 ? Math.max(1, Math.round(seedOffset / 9973)) : 1;
  const trialContext = structuredClone(parentContext) as CompositionContext;
  trialContext.seed = parentContext.seed + seedOffset;
  trialContext.generationMetadata = {
    ...trialContext.generationMetadata,
    mosaicSourceMotif: sourceMotif,
    mosaicSectionMotifVariants: sectionMotifVariants,
    songModeHookFirstIdentity: false,
  };

  const fragment = regenerateMosaicSectionForRetry(
    trialContext,
    plans,
    section.sectionLabel,
    retryOrdinal
  );
  if (fragment) return fragment;

  const span = section.endBar - section.startBar + 1;
  const plan = parentContext.generationMetadata?.mosaicSectionPlan ?? [section];
  const tonicMap = buildMosaicTonicMap(plan, parentContext);
  const tonicPc = tonicMap[section.sectionLabel] ?? 0;

  let fragmentContext = cloneDuoSectionContext(parentContext, section, tonicPc);
  fragmentContext = {
    ...fragmentContext,
    seed: parentContext.seed + seedOffset,
    generationMetadata: {
      ...fragmentContext.generationMetadata,
      mosaicSourceMotif: sourceMotif,
      mosaicSectionMotifVariants: sectionMotifVariants,
      mosaicSectionPlan: [
        {
          ...section,
          startBar: 1,
          endBar: span,
        },
      ],
      songwriterStyleId: section.songwriterStyleId,
      mosaicLockRegistry: undefined,
      mosaicMergedHarmonyBars: undefined,
      mosaicSectionOwnership: undefined,
      mosaicSectionEvalResults: undefined,
      mosaicMotifSimilarityReceipts: undefined,
      songModeHookFirstIdentity: false,
    },
  };

  const entry = getDispatchEntry(section.songwriterStyleId);
  if (!entry) return null;
  entry.precompute(fragmentContext);

  try {
    return generateGoldenPathDuoScore(fragmentContext, plans);
  } catch {
    return null;
  }
}

function evaluateSectionCandidate(
  score: ScoreModel,
  context: CompositionContext,
  section: MosaicModeSectionPlanEntry,
  expectedHarmony: string[]
): MosaicSectionEvalResult {
  const span = section.endBar - section.startBar + 1;
  const evalContext: CompositionContext = {
    ...context,
    generationMetadata: {
      ...context.generationMetadata,
      mosaicLockRegistry: buildSectionLockRegistry(section, expectedHarmony),
    },
  };
  for (const part of score.parts) {
    for (const m of part.measures) {
      if (m.index >= section.startBar) {
        m.index = m.index - section.startBar + 1;
      }
    }
  }
  const results = evaluateMosaicSections(score, evalContext);
  return (
    results.find((r) => r.sectionLabel === section.sectionLabel) ?? {
      sectionLabel: section.sectionLabel,
      startBar: 1,
      endBar: span,
      composerId: section.songwriterStyleId,
      passed: false,
      scores: { overall: 0 },
      failures: ['eval_missing'],
    }
  );
}

function buildMotifVariantForSection(
  req: VariationRequest,
  section: MosaicModeSectionPlanEntry,
  sectionSeed: CoreMotif,
  baseTonicMap: MosaicTonicMap,
  variationIndex: number
): { motif: CoreMotif; harmonyDelta: string[] } {
  const mode = req.variationMode ?? 'melodic';
  const preserve = req.preserveImportHarmony !== false;

  const localPlan: MosaicModeSectionPlanEntry[] = [
    {
      ...section,
      startBar: 1,
      endBar: section.endBar - section.startBar + 1,
    },
  ];

  let tonicMap = baseTonicMap;
  if (!preserve && (mode === 'harmonic' || mode === 'full')) {
    tonicMap = shiftedTonicMap(baseTonicMap, section.sectionLabel, variationIndex);
  }

  const variants = buildMosaicMotifVariants(cloneMotif(sectionSeed), localPlan, {
    [section.sectionLabel]: tonicMap[section.sectionLabel] ?? 0,
  });
  let motif = variants[section.sectionLabel] ?? cloneMotif(sectionSeed);

  if (mode === 'melodic' || mode === 'full') {
    motif = applyMelodicVariation(motif, variationIndex);
  }
  if (mode === 'rhythmic' || mode === 'full') {
    motif = applyRhythmicVariation(motif, variationIndex);
  }

  return { motif, harmonyDelta: preserve ? [] : [`variation${variationIndex}_harmonic`] };
}

function makeCandidate(
  parentContext: CompositionContext,
  plans: GoldenPathPlans,
  req: VariationRequest,
  section: MosaicModeSectionPlanEntry,
  sectionSeed: CoreMotif,
  baseTonicMap: MosaicTonicMap,
  importHarmony: string[],
  variationIndex: number,
  applyVariation: boolean
): VariationCandidate | null {
  const sectionImportBars = harmonyBarsForSection(importHarmony, section);
  const sourceMotif = sectionSeed;
  let motifVariant = sectionSeed;
  let precomputedHarmonyDelta: string[] = [];

  if (applyVariation) {
    const built = buildMotifVariantForSection(req, section, sectionSeed, baseTonicMap, variationIndex);
    motifVariant = built.motif;
    precomputedHarmonyDelta = built.harmonyDelta;
  } else {
    const localPlan: MosaicModeSectionPlanEntry[] = [
      {
        ...section,
        startBar: 1,
        endBar: section.endBar - section.startBar + 1,
      },
    ];
    const variants = buildMosaicMotifVariants(sourceMotif, localPlan, {
      [section.sectionLabel]: baseTonicMap[section.sectionLabel] ?? 0,
    });
    motifVariant = variants[section.sectionLabel] ?? sourceMotif;
  }

  const sectionMotifVariants = { [section.sectionLabel]: motifVariant };
  const seedOffset = applyVariation ? variationIndex * 9973 : 0;
  const scoreFragment = generateSectionFragment(
    parentContext,
    plans,
    section,
    sourceMotif,
    sectionMotifVariants,
    seedOffset
  );
  if (!scoreFragment) return null;

  const harmonyDelta =
    precomputedHarmonyDelta.length > 0
      ? precomputedHarmonyDelta
      : harmonyDeltaFromImport(sectionImportBars, scoreFragment, section.startBar, section.endBar);

  const evalResult = evaluateSectionCandidate(
    scoreFragment,
    parentContext,
    section,
    sectionImportBars
  );

  return {
    variationIndex,
    sectionLabel: section.sectionLabel,
    scoreFragment,
    evalResult,
    motifVariant,
    harmonyDelta,
  };
}

/**
 * Generate evaluated variation candidates from imported IR material.
 */
export function generateVariations(
  req: VariationRequest,
  deps: GenerateVariationsDeps
): VariationResult {
  const variationCount = Math.max(1, req.variationCount ?? DEFAULT_VARIATION_COUNT);
  const { context, plans } = deps;
  const importHarmony = importTimelineToLockedHarmony(req.importTimeline);
  const { fullMelodyLine } = importTimelineToMotifSeed(req.importTimeline);
  const baseTonicMap = buildMosaicTonicMap(req.sectionPlan, context);

  const candidates: VariationCandidate[] = [];
  let importBaseline: VariationCandidate | null = null;

  for (const section of req.sectionPlan) {
    const sectionSeed = buildSectionMotifSeedFromIr(
      fullMelodyLine,
      section.startBar,
      section.endBar
    );

    const baseline = makeCandidate(
      context,
      plans,
      req,
      section,
      sectionSeed,
      baseTonicMap,
      importHarmony,
      0,
      false
    );
    if (baseline && !importBaseline) {
      importBaseline = baseline;
      candidates.push(baseline);
    }

    for (let vi = 1; vi <= variationCount; vi++) {
      const candidate = makeCandidate(
        context,
        plans,
        req,
        section,
        sectionSeed,
        baseTonicMap,
        importHarmony,
        vi,
        true
      );
      if (candidate) candidates.push(candidate);
    }
  }

  if (!importBaseline && candidates.length > 0) {
    importBaseline = candidates[0]!;
  }

  if (!importBaseline) {
    const emptyEval: MosaicSectionEvalResult = {
      sectionLabel: req.sectionPlan[0]?.sectionLabel ?? 'import',
      startBar: 1,
      endBar: 1,
      composerId: req.sectionPlan[0]?.songwriterStyleId ?? 'unknown',
      passed: false,
      scores: { overall: 0 },
      failures: ['no_candidates'],
    };
    importBaseline = {
      variationIndex: 0,
      sectionLabel: emptyEval.sectionLabel,
      scoreFragment: { title: 'empty', parts: [] },
      evalResult: emptyEval,
      motifVariant: importTimelineToMotifSeed(req.importTimeline).coreMotif,
      harmonyDelta: [],
    };
    candidates.unshift(importBaseline);
  }

  let autoSelected = 0;
  let bestScore = evalOverall(candidates[0]!.evalResult);
  for (let i = 1; i < candidates.length; i++) {
    const score = evalOverall(candidates[i]!.evalResult);
    if (score > bestScore) {
      bestScore = score;
      autoSelected = i;
    }
  }

  return {
    candidates,
    autoSelected,
    importBaseline,
  };
}

/** Wire import IR onto context before golden-path generation. */
export function wireImportTimelineToContext(
  context: CompositionContext,
  ir: MosaicImportTimeline,
  preserveImportHarmony?: boolean
): void {
  const locked = importTimelineToLockedHarmony(ir);
  const seedResult = importTimelineToMotifSeed(ir);
  const existingLocked = context.lockedHarmonyBarsRaw;
  if (!existingLocked?.length) {
    context.form = {
      ...context.form,
      totalBars: ir.bars,
    };
    context.lockedHarmonyBarsRaw = locked;
    context.generationMetadata = {
      ...context.generationMetadata,
      parsedCustomProgressionBars: [...locked],
      customHarmonyLocked: preserveImportHarmony !== false,
    };
  }
  context.generationMetadata = {
    ...context.generationMetadata,
    mosaicSourceMotif: seedResult.coreMotif,
    importMelodyLineFull: seedResult.fullMelodyLine,
  };
}

export function shouldRunVariationEngine(options: {
  importTimeline?: MosaicImportTimeline;
  generateVariations?: boolean;
  variationCount?: number;
}): boolean {
  if (!options.importTimeline) return false;
  if (options.generateVariations === true) return true;
  return typeof options.variationCount === 'number' && options.variationCount > 0;
}

/** Replace one section span in base score with a fragment (global bar indices). */
export function spliceVariationFragmentIntoScore(
  base: ScoreModel,
  fragment: ScoreModel,
  startBar: number,
  endBar: number
): ScoreModel {
  const span = endBar - startBar + 1;
  const out = structuredClone(base) as ScoreModel;
  for (const part of out.parts) {
    const fragPart = fragment.parts.find((p) => p.id === part.id);
    if (!fragPart) continue;
    const kept = part.measures.filter((m) => m.index < startBar || m.index > endBar);
    const inserted = fragPart.measures
      .filter((m) => m.index >= startBar && m.index <= endBar)
      .map((m) => ({
        ...m,
        events: m.events.map((ev) => ({ ...ev })),
        index: startBar + (m.index - startBar),
      }));
    if (inserted.length === 0) {
      const relInserted = fragPart.measures
        .filter((m) => m.index >= 1 && m.index <= span)
        .map((m) => ({
          ...m,
          events: m.events.map((ev) => ({ ...ev })),
          index: startBar + (m.index - 1),
        }));
      part.measures = [...kept, ...relInserted].sort((a, b) => a.index - b.index);
    } else {
      part.measures = [...kept, ...inserted].sort((a, b) => a.index - b.index);
    }
  }
  return out;
}

export function applySelectedVariationToScore(
  baseScore: ScoreModel,
  variationResult: VariationResult,
  sectionPlan: MosaicModeSectionPlanEntry[],
  variationIndex?: number
): ScoreModel {
  const pick =
    typeof variationIndex === 'number' && Number.isFinite(variationIndex)
      ? variationIndex
      : variationResult.autoSelected;
  const winner = variationResult.candidates[pick];
  if (!winner || winner.variationIndex === 0) return baseScore;

  const section = sectionPlan.find((s) => s.sectionLabel === winner.sectionLabel);
  if (!section) return winner.scoreFragment.parts.length ? winner.scoreFragment : baseScore;

  if (baseScore.parts.length === 0) return winner.scoreFragment;
  return spliceVariationFragmentIntoScore(
    baseScore,
    winner.scoreFragment,
    section.startBar,
    section.endBar
  );
}
