"use strict";
/**
 * Composer OS V2 — Motif validation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateMotifIntegrity = validateMotifIntegrity;
function extractGuitarPitchesByBar(score) {
    const p = score.parts.find((x) => x.instrumentIdentity === 'clean_electric_guitar');
    if (!p)
        return new Map();
    const byBar = new Map();
    for (const m of p.measures) {
        const pitches = m.events
            .filter((e) => e.kind === 'note')
            .map((e) => e.pitch);
        if (pitches.length)
            byBar.set(m.index, pitches);
    }
    return byBar;
}
function validateMotifIntegrity(state, score) {
    const errors = [];
    if (state.placements.length < 2)
        errors.push('No motif reuse: at least 2 placements required');
    if (state.baseMotifs.length < 1)
        errors.push('No base motifs');
    const variants = new Set(state.placements.map((p) => p.variant));
    if (variants.size < 2 && state.placements.length >= 2) {
        errors.push('No transformation across sections: variation required');
    }
    const aPlacements = state.placements.filter((p) => p.startBar <= 4);
    const bPlacements = state.placements.filter((p) => p.startBar >= 5);
    if (aPlacements.length === 0 || bPlacements.length === 0) {
        errors.push('Motifs must recur across A and B');
    }
    const totalNotes = state.placements.reduce((s, p) => s + p.notes.length, 0);
    const guitarPitches = extractGuitarPitchesByBar(score);
    const scoreNoteCount = [...guitarPitches.values()].reduce((s, arr) => s + arr.length, 0);
    if (scoreNoteCount > 0 && totalNotes > 0) {
        const motifRatio = totalNotes / scoreNoteCount;
        if (motifRatio < 0.3)
            errors.push('Excessive new-note rate: motif content too low');
    }
    return { valid: errors.length === 0, errors };
}
