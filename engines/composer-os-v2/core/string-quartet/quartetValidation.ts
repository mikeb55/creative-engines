/**
 * String quartet planning validation (Prompt 6/7).
 */

import type { OrchestrationPlan } from '../orchestration/orchestrationPlanTypes';
import type { QuartetDensityPlan } from './quartetPlanTypes';
import type { QuartetFormPlan } from './quartetPlanTypes';
import type { QuartetTexturePlan } from './quartetPlanTypes';
import type { QuartetInstrument } from './stringQuartetTypes';
import { QUARTET_INSTRUMENTS, SQ_PART_V1, SQ_PART_V2, SQ_PART_VA, SQ_PART_VC } from './stringQuartetTypes';
import { QUARTET_FORM_PHASES } from './quartetFormPlanner';
import type { QuartetRoleType } from './quartetRoleTypes';

export interface QuartetValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export function mergeQuartetValidation(...results: QuartetValidationResult[]): QuartetValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  for (const r of results) {
    errors.push(...r.errors);
    warnings.push(...r.warnings);
  }
  return { ok: errors.length === 0, errors, warnings };
}

export function validateCodaPresent(formPlan: QuartetFormPlan): QuartetValidationResult {
  const errors: string[] = [];
  if (!formPlan.slices.some((s) => s.phase === 'coda')) errors.push('form must include coda');
  return { ok: errors.length === 0, errors, warnings: [] };
}

export function validateSectionContrast(formPlan: QuartetFormPlan, densityPlan: QuartetDensityPlan): QuartetValidationResult {
  const errors: string[] = [];
  const st = densityPlan.slices.find((d) => d.phase === 'statement');
  const ct = densityPlan.slices.find((d) => d.phase === 'contrast');
  if (st && ct && st.density === ct.density) {
    errors.push('contrast section must differ in density from statement');
  }
  return { ok: errors.length === 0, errors, warnings: [] };
}

export function validateCelloFoundation(texturePlan: QuartetTexturePlan): QuartetValidationResult {
  const errors: string[] = [];
  for (const sl of texturePlan.slices) {
    const c = sl.rolesByInstrument.cello;
    const ok =
      c === 'bass_anchor' ||
      c === 'inner_motion' ||
      c === 'harmonic_support' ||
      c === 'sustain_pad' ||
      c === 'silence' ||
      (sl.phase === 'contrast' && c === 'lead');
    if (!ok) errors.push(`slice ${sl.formSliceIndex}: cello role ${c} not allowed for harmonic foundation`);
  }
  return { ok: errors.length === 0, errors, warnings: [] };
}

export function validateAtLeastOneCelloBassAnchor(texturePlan: QuartetTexturePlan): QuartetValidationResult {
  const errors: string[] = [];
  const n = texturePlan.slices.filter((s) => s.rolesByInstrument.cello === 'bass_anchor').length;
  if (n < 1) errors.push('at least one section should assign cello as bass_anchor');
  return { ok: errors.length === 0, errors, warnings: [] };
}

export function validateSingleLeadPerSlice(texturePlan: QuartetTexturePlan): QuartetValidationResult {
  const errors: string[] = [];
  for (const sl of texturePlan.slices) {
    const leads = QUARTET_INSTRUMENTS.filter((p) => sl.rolesByInstrument[p] === 'lead');
    if (leads.length > 1) errors.push(`slice ${sl.formSliceIndex}: multiple lead roles (collision)`);
  }
  return { ok: errors.length === 0, errors, warnings: [] };
}

const ACTIVE_ROLES: QuartetRoleType[] = ['lead', 'counterline', 'inner_motion'];

export function validateNotAllPartsConstantMotion(texturePlan: QuartetTexturePlan, densityPlan: QuartetDensityPlan): QuartetValidationResult {
  const errors: string[] = [];
  const anySparse = densityPlan.slices.some((d) => d.density === 'sparse');
  const anyPadOrSilence = texturePlan.slices.some((sl) =>
    QUARTET_INSTRUMENTS.some((p) => {
      const r = sl.rolesByInstrument[p];
      return r === 'silence' || r === 'sustain_pad';
    })
  );
  if (!anySparse && !anyPadOrSilence) {
    errors.push('planning error: all-parts constant motion (need sparse slice or silence/sustain_pad)');
  }
  return { ok: errors.length === 0, errors, warnings: [] };
}

export function validateQuartetPlanningBundle(
  formPlan: QuartetFormPlan,
  texturePlan: QuartetTexturePlan,
  densityPlan: QuartetDensityPlan
): QuartetValidationResult {
  return mergeQuartetValidation(
    validateCodaPresent(formPlan),
    validateSectionContrast(formPlan, densityPlan),
    validateCelloFoundation(texturePlan),
    validateAtLeastOneCelloBassAnchor(texturePlan),
    validateSingleLeadPerSlice(texturePlan),
    validateNotAllPartsConstantMotion(texturePlan, densityPlan)
  );
}

/** Quartet-specific register ownership (shared plan rows must match family defaults). */
export function validateQuartetRegisterOwnership(orchestrationPlan: OrchestrationPlan): QuartetValidationResult {
  const errors: string[] = [];
  for (const block of orchestrationPlan.sectionRoleMatrix) {
    for (const row of block.rows) {
      if (row.partId === SQ_PART_VC && row.registerBand !== 'bass') {
        errors.push(`section ${block.section.index}: cello must map to bass register for string quartet`);
      }
      if ((row.partId === SQ_PART_V1 || row.partId === SQ_PART_V2) && row.registerBand === 'bass') {
        errors.push(`section ${block.section.index}: violins cannot default to bass register in quartet plan`);
      }
      if (row.partId === SQ_PART_VA && row.registerBand === 'very_high') {
        errors.push(`section ${block.section.index}: viola cannot default to very_high in quartet plan`);
      }
    }
  }
  return { ok: errors.length === 0, errors, warnings: [] };
}

/** Deliberately invalid: pair with all-dense `QuartetDensityPlan` — no sparse slice, no pad/silence. */
export function buildAllConstantMotionTextureFailure(seed: number): QuartetTexturePlan {
  const active: QuartetRoleType = 'inner_motion';
  const slices: QuartetTexturePlan['slices'] = QUARTET_FORM_PHASES.map((phase, i) => ({
    formSliceIndex: i,
    phase,
    rolesByInstrument: {
      violin_1: active,
      violin_2: active,
      viola: active,
      cello: 'inner_motion',
    },
  }));
  void seed;
  return { slices };
}
