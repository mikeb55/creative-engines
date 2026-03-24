"use strict";
/**
 * Composer OS V2 — Golden path duo score generator
 * Motif-driven melody, style-influenced, section-aware (Guitar–Bass Duo).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateGoldenPathDuoScore = generateGoldenPathDuoScore;
const guitarBassDuoPreset_1 = require("../../presets/guitarBassDuoPreset");
const scoreEventBuilder_1 = require("../score-model/scoreEventBuilder");
const guitarProfile_1 = require("../instrument-profiles/guitarProfile");
const uprightBassProfile_1 = require("../instrument-profiles/uprightBassProfile");
const guitarBassDuoExportNames_1 = require("../instrument-profiles/guitarBassDuoExportNames");
const densityCurvePlanner_1 = require("../density/densityCurvePlanner");
const interactionPlanner_1 = require("../interaction/interactionPlanner");
const performancePass_1 = require("../performance/performancePass");
const guitarBassDuoHarmony_1 = require("./guitarBassDuoHarmony");
const GUITAR_FLOOR_FOR_SEPARATION = 60;
const CHORD_ROOTS = {
    Dmin9: 38,
    Dm9: 38,
    'D-9': 38,
    G13: 43,
    G7: 43,
    Cmaj9: 36,
    Cmaj7: 36,
    C: 36,
    A7alt: 45,
    A7: 45,
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
/** Conversational stagger: rarely both on downbeat. */
function staggerForBar(bar, seed) {
    if (bar <= 4) {
        return bar % 2 === 1 ? { guitar: 0, bass: 0.5 } : { guitar: 0.5, bass: 0 };
    }
    const row = [0, 0.5, 0.25, 0.5][(bar - 5) % 4];
    return (0, guitarBassDuoHarmony_1.seededUnit)(seed, bar, 7) < 0.5 ? { guitar: 0, bass: row } : { guitar: row, bass: 0 };
}
function readStyleHints(context) {
    const so = context.styleOverrides;
    return {
        metheny: so?.metheny,
        bacharach: so?.bacharach,
    };
}
/** Quarter-beat grid — keeps MusicXML division sums stable. */
function qBeat(x) {
    return Math.round(x * 4) / 4;
}
function buildGuitarPart(context, _guitarPlan, guitarMap, densityPlan, rhythm, motifState, interactionPlan) {
    const profile = guitarBassDuoPreset_1.guitarBassDuoPreset.instrumentProfiles.find((p) => p.instrumentIdentity === 'clean_electric_guitar') ?? guitarProfile_1.CLEAN_ELECTRIC_GUITAR;
    const seed = context.seed;
    const hints = readStyleHints(context);
    const measures = [];
    const [baseLow] = profile.preferredMelodicZone;
    const effectiveBase = Math.max(baseLow, GUITAR_FLOOR_FOR_SEPARATION);
    for (let b = 1; b <= 8; b++) {
        const m = (0, scoreEventBuilder_1.createMeasure)(b, chordForBar(b), rehearsalForBar(b));
        const placements = getPlacementsForBar(motifState.placements, b);
        const density = (0, densityCurvePlanner_1.getDensityForBar)(densityPlan, b);
        const interaction = interactionPlan ? (0, interactionPlanner_1.getInteractionForBar)(interactionPlan, b) : undefined;
        const reduceAttack = interaction?.coupling?.guitarReduceAttack;
        const stagger = staggerForBar(b, seed);
        const [zLow, zHigh] = getRegisterForBar(guitarMap, b);
        const sectionBump = b > 4 ? 2 : 0;
        const effectiveLow = Math.max(zLow, effectiveBase) + sectionBump;
        const effectiveHigh = Math.min(79, zHigh + sectionBump);
        const useOffbeat = (rhythm.offbeatWeight > 0.2 && (b === 2 || b === 4 || b === 6 || b === 8)) || !!reduceAttack;
        const meth = hints.metheny;
        if (placements.length > 0) {
            const raw = [];
            for (const pl of placements) {
                for (const n of pl.notes) {
                    let pitch = Math.max(effectiveLow, Math.min(effectiveHigh, n.pitch));
                    const dur = Math.min(n.duration, Math.max(0, 4 - n.startBeat));
                    if (dur > 0 && n.startBeat < 4) {
                        raw.push({ pitch, start: n.startBeat + stagger.guitar, dur });
                    }
                }
            }
            raw.sort((a, b2) => a.start - b2.start);
            let cursor = 0;
            for (const e of raw) {
                const start = Math.max(qBeat(e.start), cursor);
                if (start > cursor) {
                    (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createRest)(cursor, start - cursor));
                }
                let dur = qBeat(Math.min(e.dur, 4 - start));
                if (meth?.attackDensityReduced && dur > 0.5) {
                    dur = Math.min(dur, 1.25);
                }
                dur = qBeat(Math.min(dur, 4 - start));
                if (dur <= 0)
                    continue;
                (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(e.pitch, start, dur));
                cursor = start + dur;
                if (cursor >= 4 - 1e-6)
                    break;
            }
            if (reduceAttack && cursor < 3) {
                (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createRest)(cursor, 4 - cursor));
            }
            else if (cursor < 4 - 1e-4) {
                const tail = 4 - cursor;
                if (tail >= 1.5 && (0, guitarBassDuoHarmony_1.seededUnit)(seed, b, 5) < 0.35) {
                    (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createRest)(cursor, 0.5));
                    (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(effectiveLow + 7, cursor + 0.5, tail - 0.5));
                }
                else {
                    (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(effectiveLow + (b % 3 === 0 ? 9 : 5), cursor, tail));
                }
            }
        }
        else {
            const dyadBar = b === 4 || b === 8;
            if (density === 'sparse') {
                if (useOffbeat) {
                    const g = stagger.guitar;
                    const head = 0.5 + g * 0.5;
                    (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createRest)(0, head));
                    (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(effectiveLow + 5, head, 1.25));
                    const t1 = head + 1.25;
                    (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createRest)(t1, 1));
                    const t2 = t1 + 1;
                    (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(effectiveLow + 9, t2, 4 - t2));
                }
                else {
                    const g = stagger.guitar;
                    const t0 = 0.75 + g;
                    (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createRest)(0, t0));
                    (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(effectiveLow + 7, t0, 2));
                    const t2 = t0 + 2;
                    (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(effectiveLow + 4, t2, 4 - t2));
                }
            }
            else if (density === 'medium') {
                if (dyadBar) {
                    (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createRest)(0, 0.5));
                    (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(effectiveLow + 4, 0.5, 1));
                    (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(effectiveLow + 7, 1.5, 1));
                    (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createRest)(2.5, 0.5));
                    (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(effectiveLow + 9, 3, 1));
                }
                else {
                    const g = stagger.guitar;
                    if (g > 0) {
                        (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createRest)(0, g));
                    }
                    (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(effectiveLow + 5, g, 1.5));
                    (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createRest)(1.5 + g, 1));
                    const tLast = 2.5 + g;
                    (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(effectiveLow + 8, tLast, 4 - tLast));
                }
            }
            else {
                const g = stagger.guitar;
                if (g > 0) {
                    (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createRest)(0, g));
                }
                (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(effectiveLow + 7, g, 1));
                (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(effectiveLow + 5, g + 1, 1));
                (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createRest)(g + 2, 0.5));
                const tLast = g + 2.5;
                (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(effectiveLow + 9, tLast, 4 - tLast));
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
/** Four quarter-style bass slices: three full beats + remainder — avoids MusicXML rounding drift. */
function addBassQuarterLine(m, start, p) {
    if (start > 0) {
        (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createRest)(0, start));
    }
    let t = start;
    for (let i = 0; i < 3; i++) {
        (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(p[i], t, 1));
        t += 1;
    }
    (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(p[3], t, 4 - t));
}
function buildBassPart(context, _bassPlan, bassMap, motifState, interactionPlan) {
    const profile = guitarBassDuoPreset_1.guitarBassDuoPreset.instrumentProfiles.find((p) => p.instrumentIdentity === 'acoustic_upright_bass') ?? uprightBassProfile_1.ACOUSTIC_UPRIGHT_BASS;
    const [walkLow, walkHigh] = profile.preferredWalkingZone;
    const bassCeiling = Math.min(walkHigh, 52);
    const seed = context.seed;
    const measures = [];
    for (let b = 1; b <= 8; b++) {
        const chord = chordForBar(b);
        const tones = (0, guitarBassDuoHarmony_1.chordTonesForGoldenChord)(chord);
        const root = CHORD_ROOTS[chord] ?? tones.root;
        const m = (0, scoreEventBuilder_1.createMeasure)(b, chord, rehearsalForBar(b));
        const [low, high] = getBassRegisterForBar(bassMap, b);
        const effectiveHigh = Math.min(high, bassCeiling);
        const rootClamped = (0, guitarBassDuoHarmony_1.clampPitch)(root, Math.max(walkLow, low), Math.min(effectiveHigh, high));
        const guide = (0, guitarBassDuoHarmony_1.clampPitch)((0, guitarBassDuoHarmony_1.pickGuideTone)(tones, b, seed), walkLow, effectiveHigh);
        const fifth = (0, guitarBassDuoHarmony_1.clampPitch)(rootClamped + 5, walkLow, effectiveHigh);
        const third = (0, guitarBassDuoHarmony_1.clampPitch)(tones.third, walkLow, effectiveHigh);
        const seventh = (0, guitarBassDuoHarmony_1.clampPitch)(tones.seventh, walkLow, effectiveHigh);
        const interaction = interactionPlan ? (0, interactionPlanner_1.getInteractionForBar)(interactionPlan, b) : undefined;
        const simplify = interaction?.coupling?.bassSimplify;
        const stagger = staggerForBar(b, seed);
        const placements = getPlacementsForBar(motifState.placements, b);
        const u = (0, guitarBassDuoHarmony_1.seededUnit)(seed, b, 13);
        const startNonRoot = u < 0.32 && !simplify;
        const firstPitch = startNonRoot ? (u < 0.16 ? third : guide) : rootClamped;
        const firstStart = stagger.bass;
        if (placements.length > 0 && placements[0].notes.length > 0 && !simplify) {
            const first = placements[0].notes[0].pitch;
            const bassEcho = (0, guitarBassDuoHarmony_1.clampPitch)(first - 12, walkLow, effectiveHigh);
            const line = (0, guitarBassDuoHarmony_1.seededUnit)(seed, b, 19) < 0.5
                ? [firstPitch, guide, bassEcho, fifth]
                : [firstPitch, seventh, rootClamped, guide];
            addBassQuarterLine(m, firstStart, line);
        }
        else if (simplify) {
            if (firstStart > 0) {
                (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createRest)(0, firstStart));
            }
            const t0 = firstStart;
            const span = 4 - firstStart;
            const half = Math.round((span / 2) * 4) / 4;
            const half2 = span - half;
            (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(rootClamped, t0, half));
            (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(fifth, t0 + half, half2));
        }
        else if (u < 0.45) {
            const ap = (0, guitarBassDuoHarmony_1.approachFromBelow)(rootClamped, walkLow, effectiveHigh);
            if (firstStart > 0) {
                (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createRest)(0, firstStart));
            }
            const t0 = firstStart;
            (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(ap, t0, 0.25));
            (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(rootClamped, t0 + 0.25, 0.75));
            (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(guide, t0 + 1, 1));
            (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(fifth, t0 + 2, 1));
            const lastDur = 4 - (t0 + 3);
            (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(rootClamped, t0 + 3, lastDur));
        }
        else {
            const line = [firstPitch, seventh, guide, rootClamped];
            addBassQuarterLine(m, firstStart, line);
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
 * Generate golden path duo score. `context` must already include any `applyStyleStack` transforms.
 */
function generateGoldenPathDuoScore(context, plans) {
    const guitarPart = buildGuitarPart(context, plans.guitarBehaviour, plans.guitarMap, plans.densityPlan, plans.rhythmConstraints, plans.motifState, plans.interactionPlan);
    const bassPart = buildBassPart(context, plans.bassBehaviour, plans.bassMap, plans.motifState, plans.interactionPlan);
    const rawScore = (0, scoreEventBuilder_1.createScore)(plans.scoreTitle, [guitarPart, bassPart], { tempo: 120 });
    return (0, performancePass_1.applyPerformancePass)(rawScore);
}
