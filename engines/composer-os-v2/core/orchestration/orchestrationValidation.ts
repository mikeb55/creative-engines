/**
 * Orchestration plan validation — planning contracts only (Prompt 4/7).
 */

import type { EnsembleFamilyProfile } from './ensembleFamilyProfiles';
import type { OrchestrationPlan, SectionRoleMatrix } from './orchestrationPlanTypes';
import type { OrchestrationRoleLabel } from './orchestrationRoleTypes';

export interface OrchestrationValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

function countLeadsInSection(matrix: SectionRoleMatrix, sectionIndex: number): number {
  const block = matrix.find((m) => m.section.index === sectionIndex);
  if (!block) return 0;
  return block.rows.filter((r) => r.instrumentRole === 'lead' || r.textureRole === 'lead').length;
}

function hasBassAnchor(matrix: SectionRoleMatrix, sectionIndex: number): boolean {
  const block = matrix.find((m) => m.section.index === sectionIndex);
  if (!block) return false;
  return block.rows.some((r) => r.instrumentRole === 'bass_anchor' || r.textureRole === 'bass_anchor');
}

export function validateOrchestrationPlanCompleteness(plan: OrchestrationPlan): OrchestrationValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (plan.totalBars < 1) errors.push('totalBars must be >= 1');
  if (plan.sections.length === 0) errors.push('sections required');
  if (plan.sectionRoleMatrix.length !== plan.sections.length) {
    errors.push('sectionRoleMatrix must align with sections');
  }

  for (const sec of plan.sections) {
    if (sec.endBar < sec.startBar) errors.push(`section ${sec.index}: endBar before startBar`);
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function validateFamilyProfileCompatibility(
  plan: OrchestrationPlan,
  profile: EnsembleFamilyProfile
): OrchestrationValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (plan.ensembleFamily !== profile.family) {
    errors.push(`ensembleFamily mismatch: plan=${plan.ensembleFamily} profile=${profile.family}`);
  }

  if (plan.presetId && !profile.compatiblePresetIds.includes(plan.presetId)) {
    errors.push(`presetId ${plan.presetId} not compatible with family ${profile.family}`);
  }

  const allowed = new Set(profile.allowedRoles);
  for (const block of plan.sectionRoleMatrix) {
    for (const row of block.rows) {
      if (!allowed.has(row.instrumentRole)) {
        errors.push(`invalid instrumentRole ${row.instrumentRole} for family ${profile.family}`);
      }
      if (!allowed.has(row.textureRole)) {
        errors.push(`invalid textureRole ${row.textureRole} for family ${profile.family}`);
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function validateRoleUniquenessWhereRequired(plan: OrchestrationPlan): OrchestrationValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const matrix = plan.sectionRoleMatrix;

  if (plan.textureOwnership.enforceSingleLead) {
    for (const sec of plan.sections) {
      const leads = countLeadsInSection(matrix, sec.index);
      if (leads > 1) errors.push(`section ${sec.index}: multiple lead roles where single lead enforced`);
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function validateRegisterOwnershipNoCrowding(plan: OrchestrationPlan): OrchestrationValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const maxMid = plan.registerOwnership.maxMidRegisterLeadParts;

  for (const sec of plan.sections) {
    const mids = plan.registerOwnership.entries.filter(
      (e) => e.sectionIndex === sec.index && e.registerBand === 'middle' && e.claimsMelodicPriority
    );
    if (mids.length > maxMid) {
      errors.push(`section ${sec.index}: mid-register melodic crowding (${mids.length} > ${maxMid})`);
    }
  }

  /** Overlapping register claims: two parts same band + both lead */
  for (const sec of plan.sections) {
    const entries = plan.registerOwnership.entries.filter((e) => e.sectionIndex === sec.index);
    const byBand = new Map<string, string[]>();
    for (const e of entries) {
      const k = e.registerBand;
      const arr = byBand.get(k) ?? [];
      arr.push(e.partId);
      byBand.set(k, arr);
    }
    for (const block of plan.sectionRoleMatrix) {
      if (block.section.index !== sec.index) continue;
      const leadParts = new Set(block.rows.filter((r) => r.instrumentRole === 'lead').map((r) => r.partId));
      for (const [_band, parts] of byBand) {
        const leadsHere = parts.filter((p) => leadParts.has(p));
        if (leadsHere.length > 1) {
          errors.push(`section ${sec.index}: impossible register overlap — multiple leads in same register bucket`);
        }
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function validateDensityNoOverload(plan: OrchestrationPlan): OrchestrationValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const th = plan.densityOwnership.overloadThreshold;

  for (const sec of plan.sections) {
    const sum = plan.densityOwnership.entries
      .filter((e) => e.sectionIndex === sec.index)
      .reduce((a, e) => a + e.weight, 0);
    if (sum > th) {
      errors.push(`section ${sec.index}: density overload (sum=${sum.toFixed(2)} > ${th})`);
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function validateBassAnchorWhenRequired(
  plan: OrchestrationPlan,
  profile: EnsembleFamilyProfile
): OrchestrationValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!profile.requireBassAnchor) return { ok: true, errors, warnings };

  for (const sec of plan.sections) {
    if (!hasBassAnchor(plan.sectionRoleMatrix, sec.index)) {
      errors.push(`section ${sec.index}: missing bass_anchor (required for ${profile.family})`);
    }
  }
  return { ok: errors.length === 0, errors, warnings };
}

export function mergeOrchestrationValidation(...results: OrchestrationValidationResult[]): OrchestrationValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  for (const r of results) {
    errors.push(...r.errors);
    warnings.push(...r.warnings);
  }
  return { ok: errors.length === 0, errors, warnings };
}

export function validateOrchestrationPlan(plan: OrchestrationPlan, profile: EnsembleFamilyProfile): OrchestrationValidationResult {
  return mergeOrchestrationValidation(
    validateOrchestrationPlanCompleteness(plan),
    validateFamilyProfileCompatibility(plan, profile),
    validateRoleUniquenessWhereRequired(plan),
    validateRegisterOwnershipNoCrowding(plan),
    validateDensityNoOverload(plan),
    validateBassAnchorWhenRequired(plan, profile)
  );
}

/** Build a deliberately invalid plan for tests: two leads, same register priority. */
export function buildConflictingLeadRegisterExample(partA: string, partB: string): OrchestrationPlan {
  const sections = [{ index: 0, label: 'A', startBar: 1, endBar: 4 }];
  const matrix: SectionRoleMatrix = [
    {
      section: sections[0],
      rows: [
        {
          partId: partA,
          instrumentRole: 'lead' as OrchestrationRoleLabel,
          textureRole: 'lead',
          registerBand: 'middle',
          densityBand: 'dense',
          articulationBias: 'mixed',
          sustainVsAttack: 'balanced',
        },
        {
          partId: partB,
          instrumentRole: 'lead' as OrchestrationRoleLabel,
          textureRole: 'lead',
          registerBand: 'middle',
          densityBand: 'dense',
          articulationBias: 'mixed',
          sustainVsAttack: 'balanced',
        },
      ],
    },
  ];
  return {
    ensembleFamily: 'duo',
    presetId: 'guitar_bass_duo',
    totalBars: 4,
    sections,
    sectionRoleMatrix: matrix,
    registerOwnership: {
      entries: [
        { partId: partA, sectionIndex: 0, registerBand: 'middle', claimsMelodicPriority: true },
        { partId: partB, sectionIndex: 0, registerBand: 'middle', claimsMelodicPriority: true },
      ],
      maxMidRegisterLeadParts: 1,
    },
    textureOwnership: { entries: [], enforceSingleLead: true },
    densityOwnership: { entries: [], overloadThreshold: 1.35 },
    silenceEligibleByBar: [false, false, false, false],
    silenceEligibility: [],
  };
}
