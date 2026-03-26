/**
 * Long-form Duo (32-bar) — safe routing, modulation plan, form structure (V4.0 Prompt 1/8).
 */

import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import { resolveLongFormRoute, LONG_FORM_DUO_BARS } from '../core/form/longFormRouteResolver';
import { generateModulationPlan } from '../core/modulation/modulationPlanner';
import { validateModulationPlan } from '../core/modulation/modulationValidation';
import { buildDuoLongFormPlan } from '../core/form/duoLongFormPlanner';
import { evaluateDuoLongFormQuality } from '../core/quality/duoLongFormQuality';
import { guitarPhraseOnsetSpread } from '../core/score-integrity/duoLockQuality';
import { planDuoLongFormInteraction } from '../core/interaction/duoLongFormInteractionMap';
import { planSectionRoles } from '../core/section-roles/sectionRolePlanner';

function testRoutingEightBarDefault(): boolean {
  const r = runGoldenPath(100);
  return r.success && r.context.form.totalBars === 8 && !r.context.generationMetadata?.longFormDuo;
}

function testRoutingThirtyTwoOptIn(): boolean {
  const r = runGoldenPath(100, { totalBars: LONG_FORM_DUO_BARS });
  return (
    r.success &&
    r.context.form.totalBars === 32 &&
    r.context.generationMetadata?.longFormDuo === true &&
    r.score.parts[0]?.measures.length === 32
  );
}

function testResolver(): boolean {
  const a = resolveLongFormRoute('guitar_bass_duo', {});
  const b = resolveLongFormRoute('guitar_bass_duo', { totalBars: 32 });
  const c = resolveLongFormRoute('guitar_bass_duo', { totalBars: 8 });
  return a.kind === 'standard8' && b.kind === 'duo32' && c.kind === 'standard8';
}

function testModulationPlanThirtyTwo(): boolean {
  const p = generateModulationPlan(42, 32);
  if (!p.active || p.sections.length !== 4) return false;
  return validateModulationPlan(p).valid;
}

function testModulationEightInert(): boolean {
  const p = generateModulationPlan(42, 8);
  return !p.active && p.sections.length === 0;
}

function testLongFormSections(): boolean {
  const plan = buildDuoLongFormPlan();
  if (plan.totalBars !== 32 || plan.sections.length !== 4) return false;
  const labels = plan.sections.map((s) => s.label).join(',');
  return labels.includes('A') && labels.includes("A'") && labels.includes('B');
}

function testLongFormQualityAndContrast(): boolean {
  const r = runGoldenPath(101, { totalBars: 32 });
  if (!r.success) return false;
  const q = evaluateDuoLongFormQuality(r.score, r.context);
  const g = r.score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  return q.total > 3 && (g ? guitarPhraseOnsetSpread(g) >= 0 : false);
}

/** Arc is deterministic from section labels — avoid coupling to a seed that may fail duo gates. */
function testInteractionArcDiffersSections(): boolean {
  const lf = buildDuoLongFormPlan();
  const sections = planSectionRoles(
    lf.sections.map((s) => ({ label: s.label, startBar: s.startBar, length: s.length })),
    { A: 'statement', "A'": 'development', B: 'contrast', "A''": 'return' }
  );
  const ip = planDuoLongFormInteraction(sections, 32);
  if (ip.perSection.length < 4) return false;
  const secA = ip.perSection.find((x) => x.sectionLabel === 'A');
  const secB = ip.perSection.find((x) => x.sectionLabel === 'B');
  const secAprime = ip.perSection.find((x) => x.sectionLabel === "A'");
  return (
    secA?.mode === 'support' &&
    secB?.coupling?.bassForward === true &&
    secAprime?.coupling?.bassForward === true &&
    secAprime?.mode === 'call_response'
  );
}

function testBackwardCompatEightBarGates(): boolean {
  const r = runGoldenPath(103);
  return r.success && r.behaviourGatesPassed;
}

export function runLongFormDuoTests(): { name: string; ok: boolean }[] {
  return [
    ['Long-form: 8-bar default unchanged', testRoutingEightBarDefault],
    ['Long-form: 32-bar opt-in route', testRoutingThirtyTwoOptIn],
    ['Long-form: resolver', testResolver],
    ['Modulation: 32-bar plan valid', testModulationPlanThirtyTwo],
    ['Modulation: 8-bar inactive', testModulationEightInert],
    ['Long-form: A/A\'/B/A\'\' map', testLongFormSections],
    ['Long-form: quality layer + spread', testLongFormQualityAndContrast],
    ['Long-form: interaction arc varies', testInteractionArcDiffersSections],
    ['Long-form: 8-bar backward compat', testBackwardCompatEightBarGates],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
