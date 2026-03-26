"use strict";
/**
 * Jimmy Wyble Engine — Example driver
 * Generates a sample two-line contrapuntal guitar study
 */
Object.defineProperty(exports, "__esModule", { value: true });
const wybleEngine_1 = require("./wybleEngine");
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
function midiToNote(midi) {
    const name = NOTE_NAMES[midi % 12];
    const octave = Math.floor(midi / 12) - 1;
    return `${name}${octave}`;
}
function formatLine(events) {
    return events.map(e => midiToNote(e.pitch)).join(' ');
}
function main() {
    const parameters = {
        harmonicContext: {
            chords: [
                { root: 'D', quality: 'm7', bars: 2 },
                { root: 'G', quality: '7', bars: 2 },
                { root: 'C', quality: 'maj7', bars: 4 },
            ],
            key: 'C',
        },
        phraseLength: 8,
        independenceBias: 0.8,
        contraryMotionBias: 0.7,
        dyadDensity: 0.6,
        chromaticismLevel: 0.2,
    };
    const output = (0, wybleEngine_1.generateWybleEtude)(parameters);
    console.log('\n--- WYBLE ETUDE OUTPUT ---\n');
    console.log('UPPER LINE');
    console.log(formatLine(output.upper_line.events));
    console.log('\nLOWER LINE');
    console.log(formatLine(output.lower_line.events));
    console.log('\nIMPLIED HARMONY');
    output.implied_harmony.forEach(h => {
        console.log(`  Bar ${h.bar} beat ${h.beat}: ${h.chord} (${(h.confidence * 100).toFixed(0)}%)`);
    });
    console.log('\n--- END ---\n');
}
main();
