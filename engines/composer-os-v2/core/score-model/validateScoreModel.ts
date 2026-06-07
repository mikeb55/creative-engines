/**
 * Mixed-preset assembled score validation (V80h export integrity).
 */

import type { AssembledScoreModel, SectionSlice } from './assembledScoreModel';
import type { PartDescriptor } from './assembledScoreModel';
import type { ScoreModel } from './scoreModelTypes';

export type MixedPresetValidationKind = 'part-coverage' | 'part-id-uniqueness' | 'section-boundary';

export class MixedPresetValidationError extends Error {
  readonly kind: MixedPresetValidationKind;
  readonly partId?: string;
  readonly bar?: number;
  readonly sectionLabel?: string;

  constructor(
    kind: MixedPresetValidationKind,
    message: string,
    details?: { partId?: string; bar?: number; sectionLabel?: string }
  ) {
    super(message);
    this.name = 'MixedPresetValidationError';
    this.kind = kind;
    this.partId = details?.partId;
    this.bar = details?.bar;
    this.sectionLabel = details?.sectionLabel;
  }
}

export class ScopeViolationError extends Error {
  readonly passName: string;
  readonly partId?: string;
  readonly bar?: number;
  readonly sectionLabel?: string;

  constructor(
    message: string,
    details: { passName: string; partId?: string; bar?: number; sectionLabel?: string }
  ) {
    super(message);
    this.name = 'ScopeViolationError';
    this.passName = details.passName;
    this.partId = details.partId;
    this.bar = details.bar;
    this.sectionLabel = details.sectionLabel;
  }
}

export interface MixedPresetValidationInput {
  score: ScoreModel;
  globalPartRegistry: PartDescriptor[];
  sectionOwnership: Record<number, string>;
  assemblyPlan: SectionSlice[];
}

function totalBarsFromPlan(assemblyPlan: SectionSlice[]): number {
  return Math.max(0, ...assemblyPlan.map((s) => s.endBar));
}

function assertPartIdUniqueness(score: ScoreModel): void {
  const seen = new Set<string>();
  for (const part of score.parts) {
    const id = part.id?.trim();
    if (!id) {
      throw new MixedPresetValidationError('part-id-uniqueness', 'Part missing id');
    }
    if (seen.has(id)) {
      throw new MixedPresetValidationError('part-id-uniqueness', `Duplicate part id "${id}"`, { partId: id });
    }
    seen.add(id);
  }
}

function assertPartBarCoverage(
  score: ScoreModel,
  globalPartRegistry: PartDescriptor[],
  totalBars: number
): void {
  const partById = new Map(score.parts.map((p) => [p.id, p]));
  for (const desc of globalPartRegistry) {
    const part = partById.get(desc.id);
    if (!part) {
      throw new MixedPresetValidationError(
        'part-coverage',
        `Registry part "${desc.id}" missing from assembled score`,
        { partId: desc.id }
      );
    }
    for (let bar = 1; bar <= totalBars; bar++) {
      const measure = part.measures.find((m) => m.index === bar);
      if (!measure || measure.events.length === 0) {
        throw new MixedPresetValidationError(
          'part-coverage',
          `Part "${desc.id}" missing event on bar ${bar}`,
          { partId: desc.id, bar }
        );
      }
    }
  }
}

function hasPitchContent(events: { kind: string }[]): boolean {
  return events.some((e) => e.kind === 'note' || e.kind === 'chord');
}

function assertSectionBoundaryIntegrity(score: ScoreModel, assemblyPlan: SectionSlice[]): void {
  const partById = new Map(score.parts.map((p) => [p.id, p]));
  for (const section of assemblyPlan) {
    for (const partId of section.activePartIds) {
      const part = partById.get(partId);
      if (!part) continue;
      for (const m of part.measures) {
        if (m.index >= section.startBar && m.index <= section.endBar) continue;
        if (hasPitchContent(m.events)) {
          throw new MixedPresetValidationError(
            'section-boundary',
            `Part "${partId}" has pitch content on bar ${m.index} outside section "${section.sectionLabel}" (${section.startBar}-${section.endBar})`,
            { partId, bar: m.index, sectionLabel: section.sectionLabel }
          );
        }
      }
    }
  }
}

/** Validate mixed-preset assembly integrity before export. */
export function validateMixedPresetScore(input: MixedPresetValidationInput): void {
  const { score, globalPartRegistry, sectionOwnership, assemblyPlan } = input;
  if (!sectionOwnership || Object.keys(sectionOwnership).length === 0) return;
  if (assemblyPlan.length === 0) return;

  assertPartIdUniqueness(score);
  const totalBars = totalBarsFromPlan(assemblyPlan);
  assertPartBarCoverage(score, globalPartRegistry, totalBars);
  assertSectionBoundaryIntegrity(score, assemblyPlan);
}

export type ScopeEventSnapshot = Map<string, string>;

/** Snapshot BB/SQ parts and duo parts on non-duo bars (scope guard baseline). */
export function snapshotMixedPresetScopeEvents(
  score: ScoreModel,
  assembled: AssembledScoreModel
): ScopeEventSnapshot {
  const duoBars = new Set<number>();
  for (const section of assembled.assemblyPlan) {
    if (section.presetRole !== 'duo') continue;
    for (let b = section.startBar; b <= section.endBar; b++) duoBars.add(b);
  }

  const snap: ScopeEventSnapshot = new Map();
  for (const part of score.parts) {
    const isEnsemble = part.id.startsWith('bb_') || part.id.startsWith('sq_');
    const isDuoPart = part.id === 'guitar' || part.id === 'bass';
    if (!isEnsemble && !isDuoPart) continue;
    for (const m of part.measures) {
      if (isDuoPart && duoBars.has(m.index)) continue;
      snap.set(`${part.id}:${m.index}`, JSON.stringify(m.events));
    }
  }
  return snap;
}

function ownerRoleForBar(assembled: AssembledScoreModel, bar: number): string {
  const label = assembled.sectionOwnership[bar];
  if (!label) return '?';
  const section = assembled.assemblyPlan.find((s) => s.sectionLabel === label);
  return section?.presetRole ?? label;
}

/** Assert duo-scoped late pass did not mutate BB/SQ bars or ensemble parts. */
export function assertDuoScopedPassScope(
  before: ScopeEventSnapshot,
  after: ScoreModel,
  assembled: AssembledScoreModel,
  passName: string
): void {
  for (const [key, prev] of before.entries()) {
    const sep = key.lastIndexOf(":");
    const partId = key.slice(0, sep);
    const bar = Number(key.slice(sep + 1));
    const part = after.parts.find((p) => p.id === partId);
    const owner = ownerRoleForBar(assembled, bar);
    if (!part) {
      console.log(`[scope-guard] pass ${passName} touched bar ${bar} (owner: ${owner}) — violation`);
      throw new ScopeViolationError(
        `[scope-guard] pass ${passName} removed part ${partId} (bar ${bar}, owner: ${owner})`,
        { passName, bar, partId, sectionLabel: assembled.sectionOwnership[bar] }
      );
    }
    const measure = part.measures.find((m) => m.index === bar);
    const now = JSON.stringify(measure?.events ?? []);
    if (prev !== now) {
      console.log(`[scope-guard] pass ${passName} touched bar ${bar} (owner: ${owner}) — violation`);
      throw new ScopeViolationError(
        `[scope-guard] pass ${passName} touched bar ${bar} part=${partId} (owner: ${owner})`,
        { passName, bar, partId, sectionLabel: assembled.sectionOwnership[bar] }
      );
    }
  }
}
