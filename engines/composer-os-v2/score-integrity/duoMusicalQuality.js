"use strict";
/**
 * Guitar–Bass Duo musical quality gates (non-correctness): variety, interaction, rhythm shape.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDuoMusicalQuality = validateDuoMusicalQuality;
const guitarBassDuoHarmony_1 = require("../goldenPath/guitarBassDuoHarmony");
function chordForBar(barIndex) {
    if (barIndex <= 2)
        return 'Dmin9';
    if (barIndex <= 4)
        return 'G13';
    if (barIndex <= 6)
        return 'Cmaj9';
    return 'A7alt';
}
function validateDuoMusicalQuality(score, opts) {
    const errors = [];
    const guitar = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
    const bass = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
    if (!guitar || !bass)
        return { valid: true, errors: [] };
    const bassNotes = [];
    for (const m of bass.measures) {
        for (const e of m.events) {
            if (e.kind === 'note') {
                bassNotes.push({
                    bar: m.index,
                    pitch: e.pitch,
                    start: e.startBeat,
                });
            }
        }
    }
    let rootClassMatches = 0;
    for (const n of bassNotes) {
        const chord = chordForBar(n.bar);
        const t = (0, guitarBassDuoHarmony_1.chordTonesForGoldenChord)(chord);
        const rootPc = t.root % 12;
        const pc = n.pitch % 12;
        if (pc === rootPc)
            rootClassMatches++;
    }
    if (bassNotes.length > 0 && rootClassMatches / bassNotes.length > 0.62) {
        errors.push('Duo: bass is excessively root-heavy (guide-tone variety required)');
    }
    const rhythmCells = new Set(bassNotes.map((n) => `${n.start.toFixed(2)}`));
    if (rhythmCells.size < 3) {
        errors.push('Duo: bass rhythm too static across the piece');
    }
    let restBeats = 0;
    let totalBeats = 0;
    const guitarStarts = [];
    for (const m of guitar.measures) {
        let barRest = 0;
        for (const e of m.events) {
            if (e.kind === 'rest')
                barRest += e.duration;
            if (e.kind === 'note') {
                guitarStarts.push(e.startBeat);
            }
        }
        totalBeats += 4;
        restBeats += barRest;
    }
    if (totalBeats > 0 && restBeats / totalBeats < 0.03) {
        errors.push('Duo: guitar lacks breathing space (rest ratio too low)');
    }
    if (guitarStarts.length > 1) {
        const mean = guitarStarts.reduce((a, b) => a + b, 0) / guitarStarts.length;
        const var_ = guitarStarts.reduce((s, x) => s + (x - mean) * (x - mean), 0) / guitarStarts.length;
        const std = Math.sqrt(var_);
        if (std < 0.28) {
            errors.push('Duo: guitar attack density too flat (onset variation required)');
        }
    }
    let bothDownbeat = 0;
    let barsBoth = 0;
    for (let bar = 1; bar <= 8; bar++) {
        const gm = guitar.measures.find((m) => m.index === bar);
        const bm = bass.measures.find((m) => m.index === bar);
        const gn = gm?.events.find((e) => e.kind === 'note');
        const bn = bm?.events.find((e) => e.kind === 'note');
        if (gn && bn) {
            barsBoth++;
            if (gn.startBeat === 0 && bn.startBeat === 0)
                bothDownbeat++;
        }
    }
    if (barsBoth > 0 && bothDownbeat / barsBoth > 0.72) {
        errors.push('Duo: excessive simultaneous downbeats (conversational contrast required)');
    }
    return { valid: errors.length === 0, errors };
}
