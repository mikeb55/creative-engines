/**
 * Ellington Measure-First Generator
 * Algorithm: for chord in progression → determine lead voice → build section voicing → create sustained bar events
 * Returns orchestral measures.
 */

import type { Score, Measure } from '../../shared/scoreModel';
import { composeMeasure } from '../../shared/barComposer';
import { generateSectionVoicings } from './ellingtonVoicings';
import { parseProgression } from './ellingtonProgressions';
import type { ChordSegment } from './ellingtonTypes';

const INSTRUMENT_RANGES: Record<string, [number, number]> = {
  'Alto Sax 1': [55, 79], 'Alto Sax 2': [55, 79],
  'Tenor Sax 1': [46, 70], 'Tenor Sax 2': [46, 70],
  'Baritone Sax': [36, 63],
  'Trumpet 1': [55, 84], 'Trumpet 2': [52, 81], 'Trumpet 3': [48, 76], 'Trumpet 4': [48, 72],
  'Trombone 1': [41, 70], 'Trombone 2': [38, 67], 'Trombone 3': [36, 65], 'Bass Trombone': [34, 58],
  'Piano': [36, 84], 'Bass': [28, 55], 'Drums': [0, 0],
};

const INSTRUMENTS: Array<{ id: string; name: string; transposition: number; section: string; sectionIndex: number }> = [
  { id: 'P1', name: 'Alto Sax 1', transposition: 9, section: 'saxes', sectionIndex: 0 },
  { id: 'P2', name: 'Alto Sax 2', transposition: 9, section: 'saxes', sectionIndex: 1 },
  { id: 'P3', name: 'Tenor Sax 1', transposition: 2, section: 'saxes', sectionIndex: 2 },
  { id: 'P4', name: 'Tenor Sax 2', transposition: 2, section: 'saxes', sectionIndex: 3 },
  { id: 'P5', name: 'Baritone Sax', transposition: 9, section: 'saxes', sectionIndex: 4 },
  { id: 'P6', name: 'Trumpet 1', transposition: 2, section: 'trumpets', sectionIndex: 0 },
  { id: 'P7', name: 'Trumpet 2', transposition: 2, section: 'trumpets', sectionIndex: 1 },
  { id: 'P8', name: 'Trumpet 3', transposition: 2, section: 'trumpets', sectionIndex: 2 },
  { id: 'P9', name: 'Trumpet 4', transposition: 2, section: 'trumpets', sectionIndex: 3 },
  { id: 'P10', name: 'Trombone 1', transposition: 0, section: 'trombones', sectionIndex: 0 },
  { id: 'P11', name: 'Trombone 2', transposition: 0, section: 'trombones', sectionIndex: 1 },
  { id: 'P12', name: 'Trombone 3', transposition: 0, section: 'trombones', sectionIndex: 2 },
  { id: 'P13', name: 'Bass Trombone', transposition: 0, section: 'trombones', sectionIndex: 3 },
  { id: 'P14', name: 'Piano', transposition: 0, section: 'rhythm', sectionIndex: 0 },
  { id: 'P15', name: 'Bass', transposition: 0, section: 'rhythm', sectionIndex: 1 },
  { id: 'P16', name: 'Drums', transposition: 0, section: 'rhythm', sectionIndex: 2 },
];

const ROOT_MIDI: Record<string, number> = {
  C: 60, 'C#': 61, Db: 61, D: 62, 'D#': 63, Eb: 63, E: 64, F: 65,
  'F#': 66, Gb: 66, G: 67, 'G#': 68, Ab: 68, A: 69, 'A#': 70, Bb: 70, B: 71,
};

function clampToRange(concertMidi: number, instName: string): number {
  const range = INSTRUMENT_RANGES[instName];
  if (!range || range[0] === 0) return concertMidi;
  return Math.max(range[0], Math.min(range[1], concertMidi));
}

function getRootMidi(chord: string, octave: number): number {
  const base = chord.split('/')[0];
  const m = base.match(/^([A-Ga-g])([#b])?/i);
  if (!m) return 48;
  const root = m[1].charAt(0).toUpperCase() + (m[1].slice(1) || '');
  const alter = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return (ROOT_MIDI[root] ?? 60) + alter + (octave - 4) * 12;
}

function getPitchForInstrument(
  inst: (typeof INSTRUMENTS)[0],
  pitches: number[],
  chord: string
): number | null {
  if (inst.section === 'rhythm') {
    if (inst.sectionIndex === 0) return pitches[0] ?? null;
    if (inst.sectionIndex === 1) return getRootMidi(chord, 2);
    return null;
  }
  if (inst.section === 'saxes' && inst.sectionIndex === 4) {
    return pitches.length > 0 ? Math.min(...pitches) : null;
  }
  return pitches[inst.sectionIndex] ?? null;
}

/** Generate Ellington orchestration as Score (measure-first). */
export function generateEllingtonScore(
  progression: string | ChordSegment[],
  options?: { seed?: number; title?: string }
): Score {
  const segments = parseProgression(progression);
  const seed = options?.seed ?? Date.now();
  const totalBars = segments.reduce((s, seg) => s + seg.bars, 0);

  const trumpets = generateSectionVoicings(segments, 'trumpets', seed);
  const trombones = generateSectionVoicings(segments, 'trombones', seed + 1);
  const saxes = generateSectionVoicings(segments, 'saxes', seed + 2);
  const rhythm = generateSectionVoicings(segments, 'rhythm', seed + 3);

  const sectionData: Record<string, Array<{ bar: number; chord: string; pitches: number[] }>> = {
    trumpets,
    trombones,
    saxes,
    rhythm,
  };

  const measures: Measure[] = [];

  for (let barIndex = 0; barIndex < totalBars; barIndex++) {
    const barNum = barIndex + 1;
    const chord = trumpets.find((v) => v.bar === barNum)?.chord ?? saxes[0]?.chord ?? 'Cmaj7';

    const voiceSpecs: Array<{ voice: number; staff: number; part: string; events: Array<{ pitch: number; startBeat: number; duration: number }> }> = [];

    for (const inst of INSTRUMENTS) {
      const data = sectionData[inst.section as keyof typeof sectionData];
      const barData = data?.find((v) => v.bar === barNum);
      const pitches = barData?.pitches ?? [];
      const concertPitch = getPitchForInstrument(inst, pitches, chord);

      if (concertPitch !== null) {
        const clamped = clampToRange(concertPitch, inst.name);
        const writtenPitch = inst.transposition !== 0 ? clamped + inst.transposition : clamped;
        voiceSpecs.push({
          voice: 1,
          staff: 1,
          part: inst.id,
          events: [{ pitch: writtenPitch, startBeat: 0, duration: 4 }],
        });
      } else {
        voiceSpecs.push({
          voice: 1,
          staff: 1,
          part: inst.id,
          events: [{ pitch: 0, startBeat: 0, duration: 4 }],
        });
      }
    }

    measures.push(composeMeasure(barIndex, chord, voiceSpecs));
  }

  return {
    title: options?.title ?? 'Ellington Orchestration',
    measures,
    parts: INSTRUMENTS.map((i) => i.id),
  };
}
