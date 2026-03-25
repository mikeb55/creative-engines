"use strict";
/**
 * Composer OS V2 — Behaviour validation gates
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSectionContrast = validateSectionContrast;
exports.runBehaviourGates = runBehaviourGates;
const behaviourValidation_1 = require("../instrument-behaviours/behaviourValidation");
const rhythmBehaviourValidation_1 = require("../rhythm-engine/rhythmBehaviourValidation");
const densityCurvePlanner_1 = require("../density/densityCurvePlanner");
const motifValidation_1 = require("../motif/motifValidation");
const moduleValidation_1 = require("../style-modules/barry-harris/moduleValidation");
const moduleValidation_2 = require("../style-modules/metheny/moduleValidation");
const moduleValidation_3 = require("../style-modules/triad-pairs/moduleValidation");
const moduleValidation_4 = require("../style-modules/bacharach/moduleValidation");
const styleModuleTypes_1 = require("../style-modules/styleModuleTypes");
const interactionValidation_1 = require("../interaction/interactionValidation");
const duoMusicalQuality_1 = require("./duoMusicalQuality");
function validateSectionContrast(sections, densityPlan, score) {
    const errors = [];
    if (sections.length < 2)
        return { valid: true, errors: [] };
    const densityA = (0, densityCurvePlanner_1.getDensityForBar)(densityPlan, 1);
    const densityB = (0, densityCurvePlanner_1.getDensityForBar)(densityPlan, 5);
    if (densityA === densityB) {
        const guitarPitchesA = score.parts
            .find((p) => p.instrumentIdentity === 'clean_electric_guitar')
            ?.measures.filter((m) => m.index >= 1 && m.index <= 4)
            .flatMap((m) => m.events.filter((e) => e.kind === 'note').map((e) => e.pitch)) ?? [];
        const guitarPitchesB = score.parts
            .find((p) => p.instrumentIdentity === 'clean_electric_guitar')
            ?.measures.filter((m) => m.index >= 5 && m.index <= 8)
            .flatMap((m) => m.events.filter((e) => e.kind === 'note').map((e) => e.pitch)) ?? [];
        const avgA = guitarPitchesA.length ? guitarPitchesA.reduce((a, b) => a + b, 0) / guitarPitchesA.length : 0;
        const avgB = guitarPitchesB.length ? guitarPitchesB.reduce((a, b) => a + b, 0) / guitarPitchesB.length : 0;
        const eventCountA = score.parts.reduce((s, p) => s + p.measures.filter((m) => m.index <= 4).flatMap((m) => m.events).length, 0);
        const eventCountB = score.parts.reduce((s, p) => s + p.measures.filter((m) => m.index >= 5).flatMap((m) => m.events).length, 0);
        if (Math.abs(avgA - avgB) < 2 && Math.abs(eventCountA - eventCountB) < 4) {
            errors.push('Sections A and B lack meaningful contrast in density or register');
        }
    }
    return { valid: errors.length === 0, errors };
}
function validateStyleBlendIntegrity(stack) {
    const errors = [];
    const w = (0, styleModuleTypes_1.normalizeStyleWeights)(stack);
    if (w.primary <= 0)
        errors.push('Style stack primary weight must be > 0');
    if (w.primary + w.secondary + w.colour < 0.01)
        errors.push('Style stack has no effective influence');
    return { valid: errors.length === 0, errors };
}
function runBehaviourGates(score, rhythmConstraints, guitarPlan, bassPlan, sections, densityPlan, opts) {
    const errors = [];
    const styleStack = opts?.styleStack;
    const styleModules = styleStack
        ? [styleStack.primary, styleStack.secondary, styleStack.colour].filter(Boolean)
        : [];
    const rhythm = (0, rhythmBehaviourValidation_1.validateRhythmBehaviour)(score, rhythmConstraints);
    if (!rhythm.valid)
        errors.push(...rhythm.errors);
    const guitar = (0, behaviourValidation_1.validateGuitarBehaviour)(score, guitarPlan);
    if (!guitar.valid)
        errors.push(...guitar.errors);
    const bass = (0, behaviourValidation_1.validateBassBehaviour)(score, bassPlan);
    if (!bass.valid)
        errors.push(...bass.errors);
    const contrast = validateSectionContrast(sections, densityPlan, score);
    if (!contrast.valid)
        errors.push(...contrast.errors);
    let motifValid = true;
    if (opts?.motifState) {
        const motif = (0, motifValidation_1.validateMotifIntegrity)(opts.motifState, score);
        motifValid = motif.valid;
        if (!motif.valid)
            errors.push(...motif.errors);
    }
    let styleBlendValid = true;
    let styleValid = true;
    if (styleStack) {
        const blend = validateStyleBlendIntegrity(styleStack);
        styleBlendValid = blend.valid;
        if (!blend.valid)
            errors.push(...blend.errors);
        if (styleModules.includes('barry_harris')) {
            const style = (0, moduleValidation_1.validateBarryHarrisConformance)(score);
            styleValid = style.valid;
            if (!style.valid)
                errors.push(...style.errors);
        }
    }
    let triadPairValid = true;
    if (styleModules.includes('triad_pairs')) {
        const tp = (0, moduleValidation_3.validateTriadPairConformance)(score);
        triadPairValid = tp.valid;
        if (!tp.valid)
            errors.push(...tp.errors);
    }
    let methenyValid = true;
    if (styleModules.includes('metheny') && (opts === null || opts === void 0 ? void 0 : opts.presetId) !== 'ecm_chamber') {
        const metheny = (0, moduleValidation_2.validateMethenyConformance)(score);
        methenyValid = metheny.valid;
        if (!metheny.valid)
            errors.push(...metheny.errors);
    }
    let bacharachValid = true;
    if (styleModules.includes('bacharach')) {
        const bach = (0, moduleValidation_4.validateBacharachConformance)(score);
        bacharachValid = bach.valid;
        if (!bach.valid)
            errors.push(...bach.errors);
    }
    const duoMusical = (0, duoMusicalQuality_1.validateDuoMusicalQuality)(score, { styleStack });
    if (!duoMusical.valid)
        errors.push(...duoMusical.errors);
    const duoMusicalValid = duoMusical.valid;
    let interactionValid = true;
    let registerSeparationValid = true;
    if (opts?.interactionPlan) {
        const ia = (0, interactionValidation_1.validateInteractionIntegrity)(score, opts.interactionPlan);
        interactionValid = ia.valid;
        if (!ia.valid)
            errors.push(...ia.errors);
        const rs = (0, interactionValidation_1.validateRegisterSeparation)(score, opts.interactionPlan);
        registerSeparationValid = rs.valid;
        if (!rs.valid)
            errors.push(...rs.errors);
    }
    return {
        rhythmValid: rhythm.valid,
        guitarValid: guitar.valid,
        bassValid: bass.valid,
        sectionContrastValid: contrast.valid,
        motifValid,
        styleValid,
        styleBlendValid,
        triadPairValid,
        methenyValid,
        bacharachValid,
        duoMusicalValid,
        interactionValid,
        registerSeparationValid,
        allValid: errors.length === 0,
        errors,
    };
}
