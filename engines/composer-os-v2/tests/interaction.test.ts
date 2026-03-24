/**
 * Composer OS V2 — Interaction layer tests
 */

import { planInteraction, getInteractionForBar } from '../core/interaction/interactionPlanner';
import { validateInteractionIntegrity, validateRegisterSeparation } from '../core/interaction/interactionValidation';
import { planSectionRoles } from '../core/section-roles/sectionRolePlanner';
import { createMeasure, createNote, addEvent, createScore } from '../core/score-model/scoreEventBuilder';
import { runGoldenPath } from '../core/goldenPath/runGoldenPath';

function testInteractionModes(): boolean {
  const sections = planSectionRoles(
    [{ label: 'A', startBar: 1, length: 4 }, { label: 'B', startBar: 5, length: 4 }],
    { A: 'statement', B: 'contrast' }
  );
  const plan = planInteraction(sections, 8);
  const aMode = plan.perSection.find((s) => s.sectionLabel === 'A')?.mode;
  const bMode = plan.perSection.find((s) => s.sectionLabel === 'B')?.mode;
  return aMode === 'support' && bMode === 'call_response';
}

function testGetInteractionForBar(): boolean {
  const sections = planSectionRoles([{ label: 'A', startBar: 1, length: 4 }], { A: 'statement' });
  const plan = planInteraction(sections, 4);
  const forBar1 = getInteractionForBar(plan, 1);
  const forBar5 = getInteractionForBar(plan, 5);
  return forBar1?.mode === 'support' && forBar5 === undefined;
}

function testRegisterSeparationEnforcement(): boolean {
  const r = runGoldenPath(50);
  const guitar = r.score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const bass = r.score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (!guitar || !bass) return false;
  for (let bar = 1; bar <= 8; bar++) {
    const gPitches = guitar.measures.find((m) => m.index === bar)?.events
      .filter((e) => e.kind === 'note').map((e) => (e as { pitch: number }).pitch) ?? [];
    const bPitches = bass.measures.find((m) => m.index === bar)?.events
      .filter((e) => e.kind === 'note').map((e) => (e as { pitch: number }).pitch) ?? [];
    if (gPitches.length > 0 && bPitches.length > 0) {
      const gLow = Math.min(...gPitches);
      const bHigh = Math.max(...bPitches);
      if (gLow - bHigh < 5) return false;
    }
  }
  return true;
}

function testBehaviourCouplingInPlan(): boolean {
  const sections = planSectionRoles(
    [{ label: 'A', startBar: 1, length: 4 }, { label: 'B', startBar: 5, length: 4 }],
    { A: 'statement', B: 'contrast' }
  );
  const plan = planInteraction(sections, 8);
  const bSection = plan.perSection.find((s) => s.sectionLabel === 'B');
  return bSection?.coupling?.guitarReduceAttack === true && bSection?.coupling?.bassSimplify !== true;
}

function testInteractionValidationPasses(): boolean {
  const r = runGoldenPath(51);
  return r.behaviourGatesPassed;
}

function testNegativeSameRegisterFails(): boolean {
  const g1 = createMeasure(1, 'Cmaj7');
  addEvent(g1, createNote(55, 0, 2));
  addEvent(g1, createNote(57, 2, 2));
  const b1 = createMeasure(1, 'Cmaj7');
  addEvent(b1, createNote(55, 0, 1));
  addEvent(b1, createNote(52, 1, 1));
  addEvent(b1, createNote(55, 2, 1));
  addEvent(b1, createNote(48, 3, 1));
  const score = createScore('Test', [{
    id: 'guitar',
    name: 'Guitar',
    instrumentIdentity: 'clean_electric_guitar',
    midiProgram: 27,
    clef: 'treble',
    measures: [g1],
  }, {
    id: 'bass',
    name: 'Bass',
    instrumentIdentity: 'acoustic_upright_bass',
    midiProgram: 32,
    clef: 'bass',
    measures: [b1],
  }]);
  const plan = planInteraction(
    planSectionRoles([{ label: 'A', startBar: 1, length: 1 }], { A: 'statement' }),
    1
  );
  const rs = validateRegisterSeparation(score, plan);
  return !rs.valid;
}

function testGoldenPathHasInteractionPlan(): boolean {
  const r = runGoldenPath(52);
  return !!r.plans?.interactionPlan?.perSection?.length;
}

export function runInteractionTests(): { name: string; ok: boolean }[] {
  return [
    ['Interaction modes: A support, B call_response', testInteractionModes],
    ['getInteractionForBar returns correct section', testGetInteractionForBar],
    ['Register separation enforced in output', testRegisterSeparationEnforcement],
    ['Behaviour coupling in plan for B', testBehaviourCouplingInPlan],
    ['Interaction validation passes', testInteractionValidationPasses],
    ['Negative: same register fails', testNegativeSameRegisterFails],
    ['Golden path has interaction plan', testGoldenPathHasInteractionPlan],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
