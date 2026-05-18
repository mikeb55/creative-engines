/**
 * SQ→BB API boundary — per-section VRB map normalization.
 */

import type { FormSection } from '../core/form/formPlanner';
import { resolveFormSections, type FormId } from '../core/form/formPlanner';
import { buildDuoLongFormPlanForBarCount } from '../core/form/duoLongFormPlanner';
import {
  buildGlobalVrbContextMap,
  type SectionVrbContext,
  type VrbContextMap,
} from '../core/counterpoint/vrbProfiles/vrbContextMap';
import { getSqVrbProfile } from '../core/counterpoint/vrbProfiles/sqVrbProfileRegistry';
import {
  getSectionLabelsForMode,
  isValidSectionLabel,
  SQ_TO_BB_DEFAULT_SECTION_LABEL_MODE,
  type SqToBbSectionLabel,
  type SqToBbSectionLabelMode,
} from '../core/counterpoint/vrbProfiles/sqToBbSectionLabels';
import { normalizeSqToBbSqComposer } from '../core/counterpoint/sqToBbWorkflowTypes';

const FORM_IDS_TO_TRY: FormId[] = [
  'aaba',
  'abac',
  'aba',
  'ab',
  'through8',
  'through7',
  'through6',
  'through5',
  'through4',
  'through3',
  'blues24',
  'blues12',
  'aab',
  'abcb',
  'abacab',
];

function invalidLabelErrorMessage(key: string, mode: SqToBbSectionLabelMode): string {
  const labels = getSectionLabelsForMode(mode).join(', ');
  return `Invalid section label: "${key}". Must be one of: ${labels}`;
}

function assertKnownVrbId(vrbId: string, sectionKey: string): void {
  if (!getSqVrbProfile(vrbId)) {
    throw new Error(`Unknown vrbId: "${vrbId}" for section "${sectionKey}"`);
  }
}

function sectionContext(sectionId: string, vrbId: string): SectionVrbContext {
  return {
    sectionId,
    vrbs: [{ vrbId, weight: 1 }],
    transitionBars: 0,
  };
}

function composerToVrbId(raw: string | null | undefined): string {
  const composer = normalizeSqToBbSqComposer(raw);
  return composer ?? '';
}

/** SQ composer id or resolved sqLine VRB id (e.g. bob_brookmeyer). */
function globalFallbackVrbId(raw: string | null | undefined): string {
  const trimmed = String(raw ?? '').trim().toLowerCase();
  if (!trimmed) return '';
  if (getSqVrbProfile(trimmed)) return trimmed;
  return composerToVrbId(raw);
}

export function normalizeSectionVrbMap(input: {
  sqToBbSqComposer?: string | null;
  sectionVrbMap?: Record<string, string>;
  totalBars: number;
  sectionLabelMode?: SqToBbSectionLabelMode;
}): VrbContextMap {
  const mode = input.sectionLabelMode ?? SQ_TO_BB_DEFAULT_SECTION_LABEL_MODE;
  const mapEntries = input.sectionVrbMap ? Object.entries(input.sectionVrbMap) : [];

  if (mapEntries.length > 0) {
    const out: VrbContextMap = new Map();
    for (const [key, vrbId] of mapEntries) {
      if (!isValidSectionLabel(key, mode)) {
        throw new Error(invalidLabelErrorMessage(key, mode));
      }
      const trimmed = String(vrbId).trim().toLowerCase();
      assertKnownVrbId(trimmed, key);
      out.set(key, sectionContext(key, trimmed));
    }
    return out;
  }

  const vrbId = globalFallbackVrbId(input.sqToBbSqComposer);
  if (!vrbId) {
    throw new Error('normalizeSectionVrbMap: vrbId must not be empty');
  }
  assertKnownVrbId(vrbId, 'sq_bb');
  return buildGlobalVrbContextMap(vrbId, input.totalBars);
}

function orderSectionKeysFromMap(
  vrbContextMap: VrbContextMap,
  labelMode: SqToBbSectionLabelMode,
): SqToBbSectionLabel[] {
  const canonical = getSectionLabelsForMode(labelMode);
  return canonical.filter((label) => vrbContextMap.has(label)) as SqToBbSectionLabel[];
}

function planBarChunksForSections(
  totalBars: number,
  sectionCount: number,
): ReadonlyArray<{ startBar: number; length: number }> {
  if (totalBars % 8 === 0 && totalBars >= 8 && totalBars <= 64) {
    try {
      const plan = buildDuoLongFormPlanForBarCount(totalBars);
      if (plan.sections.length === sectionCount) {
        return plan.sections.map((s) => ({ startBar: s.startBar, length: s.length }));
      }
    } catch {
      /* fall through */
    }
  }

  for (const formId of FORM_IDS_TO_TRY) {
    const sections = resolveFormSections(formId);
    const sum = sections.reduce((acc, s) => acc + s.length, 0);
    if (sum === totalBars && sections.length === sectionCount) {
      return sections.map((s) => ({ startBar: s.startBar, length: s.length }));
    }
  }

  const base = Math.floor(totalBars / sectionCount);
  const rem = totalBars % sectionCount;
  const chunks: { startBar: number; length: number }[] = [];
  let startBar = 1;
  for (let i = 0; i < sectionCount; i++) {
    const length = base + (i < rem ? 1 : 0);
    chunks.push({ startBar, length });
    startBar += length;
  }
  return chunks;
}

/** Assert sections cover 1…totalBars contiguously with no gaps or overlaps. */
export function assertSectionBarRanges(sections: readonly FormSection[], totalBars: number): void {
  const sum = sections.reduce((acc, s) => acc + s.length, 0);
  if (sum !== totalBars) {
    throw new Error(`Section lengths sum to ${sum}, expected ${totalBars}`);
  }
  const ordered = [...sections].sort((a, b) => a.startBar - b.startBar);
  let nextStart = 1;
  for (const s of ordered) {
    if (s.startBar !== nextStart) {
      throw new Error(
        `Section gap or overlap at bar ${nextStart}: "${s.label}" starts at ${s.startBar}`,
      );
    }
    nextStart += s.length;
  }
}

export function buildSqToBbFormSections(
  vrbContextMap: VrbContextMap,
  totalBars: number,
  labelMode: SqToBbSectionLabelMode = SQ_TO_BB_DEFAULT_SECTION_LABEL_MODE,
): FormSection[] {
  const sectionKeys = orderSectionKeysFromMap(vrbContextMap, labelMode);

  if (totalBars <= 16 || sectionKeys.length <= 1) {
    const single: FormSection[] = [{ label: 'sq_bb', startBar: 1, length: totalBars }];
    assertSectionBarRanges(single, totalBars);
    return single;
  }

  const chunks = planBarChunksForSections(totalBars, sectionKeys.length);
  const sections = sectionKeys.map((label, i) => {
    const chunk = chunks[i]!;
    return { label, startBar: chunk.startBar, length: chunk.length };
  });
  assertSectionBarRanges(sections, totalBars);
  return sections;
}
