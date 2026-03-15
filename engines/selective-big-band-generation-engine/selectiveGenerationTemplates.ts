/**
 * Selective Big-Band Generation Engine — Note-level templates
 */

import type { GeneratedUnit, TargetType } from './selectiveGenerationTypes';

const ROOT_SEMI: Record<string, number> = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const INTERVALS_MAJ7 = [0, 4, 7, 11];
const INTERVALS_MIN7 = [0, 3, 7, 10];
const INTERVALS_DOM7 = [0, 4, 7, 10];
const INTERVALS_MAJ = [0, 4, 7];

function chordToSemitones(chord: string): number[] {
  const m = chord.match(/^([A-Ga-g][#b]?)\s*(.*)$/);
  const rootStr = (m?.[1] ?? 'C').replace(/b/g, 'b').replace(/^([a-g])/, (x) => x.toUpperCase());
  const root = ROOT_SEMI[rootStr] ?? ROOT_SEMI[rootStr.charAt(0)] ?? 0;
  const suffix = (m?.[2] ?? 'maj').toLowerCase();
  const intervals = suffix.includes('m7') || suffix.includes('-7') ? INTERVALS_MIN7
    : suffix.includes('7') && !suffix.includes('maj') ? INTERVALS_DOM7
    : suffix.includes('maj') ? INTERVALS_MAJ7 : INTERVALS_MAJ;
  return intervals.map((i) => (root + i) % 12);
}

const PITCH_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

function semitoneToPitch(semi: number, octave: number): string {
  const name = PITCH_NAMES[semi % 12];
  const oct = octave + Math.floor(semi / 12);
  return `${name}${oct}`;
}

export function createBackgroundFigure(
  section: string,
  startBar: number,
  length: number,
  chord: string,
  density: string,
  staffIds: string[],
  rnd: () => number
): GeneratedUnit {
  const semitones = chordToSemitones(chord);
  const events: { bar: number; beat: number; duration: number; pitch: string; staffId: string }[] = [];
  const altoOct = 4;
  const tenorOct = 3;
  for (let b = 0; b < length; b++) {
    const bar = startBar + b;
    const idx = Math.floor(rnd() * semitones.length);
    const semi = semitones[idx];
    const pitch1 = semitoneToPitch(semi, altoOct);
    const pitch2 = semitoneToPitch(semitones[(idx + 2) % semitones.length], tenorOct);
    events.push({ bar, beat: 0, duration: 4, pitch: pitch1, staffId: staffIds[0] ?? 'P1' });
    if (rnd() < 0.6) events.push({ bar, beat: 2, duration: 4, pitch: pitch2, staffId: staffIds[1] ?? 'P3' });
  }
  return {
    barRange: { startBar, endBar: startBar + length - 1 },
    section,
    targetType: 'background_figures',
    density: density as any,
    notes: `Chord tones ${chord}, sustained support`,
    rhythmPattern: 'Half notes, beats 1 and 3',
    voicingHint: 'Saxes P1-P4, avoid lead register',
    confidence: 0.85,
    staffIds,
    noteEvents: events,
  };
}

export function createBrassPunctuation(
  section: string,
  startBar: number,
  chord: string,
  staffIds: string[],
  rnd: () => number
): GeneratedUnit {
  const semitones = chordToSemitones(chord);
  const semi = semitones[Math.floor(rnd() * Math.min(3, semitones.length))];
  const pitch = semitoneToPitch(semi, 4);
  const events = [
    { bar: startBar, beat: 0, duration: 1, pitch, staffId: staffIds[0] ?? 'P6' },
    { bar: startBar, beat: 0, duration: 1, pitch: semitoneToPitch(semitones[1] ?? semi, 3), staffId: staffIds[1] ?? 'P10' },
  ];
  return {
    barRange: { startBar, endBar: startBar },
    section,
    targetType: 'brass_punctuation',
    density: 'medium',
    notes: `Brass stab on ${chord}`,
    rhythmPattern: 'Quarter-note hit, beat 1',
    voicingHint: 'Trumpets + trombones, block chord',
    confidence: 0.9,
    staffIds,
    noteEvents: events,
  };
}

export function createSaxSoliTexture(
  section: string,
  startBar: number,
  length: number,
  chord: string,
  staffIds: string[],
  rnd: () => number
): GeneratedUnit {
  const semitones = chordToSemitones(chord);
  const events: { bar: number; beat: number; duration: number; pitch: string; staffId: string }[] = [];
  for (let b = 0; b < length; b++) {
    const bar = startBar + b;
    for (let s = 0; s < Math.min(4, staffIds.length); s++) {
      const semi = semitones[(b + s) % semitones.length];
      const oct = 4 - Math.floor(s / 2);
      events.push({ bar, beat: 0, duration: 4, pitch: semitoneToPitch(semi, oct), staffId: staffIds[s] ?? `P${s + 1}` });
    }
  }
  return {
    barRange: { startBar, endBar: startBar + length - 1 },
    section,
    targetType: 'sax_soli_texture',
    density: 'dense',
    notes: `Harmonized line on ${chord}`,
    rhythmPattern: 'Unison rhythm, 4-part block',
    voicingHint: 'Alto 1-2, Tenor 1-2, close voicing',
    confidence: 0.88,
    staffIds,
    noteEvents: events,
  };
}

export function createShoutRampMaterial(
  section: string,
  startBar: number,
  length: number,
  chord: string,
  phase: 'setup' | 'intensification' | 'arrival' | 'release',
  staffIds: string[],
  rnd: () => number
): GeneratedUnit {
  const semitones = chordToSemitones(chord);
  const events: { bar: number; beat: number; duration: number; pitch: string; staffId: string }[] = [];
  const dur = phase === 'arrival' ? 1 : phase === 'intensification' ? 2 : phase === 'setup' ? 4 : 2;
  const beat = phase === 'arrival' ? 0 : phase === 'intensification' ? (rnd() < 0.5 ? 0 : 2) : 0;
  for (let b = 0; b < length; b++) {
    const bar = startBar + b;
    const semi = semitones[Math.floor(rnd() * semitones.length)];
    events.push({ bar, beat, duration: dur, pitch: semitoneToPitch(semi, 4), staffId: staffIds[0] ?? 'P6' });
  }
  return {
    barRange: { startBar, endBar: startBar + length - 1 },
    section,
    targetType: 'shout_ramp_material',
    density: phase === 'arrival' ? 'tutti' : phase === 'intensification' ? 'dense' : 'medium',
    notes: `Shout ramp ${phase} — build-up figures`,
    rhythmPattern: phase === 'arrival' ? 'Downbeat hits' : 'Rhythmic figures',
    voicingHint: 'Full brass',
    confidence: 0.87,
    staffIds,
    noteEvents: events,
  };
}
