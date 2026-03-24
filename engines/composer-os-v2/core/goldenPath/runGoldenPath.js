"use strict";
/**
 * Composer OS V2 — Golden path runner
 * preset → feel → section roles → density → register map → behaviours → score → integrity → export → validation → manifest
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runGoldenPath = runGoldenPath;
const guitarBassDuoPreset_1 = require("../../presets/guitarBassDuoPreset");
const generateGoldenPathDuoScore_1 = require("./generateGoldenPathDuoScore");
const sectionRolePlanner_1 = require("../section-roles/sectionRolePlanner");
const densityCurvePlanner_1 = require("../density/densityCurvePlanner");
const registerMapPlanner_1 = require("../register-map/registerMapPlanner");
const interactionPlanner_1 = require("../interaction/interactionPlanner");
const guitarBehaviour_1 = require("../instrument-behaviours/guitarBehaviour");
const uprightBassBehaviour_1 = require("../instrument-behaviours/uprightBassBehaviour");
const rhythmEngine_1 = require("../rhythm-engine/rhythmEngine");
const motifGenerator_1 = require("../motif/motifGenerator");
const styleModuleTypes_1 = require("../style-modules/styleModuleTypes");
const styleModuleRegistry_1 = require("../style-modules/styleModuleRegistry");
const motifTracker_1 = require("../motif/motifTracker");
const scoreIntegrityGate_1 = require("../score-integrity/scoreIntegrityGate");
const behaviourGates_1 = require("../score-integrity/behaviourGates");
const musicxmlExporter_1 = require("../export/musicxmlExporter");
const musicxmlValidation_1 = require("../export/musicxmlValidation");
const sibeliusSafeProfile_1 = require("../export/sibeliusSafeProfile");
const exportHardening_1 = require("../export/exportHardening");
const releaseReadinessGate_1 = require("../readiness/releaseReadinessGate");
const createRunManifest_1 = require("../run-ledger/createRunManifest");
const scoreModelValidation_1 = require("../score-model/scoreModelValidation");
const strictBarMath_1 = require("../score-integrity/strictBarMath");
const validateMusicXmlBarMath_1 = require("../export/validateMusicXmlBarMath");
const validateBassIdentityInMusicXml_1 = require("../export/validateBassIdentityInMusicXml");
const scoreTitleDefaults_1 = require("../../app-api/scoreTitleDefaults");
function buildGoldenPathContext(seed) {
    const preset = guitarBassDuoPreset_1.guitarBassDuoPreset;
    const feel = preset.defaultFeel;
    const sections = [
        { label: 'A', startBar: 1, length: 4 },
        { label: 'B', startBar: 5, length: 4 },
    ];
    const form = { sections, totalBars: 8 };
    const harmony = {
        segments: [
            { chord: 'Dmin9', bars: 2 },
            { chord: 'G13', bars: 2 },
            { chord: 'Cmaj9', bars: 2 },
            { chord: 'A7alt', bars: 2 },
        ],
        totalBars: 8,
    };
    const phrase = { segments: sections.map((s) => ({ ...s, density: undefined })), totalBars: 8 };
    const chordSymbolPlan = {
        segments: [
            { chord: 'Dmin9', startBar: 1, bars: 2 },
            { chord: 'G13', startBar: 3, bars: 2 },
            { chord: 'Cmaj9', startBar: 5, bars: 2 },
            { chord: 'A7alt', startBar: 7, bars: 2 },
        ],
        totalBars: 8,
    };
    const rehearsalMarkPlan = { marks: [{ label: 'A', bar: 1 }, { label: 'B', bar: 5 }] };
    const release = (0, releaseReadinessGate_1.runReleaseReadinessGate)({ validationPassed: true, exportValid: true, mxValid: true });
    const sectionRoles = (0, sectionRolePlanner_1.planSectionRoles)(sections, { A: 'statement', B: 'contrast' });
    const densityPlan = (0, densityCurvePlanner_1.planDensityCurve)(sectionRoles, 8);
    const densityCurve = { segments: densityPlan.segments, totalBars: 8 };
    const guitarMap = (0, registerMapPlanner_1.planGuitarRegisterMap)(sectionRoles);
    const bassMap = (0, registerMapPlanner_1.planBassRegisterMap)(sectionRoles);
    const register = {
        melody: [55, 79],
        bass: [36, 55],
        byInstrument: {
            clean_electric_guitar: guitarMap.sections[0]?.preferredZone ?? [55, 79],
            acoustic_upright_bass: bassMap.sections[0]?.preferredZone ?? [36, 55],
        },
    };
    return {
        systemVersion: '2.0.0',
        presetId: 'guitar_bass_duo',
        seed,
        form,
        feel,
        harmony,
        motif: { activeMotifs: [], variants: {} },
        phrase,
        register,
        density: densityCurve,
        instrumentProfiles: preset.instrumentProfiles,
        chordSymbolPlan,
        rehearsalMarkPlan,
        generationMetadata: { generatedAt: new Date().toISOString() },
        validation: { gates: [], passed: true },
        readiness: { release: release.release, mx: release.mx },
    };
}
function extractPitchByInstrument(score) {
    return score.parts.map((p) => {
        const pitches = [];
        for (const m of p.measures) {
            for (const e of m.events) {
                if (e.kind === 'note')
                    pitches.push(e.pitch);
            }
        }
        return { instrument: p.instrumentIdentity, pitches };
    });
}
const DEFAULT_STYLE_STACK = {
    primary: 'barry_harris',
    secondary: 'metheny',
    colour: 'triad_pairs',
    weights: { primary: 0.6, secondary: 0.25, colour: 0.15 },
};
function runGoldenPath(seed = 12345, options) {
    const errors = [];
    const context = buildGoldenPathContext(seed);
    const sections = (0, sectionRolePlanner_1.planSectionRoles)(context.form.sections, { A: 'statement', B: 'contrast' });
    const densityPlan = (0, densityCurvePlanner_1.planDensityCurve)(sections, 8);
    const guitarMap = (0, registerMapPlanner_1.planGuitarRegisterMap)(sections);
    const bassMap = (0, registerMapPlanner_1.planBassRegisterMap)(sections);
    const guitarBehaviour = (0, guitarBehaviour_1.planGuitarBehaviour)(sections, densityPlan, guitarMap);
    const bassBehaviour = (0, uprightBassBehaviour_1.planBassBehaviour)(sections, densityPlan, bassMap);
    const rhythmConstraints = (0, rhythmEngine_1.computeRhythmicConstraints)(context.feel);
    const [guitarReg] = guitarMap.sections[0]?.preferredZone ?? [55, 79];
    const styleStack = options?.styleStack ?? DEFAULT_STYLE_STACK;
    const manifestPresetId = options?.presetId ?? 'guitar_bass_duo';
    const scoreTitle = (0, scoreTitleDefaults_1.resolveScoreTitleForPreset)(manifestPresetId, options?.scoreTitle);
    const stackIds = (0, styleModuleTypes_1.styleStackToModuleIds)(styleStack);
    const motifHints = {
        triadPairs: stackIds.includes('triad_pairs'),
        metheny: stackIds.includes('metheny'),
        bacharach: stackIds.includes('bacharach'),
    };
    const baseMotifs = (0, motifGenerator_1.generateMotif)(seed, guitarReg, guitarReg + 20, motifHints);
    const placements = (0, motifTracker_1.placeMotifsAcrossBars)(baseMotifs, seed);
    const motifState = { baseMotifs, placements };
    const interactionPlan = (0, interactionPlanner_1.planInteraction)(sections, 8);
    const plans = {
        sections,
        guitarMap,
        bassMap,
        densityPlan,
        guitarBehaviour,
        bassBehaviour,
        rhythmConstraints,
        motifState,
        styleStack,
        interactionPlan,
        scoreTitle,
    };
    const appliedContext = styleStack ? (0, styleModuleRegistry_1.applyStyleStack)(context, styleStack) : context;
    const score = (0, generateGoldenPathDuoScore_1.generateGoldenPathDuoScore)(appliedContext, plans);
    const modelValidation = (0, scoreModelValidation_1.validateScoreModel)(score);
    if (!modelValidation.valid)
        errors.push(...modelValidation.errors);
    const strictBarMath = (0, strictBarMath_1.validateStrictBarMath)(score);
    if (!strictBarMath.valid)
        errors.push(...strictBarMath.errors);
    const bars = score.parts[0]?.measures.map((m) => ({ index: m.index - 1, duration: 4 })) ?? [];
    const chordByBar = new Map();
    for (const p of score.parts) {
        for (const m of p.measures) {
            if (m.chord)
                chordByBar.set(m.index, m.chord);
        }
    }
    const chordSymbols = Array.from(chordByBar.entries()).map(([bar, chord]) => ({ bar, chord }));
    const rehearsalByBar = new Map();
    for (const p of score.parts) {
        for (const m of p.measures) {
            if (m.rehearsalMark)
                rehearsalByBar.set(m.index, m.rehearsalMark);
        }
    }
    const rehearsalMarks = Array.from(rehearsalByBar.entries()).map(([bar, label]) => ({ bar, label }));
    const integrityResult = (0, scoreIntegrityGate_1.runScoreIntegrityGate)({
        bars,
        instruments: context.instrumentProfiles,
        chordSymbols,
        rehearsalMarks,
        chordSymbolsRequired: true,
        rehearsalMarksRequired: true,
        pitchByInstrument: extractPitchByInstrument(score),
    });
    if (!integrityResult.passed)
        errors.push(...integrityResult.errors);
    const behaviourResult = (0, behaviourGates_1.runBehaviourGates)(score, rhythmConstraints, guitarBehaviour, bassBehaviour, sections, densityPlan, { motifState, styleStack, interactionPlan });
    if (!behaviourResult.allValid)
        errors.push(...behaviourResult.errors);
    const exportResult = (0, musicxmlExporter_1.exportScoreModelToMusicXml)(score);
    let xml;
    let mxValidationPassed = false;
    let sibeliusSafe = false;
    let exportIntegrityPassed = true;
    let exportRoundTripPassed = false;
    let instrumentMetadataPassed = false;
    if (exportResult.success && exportResult.xml) {
        xml = exportResult.xml;
        mxValidationPassed = (0, musicxmlValidation_1.validateMusicXmlSchema)(xml).valid;
        sibeliusSafe = (0, sibeliusSafeProfile_1.checkSibeliusSafe)(xml).safe;
        const exportIntegrity = (0, exportHardening_1.validateExportIntegrity)(xml);
        exportIntegrityPassed = exportIntegrity.valid;
        if (!exportIntegrity.valid)
            errors.push(...exportIntegrity.errors);
        const mxBar = (0, validateMusicXmlBarMath_1.validateExportedMusicXmlBarMath)(xml);
        exportRoundTripPassed = mxBar.valid;
        if (!mxBar.valid)
            errors.push(...mxBar.errors);
        const bassMeta = (0, validateBassIdentityInMusicXml_1.validateGuitarBassDuoBassIdentityInMusicXml)(xml);
        instrumentMetadataPassed = bassMeta.valid;
        if (!bassMeta.valid)
            errors.push(...bassMeta.errors);
    }
    else {
        errors.push(...exportResult.errors);
    }
    const readinessResult = (0, releaseReadinessGate_1.runReleaseReadinessGate)({
        validationPassed: integrityResult.passed &&
            modelValidation.valid &&
            behaviourResult.allValid &&
            strictBarMath.valid &&
            instrumentMetadataPassed,
        exportValid: exportResult.success,
        mxValid: mxValidationPassed && exportRoundTripPassed,
        rhythmicCorrect: behaviourResult.rhythmValid,
        registerCorrect: integrityResult.passed,
        sibeliusSafe,
        chordRehearsalComplete: chordSymbols.length >= 8 && rehearsalMarks.length >= 2,
        exportIntegrity: exportIntegrityPassed,
    });
    const runManifest = (0, createRunManifest_1.createRunManifest)({
        version: '2.0.0',
        seed,
        presetId: manifestPresetId,
        scoreTitle,
        activeModules: (() => {
            if (!styleStack)
                return [];
            const a = [styleStack.primary];
            if (styleStack.secondary)
                a.push(styleStack.secondary);
            if (styleStack.colour)
                a.push(styleStack.colour);
            return a;
        })(),
        feelMode: context.feel.mode,
        instrumentProfiles: context.instrumentProfiles.map((p) => p.instrumentIdentity),
        readinessScores: { release: readinessResult.release.overall, mx: readinessResult.mx.overall },
        validationPassed: integrityResult.passed &&
            behaviourResult.allValid &&
            strictBarMath.valid &&
            exportRoundTripPassed &&
            instrumentMetadataPassed,
        validationErrors: errors.length > 0 ? errors : undefined,
        exportTarget: xml ? 'musicxml' : undefined,
        timestamp: new Date().toISOString(),
    });
    const success = modelValidation.valid &&
        strictBarMath.valid &&
        integrityResult.passed &&
        behaviourResult.allValid &&
        exportResult.success &&
        mxValidationPassed &&
        exportIntegrityPassed &&
        exportRoundTripPassed &&
        instrumentMetadataPassed &&
        errors.length === 0;
    return {
        success,
        score,
        context,
        plans,
        xml,
        integrityPassed: integrityResult.passed,
        behaviourGatesPassed: behaviourResult.allValid,
        mxValidationPassed,
        strictBarMathPassed: strictBarMath.valid,
        exportRoundTripPassed,
        instrumentMetadataPassed,
        sibeliusSafe,
        readiness: {
            shareable: readinessResult.shareable,
            release: readinessResult.release.overall,
            mx: readinessResult.mx.overall,
        },
        runManifest,
        errors,
    };
}
