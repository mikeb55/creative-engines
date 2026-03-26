"use strict";
/**
 * Ellington Orchestration Engine — Progression parsing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseProgression = parseProgression;
function parseProgression(input) {
    if (Array.isArray(input)) {
        return input.map((s) => ({
            chord: typeof s === 'string' ? s : s.chord,
            bars: typeof s === 'object' && 'bars' in s ? s.bars : 2,
        }));
    }
    if (typeof input !== 'string')
        return [];
    const parts = input.split(/[\s,;|]+/).filter(Boolean);
    const result = [];
    for (const p of parts) {
        const match = p.match(/^([A-Ga-g][#b]?(?:maj7|min7|m7|7|m|dom7|m7b5|6|m6)?)(?:\*(\d+))?$/);
        if (match) {
            result.push({
                chord: match[1],
                bars: match[2] ? parseInt(match[2], 10) : 2,
            });
        }
    }
    return result.length > 0 ? result : [{ chord: 'Cmaj7', bars: 4 }];
}
