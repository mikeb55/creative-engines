"use strict";
/**
 * Guitar–Bass Duo golden path — chord tones and guide-tone helpers (harmonic clarity, register-safe).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.seededUnit = seededUnit;
exports.chordTonesForGoldenChord = chordTonesForGoldenChord;
exports.clampPitch = clampPitch;
exports.approachFromBelow = approachFromBelow;
exports.pickGuideTone = pickGuideTone;
/** Seeded 0..1 for bar-local decisions (deterministic). */
function seededUnit(seed, bar, salt = 0) {
    let s = (seed * 7919 + bar * 104729 + salt * 503) >>> 0;
    s = (s * 1103515245 + 12345) >>> 0;
    return s / 0xffffffff;
}
/** Golden-path chord symbols → MIDI bass-register reference tones (same as legacy CHORD_ROOTS). */
function chordTonesForGoldenChord(chord) {
    switch (chord) {
        case 'Dmin9':
            return { root: 38, third: 41, fifth: 45, seventh: 48 };
        case 'G13':
            return { root: 43, third: 47, fifth: 50, seventh: 42 };
        case 'Cmaj9':
            return { root: 36, third: 40, fifth: 43, seventh: 48 };
        case 'A7alt':
            return { root: 45, third: 49, fifth: 52, seventh: 44 };
        default:
            return { root: 40, third: 44, fifth: 47, seventh: 46 };
    }
}
function clampPitch(pitch, low, high) {
    return Math.max(low, Math.min(high, pitch));
}
/** Half-step approach from below into target (short bass colour). */
function approachFromBelow(target, low, high) {
    return clampPitch(target - 1, low, high);
}
/** Strong chord tone for guide-tone line: prefer 3rd or 7th. */
function pickGuideTone(t, bar, seed) {
    const u = seededUnit(seed, bar, 11);
    return u < 0.55 ? t.third : t.seventh;
}
