/**
 * Composer OS V2 — Stage 2 Musical Core tests
 */

import { planSectionRoles } from '../core/section-roles/sectionRolePlanner';
import { validateSectionRoles } from '../core/section-roles/sectionRoleValidation';
import { planGuitarRegisterMap, planBassRegisterMap } from '../core/register-map/registerMapPlanner';
import { validateRegisterMap } from '../core/register-map/registerMapValidation';
import { planDensityCurve, getDensityForBar } from '../core/density/densityCurvePlanner';
import { validateDensityCurve } from '../core/density/densityCurveValidation';
import { planGuitarBehaviour } from '../core/instrument-behaviours/guitarBehaviour';
import { planBassBehaviour } from '../core/instrument-behaviours/uprightBassBehaviour';
import { validateGuitarBehaviour, validateBassBehaviour } from '../core/instrument-behaviours/behaviourValidation';
import { validateRhythmBehaviour } from '../core/rhythm-engine/rhythmBehaviourValidation';
import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import { computeRhythmicConstraints } from '../core/rhythm-engine/rhythmEngine';
import { createMeasure, createNote, addEvent, createScore } from '../core/score-model/scoreEventBuilder';

function testSectionRolePlanning(): boolean {
  const sections = planSectionRoles(
    [{ label: 'A', startBar: 1, length: 4 }, { label: 'B', startBar: 5, length: 4 }],
    { A: 'statement', B: 'contrast' }
  );
  return sections[0].role === 'statement' && sections[1].role === 'contrast';
}

function testSectionRoleValidation(): boolean {
  const sections = planSectionRoles([{ label: 'A', startBar: 1, length: 4 }], { A: 'statement' });
  const r = validateSectionRoles(sections);
  return r.valid;
}

function testRegisterMapPlanning(): boolean {
  const sections = planSectionRoles([{ label: 'A', startBar: 1, length: 4 }], { A: 'statement' });
  const g = planGuitarRegisterMap(sections);
  const b = planBassRegisterMap(sections);
  return g.instrumentIdentity === 'clean_electric_guitar' && b.instrumentIdentity === 'acoustic_upright_bass';
}

function testRegisterMapValidation(): boolean {
  const sections = planSectionRoles([{ label: 'A', startBar: 1, length: 4 }], { A: 'statement' });
  const g = planGuitarRegisterMap(sections);
  return validateRegisterMap(g).valid;
}

function testDensityCurvePlanning(): boolean {
  const sections = planSectionRoles(
    [{ label: 'A', startBar: 1, length: 4 }, { label: 'B', startBar: 5, length: 4 }],
    { A: 'statement', B: 'contrast' }
  );
  const plan = planDensityCurve(sections, 8);
  return getDensityForBar(plan, 1) === 'sparse' && getDensityForBar(plan, 5) === 'medium';
}

function testDensityValidation(): boolean {
  const sections = planSectionRoles([{ label: 'A', startBar: 1, length: 4 }], { A: 'statement' });
  const plan = planDensityCurve(sections, 4);
  return validateDensityCurve(plan, sections).valid;
}

function testGuitarBehaviourPlanning(): boolean {
  const sections = planSectionRoles(
    [{ label: 'A', startBar: 1, length: 4 }, { label: 'B', startBar: 5, length: 4 }],
    { A: 'statement', B: 'contrast' }
  );
  const densityPlan = planDensityCurve(sections, 8);
  const guitarMap = planGuitarRegisterMap(sections);
  const plan = planGuitarBehaviour(sections, densityPlan, guitarMap);
  const firstBar = plan.perBar[0];
  return firstBar.textureMix.some((t) => t.type === 'melody') && firstBar.textureMix.some((t) => t.type === 'dyad');
}

function testBassBehaviourPlanning(): boolean {
  const sections = planSectionRoles([{ label: 'A', startBar: 1, length: 4 }], { A: 'statement' });
  const densityPlan = planDensityCurve(sections, 4);
  const bassMap = planBassRegisterMap(sections);
  const plan = planBassBehaviour(sections, densityPlan, bassMap);
  return plan.perBar.every((b) => b.harmonicAnchor);
}

function testGuitarBehaviourValidation(): boolean {
  const m = createMeasure(1, 'Cmaj7');
  addEvent(m, createNote(60, 0, 2));
  addEvent(m, createNote(62, 2, 2));
  const score = createScore('Test', [{
    id: 'guitar',
    name: 'Guitar',
    instrumentIdentity: 'clean_electric_guitar',
    midiProgram: 27,
    clef: 'treble',
    measures: [m],
  }]);
  const sections = planSectionRoles([{ label: 'A', startBar: 1, length: 1 }], { A: 'statement' });
  const densityPlan = planDensityCurve(sections, 1);
  const guitarMap = planGuitarRegisterMap(sections);
  const plan = planGuitarBehaviour(sections, densityPlan, guitarMap);
  const r = validateGuitarBehaviour(score, plan);
  return r.valid;
}

function testBassBehaviourValidation(): boolean {
  const m = createMeasure(1, 'Cmaj7');
  addEvent(m, createNote(40, 0, 1));
  addEvent(m, createNote(47, 1, 1));
  addEvent(m, createNote(40, 2, 1));
  addEvent(m, createNote(43, 3, 1));
  const score = createScore('Test', [{
    id: 'bass',
    name: 'Bass',
    instrumentIdentity: 'acoustic_upright_bass',
    midiProgram: 43,
    clef: 'bass',
    measures: [m],
  }]);
  const sections = planSectionRoles([{ label: 'A', startBar: 1, length: 1 }], { A: 'statement' });
  const densityPlan = planDensityCurve(sections, 1);
  const bassMap = planBassRegisterMap(sections);
  const plan = planBassBehaviour(sections, densityPlan, bassMap);
  const r = validateBassBehaviour(score, plan);
  return r.valid;
}

function testRhythmBehaviourValidation(): boolean {
  const m = createMeasure(1);
  addEvent(m, createNote(60, 0, 2));
  addEvent(m, createNote(62, 2, 2));
  const score = createScore('Test', [{ id: 'p1', name: 'P1', instrumentIdentity: 'guitar', midiProgram: 27, clef: 'treble', measures: [m] }]);
  const constraints = computeRhythmicConstraints({ mode: 'swing', intensity: 0.5, syncopationDensity: 'medium' });
  const r = validateRhythmBehaviour(score, constraints);
  return r.valid;
}

function testGoldenPathBehaviourGatesPassed(): boolean {
  const r = runGoldenPath(99);
  return r.behaviourGatesPassed;
}

function testGoldenPathPlansPresent(): boolean {
  const r = runGoldenPath(100);
  return !!r.plans?.sections?.length && !!r.plans?.guitarMap && !!r.plans?.densityPlan;
}

export function runStage2MusicalCoreTests(): { name: string; ok: boolean }[] {
  return [
    ['Section role planning', testSectionRolePlanning],
    ['Section role validation', testSectionRoleValidation],
    ['Register map planning', testRegisterMapPlanning],
    ['Register map validation', testRegisterMapValidation],
    ['Density curve planning', testDensityCurvePlanning],
    ['Density validation', testDensityValidation],
    ['Guitar behaviour planning', testGuitarBehaviourPlanning],
    ['Bass behaviour planning', testBassBehaviourPlanning],
    ['Guitar behaviour validation', testGuitarBehaviourValidation],
    ['Bass behaviour validation', testBassBehaviourValidation],
    ['Rhythm behaviour validation', testRhythmBehaviourValidation],
    ['Golden path behaviour gates passed', testGoldenPathBehaviourGatesPassed],
    ['Golden path plans present', testGoldenPathPlansPresent],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
