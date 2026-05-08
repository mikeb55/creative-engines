/**
 * Single resolver for macro form: formId → compiled Song Mode sections → default layout.
 * LOCK: output `totalBars` matches `lockedHarmonyBarCount` when provided (harmony truth).
 */

import type { FormMap } from '../compositionContext';
import type { SongSectionKind } from '../song-mode/songModeTypes';
import type { FormId } from './formPlanner';
import { resolveFormSections } from './formPlanner';
import { buildDuoLongFormPlanForBarCount } from './duoLongFormPlanner';

export interface CompiledSectionSliceInput {
  kind: SongSectionKind;
  barLength: number;
}

/** Stable labels (`verse_0`, `chorus_1`, …) so Wayne/GCE see semantic roles. */
export function compiledSectionKindToFormLabel(kind: SongSectionKind, ordinal: number): string {
  return `${kind}_${ordinal}`;
}

function sumCompiledLengths(sections: CompiledSectionSliceInput[]): number {
  return sections.reduce((s, x) => s + x.barLength, 0);
}

function buildFormMapFromCompiled(sections: CompiledSectionSliceInput[]): FormMap {
  const counts: Partial<Record<SongSectionKind, number>> = {};
  let bar = 1;
  const out: FormMap['sections'] = [];
  for (const sec of sections) {
    const ord = counts[sec.kind] ?? 0;
    counts[sec.kind] = ord + 1;
    const label = compiledSectionKindToFormLabel(sec.kind, ord);
    out.push({ label, startBar: bar, length: sec.barLength });
    bar += sec.barLength;
  }
  const totalBars = bar - 1;
  return { sections: out, totalBars };
}

function formMapFromDuoLongPlanner(tb: number): FormMap {
  const lf = buildDuoLongFormPlanForBarCount(tb);
  return {
    sections: lf.sections.map((s) => ({ label: s.label, startBar: s.startBar, length: s.length })),
    totalBars: tb,
  };
}

export interface ResolveFormPrecedenceInput {
  formId?: FormId | string | null | undefined;
  compiledSections?: CompiledSectionSliceInput[] | null | undefined;
  /** Requested / context bar span before lock clamp */
  totalBars: number;
  /** When set (e.g. `lockedHarmonyBarsRaw.length`), output must use exactly this many bars */
  lockedHarmonyBarCount?: number | undefined;
  /** Fallback when formId/compiled do not apply — typically `buildGoldenPathContext` output */
  defaultForm?: FormMap | undefined;
}

export function resolveFormPrecedence(input: ResolveFormPrecedenceInput): FormMap {
  const tb =
    typeof input.lockedHarmonyBarCount === 'number' && input.lockedHarmonyBarCount > 0
      ? input.lockedHarmonyBarCount
      : input.totalBars;

  const tryFormId = (): FormMap | null => {
    const fid = input.formId;
    if (fid == null || String(fid).trim() === '') return null;
    const sections = resolveFormSections(fid as FormId);
    const sum = sections.reduce((s, x) => s + x.length, 0);
    if (sum !== tb) return null;
    return {
      sections: sections.map((s) => ({ label: s.label, startBar: s.startBar, length: s.length })),
      totalBars: tb,
    };
  };

  const tryCompiled = (): FormMap | null => {
    if (!input.compiledSections?.length) return null;
    if (sumCompiledLengths(input.compiledSections) !== tb) return null;
    return buildFormMapFromCompiled(input.compiledSections);
  };

  const resolvedDefault =
    input.defaultForm && input.defaultForm.totalBars === tb ? input.defaultForm : null;

  return tryFormId() ?? tryCompiled() ?? resolvedDefault ?? formMapFromDuoLongPlanner(tb);
}
