import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import { parseChordSymbol } from '../core/harmony/chordSymbolAnalysis';

const text = 'D/F# | G/B | Cmaj7/E | A7alt | D/F# | G/B | Cmaj7/E | A7alt';
const r = runGoldenPath(61, { chordProgressionText: text });
console.log('success', r.success, r.errors);
const bass = r.score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
const m1 = bass?.measures.find((x) => x.index === 1);
console.log('chord', m1?.chord, 'parse', m1?.chord ? parseChordSymbol(m1.chord) : null);
console.log('events', JSON.stringify(m1?.events));
