"use strict";
/**
 * Composer OS V2 — Stage 2 Musical Core tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runStage2MusicalCoreTests = runStage2MusicalCoreTests;
const sectionRolePlanner_1 = require("../core/section-roles/sectionRolePlanner");
const sectionRoleValidation_1 = require("../core/section-roles/sectionRoleValidation");
const registerMapPlanner_1 = require("../core/register-map/registerMapPlanner");
const registerMapValidation_1 = require("../core/register-map/registerMapValidation");
const densityCurvePlanner_1 = require("../core/density/densityCurvePlanner");
const densityCurveValidation_1 = require("../core/density/densityCurveValidation");
const guitarBehaviour_1 = require("../core/instrument-behaviours/guitarBehaviour");
const uprightBassBehaviour_1 = require("../core/instrument-behaviours/uprightBassBehaviour");
const behaviourValidation_1 = require("../core/instrument-behaviours/behaviourValidation");
const rhythmBehaviourValidation_1 = require("../core/rhythm-engine/rhythmBehaviourValidation");
const runGoldenPath_1 = require("../core/goldenPath/runGoldenPath");
const rhythmEngine_1 = require("../core/rhythm-engine/rhythmEngine");
const scoreEventBuilder_1 = require("../core/score-model/scoreEventBuilder");
function testSectionRolePlanning() {
    const sections = (0, sectionRolePlanner_1.planSectionRoles)([{ label: 'A', startBar: 1, length: 4 }, { label: 'B', startBar: 5, length: 4 }], { A: 'statement', B: 'contrast' });
    return sections[0].role === 'statement' && sections[1].role === 'contrast';
}
function testSectionRoleValidation() {
    const sections = (0, sectionRolePlanner_1.planSectionRoles)([{ label: 'A', startBar: 1, length: 4 }], { A: 'statement' });
    const r = (0, sectionRoleValidation_1.validateSectionRoles)(sections);
    return r.valid;
}
function testRegisterMapPlanning() {
    const sections = (0, sectionRolePlanner_1.planSectionRoles)([{ label: 'A', startBar: 1, length: 4 }], { A: 'statement' });
    const g = (0, registerMapPlanner_1.planGuitarRegisterMap)(sections);
    const b = (0, registerMapPlanner_1.planBassRegisterMap)(sections);
    return g.instrumentIdentity === 'clean_electric_guitar' && b.instrumentIdentity === 'acoustic_upright_bass';
}
function testRegisterMapValidation() {
    const sections = (0, sectionRolePlanner_1.planSectionRoles)([{ label: 'A', startBar: 1, length: 4 }], { A: 'statement' });
    const g = (0, registerMapPlanner_1.planGuitarRegisterMap)(sections);
    return (0, registerMapValidation_1.validateRegisterMap)(g).valid;
}
function testDensityCurvePlanning() {
    const sections = (0, sectionRolePlanner_1.planSectionRoles)([{ label: 'A', startBar: 1, length: 4 }, { label: 'B', startBar: 5, length: 4 }], { A: 'statement', B: 'contrast' });
    const plan = (0, densityCurvePlanner_1.planDensityCurve)(sections, 8);
    return (0, densityCurvePlanner_1.getDensityForBar)(plan, 1) === 'sparse' && (0, densityCurvePlanner_1.getDensityForBar)(plan, 5) === 'medium';
}
function testDensityValidation() {
    const sections = (0, sectionRolePlanner_1.planSectionRoles)([{ label: 'A', startBar: 1, length: 4 }], { A: 'statement' });
    const plan = (0, densityCurvePlanner_1.planDensityCurve)(sections, 4);
    return (0, densityCurveValidation_1.validateDensityCurve)(plan, sections).valid;
}
function testGuitarBehaviourPlanning() {
    const sections = (0, sectionRolePlanner_1.planSectionRoles)([{ label: 'A', startBar: 1, length: 4 }, { label: 'B', startBar: 5, length: 4 }], { A: 'statement', B: 'contrast' });
    const densityPlan = (0, densityCurvePlanner_1.planDensityCurve)(sections, 8);
    const guitarMap = (0, registerMapPlanner_1.planGuitarRegisterMap)(sections);
    const plan = (0, guitarBehaviour_1.planGuitarBehaviour)(sections, densityPlan, guitarMap);
    const firstBar = plan.perBar[0];
    return firstBar.textureMix.some((t) => t.type === 'melody') && firstBar.textureMix.some((t) => t.type === 'dyad');
}
function testBassBehaviourPlanning() {
    const sections = (0, sectionRolePlanner_1.planSectionRoles)([{ label: 'A', startBar: 1, length: 4 }], { A: 'statement' });
    const densityPlan = (0, densityCurvePlanner_1.planDensityCurve)(sections, 4);
    const bassMap = (0, registerMapPlanner_1.planBassRegisterMap)(sections);
    const plan = (0, uprightBassBehaviour_1.planBassBehaviour)(sections, densityPlan, bassMap);
    return plan.perBar.every((b) => b.harmonicAnchor);
}
function testGuitarBehaviourValidation() {
    const m = (0, scoreEventBuilder_1.createMeasure)(1, 'Cmaj7');
    (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(60, 0, 2));
    (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(62, 2, 2));
    const score = (0, scoreEventBuilder_1.createScore)('Test', [{
            id: 'guitar',
            name: 'Guitar',
            instrumentIdentity: 'clean_electric_guitar',
            midiProgram: 27,
            clef: 'treble',
            measures: [m],
        }]);
    const sections = (0, sectionRolePlanner_1.planSectionRoles)([{ label: 'A', startBar: 1, length: 1 }], { A: 'statement' });
    const densityPlan = (0, densityCurvePlanner_1.planDensityCurve)(sections, 1);
    const guitarMap = (0, registerMapPlanner_1.planGuitarRegisterMap)(sections);
    const plan = (0, guitarBehaviour_1.planGuitarBehaviour)(sections, densityPlan, guitarMap);
    const r = (0, behaviourValidation_1.validateGuitarBehaviour)(score, plan);
    return r.valid;
}
function testBassBehaviourValidation() {
    const m = (0, scoreEventBuilder_1.createMeasure)(1, 'Cmaj7');
    (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(40, 0, 1));
    (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(47, 1, 1));
    (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(40, 2, 1));
    (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(43, 3, 1));
    const score = (0, scoreEventBuilder_1.createScore)('Test', [{
            id: 'bass',
            name: 'Bass',
            instrumentIdentity: 'acoustic_upright_bass',
            midiProgram: 32,
            clef: 'bass',
            measures: [m],
        }]);
    const sections = (0, sectionRolePlanner_1.planSectionRoles)([{ label: 'A', startBar: 1, length: 1 }], { A: 'statement' });
    const densityPlan = (0, densityCurvePlanner_1.planDensityCurve)(sections, 1);
    const bassMap = (0, registerMapPlanner_1.planBassRegisterMap)(sections);
    const plan = (0, uprightBassBehaviour_1.planBassBehaviour)(sections, densityPlan, bassMap);
    const r = (0, behaviourValidation_1.validateBassBehaviour)(score, plan);
    return r.valid;
}
function testRhythmBehaviourValidation() {
    const m = (0, scoreEventBuilder_1.createMeasure)(1);
    (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(60, 0, 2));
    (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(62, 2, 2));
    const score = (0, scoreEventBuilder_1.createScore)('Test', [{ id: 'p1', name: 'P1', instrumentIdentity: 'guitar', midiProgram: 27, clef: 'treble', measures: [m] }]);
    const constraints = (0, rhythmEngine_1.computeRhythmicConstraints)({ mode: 'swing', intensity: 0.5, syncopationDensity: 'medium' });
    const r = (0, rhythmBehaviourValidation_1.validateRhythmBehaviour)(score, constraints);
    return r.valid;
}
function testGoldenPathBehaviourGatesPassed() {
    const r = (0, runGoldenPath_1.runGoldenPath)(99);
    return r.behaviourGatesPassed;
}
function testGoldenPathPlansPresent() {
    const r = (0, runGoldenPath_1.runGoldenPath)(100);
    return !!r.plans?.sections?.length && !!r.plans?.guitarMap && !!r.plans?.densityPlan;
}
function runStage2MusicalCoreTests() {
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
    ].map(([name, fn]) => ({ name: name, ok: fn() }));
}
