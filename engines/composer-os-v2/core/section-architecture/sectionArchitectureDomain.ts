/**
 * V64 P4 — Section architecture domain model (canonical bar geometry + layer taxonomy).
 *
 * Unifies form sections, per-section VRB markers, SQ→BB VRB context maps, macro goals,
 * and future section meter maps under one vocabulary. P5 extends TS surfaces; P6
 * defines merge/validation contracts; P7 consumes meter at engine render time.
 */

import type { SectionMarker } from '../composer/sectionMarkerTypes';
import type { SectionVrbContext } from '../counterpoint/vrbProfiles/vrbContextMap';
import type { MacroSectionGoals } from '../form/macroFormPlanner';

/** Canonical 1-based inclusive bar span for any section-scoped layer. */
export interface CompositionSection {
  /** Stable id — usually normalized label (e.g. `verse`, `A`, `sq_bb`). */
  sectionId: string;
  /** Display label from form plan or UI (may equal sectionId). */
  label: string;
  startBar: number;
  endBar: number;
  length: number;
}

/** Written meter change anchored at a bar (V65 engine consumption — domain placeholder in P4). */
export interface SectionMeterSpan {
  bar: number;
  meter: string;
}

/** One section row inside a reusable preset (UI / API). */
export interface SectionTemplateSection extends CompositionSection {
  /** Per-section meter timeline; engine reads at render in P7. */
  meterMap?: readonly SectionMeterSpan[];
}

/** Saved multi-section form template — superset of {@link FormMap} for product + V65 meter. */
export interface SectionTemplateBundle {
  presetId: string;
  displayName: string;
  sections: readonly SectionTemplateSection[];
  totalBars: number;
}

/** @deprecated P4 name — use {@link SectionTemplateSection}. */
export type SectionPresetSection = SectionTemplateSection;

/**
 * Which architectural layer supplies section-scoped behaviour.
 * Multiple layers may apply to the same bar span; P6 defines precedence.
 */
export type SectionLayerKind =
  | 'form'
  | 'macro_goals'
  | 'vrb_context'
  | 'marker'
  | 'meter';

/** Aggregated view of all section layers on a single generate request. */
export interface SectionArchitectureDocument {
  totalBars: number;
  formSections: readonly CompositionSection[];
  macroGoals?: readonly MacroSectionGoals[];
  markers?: readonly SectionMarker[];
  vrbContextBySectionId?: Readonly<Record<string, SectionVrbContext>>;
  preset?: SectionTemplateBundle;
}

export function compositionSectionEndBar(startBar: number, length: number): number {
  return startBar + Math.max(0, length) - 1;
}

export function toCompositionSection(
  label: string,
  startBar: number,
  length: number,
  sectionId?: string
): CompositionSection {
  const len = Math.max(0, Math.floor(length));
  const start = Math.max(1, Math.floor(startBar));
  return {
    sectionId: sectionId ?? normalizeSectionId(label),
    label: label.trim(),
    startBar: start,
    endBar: compositionSectionEndBar(start, len),
    length: len,
  };
}

export function toCompositionSectionsFromForm(
  sections: readonly { label: string; startBar: number; length: number }[],
  totalBars: number
): CompositionSection[] {
  const out = sections.map((s) => toCompositionSection(s.label, s.startBar, s.length));
  if (out.length === 0 && totalBars > 0) {
    return [toCompositionSection('whole', 1, totalBars)];
  }
  return out;
}

export function normalizeSectionId(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'section';
}

export function sectionCoversBar(section: CompositionSection, bar: number): boolean {
  return bar >= section.startBar && bar <= section.endBar;
}

export function findCompositionSectionForBar(
  sections: readonly CompositionSection[],
  bar: number
): CompositionSection | undefined {
  return sections.find((s) => sectionCoversBar(s, bar));
}

export type SectionPartitionIssue =
  | { kind: 'empty' }
  | { kind: 'gap'; afterBar: number; beforeBar: number }
  | { kind: 'overlap'; bar: number; labels: string[] }
  | { kind: 'start_not_one'; startBar: number }
  | { kind: 'end_mismatch'; endBar: number; totalBars: number };

/** Validates contiguous 1..totalBars coverage with no overlaps (form-geometry contract). */
export function validateSectionPartition(
  sections: readonly CompositionSection[],
  totalBars: number
): { ok: true } | { ok: false; issues: SectionPartitionIssue[] } {
  const issues: SectionPartitionIssue[] = [];
  if (totalBars <= 0) return { ok: true };
  if (!sections.length) {
    issues.push({ kind: 'empty' });
    return { ok: false, issues };
  }

  const sorted = [...sections].sort((a, b) => a.startBar - b.startBar);
  if (sorted[0]!.startBar !== 1) {
    issues.push({ kind: 'start_not_one', startBar: sorted[0]!.startBar });
  }

  let expectedStart = 1;
  for (const s of sorted) {
    if (s.startBar > expectedStart) {
      issues.push({ kind: 'gap', afterBar: expectedStart - 1, beforeBar: s.startBar });
    }
    if (s.startBar < expectedStart) {
      const overlapBar = expectedStart;
      const labels = sorted.filter((x) => sectionCoversBar(x, overlapBar)).map((x) => x.label);
      issues.push({ kind: 'overlap', bar: overlapBar, labels });
    }
    expectedStart = Math.max(expectedStart, s.endBar + 1);
  }

  const last = sorted[sorted.length - 1]!;
  if (last.endBar !== totalBars) {
    issues.push({ kind: 'end_mismatch', endBar: last.endBar, totalBars });
  }

  return issues.length ? { ok: false, issues } : { ok: true };
}

/** Layers present on a document (diagnostics / UI). */
export function activeSectionLayers(doc: SectionArchitectureDocument): SectionLayerKind[] {
  const layers: SectionLayerKind[] = ['form'];
  if (doc.macroGoals?.length) layers.push('macro_goals');
  if (doc.vrbContextBySectionId && Object.keys(doc.vrbContextBySectionId).length > 0) {
    layers.push('vrb_context');
  }
  if (doc.markers?.length) layers.push('marker');
  if (doc.preset?.sections.some((s) => (s.meterMap?.length ?? 0) > 0)) layers.push('meter');
  return layers;
}

export function sectionArchitectureFromForm(
  formSections: readonly { label: string; startBar: number; length: number }[],
  totalBars: number,
  extras?: Omit<SectionArchitectureDocument, 'totalBars' | 'formSections'>
): SectionArchitectureDocument {
  return {
    totalBars,
    formSections: toCompositionSectionsFromForm(formSections, totalBars),
    ...extras,
  };
}
