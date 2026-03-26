"use strict";
/**
 * Composer OS V2 — Metheny style validation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateMethenyConformance = validateMethenyConformance;
function countScalarSteps(pitches) {
    let scalar = 0;
    for (let i = 1; i < pitches.length; i++) {
        const d = Math.abs(pitches[i] - pitches[i - 1]);
        if (d <= 2)
            scalar++;
    }
    return scalar;
}
function validateMethenyConformance(score) {
    const errors = [];
    const guitar = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
    if (guitar) {
        const all = [];
        for (const m of guitar.measures) {
            for (const e of m.events) {
                if (e.kind === 'note')
                    all.push(e.pitch);
            }
        }
        const scalar = countScalarSteps(all);
        const intervals = all.length - 1;
        if (intervals > 0 && scalar / intervals > 0.85)
            errors.push('Output overly scalar for Metheny');
        const eventCount = guitar.measures.reduce((s, m) => s + m.events.length, 0);
        if (eventCount > 40)
            errors.push('Density too busy for Metheny');
        const onBeats = guitar.measures.flatMap((m) => m.events.filter((e) => e.kind === 'note').map((e) => e.startBeat));
        const square = onBeats.filter((b) => b === 0 || b === 1 || b === 2 || b === 3).length;
        if (onBeats.length > 0 && square / onBeats.length > 0.9)
            errors.push('Phrases too square');
    }
    return { valid: errors.length === 0, errors };
}
