"use strict";
/**
 * Composer OS V2 — Triad Pairs module validation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateTriadPairConformance = validateTriadPairConformance;
function hasTriadCellIdentity(pitches) {
    if (pitches.length < 2)
        return false;
    const intervals = [];
    for (let i = 1; i < pitches.length; i++) {
        intervals.push(Math.abs(pitches[i] - pitches[i - 1]));
    }
    const thirds = intervals.filter((d) => d === 3 || d === 4).length;
    const fourths = intervals.filter((d) => d === 5 || d === 6).length;
    return thirds >= 1 || fourths >= 1;
}
function isScalarRun(pitches) {
    if (pitches.length < 4)
        return false;
    let stepwise = 0;
    for (let i = 1; i < pitches.length; i++) {
        if (Math.abs(pitches[i] - pitches[i - 1]) <= 2)
            stepwise++;
    }
    return stepwise >= pitches.length - 1;
}
function validateTriadPairConformance(score) {
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
        if (all.length >= 4 && isScalarRun(all))
            errors.push('Output scalar/exercise-like');
        const perBar = [];
        for (const m of guitar.measures) {
            const bar = [];
            for (const e of m.events) {
                if (e.kind === 'note')
                    bar.push(e.pitch);
            }
            if (bar.length >= 2 && hasTriadCellIdentity(bar))
                return { valid: true, errors: [] };
            perBar.push(bar);
        }
        const anyTriad = perBar.some((bar) => bar.length >= 2 && hasTriadCellIdentity(bar));
        if (!anyTriad && all.length >= 6)
            errors.push('No triad-cell identity');
        const onBeats = guitar.measures.flatMap((m) => m.events.filter((e) => e.kind === 'note').map((e) => e.startBeat));
        const offbeat = onBeats.filter((b) => b !== 0 && b !== 1 && b !== 2 && b !== 3).length;
        if (onBeats.length > 4 && offbeat / onBeats.length < 0.1)
            errors.push('Rhythm too square');
    }
    return { valid: errors.length === 0, errors };
}
