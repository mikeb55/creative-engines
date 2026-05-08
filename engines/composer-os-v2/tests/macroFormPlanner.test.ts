/**
 * Macro form planner — AABA goals + songwriter biases + section-boundary motif posture.
 */

import { macroGoalsForBar, planMacroForm } from '../core/form/macroFormPlanner';
import { resolveFormSections } from '../core/form/formPlanner';

function aaba32Form() {
  const sections = resolveFormSections('aaba');
  return {
    sections: sections.map((s) => ({ label: s.label, startBar: s.startBar, length: s.length })),
    totalBars: 32,
  };
}

export function runMacroFormPlannerTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];
  const form = aaba32Form();

  const glass = planMacroForm(form, 'philip_glass', undefined);
  out.push({
    ok:
      glass.songwriterBias === 'glass_flat' &&
      glass.sections[0]!.motifTreatment === 'statement' &&
      glass.sections[0]!.harmonyPacing === 'static' &&
      glass.sections.find((s) => s.label === 'B')?.motifTreatment === 'development',
    name: 'macroForm: Philip Glass — flat bias + AABA section roles',
  });

  const herrmann = planMacroForm(form, 'bernard_herrmann', undefined);
  out.push({
    ok:
      herrmann.songwriterBias === 'herrmann_contrast' &&
      herrmann.sections.find((s) => s.label === 'B')?.harmonyPacing === 'dense',
    name: 'macroForm: Bernard Herrmann — contrast bias + B section dense harmony pacing',
  });

  const evans = planMacroForm(form, 'bill_evans', undefined);
  out.push({
    ok:
      evans.songwriterBias === 'evans_moderate' &&
      evans.sections.every((s) => s.energyCurve === 'mid'),
    name: 'macroForm: Bill Evans — moderate energy on all sections',
  });

  const neutral = planMacroForm(form, undefined, undefined);
  const g16 = macroGoalsForBar(16, neutral);
  const g17 = macroGoalsForBar(17, neutral);
  out.push({
    ok:
      g16 !== undefined &&
      g17 !== undefined &&
      g16.motifTreatment === 'return' &&
      g17.motifTreatment === 'development',
    name: 'macroForm: motifTreatment flips across B boundary (bar 16 A′ → bar 17 B)',
  });

  return out;
}
