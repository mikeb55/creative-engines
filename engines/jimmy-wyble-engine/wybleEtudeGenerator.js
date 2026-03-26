"use strict";
/**
 * Wyble Etude Generator
 * Converts chord progressions into playable two-line guitar studies using the Wyble engine.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateWybleEtudeFromProgression = generateWybleEtudeFromProgression;
const wybleEngine_1 = require("./wybleEngine");
function parseChordSymbol(symbol) {
    const match = symbol.match(/^([A-G][#b]?)(maj7|min7|m7|7|m|dom7)?/i);
    if (!match)
        return { root: 'C', quality: 'maj' };
    let q = (match[2] ?? 'maj').toLowerCase();
    if (q === 'm7' || q === 'min7')
        q = 'min';
    if (q === '7' || q === 'dom7')
        q = 'dom';
    if (q === 'maj7')
        q = 'maj';
    return { root: match[1], quality: q };
}
function progressionToHarmonicContext(progression, key) {
    const chords = progression.map(({ chord, bars }) => {
        const { root, quality } = parseChordSymbol(chord);
        return { root, quality, bars };
    });
    return { chords, key };
}
/**
 * Generate a two-line guitar etude from a chord progression.
 */
function generateWybleEtudeFromProgression(progression, options) {
    const bars = progression.reduce((sum, seg) => sum + seg.bars, 0);
    const phraseLength = options?.phraseLength ?? bars;
    const { chords, key } = progressionToHarmonicContext(progression, options?.key);
    const output = (0, wybleEngine_1.generateWybleEtude)({
        harmonicContext: { chords, key },
        phraseLength,
        independenceBias: 0.8,
        contraryMotionBias: 0.7,
        dyadDensity: 0.6,
        chromaticismLevel: 0.2,
    });
    return {
        upper_line: output.upper_line,
        lower_line: output.lower_line,
        implied_harmony: output.implied_harmony,
        bars,
    };
}
