"use strict";
/**
 * Composer OS V2 — Lock validation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateLockIntegrity = validateLockIntegrity;
function arraysEqual(a, b) {
    if (a.length !== b.length)
        return false;
    return a.every((v, i) => v === b[i]);
}
function validateLockIntegrity(originalScore, regeneratedScore, lockContext) {
    const errors = [];
    const { locks, snapshot } = lockContext;
    if (locks.melody && snapshot.melody) {
        const guitar = regeneratedScore.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
        if (!guitar)
            errors.push('Lock integrity: melody part missing');
        else {
            for (const [bar, origPitches] of snapshot.melody.pitchesByBar) {
                const m = guitar.measures.find((me) => me.index === bar);
                const newPitches = m?.events
                    .filter((e) => e.kind === 'note')
                    .map((e) => e.pitch) ?? [];
                if (!arraysEqual(origPitches, newPitches)) {
                    errors.push(`Lock integrity: melody changed in bar ${bar}`);
                }
            }
        }
    }
    if (locks.bass && snapshot.bass) {
        const bass = regeneratedScore.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
        if (!bass)
            errors.push('Lock integrity: bass part missing');
        else {
            for (const [bar, origPitches] of snapshot.bass.pitchesByBar) {
                const m = bass.measures.find((me) => me.index === bar);
                const newPitches = m?.events
                    .filter((e) => e.kind === 'note')
                    .map((e) => e.pitch) ?? [];
                if (!arraysEqual(origPitches, newPitches)) {
                    errors.push(`Lock integrity: bass changed in bar ${bar}`);
                }
            }
        }
    }
    if (locks.harmony && snapshot.harmony) {
        const chordByBar = new Map();
        for (const p of regeneratedScore.parts) {
            for (const m of p.measures) {
                if (m.chord)
                    chordByBar.set(m.index, m.chord);
            }
        }
        for (const [bar, origChord] of snapshot.harmony.chordByBar) {
            if (chordByBar.get(bar) !== origChord) {
                errors.push(`Lock integrity: harmony changed in bar ${bar}`);
            }
        }
    }
    return { valid: errors.length === 0, errors };
}
