"use strict";
/**
 * Jimmy Wyble Engine — Generator (voices-first architecture)
 * 1. generateUpperVoice 2. generateLowerVoice 3. enforceCounterpoint
 * 4. deriveDyadsFromVoices 5. applyGuitarConstraints
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateWybleEtude = generateWybleEtude;
const UPPER_MIN = 64;
const UPPER_MAX = 76;
const LOWER_MIN = 48;
const LOWER_MAX = 60;
const VOICE_DISTANCE_MIN = 10;
const VOICE_DISTANCE_MAX = 17;
const VOICE_DISTANCE_REJECT = 18;
const PREFERRED_DYAD_INTERVALS = [3, 4, 8, 9, 10, 15, 16, 17];
const MAX_LEAP = 7;
const SCALE_DEGREES = {
    maj: [0, 2, 4, 5, 7, 9, 11],
    min: [0, 2, 3, 5, 7, 8, 10],
    dom: [0, 2, 4, 5, 7, 9, 10],
};
const ALTERED_DOMINANT_TONES = [1, 3, 6, 8];
const HALF_WHOLE_DIM = [0, 1, 3, 4, 6, 7, 9, 10];
const ROOT_MIDI = {
    C: 60, 'C#': 61, Db: 61, D: 62, 'D#': 63, Eb: 63, E: 64, F: 65,
    'F#': 66, Gb: 66, G: 67, 'G#': 68, Ab: 68, A: 69, 'A#': 70, Bb: 70, B: 71,
};
function getChordTones(root, quality, octave) {
    const rootMidi = ROOT_MIDI[root] ?? 60;
    const base = rootMidi + (octave - 4) * 12;
    const degrees = SCALE_DEGREES[quality] ?? SCALE_DEGREES.maj;
    return degrees.map(d => base + d);
}
function getChordTonesWithAltered(root, quality, octave, alteredBias) {
    const base = getChordTones(root, quality, octave);
    if (quality !== 'dom' || alteredBias <= 0)
        return base;
    const rootMidi = ROOT_MIDI[root] ?? 60;
    const baseRoot = rootMidi + (octave - 4) * 12;
    const altered = ALTERED_DOMINANT_TONES.map(d => baseRoot + d);
    const hw = HALF_WHOLE_DIM.map(d => baseRoot + d);
    const extra = Math.random() < alteredBias ? altered : hw;
    return [...new Set([...base, ...extra])];
}
function parseChord(chord) {
    const match = chord.match(/^([A-G][#b]?)(maj7|min7|m7|7|m|dom7)?/i);
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
function normalizeQuality(q) {
    const s = q.toLowerCase();
    if (s === 'm7' || s === 'min7')
        return 'min';
    if (s === '7' || s === 'dom7')
        return 'dom';
    if (s === 'maj7')
        return 'maj';
    return s;
}
function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}
function getChordForBeat(chords, beatIndex, beatsPerBar) {
    const bar = Math.floor(beatIndex / beatsPerBar);
    let chordIndex = 0;
    let acc = 0;
    for (let i = 0; i < chords.length; i++) {
        const ch = chords[i];
        const bars = typeof ch === 'object' && 'bars' in ch
            ? ch.bars
            : Math.max(1, Math.ceil(32 / chords.length));
        if (bar < acc + bars) {
            chordIndex = i;
            break;
        }
        acc += bars;
    }
    const chord = chords[Math.min(chordIndex, chords.length - 1)] ?? chords[0];
    return typeof chord === 'string'
        ? parseChord(chord)
        : { root: chord.root, quality: normalizeQuality(chord.quality) };
}
function generateUpperVoice(totalBeats, chords, params) {
    const { motifSeed, chromaticismLevel = 0.2, alteredDominantBias = 0 } = params;
    const beatsPerBar = 4;
    const upper = [];
    let last = motifSeed?.[0] ?? 67;
    for (let b = 0; b < totalBeats; b++) {
        const { root, quality } = getChordForBeat(chords, b, beatsPerBar);
        const chordTones = getChordTonesWithAltered(root, quality, 5, alteredDominantBias)
            .filter(t => t >= UPPER_MIN && t <= UPPER_MAX);
        const isStrongBeat = b % 2 === 0;
        let candidates = chordTones;
        if (chordTones.length === 0)
            candidates = [clamp(last, UPPER_MIN, UPPER_MAX)];
        const stepwise = candidates.filter(c => Math.abs(c - last) <= 2);
        const leap = candidates.filter(c => Math.abs(c - last) > 2 && Math.abs(c - last) <= MAX_LEAP);
        const pool = isStrongBeat
            ? (stepwise.length > 0 ? stepwise : candidates)
            : (stepwise.length > 0 ? stepwise : (leap.length > 0 ? leap : candidates));
        const nearest = pool.reduce((a, c) => Math.abs(c - last) < Math.abs(a - last) ? c : a);
        const next = clamp(nearest, UPPER_MIN, UPPER_MAX);
        upper.push(next);
        last = next;
    }
    return upper;
}
function getGuideTones(root, quality, octave) {
    const chordTones = getChordTones(root, quality, octave);
    const rootMidi = ROOT_MIDI[root] ?? 60;
    return chordTones.filter(t => {
        const pc = ((t - rootMidi) % 12 + 12) % 12;
        return pc === 3 || pc === 4 || pc === 10 || pc === 11;
    });
}
function generateLowerVoice(totalBeats, chords, upperPitches, params) {
    const { motifSeed, contraryMotionBias = 0.7, pedalToneEnabled = false } = params;
    const beatsPerBar = 4;
    const lower = [];
    let last = motifSeed?.[1] ?? 55;
    if (pedalToneEnabled && chords.length > 0) {
        const first = chords[0];
        const parsed = typeof first === 'string' ? parseChord(first) : { root: first.root, quality: 'maj' };
        const rootMidi = ROOT_MIDI[parsed.root] ?? 60;
        const pedal = clamp(rootMidi - 12, LOWER_MIN, LOWER_MAX);
        for (let b = 0; b < totalBeats; b++)
            lower.push(pedal);
        return lower;
    }
    for (let b = 0; b < totalBeats; b++) {
        const beatInBar = b % beatsPerBar;
        const isStrongBeat = beatInBar === 1 || beatInBar === 3;
        const { root, quality } = getChordForBeat(chords, b, beatsPerBar);
        const chordTones = getChordTones(root, quality, 3).filter(t => t >= LOWER_MIN && t <= LOWER_MAX);
        const guideTones = getGuideTones(root, quality, 3).filter(t => t >= LOWER_MIN && t <= LOWER_MAX);
        const upperNow = upperPitches[b];
        const strongBeatPool = guideTones.length > 0 ? guideTones : chordTones;
        const pool = isStrongBeat ? strongBeatPool : chordTones;
        const effectiveCandidates = (pool.length > 0 ? pool : chordTones).filter(t => t >= LOWER_MIN && t <= LOWER_MAX);
        const stepwise = effectiveCandidates.filter(c => Math.abs(c - last) <= 2);
        const candidates = stepwise.length > 0 ? stepwise : effectiveCandidates;
        if (candidates.length === 0) {
            lower.push(clamp(last, LOWER_MIN, LOWER_MAX));
            last = clamp(last, LOWER_MIN, LOWER_MAX);
            continue;
        }
        const useContrary = Math.random() < contraryMotionBias;
        const upperDir = upperNow - (b > 0 ? upperPitches[b - 1] : upperNow);
        const preferredDir = useContrary ? -Math.sign(upperDir || 1) : Math.sign(upperDir || 1);
        const byMotion = [...candidates].sort((a, b) => {
            const da = (a - last) * preferredDir;
            const db = (b - last) * preferredDir;
            return db - da;
        });
        const next = clamp(byMotion[0] ?? candidates[0], LOWER_MIN, LOWER_MAX);
        if (isStrongBeat && guideTones.length > 0) {
            const isGuideTone = guideTones.some(gt => (gt % 12) === (next % 12));
            if (!isGuideTone) {
                const guideChoice = guideTones.reduce((a, c) => Math.abs(c - last) < Math.abs(a - last) ? c : a);
                lower.push(clamp(guideChoice, LOWER_MIN, LOWER_MAX));
                last = clamp(guideChoice, LOWER_MIN, LOWER_MAX);
                continue;
            }
        }
        lower.push(next);
        last = next;
    }
    return lower;
}
function enforceCounterpoint(upper, lower) {
    const u = [...upper];
    const l = [...lower];
    for (let i = 1; i < u.length; i++) {
        const u1 = u[i - 1], u2 = u[i];
        const l1 = l[i - 1], l2 = l[i];
        const int1 = Math.abs(u1 - l1) % 12;
        const int2 = Math.abs(u2 - l2) % 12;
        const parallel5 = int1 === 7 && int2 === 7 && (u2 - u1) * (l2 - l1) > 0;
        const parallel8 = (int1 === 0 || int1 === 12) && (int2 === 0 || int2 === 12) && (u2 - u1) * (l2 - l1) > 0;
        if (parallel5 || parallel8) {
            const alt = l2 + (Math.random() < 0.5 ? 2 : -2);
            l[i] = clamp(alt, LOWER_MIN, LOWER_MAX);
        }
    }
    return { upper: u, lower: l };
}
function pickLowerForDyad(upper, lastLower, chordTones) {
    const preferred = PREFERRED_DYAD_INTERVALS.filter(iv => upper - iv >= LOWER_MIN && upper - iv <= LOWER_MAX);
    const candidates = preferred.length > 0 ? preferred.map(iv => upper - iv) : [12, 15, 16].map(iv => upper - iv).filter(l => l >= LOWER_MIN && l <= LOWER_MAX);
    if (candidates.length === 0)
        return clamp(upper - 12, LOWER_MIN, LOWER_MAX);
    const chordPcs = new Set(chordTones.map(t => t % 12));
    const inChord = candidates.filter(c => chordPcs.has(c % 12));
    const pool = inChord.length > 0 ? inChord : candidates;
    return pool.reduce((a, c) => Math.abs(c - lastLower) < Math.abs(a - lastLower) ? c : a);
}
function shouldUpperPlaySolo(beat, voiceRatioMode) {
    if (voiceRatioMode === 'two_to_one')
        return beat % 3 !== 2;
    if (voiceRatioMode === 'three_to_one')
        return beat % 4 !== 3;
    if (voiceRatioMode === 'one_to_one')
        return beat % 2 === 0;
    return beat % 2 === 0;
}
function deriveDyadsFromVoices(upper, lower, chords, beatsPerBar, dyadDensity, voiceRatioMode = 'mixed') {
    const upperEvents = [];
    const lowerEvents = [];
    const impliedHarmony = [];
    let lastLower = lower[0] ?? 55;
    for (let b = 0; b < upper.length; b++) {
        const bar = Math.floor(b / beatsPerBar);
        const beat = b % beatsPerBar;
        const isDyadBeat = beat === 1 || beat === 3;
        const useDyad = Math.random() < dyadDensity && isDyadBeat;
        const { root, quality } = getChordForBeat(chords, b, beatsPerBar);
        const chordTones = getChordTones(root, quality, 3);
        let upperPitch = upper[b];
        let lowerPitch = lower[b];
        if (useDyad) {
            const interval = upperPitch - lowerPitch;
            if (interval > VOICE_DISTANCE_REJECT || interval < VOICE_DISTANCE_MIN) {
                lowerPitch = pickLowerForDyad(upperPitch, lastLower, chordTones);
            }
            lastLower = lowerPitch;
            upperEvents.push({ pitch: upperPitch, duration: 1, beat, isDyad: true });
            lowerEvents.push({ pitch: lowerPitch, duration: 1, beat, isDyad: true });
            impliedHarmony.push({
                chord: `${root}${quality === 'maj' ? 'maj7' : quality === 'min' ? 'm7' : '7'}`,
                bar,
                beat,
                confidence: 0.8,
            });
        }
        else {
            const upperSolo = voiceRatioMode === 'mixed' ? beat % 2 === 0 : shouldUpperPlaySolo(beat, voiceRatioMode);
            if (upperSolo) {
                upperEvents.push({ pitch: upperPitch, duration: 1, beat, isDyad: false });
            }
            else {
                lowerEvents.push({ pitch: lowerPitch, duration: 1, beat, isDyad: false });
                lastLower = lowerPitch;
            }
        }
    }
    return { upperEvents, lowerEvents, impliedHarmony };
}
function applyGuitarConstraints(output) {
    const upperEvents = [...output.upper_line.events];
    const lowerEvents = [...output.lower_line.events];
    const upperDyads = upperEvents.filter(e => e.isDyad);
    const lowerDyads = lowerEvents.filter(e => e.isDyad);
    for (let i = 0; i < Math.min(upperDyads.length, lowerDyads.length); i++) {
        const ui = upperEvents.indexOf(upperDyads[i]);
        const li = lowerEvents.indexOf(lowerDyads[i]);
        if (ui < 0 || li < 0)
            continue;
        const u = upperEvents[ui];
        const l = lowerEvents[li];
        const interval = u.pitch - l.pitch;
        if (interval > VOICE_DISTANCE_REJECT || interval < 0) {
            const preferred = PREFERRED_DYAD_INTERVALS.find(iv => u.pitch - iv >= LOWER_MIN && u.pitch - iv <= LOWER_MAX) ?? 12;
            lowerEvents[li] = { ...l, pitch: clamp(u.pitch - preferred, LOWER_MIN, LOWER_MAX) };
        }
        else if (interval > 0 && interval < VOICE_DISTANCE_MIN) {
            lowerEvents[li] = { ...l, pitch: clamp(u.pitch - VOICE_DISTANCE_MIN, LOWER_MIN, LOWER_MAX) };
        }
    }
    return {
        upper_line: { events: upperEvents, register: 'upper' },
        lower_line: { events: lowerEvents, register: 'lower' },
        implied_harmony: output.implied_harmony,
    };
}
function generateWybleEtude(params) {
    const { harmonicContext, phraseLength = 8, dyadDensity = 0.6, voiceRatioMode = 'mixed', } = params;
    const beatsPerBar = 4;
    const totalBeats = phraseLength * beatsPerBar;
    const chords = harmonicContext.chords;
    const upperPitches = generateUpperVoice(totalBeats, chords, params);
    const lowerPitches = generateLowerVoice(totalBeats, chords, upperPitches, params);
    const { upper: u, lower: l } = enforceCounterpoint(upperPitches, lowerPitches);
    const { upperEvents, lowerEvents, impliedHarmony } = deriveDyadsFromVoices(u, l, chords, beatsPerBar, dyadDensity, voiceRatioMode);
    const rawOutput = {
        upper_line: { events: upperEvents, register: 'upper' },
        lower_line: { events: lowerEvents, register: 'lower' },
        implied_harmony: impliedHarmony,
    };
    return applyGuitarConstraints(rawOutput);
}
