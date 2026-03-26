"use strict";
/**
 * Composer OS V2 — Rhythm behaviour validation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRhythmBehaviour = validateRhythmBehaviour;
function countOnBeatOffBeat(score) {
    let onBeat = 0;
    let offBeat = 0;
    for (const part of score.parts) {
        for (const m of part.measures) {
            for (const e of m.events) {
                if (e.kind !== 'note')
                    continue;
                const beat = e.startBeat;
                const isOnBeat = Math.abs(beat - Math.floor(beat)) < 0.01 && [0, 1, 2, 3].includes(Math.round(beat));
                if (isOnBeat)
                    onBeat++;
                else
                    offBeat++;
            }
        }
    }
    return { onBeat, offBeat };
}
function validateRhythmBehaviour(score, constraints) {
    const errors = [];
    const { onBeat, offBeat } = countOnBeatOffBeat(score);
    const total = onBeat + offBeat;
    if (total === 0)
        return { valid: true, errors: [] };
    const offBeatRatio = offBeat / total;
    if ((constraints.mode === 'swing' || constraints.mode === 'hybrid') && constraints.offbeatWeight > 0.3) {
        if (offBeatRatio < 0.05 && total > 8)
            errors.push('Phrasing too square for swing/hybrid mode');
    }
    if (constraints.mode === 'straight' && offBeatRatio > 0.6)
        errors.push('Too many off-beats for straight mode');
    return { valid: errors.length === 0, errors };
}
