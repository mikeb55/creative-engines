"use strict";
/**
 * Composer OS V2 — Interaction validation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateInteractionIntegrity = validateInteractionIntegrity;
exports.validateRegisterSeparation = validateRegisterSeparation;
/** Min semitones between bass top and guitar bottom to avoid crowding. */
const CROWDING_THRESHOLD = 5;
/** Max fraction of bars where both start on beat 0 (excessive unison). */
const UNISON_BEAT1_THRESHOLD = 0.85;
/** Max combined events per bar before density overload. */
const DENSITY_OVERLOAD_THRESHOLD = 12;
function getPitchesByBar(score, instrumentId) {
    const part = score.parts.find((p) => p.instrumentIdentity === instrumentId);
    const byBar = new Map();
    if (!part)
        return byBar;
    for (const m of part.measures) {
        const pitches = m.events
            .filter((e) => e.kind === 'note')
            .map((e) => e.pitch);
        if (pitches.length)
            byBar.set(m.index, pitches);
    }
    return byBar;
}
function getFirstBeatByBar(score, instrumentId) {
    const part = score.parts.find((p) => p.instrumentIdentity === instrumentId);
    const byBar = new Map();
    if (!part)
        return byBar;
    for (const m of part.measures) {
        const first = m.events.find((e) => e.kind === 'note');
        if (first)
            byBar.set(m.index, first.startBeat);
    }
    return byBar;
}
function validateInteractionIntegrity(score, _plan) {
    const errors = [];
    const guitarByBar = getPitchesByBar(score, 'clean_electric_guitar');
    const bassByBar = getPitchesByBar(score, 'acoustic_upright_bass');
    const guitarFirstBeat = getFirstBeatByBar(score, 'clean_electric_guitar');
    const bassFirstBeat = getFirstBeatByBar(score, 'acoustic_upright_bass');
    let bothOnBeat1 = 0;
    let barsWithBoth = 0;
    let densityOverloadBars = 0;
    for (let bar = 1; bar <= 8; bar++) {
        const gPitches = guitarByBar.get(bar) ?? [];
        const bPitches = bassByBar.get(bar) ?? [];
        if (gPitches.length > 0 && bPitches.length > 0) {
            barsWithBoth++;
            const gFirst = guitarFirstBeat.get(bar);
            const bFirst = bassFirstBeat.get(bar);
            if (gFirst === 0 && bFirst === 0)
                bothOnBeat1++;
            const gLow = Math.min(...gPitches);
            const bHigh = Math.max(...bPitches);
            const threshold = _plan?.registerSeparationThreshold ?? CROWDING_THRESHOLD;
            if (gLow - bHigh < threshold) {
                errors.push(`Register crowding in bar ${bar}: guitar low ${gLow} too close to bass high ${bHigh}`);
            }
        }
        const guitar = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
        const bass = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
        const guitarEvents = guitar?.measures.find((m) => m.index === bar)?.events.length ?? 0;
        const bassEvents = bass?.measures.find((m) => m.index === bar)?.events.length ?? 0;
        if (guitarEvents + bassEvents > DENSITY_OVERLOAD_THRESHOLD)
            densityOverloadBars++;
    }
    if (barsWithBoth > 0 && bothOnBeat1 / barsWithBoth > UNISON_BEAT1_THRESHOLD) {
        errors.push('Excessive unison behaviour: both instruments start on beat 1 too often');
    }
    if (densityOverloadBars > 2) {
        errors.push(`Simultaneous density overload in ${densityOverloadBars} bars`);
    }
    return { valid: errors.length === 0, errors };
}
function validateRegisterSeparation(score, plan) {
    const errors = [];
    const threshold = plan.registerSeparationThreshold;
    const guitarByBar = getPitchesByBar(score, 'clean_electric_guitar');
    const bassByBar = getPitchesByBar(score, 'acoustic_upright_bass');
    for (let bar = 1; bar <= 8; bar++) {
        const gPitches = guitarByBar.get(bar) ?? [];
        const bPitches = bassByBar.get(bar) ?? [];
        if (gPitches.length === 0 || bPitches.length === 0)
            continue;
        const gLow = Math.min(...gPitches);
        const bHigh = Math.max(...bPitches);
        if (gLow - bHigh < threshold) {
            errors.push(`Register separation violated in bar ${bar}: gap ${gLow - bHigh} < ${threshold}`);
        }
    }
    return { valid: errors.length === 0, errors };
}
