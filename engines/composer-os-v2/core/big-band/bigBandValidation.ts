/**
 * Big Band planning validation (Prompt 5/7).
 */

import type { BigBandDensityPlan } from './bigBandPlanTypes';
import type { BigBandFormPlan } from './bigBandPlanTypes';
import type { BigBandSectionPlan } from './bigBandPlanTypes';
import type { BigBandInstrumentSection } from './bigBandSectionTypes';

export interface BigBandValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

const SECTIONS: BigBandInstrumentSection[] = ['saxes', 'trumpets', 'trombones', 'rhythm_section'];

export function mergeBigBandValidation(...results: BigBandValidationResult[]): BigBandValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  for (const r of results) {
    errors.push(...r.errors);
    warnings.push(...r.warnings);
  }
  return { ok: errors.length === 0, errors, warnings };
}

export function validateRhythmSectionAlwaysActive(sectionPlan: BigBandSectionPlan): BigBandValidationResult {
  const errors: string[] = [];
  for (const sl of sectionPlan.slices) {
    const r = sl.rolesBySection.rhythm_section;
    if (r === 'silence') errors.push(`slice ${sl.formSliceIndex}: rhythm_section cannot be silent (rhythm section required)`);
  }
  return { ok: errors.length === 0, errors, warnings: [] };
}

export function validateBassAnchorCoverage(sectionPlan: BigBandSectionPlan): BigBandValidationResult {
  const errors: string[] = [];
  for (const sl of sectionPlan.slices) {
    const hasBass =
      sl.rolesBySection.rhythm_section === 'bass_anchor' ||
      Object.values(sl.rolesBySection).some((role) => role === 'bass_anchor');
    if (!hasBass) errors.push(`slice ${sl.formSliceIndex}: missing bass_anchor`);
  }
  return { ok: errors.length === 0, errors, warnings: [] };
}

export function validateFormSequence(formPlan: BigBandFormPlan): BigBandValidationResult {
  const errors: string[] = [];
  const phases = formPlan.slices.map((s) => s.phase);
  if (!phases.includes('ending')) errors.push('form must include ending');
  if (!phases.includes('shout_chorus')) errors.push('form must include shout_chorus');
  const shoutIdx = phases.indexOf('shout_chorus');
  const endIdx = phases.indexOf('ending');
  if (shoutIdx >= 0 && endIdx >= 0 && shoutIdx > endIdx) errors.push('shout_chorus must occur before ending');
  return { ok: errors.length === 0, errors, warnings: [] };
}

export function validateShoutChorusContrast(
  formPlan: BigBandFormPlan,
  densityPlan: BigBandDensityPlan
): BigBandValidationResult {
  const errors: string[] = [];
  const head = densityPlan.slices.find((s) => s.phase === 'melody_head');
  const shout = densityPlan.slices.find((s) => s.phase === 'shout_chorus');
  if (head && shout && head.density === shout.density) {
    errors.push('shout_chorus must contrast with melody_head (density)');
  }
  return { ok: errors.length === 0, errors, warnings: [] };
}

export function validateNotEveryoneAlwaysPlaying(sectionPlan: BigBandSectionPlan): BigBandValidationResult {
  const errors: string[] = [];
  let allFull = true;
  for (const sl of sectionPlan.slices) {
    const anyRest = SECTIONS.some((k) => sl.rolesBySection[k] === 'silence');
    if (anyRest) allFull = false;
  }
  if (allFull) errors.push('planning error: every instrument section plays in every slice (no sectional rests)');
  return { ok: errors.length === 0, errors, warnings: [] };
}

export function validateDensityOverloadBigBand(maxDensityWeightPerSlice: number, threshold: number): BigBandValidationResult {
  const errors: string[] = [];
  if (maxDensityWeightPerSlice > threshold) {
    errors.push(`density overload: max slice weight ${maxDensityWeightPerSlice.toFixed(2)} > ${threshold}`);
  }
  return { ok: errors.length === 0, errors, warnings: [] };
}

export function validateBigBandPlanningBundle(
  formPlan: BigBandFormPlan,
  sectionPlan: BigBandSectionPlan,
  densityPlan: BigBandDensityPlan
): BigBandValidationResult {
  return mergeBigBandValidation(
    validateFormSequence(formPlan),
    validateRhythmSectionAlwaysActive(sectionPlan),
    validateBassAnchorCoverage(sectionPlan),
    validateShoutChorusContrast(formPlan, densityPlan),
    validateNotEveryoneAlwaysPlaying(sectionPlan)
  );
}
