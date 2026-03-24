"use strict";
/**
 * Composer OS V2 — Golden path duo score generator
 * Motif-driven melody, style-influenced, section-aware.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateGoldenPathDuoScore = generateGoldenPathDuoScore;
const guitarBassDuoPreset_1 = require("../../presets/guitarBassDuoPreset");
const scoreEventBuilder_1 = require("../score-model/scoreEventBuilder");
const guitarProfile_1 = require("../instrument-profiles/guitarProfile");
const uprightBassProfile_1 = require("../instrument-profiles/uprightBassProfile");
const guitarBassDuoExportNames_1 = require("../instrument-profiles/guitarBassDuoExportNames");
const densityCurvePlanner_1 = require("../density/densityCurvePlanner");
const styleModuleRegistry_1 = require("../style-modules/styleModuleRegistry");
const interactionPlanner_1 = require("../interaction/interactionPlanner");
const performancePass_1 = require("../performance/performancePass");
/** Min guitar pitch to maintain register separation from bass (bass typically to 55). */
const GUITAR_FLOOR_FOR_SEPARATION = 60;
const CHORD_ROOTS = {
    'Dmin9': 38, 'Dm9': 38, 'D-9': 38,
    'G13': 43, 'G7': 43,
    'Cmaj9': 36, 'Cmaj7': 36, 'C': 36,
    'A7alt': 45, 'A7': 45,
};
function chordForBar(barIndex) {
    if (barIndex <= 2)
        return 'Dmin9';
    if (barIndex <= 4)
        return 'G13';
    if (barIndex <= 6)
        return 'Cmaj9';
    return 'A7alt';
}
function rehearsalForBar(barIndex) {
    if (barIndex === 1)
        return 'A';
    if (barIndex === 5)
        return 'B';
    return undefined;
}
function getRegisterForBar(guitarMap, bar) {
    const section = bar <= 4 ? 'A' : 'B';
    const plan = guitarMap.sections.find((s) => s.sectionLabel === section);
    return plan?.preferredZone ?? [55, 79];
}
function getBassRegisterForBar(bassMap, bar) {
    const section = bar <= 4 ? 'A' : 'B';
    const plan = bassMap.sections.find((s) => s.sectionLabel === section);
    return plan?.preferredZone ?? [36, 55];
}
function getPlacementsForBar(placements, bar) {
    return placements.filter((p) => p.startBar === bar);
}
/** Build guitar part: motif-driven where placed, filler elsewhere. Enforces register separation. */
function buildGuitarPart(guitarPlan, guitarMap, densityPlan, rhythm, motifState, interactionPlan) {
    const profile = guitarBassDuoPreset_1.guitarBassDuoPreset.instrumentProfiles.find((p) => p.instrumentIdentity === 'clean_electric_guitar') ?? guitarProfile_1.CLEAN_ELECTRIC_GUITAR;
    const measures = [];
    const [baseLow] = profile.preferredMelodicZone;
    const effectiveLow = Math.max(baseLow, GUITAR_FLOOR_FOR_SEPARATION);
    for (let b = 1; b <= 8; b++) {
        const m = (0, scoreEventBuilder_1.createMeasure)(b, chordForBar(b), rehearsalForBar(b));
        const placements = getPlacementsForBar(motifState.placements, b);
        const density = (0, densityCurvePlanner_1.getDensityForBar)(densityPlan, b);
        const interaction = interactionPlan ? (0, interactionPlanner_1.getInteractionForBar)(interactionPlan, b) : undefined;
        const reduceAttack = interaction?.coupling?.guitarReduceAttack;
        const useOffbeat = (rhythm.offbeatWeight > 0.2 && (b === 2 || b === 4 || b === 6 || b === 8)) || !!reduceAttack;
        if (placements.length > 0) {
            const raw = [];
            for (const pl of placements) {
                for (const n of pl.notes) {
                    const pitch = Math.max(effectiveLow, Math.min(79, n.pitch));
                    const dur = Math.min(n.duration, Math.max(0, 4 - n.startBeat));
                    if (dur > 0 && n.startBeat < 4) {
                        raw.push({ pitch, start: n.startBeat, dur });
                    }
                }
            }
            raw.sort((a, b) => a.start - b.start);
            let cursor = 0;
            for (const e of raw) {
                const start = Math.max(e.start, cursor);
                if (start > cursor) {
                    (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createRest)(cursor, start - cursor));
                }
                const dur = Math.min(e.dur, 4 - start);
                if (dur <= 0)
                    continue;
                (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(e.pitch, start, dur));
                cursor = start + dur;
            }
            if (cursor < 4 - 1e-4) {
                (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(effectiveLow + 5, cursor, 4 - cursor));
            }
        }
        else {
            if (density === 'sparse') {
                if (useOffbeat) {
                    (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createRest)(0, 0.5));
                    (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(effectiveLow + 5, 0.5, 1.5));
                    (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(effectiveLow + 7, 2, 2));
                }
                else {
                    (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(effectiveLow + 7, 0, 2));
                    (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(effectiveLow + 9, 2, 2));
                }
            }
            else if (density === 'medium') {
                (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(effectiveLow + 5, 0, 4));
            }
            else {
                (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(effectiveLow + 7, 0, 2));
                (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(effectiveLow + 4, 2, 2));
            }
        }
        measures.push(m);
    }
    return {
        id: 'guitar',
        name: 'Clean Electric Guitar',
        instrumentIdentity: profile.instrumentIdentity,
        midiProgram: profile.midiProgram,
        clef: 'treble',
        measures,
    };
}
/** Build bass part: anchor + light motif echoes. Staggered entries in call_response. */
function buildBassPart(bassPlan, bassMap, motifState, interactionPlan) {
    const profile = guitarBassDuoPreset_1.guitarBassDuoPreset.instrumentProfiles.find((p) => p.instrumentIdentity === 'acoustic_upright_bass') ?? uprightBassProfile_1.ACOUSTIC_UPRIGHT_BASS;
    const [walkLow, walkHigh] = profile.preferredWalkingZone;
    const bassCeiling = Math.min(walkHigh, 52);
    const measures = [];
    for (let b = 1; b <= 8; b++) {
        const chord = chordForBar(b);
        const root = CHORD_ROOTS[chord] ?? 48;
        const m = (0, scoreEventBuilder_1.createMeasure)(b, chord, rehearsalForBar(b));
        const [low, high] = getBassRegisterForBar(bassMap, b);
        const effectiveHigh = Math.min(high, bassCeiling);
        const rootClamped = Math.max(walkLow, Math.min(effectiveHigh, Math.max(low, Math.min(high, root))));
        const interaction = interactionPlan ? (0, interactionPlanner_1.getInteractionForBar)(interactionPlan, b) : undefined;
        const simplify = interaction?.coupling?.bassSimplify;
        const isCallResponse = interaction?.mode === 'call_response';
        const placements = getPlacementsForBar(motifState.placements, b);
        if (placements.length > 0 && placements[0].notes.length > 0 && !simplify) {
            const first = placements[0].notes[0].pitch;
            const bassEcho = Math.max(walkLow, Math.min(effectiveHigh, first - 12));
            const beatOffset = isCallResponse && (b === 6 || b === 8) ? 0.5 : 0;
            if (beatOffset > 0) {
                (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createRest)(0, 0.5));
                (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(rootClamped, 0.5, 0.5));
                (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(bassEcho, 1, 1));
                (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(rootClamped, 2, 1));
                (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(rootClamped + 5, 3, 1));
            }
            else {
                (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(rootClamped, 0, 1));
                (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(bassEcho, 1, 1));
                (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(rootClamped, 2, 1));
                (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(rootClamped + 5, 3, 1));
            }
        }
        else if (simplify) {
            const fifth = Math.min(effectiveHigh, rootClamped + 5);
            (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(rootClamped, 0, 2));
            (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(fifth, 2, 2));
        }
        else {
            const beatOffset = isCallResponse && (b === 6 || b === 8) ? 0.5 : 0;
            if (beatOffset > 0) {
                (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createRest)(0, 0.5));
                (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(rootClamped, 0.5, 0.5));
                (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(rootClamped + 7, 1, 1));
                (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(rootClamped, 2, 1));
                (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(rootClamped + 5, 3, 1));
            }
            else {
                (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(rootClamped, 0, 1));
                (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(rootClamped + 7, 1, 1));
                (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(rootClamped, 2, 1));
                (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(rootClamped + 5, 3, 1));
            }
        }
        measures.push(m);
    }
    return {
        id: 'bass',
        name: guitarBassDuoExportNames_1.GUITAR_BASS_DUO_BASS_PART_NAME,
        instrumentIdentity: profile.instrumentIdentity,
        midiProgram: profile.midiProgram,
        clef: 'bass',
        measures,
    };
}
/**
 * Generate golden path duo score.
 */
function generateGoldenPathDuoScore(context, plans) {
    const styleContext = plans.styleStack
        ? (0, styleModuleRegistry_1.applyStyleStack)(context, plans.styleStack)
        : context;
    const guitarPart = buildGuitarPart(plans.guitarBehaviour, plans.guitarMap, plans.densityPlan, plans.rhythmConstraints, plans.motifState, plans.interactionPlan);
    const bassPart = buildBassPart(plans.bassBehaviour, plans.bassMap, plans.motifState, plans.interactionPlan);
    const rawScore = (0, scoreEventBuilder_1.createScore)(plans.scoreTitle, [guitarPart, bassPart], { tempo: 120 });
    return (0, performancePass_1.applyPerformancePass)(rawScore);
}
