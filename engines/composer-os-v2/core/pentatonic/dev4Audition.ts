/**
 * Dev 4 guitar auditions. One part. Existing MusicXML exporter.
 */

import fs from 'node:fs';
import path from 'node:path';
import { CLEAN_ELECTRIC_GUITAR } from '../instrument-profiles/guitarProfile';
import { exportScoreModelToMusicXml } from '../export/musicxmlExporter';
import { validateMusicXml } from '../../../../src/utils/musicXmlValidator';
import { createMeasure, createNote, createPart, createRest, createScore } from '../score-model/scoreEventBuilder';
import type { ScoreModel } from '../score-model/scoreModelTypes';
import { extractAnnotatedMotif, type AnnotatedMotif } from './motifAnnotationExtract';
import {
  beatUnitQuarters,
  mapMotifPitches,
  type MappedMotifNote,
  type MotifMapMethod,
  type MotifMapResult,
  type PentatonicCollectionView,
  type RhythmSlot,
} from './motifTransform';

/** User-facing Pentatonic Engine output. Engine source stays in creative-engines. */
export const PENTATONIC_OUTPUT_ROOT = '/Users/user/Documents/DEVS/Pentatonic-Options';
export const DEV4_AUDITION_DIR = `${PENTATONIC_OUTPUT_ROOT}/Dev4-Auditions`;

export interface Dev4PilotSpec {
  file: string;
  token: string;
  sourceLabel: string;
  piece: string;
  colourName: string;
  fileName: (method: MotifMapMethod) => string;
}

export const DEV4_PILOTS: readonly Dev4PilotSpec[] = [
  {
    file: '02-Palace-Gates-Duo-Leadsheet-V1.1.musicxml',
    token: 'M2',
    sourceLabel: '2',
    piece: 'Palace Gates',
    colourName: 'C Major Pentatonic',
    fileName: (method) => `Dev4-Palace-Gates-M2-${method}.musicxml`,
  },
  {
    file: '04-Meet-Me-at-Hobos-Duo-Leadsheet-V1.0.musicxml',
    token: 'M1',
    sourceLabel: '1',
    piece: "Hobo's",
    colourName: 'Ab Major Pentatonic',
    fileName: (method) => `Dev4-Hobos-M1-${method}.musicxml`,
  },
];

export interface Dev4Audition {
  spec: Dev4PilotSpec;
  extracted: AnnotatedMotif;
  method: MotifMapMethod;
  colour: MotifMapResult;
  returned: MotifMapResult;
  roundTripEqual: boolean;
  title: string;
  filePath: string;
  xml: string;
  valid: boolean;
  errors: string[];
}

const ALBUM = '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/00 - WWH DUO LEADSHEETS';

export function relationshipStaff(collection: PentatonicCollectionView, role: 'home' | 'colour'): string {
  if (collection.homeRelationshipLabel) return collection.homeRelationshipLabel;
  return role === 'colour' ? 'colour' : 'HOME';
}

export function shortCollection(name: string): string {
  return name.replace('Pentatonic', 'Pent');
}

export function staffText(collection: PentatonicCollectionView, role: 'home' | 'colour', method: MotifMapMethod): string {
  return `${shortCollection(collection.name)} · ${relationshipStaff(collection, role)} · ${method}`;
}

function keyFor(collection: PentatonicCollectionView): { fifths: number; mode: 'major' | 'minor' } {
  const minor = collection.archetypeId === 'minor_pentatonic';
  const fifths: Record<string, number> = {
    C: 0,
    G: 1,
    D: 2,
    A: 3,
    E: 4,
    B: 5,
    'F#': 6,
    F: -1,
    Bb: -2,
    Eb: -3,
    Ab: -4,
    Db: -5,
    Gb: -6,
  };
  const majorFromMinor: Record<string, string> = {
    A: 'C',
    E: 'G',
    B: 'D',
    'F#': 'A',
    'C#': 'E',
    G: 'Bb',
    D: 'F',
    C: 'Eb',
    F: 'Ab',
    Bb: 'Db',
    Eb: 'Gb',
  };
  const lookup = minor ? majorFromMinor[collection.referenceNote] ?? 'C' : collection.referenceNote;
  return { fifths: fifths[lookup] ?? 0, mode: minor ? 'minor' : 'major' };
}

function eventsFor(rhythm: readonly RhythmSlot[], notes: readonly MappedMotifNote[] | null, sourceNotes: readonly { pitch: number }[]) {
  let noteIndex = 0;
  return rhythm.map((slot) => {
    if (slot.kind === 'rest') return createRest(slot.startBeat, slot.duration, 1);
    const pitch = notes ? notes[noteIndex]!.pitch : sourceNotes[noteIndex]!.pitch;
    const ornament = notes?.[noteIndex]?.preservedChromaticOrnament === true;
    noteIndex += 1;
    return { event: createNote(pitch, slot.startBeat, slot.duration, 1), ornament };
  });
}

export function buildAuditionScore(args: {
  title: string;
  extracted: AnnotatedMotif;
  method: MotifMapMethod;
  colour: MotifMapResult;
  returned: MotifMapResult;
}): ScoreModel {
  const meter = args.extracted.meter;
  const span = meter.beats * (4 / meter.beatType);
  const barMeterMap = Object.fromEntries([1, 2, 3, 4, 5].map((bar) => [bar, { numerator: meter.beats, denominator: meter.beatType }]));
  const part = createPart('guitar', 'Electric Guitar', CLEAN_ELECTRIC_GUITAR.instrumentIdentity, CLEAN_ELECTRIC_GUITAR.midiProgram, 'treble', 5, () => undefined, () => undefined);
  const segments: { bar: number; rhythm: RhythmSlot[]; mapped: MappedMotifNote[] | null; words: string; ornaments: boolean }[] = [
    {
      bar: 1,
      rhythm: args.extracted.rhythm,
      mapped: null,
      words: staffText(args.extracted.home, 'home', args.method),
      ornaments: false,
    },
    { bar: 2, rhythm: [{ kind: 'rest', startBeat: 0, duration: span }], mapped: null, words: '', ornaments: false },
    {
      bar: 3,
      rhythm: args.colour.rhythm,
      mapped: args.colour.notes,
      words: staffText(args.extracted.colour, 'colour', args.method),
      ornaments: args.colour.preservedOrnaments.length > 0,
    },
    { bar: 4, rhythm: [{ kind: 'rest', startBeat: 0, duration: span }], mapped: null, words: '', ornaments: false },
    {
      bar: 5,
      rhythm: args.returned.rhythm,
      mapped: args.returned.notes,
      words: staffText(args.extracted.home, 'home', args.method),
      ornaments: args.returned.preservedOrnaments.length > 0,
    },
  ];
  const words: Record<number, string> = {};
  const chr: Record<number, string> = {};
  for (const segment of segments) {
    const measure = createMeasure(segment.bar);
    measure.measureBeatSpanQuarters = span;
    const built = eventsFor(segment.rhythm, segment.mapped, args.extracted.motif.notes);
    for (const item of built) {
      measure.events.push('event' in item ? item.event : item);
    }
    part.measures[segment.bar - 1] = measure;
    if (segment.words) words[segment.bar] = segment.words;
    if (segment.ornaments) chr[segment.bar] = 'chr';
  }
  const key = keyFor(args.extracted.home);
  const score = createScore(args.title, [part], { tempo: 92 });
  score.timeSignature = { beats: meter.beats, beatType: meter.beatType };
  score.barMeterMap = barMeterMap;
  score.keySignature = { fifths: key.fifths, mode: key.mode, hideKeySignature: false };
  score.measureWordsMarkings = words;
  if (Object.keys(chr).length > 0) score.partMeasureWordsMarkings = { guitar: chr };
  return score;
}

function pitchesEqual(left: readonly { pitch: number }[], right: readonly { pitch: number }[]): boolean {
  return left.length === right.length && left.every((note, index) => note.pitch === right[index]!.pitch);
}

export function auditionFor(xml: string, spec: Dev4PilotSpec, method: MotifMapMethod): Dev4Audition {
  const extracted = extractAnnotatedMotif(xml, spec.token, spec.sourceLabel, spec.colourName);
  const colour = mapMotifPitches({
    motif: extracted.motif,
    rhythm: extracted.rhythm,
    source: extracted.home,
    target: extracted.colour,
    method,
    meter: extracted.meter,
  });
  const returnedMotif = {
    ...extracted.motif,
    notes: colour.notes.map((note) => ({ pitch: note.pitch, startBeat: note.startBeat, duration: note.duration })),
  };
  const returned = mapMotifPitches({
    motif: returnedMotif,
    rhythm: colour.rhythm,
    source: extracted.colour,
    target: extracted.home,
    method,
    meter: extracted.meter,
  });
  const title = `Dev4 audition — ${spec.piece} ${spec.token} ${extracted.home.name} → ${extracted.colour.name} → ${extracted.home.name} ${method}`;
  const score = buildAuditionScore({ title, extracted, method, colour, returned });
  const exported = exportScoreModelToMusicXml(score, { omitChordSymbols: true, barMeterMap: score.barMeterMap });
  const xmlOut = exported.xml ?? '';
  const validation = xmlOut ? validateMusicXml(xmlOut) : { valid: false, errors: exported.errors };
  const filePath = path.join(DEV4_AUDITION_DIR, spec.fileName(method));
  return {
    spec,
    extracted,
    method,
    colour,
    returned,
    roundTripEqual: pitchesEqual(extracted.motif.notes, returned.notes),
    title,
    filePath,
    xml: xmlOut,
    valid: exported.success && validation.valid && !validation.errors.length,
    errors: [...exported.errors, ...validation.errors],
  };
}

export function writeDev4Auditions(album = ALBUM): Dev4Audition[] {
  fs.mkdirSync(DEV4_AUDITION_DIR, { recursive: true });
  const written: Dev4Audition[] = [];
  for (const spec of DEV4_PILOTS) {
    const xml = fs.readFileSync(path.join(album, spec.file), 'utf8');
    for (const method of ['M-DEG', 'M-NEAR'] as const) {
      const audition = auditionFor(xml, spec, method);
      if (!audition.valid) {
        throw new Error(`${audition.filePath} failed validation: ${audition.errors.join('; ')}`);
      }
      fs.writeFileSync(audition.filePath, audition.xml);
      written.push(audition);
    }
  }
  return written;
}

export function beatUnitForPilot(extracted: AnnotatedMotif): number {
  return beatUnitQuarters(extracted.meter.beats, extracted.meter.beatType);
}
