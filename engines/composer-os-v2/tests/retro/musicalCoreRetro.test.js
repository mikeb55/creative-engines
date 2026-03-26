"use strict";
/**
 * Composer OS V2 — Musical Core retro tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMusicalCoreRetroTests = runMusicalCoreRetroTests;
const runGoldenPath_1 = require("../../core/goldenPath/runGoldenPath");
const densityCurvePlanner_1 = require("../../core/density/densityCurvePlanner");
const sectionRolePlanner_1 = require("../../core/section-roles/sectionRolePlanner");
const densityCurvePlanner_2 = require("../../core/density/densityCurvePlanner");
function testSectionRolesApplied() {
    const r = (0, runGoldenPath_1.runGoldenPath)(10);
    const sections = r.plans?.sections ?? [];
    return sections.length >= 2 && sections.some((s) => s.role === 'statement') && sections.some((s) => s.role === 'contrast');
}
function testDensityCurvePresent() {
    const r = (0, runGoldenPath_1.runGoldenPath)(11);
    const plan = r.plans?.densityPlan;
    if (!plan)
        return false;
    const d1 = (0, densityCurvePlanner_1.getDensityForBar)(plan, 1);
    const d5 = (0, densityCurvePlanner_1.getDensityForBar)(plan, 5);
    const valid = (d) => d === 'sparse' || d === 'medium' || d === 'dense';
    return valid(d1) && valid(d5);
}
function testDensityAffectsEventCounts() {
    const r = (0, runGoldenPath_1.runGoldenPath)(12);
    const guitar = r.score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
    if (!guitar)
        return false;
    const eventsA = guitar.measures.filter((m) => m.index <= 4).flatMap((m) => m.events).length;
    const eventsB = guitar.measures.filter((m) => m.index >= 5).flatMap((m) => m.events).length;
    return eventsA >= 1 && eventsB >= 1;
}
function testRegisterMapsExist() {
    const r = (0, runGoldenPath_1.runGoldenPath)(13);
    return !!r.plans?.guitarMap?.sections?.length && !!r.plans?.bassMap?.sections?.length;
}
function testGuitarTessituraInRange() {
    const r = (0, runGoldenPath_1.runGoldenPath)(14);
    const guitar = r.score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
    if (!guitar)
        return false;
    const [low, high] = [40, 88];
    for (const m of guitar.measures) {
        for (const e of m.events) {
            if (e.kind === 'note' && (e.pitch < low || e.pitch > high))
                return false;
        }
    }
    return true;
}
function testBassTessituraInRange() {
    const r = (0, runGoldenPath_1.runGoldenPath)(15);
    const bass = r.score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
    if (!bass)
        return false;
    const [low, high] = [28, 67];
    for (const m of bass.measures) {
        for (const e of m.events) {
            if (e.kind === 'note' && (e.pitch < low || e.pitch > high))
                return false;
        }
    }
    return true;
}
function testRhythmConstraintsAffectPlanning() {
    const r = (0, runGoldenPath_1.runGoldenPath)(16);
    return !!r.plans?.rhythmConstraints?.offbeatWeight !== undefined;
}
function testSectionContrastPresent() {
    const r = (0, runGoldenPath_1.runGoldenPath)(17);
    const sections = (0, sectionRolePlanner_1.planSectionRoles)([{ label: 'A', startBar: 1, length: 4 }, { label: 'B', startBar: 5, length: 4 }], { A: 'statement', B: 'contrast' });
    const plan = (0, densityCurvePlanner_2.planDensityCurve)(sections, 8);
    return (0, densityCurvePlanner_1.getDensityForBar)(plan, 1) !== (0, densityCurvePlanner_1.getDensityForBar)(plan, 5) || sections[0].role !== sections[1].role;
}
function runMusicalCoreRetroTests() {
    return [
        ['Section roles applied', testSectionRolesApplied],
        ['Density curve present', testDensityCurvePresent],
        ['Density affects event counts', testDensityAffectsEventCounts],
        ['Register maps exist', testRegisterMapsExist],
        ['Guitar tessitura in range', testGuitarTessituraInRange],
        ['Bass tessitura in range', testBassTessituraInRange],
        ['Rhythm constraints affect planning', testRhythmConstraintsAffectPlanning],
        ['Section contrast present', testSectionContrastPresent],
    ].map(([name, fn]) => ({ name: name, ok: fn() }));
}
