"use strict";
/**
 * Composer OS V2 — Behaviour validation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateGuitarBehaviour = validateGuitarBehaviour;
exports.validateBassBehaviour = validateBassBehaviour;
function extractGuitarPitches(score) {
    const p = score.parts.find((x) => x.instrumentIdentity === 'clean_electric_guitar');
    if (!p)
        return [];
    return p.measures.flatMap((m) => m.events.filter((e) => e.kind === 'note').map((e) => e.pitch));
}
function extractBassPitches(score) {
    const p = score.parts.find((x) => x.instrumentIdentity === 'acoustic_upright_bass');
    if (!p)
        return [];
    return p.measures.flatMap((m) => m.events.filter((e) => e.kind === 'note').map((e) => e.pitch));
}
function validateGuitarBehaviour(score, plan) {
    const errors = [];
    const pitches = extractGuitarPitches(score);
    if (pitches.length === 0) {
        errors.push('Guitar has no notes');
        return { valid: false, errors };
    }
    const avg = pitches.reduce((a, b) => a + b, 0) / pitches.length;
    if (avg > 79)
        errors.push('Guitar tessitura too high');
    if (avg < 48)
        errors.push('Guitar tessitura too low');
    const hasMelody = plan.perBar.some((b) => b.textureMix.some((t) => t.type === 'melody' && t.weight > 0));
    const hasDyad = plan.perBar.some((b) => b.textureMix.some((t) => t.type === 'dyad' && t.weight > 0));
    if (!hasMelody || !hasDyad)
        errors.push('Guitar texture mix must include melody and dyads');
    return { valid: errors.length === 0, errors };
}
function validateBassBehaviour(score, plan) {
    const errors = [];
    const pitches = extractBassPitches(score);
    if (pitches.length === 0) {
        errors.push('Bass has no notes');
        return { valid: false, errors };
    }
    const avg = pitches.reduce((a, b) => a + b, 0) / pitches.length;
    if (avg > 55)
        errors.push('Bass tessitura too high');
    if (avg < 28)
        errors.push('Bass tessitura too low');
    const hasAnchor = plan.perBar.every((b) => b.harmonicAnchor);
    if (!hasAnchor)
        errors.push('Bass harmonic anchor weak');
    return { valid: errors.length === 0, errors };
}
