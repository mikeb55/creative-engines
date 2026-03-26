"use strict";
/**
 * Contemporary Counterpoint — two-voice independence.
 * V1: 4 quarters. V2: 2 halves OR 4 quarters (≥50% halves for contrast).
 * Interval rules, range separation, motion contrast.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCounterpointScore = generateCounterpointScore;
exports.getCounterpointBarLog = getCounterpointBarLog;
exports.getParallelsPrevented = getParallelsPrevented;
const measureBuilder_1 = require("../core/measureBuilder");
const validateScore_1 = require("../../scripts/validateScore");
const ROOT_MIDI = {
    C: 60, 'C#': 61, Db: 61, D: 62, 'D#': 63, Eb: 63, E: 64, F: 65,
    'F#': 66, Gb: 66, G: 67, 'G#': 68, Ab: 68, A: 69, 'A#': 70, Bb: 70, B: 71,
};
const SCALE_STEPS = [0, 2, 4, 5, 7, 9, 11];
const V1_MIN = 60;
const V1_MAX = 84;
const V2_MIN = 36;
const V2_MAX = 60;
function parseChord(chord) {
    const m = chord.match(/^([A-G][#b]?)/);
    return ROOT_MIDI[m?.[1] ?? 'C'] ?? 60;
}
function getScaleTones(root) {
    return SCALE_STEPS.map((s) => root + s);
}
function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}
/** Reject parallel 5ths (7 semitones) and parallel octaves (12). */
function isParallel(prevInterval, currInterval) {
    if (prevInterval === 7 && currInterval === 7)
        return true;
    if (prevInterval === 12 && currInterval === 12)
        return true;
    return false;
}
const rhythmLog = [];
let parallelsPrevented = 0;
/** Generate counterpoint as Score. */
function generateCounterpointScore(segments, options) {
    rhythmLog.length = 0;
    parallelsPrevented = 0;
    let seed = options?.seed ?? 42;
    const rnd = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };
    const totalBars = segments.reduce((s, seg) => s + seg.bars, 0);
    const measures = [];
    let lastV1 = 64;
    let lastV2 = 48;
    let identicalRhythmCount = 0;
    let prevInterval = -1;
    for (let i = 0; i < totalBars; i++) {
        let segIdx = 0;
        let acc = 0;
        for (let s = 0; s < segments.length; s++) {
            if (i < acc + segments[s].bars) {
                segIdx = s;
                break;
            }
            acc += segments[s].bars;
        }
        const chord = segments[segIdx]?.chord ?? 'C';
        const root = parseChord(chord);
        const scaleTones = getScaleTones(root);
        const m = (0, measureBuilder_1.createMeasure)(i, [1, 2]);
        const v1Cursor = { pos: 0 };
        const v2Cursor = { pos: 0 };
        const isFirstOrLastBar = i === 0 || i === totalBars - 1;
        const v1Pitches = [];
        const v2Pitches = [];
        const v2UseHalves = identicalRhythmCount >= 1 || rnd() > 0.5;
        const v2Durations = v2UseHalves ? [8, 8] : [4, 4, 4, 4];
        const v1Durations = [4, 4, 4, 4];
        const v1Rhythm = v1Durations.join('-');
        const v2Rhythm = v2Durations.join('-');
        if (v1Rhythm === v2Rhythm)
            identicalRhythmCount++;
        else
            identicalRhythmCount = 0;
        let barParallels = 0;
        for (let slice = 0; slice < 4; slice++) {
            const v1Step = (i + slice) % 7;
            const v2Step = (i + slice + 2) % 7;
            let v1Cand = scaleTones[v1Step];
            let v2Cand = scaleTones[v2Step];
            v1Cand = clamp(v1Cand, V1_MIN, V1_MAX);
            v2Cand = clamp(v2Cand, V2_MIN, V2_MAX);
            const motionV1 = v1Cand - lastV1;
            if (motionV1 > 0 && !isFirstOrLastBar) {
                v2Cand = Math.min(v2Cand, lastV2 - 1);
            }
            else if (motionV1 < 0 && !isFirstOrLastBar) {
                v2Cand = Math.max(v2Cand, lastV2 + 1);
            }
            v2Cand = clamp(v2Cand, V2_MIN, V2_MAX);
            const intSemis = Math.abs(v1Cand - v2Cand) % 12;
            const intClass = intSemis <= 6 ? intSemis : 12 - intSemis;
            if (!isFirstOrLastBar && intClass === 0) {
                v2Cand = v2Cand - 2;
                v2Cand = clamp(v2Cand, V2_MIN, V2_MAX);
            }
            if (prevInterval >= 0 && !isFirstOrLastBar) {
                const currInt = Math.abs(v1Cand - v2Cand) % 12;
                const prevInt = prevInterval;
                if (isParallel(prevInt, currInt)) {
                    v2Cand = v2Cand + (v2Cand < lastV2 ? 2 : -2);
                    v2Cand = clamp(v2Cand, V2_MIN, V2_MAX);
                    parallelsPrevented++;
                    barParallels++;
                }
            }
            if (prevInterval === 7 && !isFirstOrLastBar) {
                const currInt = Math.abs(v1Cand - v2Cand) % 12;
                if (currInt === 7) {
                    v2Cand = v2Cand + 1;
                    v2Cand = clamp(v2Cand, V2_MIN, V2_MAX);
                    parallelsPrevented++;
                    barParallels++;
                }
            }
            v1Pitches.push(v1Cand);
            v2Pitches.push(v2Cand);
            prevInterval = Math.abs(v1Cand - v2Cand) % 12;
            lastV1 = v1Cand;
            lastV2 = v2Cand;
        }
        for (let j = 0; j < 4; j++) {
            (0, measureBuilder_1.pushNote)(m, 1, v1Pitches[j], 4, v1Cursor);
        }
        if (v2UseHalves) {
            const p0 = v2Pitches[0];
            const p1 = v2Pitches[2];
            (0, measureBuilder_1.pushNote)(m, 2, p0, 8, v2Cursor);
            (0, measureBuilder_1.pushNote)(m, 2, p1, 8, v2Cursor);
        }
        else {
            for (let j = 0; j < 4; j++) {
                (0, measureBuilder_1.pushNote)(m, 2, v2Pitches[j], 4, v2Cursor);
            }
        }
        rhythmLog.push({
            v1Rhythm: v1Rhythm,
            v2Rhythm: v2Rhythm,
            parallelsRejected: barParallels,
        });
        measures.push(m);
    }
    const score = { measures };
    (0, validateScore_1.validateScore)(score);
    return score;
}
function getCounterpointBarLog() {
    return [...rhythmLog];
}
function getParallelsPrevented() {
    return parallelsPrevented;
}
