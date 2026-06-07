/**
 * V80a INS-3 - stitch section ScoreModel fragments into one flat assembled score.
 */

import type { CompositionContext } from '../compositionContext';
import { applyMelodyBassFormat } from '../goldenPath/generateMelodyBassScore';
import { applyLeadSheetFormat } from '../goldenPath/generateLeadSheetScore';
import { applyContrapuntalPass4MusicXmlMerge } from '../counterpoint/contrapuntalPass4MusicXmlMerge';
import {
  buildMosaicTonicMap,
  type MosaicModeSectionPlanEntry,
} from '../mosaic-mode/precomputeMosaicEffectiveHarmonyBars';
import { injectMosaicMotifNotesPostFinalizeBigBand } from '../mosaic-mode/mosaicTilePipeline';
import { validateScoreModel } from './scoreModelValidation';
import {
  assertDuoScopedPassScope,
  snapshotMixedPresetScopeEvents,
  validateMixedPresetScore,
} from './validateScoreModel';
import {
  BEATS_PER_MEASURE,
  type MeasureModel,
  type PartModel,
  type RestEvent,
  type ScoreEvent,
  type ScoreModel,
} from './scoreModelTypes';
import type {
  AssembledScoreModel,
  PartDescriptor,
  SectionRealizationResult,
  SectionSlice,
} from './assembledScoreModel';
import { partToDescriptor } from './assembledScoreModel';

function cloneMeasure(m: MeasureModel): MeasureModel {
  return {
    ...m,
    events: m.events.map((e) => ({ ...e })) as ScoreEvent[],
  };
}

function partUsesVoice2(part: PartModel): boolean {
  return part.measures.some((m) => m.events.some((e) => (e.voice ?? 1) === 2));
}

function normalizeDualVoiceRestMeasures(part: PartModel): void {
  if (!partUsesVoice2(part)) return;
  for (const m of part.measures) {
    const span = m.measureBeatSpanQuarters ?? BEATS_PER_MEASURE;
    const voices = new Set(m.events.map((e) => e.voice ?? 1));
    if (!voices.has(2)) {
      m.events.push({ kind: 'rest', startBeat: 0, duration: span, voice: 2 });
    }
  }
}

function createFullMeasureRest(index: number, beatSpan = BEATS_PER_MEASURE): MeasureModel {
  const rest: RestEvent = { kind: 'rest', startBeat: 0, duration: beatSpan, voice: 1 };
  return {
    index,
    measureBeatSpanQuarters: beatSpan,
    events: [rest],
  };
}

function unionPartDescriptors(results: SectionRealizationResult[]): PartDescriptor[] {
  const byId = new Map<string, PartDescriptor>();
  for (const r of results) {
    for (const desc of r.partSet) {
      if (!byId.has(desc.id)) {
        byId.set(desc.id, { ...desc });
      }
    }
  }
  return [...byId.values()];
}

export function offsetFragmentToGlobal(fragment: ScoreModel, globalStartBar: number): ScoreModel {
  return {
    ...fragment,
    parts: fragment.parts.map((p) => ({
      ...p,
      measures: p.measures.map((m) => ({
        ...cloneMeasure(m),
        index: m.index + globalStartBar - 1,
      })),
    })),
  };
}

export function reindexScoreToLocalBars(score: ScoreModel, globalStartBar: number): ScoreModel {
  return {
    ...score,
    parts: score.parts.map((p) => ({
      ...p,
      measures: p.measures.map((m) => ({
        ...cloneMeasure(m),
        index: m.index - globalStartBar + 1,
      })),
    })),
  };
}

function sliceScoreForBarRange(score: ScoreModel, startBar: number, endBar: number): ScoreModel {
  return {
    ...score,
    parts: score.parts.map((part) => ({
      ...part,
      measures: part.measures
        .filter((m) => m.index >= startBar && m.index <= endBar)
        .map(cloneMeasure),
    })),
  };
}

function descriptorToPartShell(desc: PartDescriptor, totalBars: number): PartModel {
  return {
    ...desc,
    measures: Array.from({ length: totalBars }, (_, i) => createFullMeasureRest(i + 1)),
  };
}

function applyGlobalHarmonySpine(score: ScoreModel, harmonyByBar: Map<number, string>): void {
  if (harmonyByBar.size === 0) return;
  const spinePart =
    score.parts.find((p) => p.id === 'guitar' || p.instrumentIdentity === 'clean_electric_guitar') ??
    score.parts[0];
  if (!spinePart) return;
  for (const m of spinePart.measures) {
    const sym = harmonyByBar.get(m.index);
    if (sym) {
      m.chord = sym;
      m.chordSymbol = sym;
    }
  }
}

function collectHarmonySpine(results: SectionRealizationResult[]): Map<number, string> {
  const map = new Map<number, string>();
  for (const r of results) {
    for (let i = 0; i < r.harmonyBars.length; i++) {
      const bar = r.startBar + i;
      const sym = r.harmonyBars[i]?.trim();
      if (sym) map.set(bar, sym);
    }
  }
  return map;
}

export function assembleSections(results: SectionRealizationResult[]): AssembledScoreModel {
  if (results.length === 0) {
    throw new Error('assembleSections: no section results');
  }

  const totalBars = Math.max(...results.map((r) => r.endBar));
  const globalPartRegistry = unionPartDescriptors(results);
  const assemblyPlan: SectionSlice[] = results.map((r) => ({
    sectionLabel: r.sectionLabel,
    startBar: r.startBar,
    endBar: r.endBar,
    presetRole: r.presetRole,
    activePartIds: [...r.activePartIds],
  }));

  const sectionOwnership: Record<number, string> = {};
  for (const r of results) {
    for (let b = r.startBar; b <= r.endBar; b++) {
      sectionOwnership[b] = r.sectionLabel;
    }
  }

  const partById = new Map<string, PartModel>();
  for (const desc of globalPartRegistry) {
    partById.set(desc.id, descriptorToPartShell(desc, totalBars));
  }

  for (const r of results) {
    const offset = offsetFragmentToGlobal(r.scoreFragment, r.startBar);
    for (const fragPart of offset.parts) {
      let target = partById.get(fragPart.id);
      if (!target) {
        target = descriptorToPartShell(partToDescriptor(fragPart), totalBars);
        partById.set(fragPart.id, target);
        globalPartRegistry.push(partToDescriptor(fragPart));
      }
      for (const m of fragPart.measures) {
        if (m.index < r.startBar || m.index > r.endBar) continue;
        const slotIdx = target.measures.findIndex((x) => x.index === m.index);
        if (slotIdx >= 0) {
          target.measures[slotIdx] = cloneMeasure(m);
        } else {
          target.measures.push(cloneMeasure(m));
        }
      }
    }
  }

  for (const part of partById.values()) {
    for (let b = 1; b <= totalBars; b++) {
      if (!part.measures.some((m) => m.index === b)) {
        part.measures.push(createFullMeasureRest(b));
      }
    }
    part.measures.sort((a, b) => a.index - b.index);
  }

  const title = results.find((r) => r.scoreFragment.title)?.scoreFragment.title ?? 'Assembled Score';
  const score: ScoreModel = {
    title,
    parts: [...partById.values()],
  };

  applyGlobalHarmonySpine(score, collectHarmonySpine(results));

  for (const part of score.parts) {
    normalizeDualVoiceRestMeasures(part);
  }

  const validation = validateScoreModel(score);
  if (!validation.valid) {
    throw new Error(`assembleSections: invalid score - ${validation.errors.slice(0, 5).join('; ')}`);
  }

  const assembledForValidation = { score, assemblyPlan, globalPartRegistry, sectionOwnership };
  validateMixedPresetScore(assembledForValidation);

  return assembledForValidation;
}

function filterPlanByRole(
  plan: MosaicModeSectionPlanEntry[],
  role: 'duo' | 'big_band' | 'string_quartet'
): MosaicModeSectionPlanEntry[] {
  return plan.filter((e) => (e.presetRole ?? 'duo') === role);
}

function applyMelodyBassFormatScoped(
  score: ScoreModel,
  assembled: AssembledScoreModel,
  plan: MosaicModeSectionPlanEntry[],
  tonicMap: Record<string, number>
): ScoreModel {
  const duoSections = assembled.assemblyPlan.filter((s) => s.presetRole === 'duo');
  if (duoSections.length === 0) return score;

  let working = structuredClone(score) as ScoreModel;
  for (const section of duoSections) {
    const entry = plan.find((p) => p.sectionLabel === section.sectionLabel);
    if (!entry) continue;
    const slice = sliceScoreForBarRange(working, section.startBar, section.endBar);
    const local = reindexScoreToLocalBars(slice, section.startBar);
    const formatted = applyMelodyBassFormat(local, [entry], tonicMap);
    const globalFormatted = offsetFragmentToGlobal(formatted, section.startBar);
    for (const fp of globalFormatted.parts) {
      const target = working.parts.find((p) => p.id === fp.id);
      if (!target) continue;
      for (const m of fp.measures) {
        const idx = target.measures.findIndex((x) => x.index === m.index);
        if (idx >= 0) target.measures[idx] = cloneMeasure(m);
      }
    }
  }
  return working;
}

export interface ScopedLatePassOptions {
  bbMosaicEnabled?: boolean;
  sqMosaicEnabled?: boolean;
}

export function applyScopedLatePasses(
  assembled: AssembledScoreModel,
  context: CompositionContext,
  options?: ScopedLatePassOptions
): ScoreModel {
  let score = structuredClone(assembled.score) as ScoreModel;
  const plan = context.generationMetadata?.mosaicSectionPlan ?? [];
  const tonicMap = plan.length > 0 ? buildMosaicTonicMap(plan, context) : {};
  const outputFormat = context.generationMetadata?.mosaicOutputFormat;

  const hasBb = assembled.assemblyPlan.some((s) => s.presetRole === 'big_band');
  const hasSq = assembled.assemblyPlan.some((s) => s.presetRole === 'string_quartet');

  if (hasSq) {
    const sqContext = {
      ...context,
      generationMetadata: {
        ...context.generationMetadata,
        mosaicSectionPlan: filterPlanByRole(plan, 'string_quartet'),
      },
    };
    score = applyContrapuntalPass4MusicXmlMerge(score, sqContext as CompositionContext);
  }

  if (hasBb && options?.bbMosaicEnabled === true) {
    const bbContext = {
      ...context,
      generationMetadata: {
        ...context.generationMetadata,
        mosaicSectionPlan: filterPlanByRole(plan, 'big_band'),
      },
    };
    score = injectMosaicMotifNotesPostFinalizeBigBand(score, bbContext as CompositionContext, true);
  }

  if (outputFormat === 'melody-bass-chords') {
    const mbBefore = snapshotMixedPresetScopeEvents(score, assembled);
    score = applyMelodyBassFormatScoped(score, assembled, filterPlanByRole(plan, 'duo'), tonicMap);
    assertDuoScopedPassScope(mbBefore, score, assembled, 'applyMelodyBassFormat');
  } else if (outputFormat === 'lead-sheet') {
    const lsBefore = snapshotMixedPresetScopeEvents(score, assembled);
    for (const section of assembled.assemblyPlan.filter((s) => s.presetRole === 'duo')) {
      const entry = plan.find((p) => p.sectionLabel === section.sectionLabel);
      if (!entry) continue;
      const slice = sliceScoreForBarRange(score, section.startBar, section.endBar);
      const local = reindexScoreToLocalBars(slice, section.startBar);
      const formatted = applyLeadSheetFormat(local, [entry], tonicMap);
      const globalFormatted = offsetFragmentToGlobal(formatted, section.startBar);
      for (const fp of globalFormatted.parts) {
        const existing = workingFindOrAddPart(score, fp.id, fp);
        for (const m of fp.measures) {
          const idx = existing.measures.findIndex((x) => x.index === m.index);
          if (idx >= 0) existing.measures[idx] = cloneMeasure(m);
        }
      }
    }
    assertDuoScopedPassScope(lsBefore, score, assembled, 'applyLeadSheetFormat');
  }

  return score;
}

function workingFindOrAddPart(score: ScoreModel, id: string, template: PartModel): PartModel {
  let part = score.parts.find((p) => p.id === id);
  if (!part) {
    part = structuredClone(template) as PartModel;
    score.parts.push(part);
  }
  return part;
}

export function extractDuoSectionFragment(
  duoScore: ScoreModel,
  entry: MosaicModeSectionPlanEntry,
  harmonyBars: string[]
): SectionRealizationResult {
  const sliced = sliceScoreForBarRange(duoScore, entry.startBar, entry.endBar);
  const local = reindexScoreToLocalBars(sliced, entry.startBar);
  const activePartIds = local.parts.map((p) => p.id);
  return {
    sectionLabel: entry.sectionLabel,
    startBar: entry.startBar,
    endBar: entry.endBar,
    presetRole: 'duo',
    partSet: local.parts.map(partToDescriptor),
    scoreFragment: local,
    harmonyBars,
    activePartIds,
    latePassPermissions: { mosaicInject: true, melodyBassFormat: true, leadSheetFormat: true },
  };
}

export function sectionHarmonyBars(
  context: CompositionContext,
  entry: MosaicModeSectionPlanEntry
): string[] {
  const locked =
    context.lockedHarmonyBarsRaw ??
    context.generationMetadata?.parsedCustomProgressionBars ??
    [];
  return locked.slice(entry.startBar - 1, entry.endBar);
}
