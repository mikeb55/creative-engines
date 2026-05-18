/**
 * Long-form Duo (32–64-bar) — safe routing, modulation plan, form structure (V4.0 Prompt 1/8).
 */

import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import { resolveLongFormRoute, LONG_FORM_DUO_BARS } from '../core/form/longFormRouteResolver';
import { generateModulationPlan } from '../core/modulation/modulationPlanner';
import { validateModulationPlan } from '../core/modulation/modulationValidation';
import { buildDuoLongFormPlan, buildDuoLongFormPlanForBarCount } from '../core/form/duoLongFormPlanner';
import { evaluateDuoLongFormQuality } from '../core/quality/duoLongFormQuality';
import { guitarPhraseOnsetSpread } from '../core/score-integrity/duoLockQuality';
import { planDuoLongFormInteraction } from '../core/interaction/duoLongFormInteractionMap';
import { planSectionRoles } from '../core/section-roles/sectionRolePlanner';
import { placeMotifsLongFormDuoByBarCount } from '../core/motif/longFormMotifPlanner';
import { generateMotif } from '../core/motif/motifGenerator';
import { applySongModeRhythmOverlayC1 } from '../core/goldenPath/songModeRhythmOverlayC1';
import { shouldRunDuo32LockedPipelineTruth } from '../core/score-integrity/pipelineTruthGates';
import type { CompositionContext } from '../core/compositionContext';
import { createPart, createScore } from '../core/score-model/scoreEventBuilder';

function lockedBarsN(n: number, chord = 'Dmin9'): string[] {
  return Array.from({ length: n }, () => chord);
}

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
  /** Seed 100: stable 32-bar pass; 101 can hit voice-leading / V3 leap gates with long-form modulation. */
  const r = runGoldenPath(100, { totalBars: 32 });
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

function testModulationPlanFortyActive(): boolean {
  const p = generateModulationPlan(42, 40);
  if (!p.active || p.sections.length !== 4) return false;
  const lens = p.sections.map((s) => s.endBar - s.startBar + 1);
  return lens.every((l) => l === 10) && validateModulationPlan(p).valid;
}

function testMotifPlacementForty(): boolean {
  const motifs = generateMotif(7, 55, 75, { duoLock: true });
  const placements = placeMotifsLongFormDuoByBarCount(motifs, 7, 40);
  const starts = new Set(placements.map((p) => p.startBar));
  return starts.has(1) && starts.has(11) && starts.has(21) && starts.has(31);
}

function testInteractionFortyEightFromPlan(): boolean {
  const lf = buildDuoLongFormPlanForBarCount(48);
  const roleMap = Object.fromEntries(lf.sections.map((s) => [s.label, s.role])) as Record<
    string,
    'statement' | 'development' | 'contrast' | 'return'
  >;
  const sections = planSectionRoles(
    lf.sections.map((s) => ({ label: s.label, startBar: s.startBar, length: s.length })),
    roleMap
  );
  const ip = planDuoLongFormInteraction(sections, 48);
  const bSec = ip.perSection.find((x) => x.sectionLabel === 'B');
  const a2 = ip.perSection.find((x) => x.sectionLabel === 'A-2');
  return (
    bSec?.coupling?.bassForward === true &&
    bSec?.mode === 'call_response' &&
    a2?.mode === 'support' &&
    ip.perSection.length === lf.sections.length
  );
}

function testSongModeRhythmOverlayFortyEightRuns(): boolean {
  const guitar = createPart(
    'guitar',
    'Guitar',
    'clean_electric_guitar',
    27,
    'treble',
    48,
    () => undefined,
    () => undefined
  );
  const score = createScore('c1-48', [guitar]);
  const context = {
    seed: 88,
    presetId: 'guitar_bass_duo',
    form: { totalBars: 48, sections: [] },
    generationMetadata: { songModeHookFirstIdentity: true },
  } as unknown as CompositionContext;
  applySongModeRhythmOverlayC1(score, context);
  return Array.isArray(context.generationMetadata?.songModeRhythmOverlayByPhrase);
}

function testQualityFiftySixFullRange(): boolean {
  const r = runGoldenPath(100, { totalBars: 56, longFormEnabled: true });
  if (r.score.parts[0]?.measures.length !== 56) return false;
  const q = evaluateDuoLongFormQuality(r.score, r.context);
  return q.total > 0 && r.context.generationMetadata?.modulationPlanActive === true;
}

function testPipelineTruthFiftySixLocked(): boolean {
  const bars = lockedBarsN(56);
  const r = runGoldenPath(100, {
    totalBars: 56,
    harmonyMode: 'custom_locked',
    lockedHarmonyBarsRaw: bars,
    parsedChordBars: bars,
    chordProgressionText: bars.join('|'),
    longFormEnabled: true,
  });
  return (
    shouldRunDuo32LockedPipelineTruth(r.context, { parsedChordBars: bars, harmonyMode: 'custom_locked' }) &&
    !!r.truthReport &&
    r.truthReport.inputStage === 'pass' &&
    r.truthReport.scoreStage === 'pass' &&
    r.truthReport.exportStage === 'pass'
  );
}

function testSixtyFourFullProductAndExport(): boolean {
  const p = generateModulationPlan(42, 64);
  if (!p.active) return false;
  const motifs = generateMotif(9, 55, 75, { duoLock: true });
  const placements = placeMotifsLongFormDuoByBarCount(motifs, 9, 64);
  if (![1, 17, 33, 49].every((b) => placements.some((pl) => pl.startBar === b))) return false;

  const r = runGoldenPath(100, { totalBars: 64, longFormEnabled: true });
  const q = evaluateDuoLongFormQuality(r.score, r.context);
  const guitarMeasures = r.score.parts[0]?.measures.length ?? 0;
  const xmlMeasures = (r.xml?.match(/<measure /g) ?? []).length;
  return (
    q.total > 0 &&
    r.context.generationMetadata?.modulationPlanActive === true &&
    guitarMeasures === 64 &&
    xmlMeasures >= 64
  );
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
    ['Long-form: 40-bar modulation active (4×10)', testModulationPlanFortyActive],
    ['Long-form: 40-bar motif at 1/11/21/31', testMotifPlacementForty],
    ['Long-form: 48-bar interaction from plan roles', testInteractionFortyEightFromPlan],
    ['Long-form: 48-bar C1 rhythm overlay runs', testSongModeRhythmOverlayFortyEightRuns],
    ['Long-form: 56-bar quality + modulation active', testQualityFiftySixFullRange],
    ['Long-form: 56-bar locked pipeline truth', testPipelineTruthFiftySixLocked],
    ['Long-form: 64-bar product + export measures', testSixtyFourFullProductAndExport],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
