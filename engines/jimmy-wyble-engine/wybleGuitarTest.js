"use strict";
/**
 * Jimmy Wyble Engine — Guitar-specific auto-test suite
 * Measures idiomatic guitar behaviour to establish a baseline for generator improvements.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeGuitarIdiomScore = computeGuitarIdiomScore;
const wybleEngine_1 = require("./wybleEngine");
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
function midiToNote(midi) {
    return `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}
const TEST_CONTEXTS = [
    {
        name: 'ii–V–I',
        harmonicContext: {
            chords: [
                { root: 'D', quality: 'm7', bars: 2 },
                { root: 'G', quality: '7', bars: 2 },
                { root: 'C', quality: 'maj7', bars: 4 },
            ],
            key: 'C',
        },
    },
    {
        name: 'minor ii–V–I',
        harmonicContext: {
            chords: [
                { root: 'E', quality: 'm7', bars: 2 },
                { root: 'A', quality: '7', bars: 2 },
                { root: 'D', quality: 'm', bars: 4 },
            ],
            key: 'D',
        },
    },
    {
        name: 'modal vamp (D Dorian)',
        harmonicContext: {
            chords: [{ root: 'D', quality: 'm', bars: 8 }],
            key: 'D',
        },
    },
    {
        name: 'chromatic dominant chain',
        harmonicContext: {
            chords: [
                { root: 'A', quality: '7', bars: 2 },
                { root: 'Ab', quality: '7', bars: 2 },
                { root: 'G', quality: '7', bars: 2 },
                { root: 'C', quality: 'maj7', bars: 2 },
            ],
            key: 'C',
        },
    },
];
const VERTICAL_IDEAL_MIN = 10;
const VERTICAL_IDEAL_MAX = 17;
const VERTICAL_WARNING_MAX = 21;
const POSITION_WINDOW_FRETS = 7;
const STRING_JUMP_MAX = 2;
const THIRDS = new Set([3, 4]);
const SIXTHS = new Set([8, 9]);
const TENTHS = new Set([15, 16, 17]);
function midiToGuitarStringIndex(midi) {
    if (midi >= 64)
        return 0;
    if (midi >= 59)
        return 1;
    if (midi >= 55)
        return 2;
    if (midi >= 50)
        return 3;
    if (midi >= 45)
        return 4;
    return 5;
}
function classifyInterval(semitones) {
    if (TENTHS.has(semitones))
        return '10th';
    if (THIRDS.has(semitones))
        return '3rd';
    if (SIXTHS.has(semitones))
        return '6th';
    const mod = semitones % 12;
    if (THIRDS.has(mod))
        return '3rd';
    if (SIXTHS.has(mod))
        return '6th';
    return 'other';
}
function evaluateVerticalSpan(output) {
    const upperDyads = output.upper_line.events.filter(e => e.isDyad);
    const lowerDyads = output.lower_line.events.filter(e => e.isDyad);
    let ideal = 0;
    let warnings = 0;
    let violations = 0;
    for (let i = 0; i < Math.min(upperDyads.length, lowerDyads.length); i++) {
        const interval = Math.abs(upperDyads[i].pitch - lowerDyads[i].pitch);
        if (interval >= VERTICAL_IDEAL_MIN && interval <= VERTICAL_IDEAL_MAX)
            ideal++;
        else if (interval <= VERTICAL_WARNING_MAX)
            warnings++;
        else
            violations++;
    }
    const total = Math.min(upperDyads.length, lowerDyads.length) || 1;
    const penalty = violations * 2 + warnings * 0.5;
    const score = Math.max(0, 10 - (penalty / total) * 10);
    return { ideal, warnings, violations, score };
}
function evaluatePositionWindow(output) {
    const upperPitches = output.upper_line.events.map(e => e.pitch);
    const lowerPitches = output.lower_line.events.map(e => e.pitch);
    const upperSpan = upperPitches.length > 0 ? Math.max(...upperPitches) - Math.min(...upperPitches) : 0;
    const lowerSpan = lowerPitches.length > 0 ? Math.max(...lowerPitches) - Math.min(...lowerPitches) : 0;
    let violations = 0;
    if (upperSpan > POSITION_WINDOW_FRETS)
        violations++;
    if (lowerSpan > POSITION_WINDOW_FRETS)
        violations++;
    const score = violations === 0 ? 10 : Math.max(0, 10 - violations * 5);
    return { violations, score };
}
function evaluateDyadIntervalTypes(output) {
    const upperDyads = output.upper_line.events.filter(e => e.isDyad);
    const lowerDyads = output.lower_line.events.filter(e => e.isDyad);
    const stats = {
        thirds: 0,
        sixths: 0,
        tenths: 0,
        other: 0,
        total: 0,
        thirdsPct: 0,
        sixthsPct: 0,
        tenthsPct: 0,
    };
    for (let i = 0; i < Math.min(upperDyads.length, lowerDyads.length); i++) {
        const interval = Math.abs(upperDyads[i].pitch - lowerDyads[i].pitch);
        const type = classifyInterval(interval);
        if (type === '3rd')
            stats.thirds++;
        else if (type === '6th')
            stats.sixths++;
        else if (type === '10th')
            stats.tenths++;
        else
            stats.other++;
        stats.total++;
    }
    if (stats.total > 0) {
        stats.thirdsPct = (stats.thirds / stats.total) * 100;
        stats.sixthsPct = (stats.sixths / stats.total) * 100;
        stats.tenthsPct = (stats.tenths / stats.total) * 100;
    }
    const preferredPct = stats.total > 0
        ? (stats.thirds + stats.sixths + stats.tenths) / stats.total
        : 1;
    const score = Math.min(10, preferredPct * 12);
    return { stats, score };
}
function evaluateStringSet(output) {
    const upperDyads = output.upper_line.events.filter(e => e.isDyad);
    const lowerDyads = output.lower_line.events.filter(e => e.isDyad);
    let violations = 0;
    for (let i = 0; i < Math.min(upperDyads.length, lowerDyads.length); i++) {
        const strIdxU = midiToGuitarStringIndex(upperDyads[i].pitch);
        const strIdxL = midiToGuitarStringIndex(lowerDyads[i].pitch);
        const skip = Math.abs(strIdxU - strIdxL);
        if (skip > STRING_JUMP_MAX)
            violations++;
    }
    const total = Math.min(upperDyads.length, lowerDyads.length) || 1;
    const score = Math.max(0, 10 - (violations / total) * 10);
    return { violations, score };
}
function computeGuitarIdiomScore(output) {
    const vertical = evaluateVerticalSpan(output);
    const position = evaluatePositionWindow(output);
    const dyad = evaluateDyadIntervalTypes(output);
    const stringSet = evaluateStringSet(output);
    const total = (vertical.score + position.score + dyad.score + stringSet.score) / 4;
    return {
        score: {
            verticalSpan: Math.round(vertical.score * 10) / 10,
            positionWindow: Math.round(position.score * 10) / 10,
            dyadTypes: Math.round(dyad.score * 10) / 10,
            stringSet: Math.round(stringSet.score * 10) / 10,
            total: Math.round(total * 10) / 10,
        },
        violations: {
            verticalSpanViolations: vertical.violations,
            verticalSpanWarnings: vertical.warnings,
            positionWindowViolations: position.violations,
            stringJumpViolations: stringSet.violations,
        },
        dyadStats: dyad.stats,
    };
}
function formatStudy(output) {
    const upper = output.upper_line.events.map(e => midiToNote(e.pitch)).join(' ');
    const lower = output.lower_line.events.map(e => midiToNote(e.pitch)).join(' ');
    const harmony = output.implied_harmony
        .slice(0, 8)
        .map(h => `${h.chord}@${h.bar}.${h.beat}`)
        .join(', ');
    return `UPPER: ${upper}\nLOWER: ${lower}\nHARMONY: ${harmony}`;
}
function main() {
    const allOutputs = [];
    const allScores = [];
    const allViolations = [];
    const allDyadStats = [];
    let bestOutput = null;
    let bestScore = -1;
    const runsPerContext = 20;
    for (const ctx of TEST_CONTEXTS) {
        for (let i = 0; i < runsPerContext; i++) {
            const params = {
                harmonicContext: ctx.harmonicContext,
                phraseLength: 8,
                independenceBias: 0.8,
                contraryMotionBias: 0.7,
                dyadDensity: 0.6,
                chromaticismLevel: 0.2,
            };
            const output = (0, wybleEngine_1.generateWybleEtude)(params);
            const { score, violations, dyadStats } = computeGuitarIdiomScore(output);
            allOutputs.push(output);
            allScores.push(score);
            allViolations.push(violations);
            allDyadStats.push(dyadStats);
            if (score.total > bestScore) {
                bestScore = score.total;
                bestOutput = output;
            }
        }
    }
    const totalStudies = allOutputs.length;
    const avgScore = allScores.reduce((a, s) => a + s.total, 0) / totalStudies;
    const best = Math.max(...allScores.map(s => s.total));
    const worst = Math.min(...allScores.map(s => s.total));
    const totalVerticalViolations = allViolations.reduce((a, v) => a + v.verticalSpanViolations, 0);
    const totalVerticalWarnings = allViolations.reduce((a, v) => a + v.verticalSpanWarnings, 0);
    const totalPositionViolations = allViolations.reduce((a, v) => a + v.positionWindowViolations, 0);
    const totalStringJumps = allViolations.reduce((a, v) => a + v.stringJumpViolations, 0);
    const totalDyads = allDyadStats.reduce((a, d) => a + d.total, 0);
    const totalThirds = allDyadStats.reduce((a, d) => a + d.thirds, 0);
    const totalSixths = allDyadStats.reduce((a, d) => a + d.sixths, 0);
    const totalTenths = allDyadStats.reduce((a, d) => a + d.tenths, 0);
    const thirdsPct = totalDyads > 0 ? (totalThirds / totalDyads) * 100 : 0;
    const sixthsPct = totalDyads > 0 ? (totalSixths / totalDyads) * 100 : 0;
    const tenthsPct = totalDyads > 0 ? (totalTenths / totalDyads) * 100 : 0;
    console.log('\n========== WYBLE GUITAR IDIOM BASELINE ==========\n');
    console.log(`Total studies: ${totalStudies}`);
    console.log(`Average score: ${avgScore.toFixed(2)}`);
    console.log(`Best score: ${best.toFixed(2)}`);
    console.log(`Worst score: ${worst.toFixed(2)}`);
    console.log('\nViolations detected:');
    console.log(`  - Vertical span (>21 semitones): ${totalVerticalViolations}`);
    console.log(`  - Vertical span warnings (18–21): ${totalVerticalWarnings}`);
    console.log(`  - Position window (>7 fret span): ${totalPositionViolations}`);
    console.log(`  - String jumps (>2 strings): ${totalStringJumps}`);
    console.log('\nDyad interval distribution:');
    console.log(`  - 3rds: ${thirdsPct.toFixed(1)}%`);
    console.log(`  - 6ths: ${sixthsPct.toFixed(1)}%`);
    console.log(`  - 10ths: ${tenthsPct.toFixed(1)}%`);
    console.log(`  - Other: ${(100 - thirdsPct - sixthsPct - tenthsPct).toFixed(1)}%`);
    console.log('\n--- Highest scoring example study ---\n');
    if (bestOutput) {
        console.log(formatStudy(bestOutput));
    }
    console.log('\n========== END REPORT ==========\n');
}
main();
