"use strict";
/**
 * Ellington Orchestration Engine — Voicing logic
 * Close saxes, wide trumpets, grounded trombones. Min 3 notes per section. Voice leading.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.drop2Voicing = drop2Voicing;
exports.saxSoliVoicing = saxSoliVoicing;
exports.trumpetLeadVoicing = trumpetLeadVoicing;
exports.tromboneSupportVoicing = tromboneSupportVoicing;
exports.rhythmGuideTones = rhythmGuideTones;
exports.generateSectionVoicings = generateSectionVoicings;
const instrumentRanges_1 = require("./instrumentRanges");
const ROOT_MIDI = {
    C: 60, 'C#': 61, Db: 61, D: 62, 'D#': 63, Eb: 63, E: 64, F: 65,
    'F#': 66, Gb: 66, G: 67, 'G#': 68, Ab: 68, A: 69, 'A#': 70, Bb: 70, B: 71,
};
const CHORD_TONES = {
    maj: [0, 4, 7, 11],
    min: [0, 3, 7, 10],
    dom: [0, 4, 7, 10],
    m7b5: [0, 3, 6, 10],
    m6: [0, 3, 7, 9],
    '6': [0, 4, 7, 9],
};
const MIN_SECTION_NOTES = 3;
const SAX_NOTES = 4;
function parseChord(chord) {
    const base = chord.split('/')[0];
    const m = base.match(/^([A-Ga-g][#b]?)(maj7#11|maj7b5|maj13|maj7|min7|m7|m9|7|#11|11|dom7|m7b5|m6|6)?/i);
    if (!m)
        return { root: 'C', quality: 'maj' };
    let q = (m[2] || 'maj').toLowerCase();
    if (q === 'm7' || q === 'min7' || q === 'm9')
        q = 'min';
    if (q === '7' || q === 'dom7' || q === '11' || q === '#11')
        q = 'dom';
    if (q === 'maj7' || q === 'maj7#11' || q === 'maj7b5' || q === 'maj13')
        q = 'maj';
    const root = m[1].charAt(0).toUpperCase() + (m[1].slice(1) || '');
    return { root, quality: q };
}
function getChordTones(chord, octave) {
    const { root, quality } = parseChord(chord);
    const base = ROOT_MIDI[root] ?? 60;
    const rootMidi = base + (octave - 4) * 12;
    const degrees = CHORD_TONES[quality] ?? CHORD_TONES.maj;
    return degrees.map((d) => rootMidi + d);
}
/** Simple sustained chord tone for empty-bar fallback (root or 3rd). */
function simpleChordTone(chord, octave) {
    const tones = getChordTones(chord, octave);
    return tones.length > 0 ? [tones[0], tones[1] ?? tones[0], tones[2] ?? tones[0]] : [60];
}
function enforceRange(tones, [min, max]) {
    return tones.map((t) => (0, instrumentRanges_1.clamp)(t, min, max));
}
function removeUnisons(tones) {
    const seen = new Set();
    return tones.filter((t) => {
        if (seen.has(t))
            return false;
        seen.add(t);
        return true;
    });
}
function ensureMinDensity(tones, chord, octave, band, minNotes = MIN_SECTION_NOTES) {
    const distinct = removeUnisons(tones);
    if (distinct.length >= minNotes)
        return enforceRange(tones, band);
    const fallback = simpleChordTone(chord, octave);
    const padded = [...distinct];
    for (let i = distinct.length; i < minNotes && fallback[i % fallback.length]; i++) {
        const c = (0, instrumentRanges_1.clamp)(fallback[i % fallback.length], band[0], band[1]);
        if (!padded.includes(c))
            padded.push(c);
    }
    return enforceRange(padded.length > 0 ? padded : tones, band);
}
/** Drop-2: take 4-note close voicing, drop 2nd from top down an octave */
function drop2Voicing(chord, octave) {
    const tones = getChordTones(chord, octave);
    if (tones.length < 4)
        return tones;
    const [bass, mid1, mid2, soprano] = tones;
    return removeUnisons([bass - 12, mid1, mid2, soprano].sort((a, b) => a - b)).slice(0, 4);
}
/** Sax soli: close-ish voicing, stepwise spacing. Bari lowest, Altos top. 4 notes + Bari=min. */
function saxSoliVoicing(chord, octave) {
    const tones = getChordTones(chord, octave);
    if (tones.length < 4)
        return ensureMinDensity(tones, chord, octave, instrumentRanges_1.SECTION_BANDS.altos);
    const [root, third, fifth, seventh] = tones;
    const close = removeUnisons([root + 12, third + 12, fifth + 12, seventh + 12].sort((a, b) => a - b));
    const clamped = enforceRange(close, instrumentRanges_1.SECTION_BANDS.altos);
    const out = clamped.length >= 4
        ? [clamped[3], clamped[2], clamped[1], clamped[0]]
        : clamped;
    return ensureMinDensity(out, chord, octave, instrumentRanges_1.SECTION_BANDS.altos, SAX_NOTES);
}
/** Trumpet lead: wider spacing, top note clearly highest. 4 notes. */
function trumpetLeadVoicing(chord, octave, leadNote) {
    const tones = getChordTones(chord, octave);
    if (tones.length < 4)
        return ensureMinDensity(tones, chord, octave, instrumentRanges_1.SECTION_BANDS.trumpets);
    const top = leadNote ?? Math.max(...tones) + 12;
    const topPc = top % 12;
    const support = tones.filter((t) => (t % 12) !== topPc);
    const spread = [
        top,
        (support[0] ?? tones[0]) + 12,
        support[1] ?? tones[1],
        (support[2] ?? tones[2]) - 12,
    ].sort((a, b) => b - a);
    const distinct = removeUnisons(spread);
    return ensureMinDensity(enforceRange(distinct, instrumentRanges_1.SECTION_BANDS.trumpets), chord, octave, instrumentRanges_1.SECTION_BANDS.trumpets);
}
/** Trombone support: grounded mid-low cluster. Drop-2 style, lower register. */
function tromboneSupportVoicing(chord, octave) {
    const tones = getChordTones(chord, octave - 1);
    if (tones.length < 4)
        return ensureMinDensity(tones, chord, octave - 1, instrumentRanges_1.SECTION_BANDS.trombones);
    const [bass, mid1, mid2, soprano] = tones;
    const cluster = [bass - 12, mid1, mid2, soprano].sort((a, b) => a - b);
    const distinct = removeUnisons(cluster);
    return ensureMinDensity(enforceRange(distinct, instrumentRanges_1.SECTION_BANDS.trombones), chord, octave - 1, instrumentRanges_1.SECTION_BANDS.trombones);
}
/** Rhythm guide tones: 3rd and 7th. Bass gets root separately. */
function rhythmGuideTones(chord, octave) {
    const tones = getChordTones(chord, octave);
    const third = tones[1];
    const seventh = tones[3] ?? tones[2];
    return enforceRange([third, seventh], instrumentRanges_1.SECTION_BANDS.piano);
}
/** Voice lead: move each voice to nearest chord tone, avoid large jumps. */
function voiceLeadSmooth(prev, next) {
    if (prev.length === 0 || next.length === 0)
        return next;
    const out = [];
    const used = new Set();
    for (let i = 0; i < next.length; i++) {
        const prevN = prev[Math.min(i, prev.length - 1)];
        const available = next.filter((n) => !used.has(n));
        if (available.length === 0)
            break;
        const best = available.reduce((a, b) => Math.abs(b - prevN) < Math.abs(a - prevN) ? b : a);
        out.push(best);
        used.add(best);
    }
    return out.length > 0 ? out : next;
}
function generateSectionVoicings(progression, section, seed) {
    const result = [];
    let bar = 1;
    let lastPitches = [];
    for (const seg of progression) {
        for (let b = 0; b < seg.bars; b++) {
            let pitches;
            switch (section) {
                case 'trumpets':
                    pitches = trumpetLeadVoicing(seg.chord, 5);
                    break;
                case 'trombones':
                    pitches = tromboneSupportVoicing(seg.chord, 4);
                    break;
                case 'saxes':
                    pitches = saxSoliVoicing(seg.chord, 4);
                    break;
                case 'rhythm':
                    pitches = rhythmGuideTones(seg.chord, 4);
                    break;
                default:
                    pitches = drop2Voicing(seg.chord, 4);
            }
            if (pitches.length === 0) {
                pitches = simpleChordTone(seg.chord, 4);
            }
            if (lastPitches.length > 0) {
                pitches = voiceLeadSmooth(lastPitches, pitches);
            }
            const distinct = removeUnisons(pitches);
            pitches = distinct.length > 0 ? distinct : pitches;
            lastPitches = pitches;
            result.push({ bar, chord: seg.chord, pitches });
            bar++;
        }
    }
    return result;
}
