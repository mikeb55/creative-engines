/**
 * Black Aura V8A — pitched guitar improvisation inside the authorised guitar-talk window.
 * Reuses the duo importer, M-NEAR motif map, and the existing MusicXML writer.
 * Does not edit the performance compiler or the writer.
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { BaseMotif } from '../motif/motifTypes';
import { mapMotifPitches, type MappedMotifNote, type RhythmSlot } from '../pentatonic/motifTransform';
import { importWwhDuoMusicXml } from './wwhDuoImport';
import { renderWwhDuoScore, type WwhScoreHeader, type WwhWrittenBar } from './wwhMusicXmlWrite';
import { indexSource, type SourceIndex } from './director/sourceIndexAdapter';
import {
  assertWwhBar,
  wwhNote,
  wwhRest,
  WWH_DIVISIONS,
  type WwhAtom,
} from './wwhPerformanceTypes';
import { inspectV8bParentTriad, resolveV8aPentatonicField, type V8aPentatonicField } from './wwhBlackAuraV8aVault';

export const V8A_SEED = 80081;
export const V8A_DUO_FILE =
  '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/00 - WWH DUO LEADSHEETS/01-Black-Aura-Duo-Leadsheet-V1.1.musicxml';

/** V7.3C guitar-talk: cut after order 15, cycle length 1, authorised 2–4 cycles. */
export const V8A_WINDOW = {
  id: 'guitar-talk',
  motifId: 'guitar-m2-cell',
  motifFirstOrder: 8,
  motifLastOrder: 9,
  cutAfterOrder: 15,
  returnOrder: 16,
  bars: 4,
  beats: 4,
  beatType: 4,
  minCycles: 2,
  maxCycles: 4,
} as const;

const BAR_TICKS = 1024;
const PC_SPELL: ReadonlyArray<readonly [string, number]> = [
  ['C', 0],
  ['D', -1],
  ['D', 0],
  ['E', -1],
  ['E', 0],
  ['F', 0],
  ['F', 1],
  ['G', 0],
  ['A', -1],
  ['A', 0],
  ['B', -1],
  ['B', 0],
];

export interface V8aPitchEvent {
  bar: number;
  rest: boolean;
  step?: string;
  alter?: number;
  octave?: number;
  midi?: number;
  duration: string;
  divisions: number;
}

export interface V8aApproach {
  id: 'lyrical' | 'adventurous';
  seed: number;
  bars: V8aPitchEvent[][];
  guitarAttackGroups: number[];
  silenceBars: number[];
}

export interface V8aBundle {
  seed: number;
  sourceSha256: string;
  field: V8aPentatonicField;
  v8b: ReturnType<typeof inspectV8bParentTriad>;
  motif: {
    id: string;
    orders: [number, number];
    printedBars: [string, string];
    notes: Array<{ step: string; alter: number; octave: number; midi: number; startBeat: number; duration: number; type: string }>;
    rests: string;
    eventIds: string[];
  };
  map: {
    method: 'M-NEAR';
    degreeAlignment: string;
    sourcePitches: number[];
    mappedPitches: number[];
    commonToneRetentions: number[];
    notes: MappedMotifNote[];
  };
  lyrical: V8aApproach;
  adventurous: V8aApproach;
  scores: {
    lyricalExtract: string;
    adventurousExtract: string;
    lyricalDuo: string;
  };
}

function midiOf(step: string, alter: number, octave: number): number {
  const natural: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const pc = natural[step];
  if (pc === undefined) throw new Error(`bad step ${step}`);
  return (octave + 1) * 12 + ((pc + alter) % 12);
}

function atomFromMidi(midi: number, dur: 'quarter' | 'eighth' | 'half' | 'whole'): WwhAtom {
  const pc = ((midi % 12) + 12) % 12;
  const spell = PC_SPELL[pc];
  if (!spell) throw new Error(`no spelling for ${midi}`);
  const octave = Math.floor(midi / 12) - 1;
  return wwhNote(spell[0], octave, dur, spell[1]);
}

function eventsOf(atoms: readonly WwhAtom[], bar: number): V8aPitchEvent[] {
  return atoms.map((atom) => ({
    bar,
    rest: atom.rest,
    step: atom.step,
    alter: atom.alter ?? 0,
    octave: atom.octave,
    midi: atom.rest || !atom.step || atom.octave === undefined ? undefined : midiOf(atom.step, atom.alter ?? 0, atom.octave),
    duration: atom.dots ? `${atom.type}.` : atom.type,
    divisions: atom.divisions,
  }));
}

function finishBar(atoms: WwhAtom[], label: string): WwhAtom[] {
  assertWwhBar(atoms, BAR_TICKS, label);
  const attacks = atoms.filter((atom) => !atom.rest && !atom.chord).length;
  if (attacks > 4) throw new Error(`${label} has ${attacks} guitar attacks`);
  return atoms;
}

function quoteCell(): WwhAtom[] {
  return finishBar(
    [wwhRest('quarter'), atomFromMidi(77, 'eighth'), atomFromMidi(80, 'eighth'), wwhRest('quarter'), atomFromMidi(77, 'quarter')],
    'lyrical-1'
  );
}

function lyricalBars(): WwhAtom[][] {
  return [
    quoteCell(),
    finishBar(
      [wwhRest('quarter'), atomFromMidi(77, 'eighth'), atomFromMidi(79, 'eighth'), wwhRest('quarter'), atomFromMidi(75, 'quarter')],
      'lyrical-2'
    ),
    finishBar([wwhRest('whole')], 'lyrical-3'),
    finishBar(
      [wwhRest('half'), atomFromMidi(77, 'eighth'), atomFromMidi(80, 'eighth'), wwhRest('quarter')],
      'lyrical-4'
    ),
  ];
}

function sourceMotif(index: SourceIndex): V8aBundle['motif'] {
  const first = index.measures[V8A_WINDOW.motifFirstOrder];
  const second = index.measures[V8A_WINDOW.motifLastOrder];
  if (!first || !second) throw new Error('Black Aura motif bars missing');
  const pitched = [first, second].flatMap((measure) =>
    measure.guitar.notes.filter((note) => !note.rest && !note.chord && note.step && note.octave !== undefined)
  );
  const chosen = pitched.slice(0, 5);
  if (chosen.length !== 5) throw new Error(`expected 5 motif attacks, found ${chosen.length}`);
  const starts = [1, 1.5, 3, 5, 5.5];
  const durations = [0.5, 0.5, 1, 0.5, 0.5];
  const notes = chosen.map((note, index) => ({
    step: note.step!,
    alter: note.alter ?? 0,
    octave: note.octave!,
    midi: midiOf(note.step!, note.alter ?? 0, note.octave!),
    startBeat: starts[index]!,
    duration: durations[index]!,
    type: note.type ?? 'eighth',
  }));
  const eventIds = index.events
    .filter(
      (event) =>
        event.player === 'guitar' &&
        !event.rest &&
        event.order >= V8A_WINDOW.motifFirstOrder &&
        event.order <= V8A_WINDOW.motifLastOrder
    )
    .slice(0, 5)
    .map((event) => event.id);
  return {
    id: V8A_WINDOW.motifId,
    orders: [V8A_WINDOW.motifFirstOrder, V8A_WINDOW.motifLastOrder],
    printedBars: [first.printedNumber, second.printedNumber],
    notes,
    rests: 'quarter rest before each pair; quarter rest between the pair and the following quarter; bar 10 closing quarter replaced by a rest so the motif stays at five notes',
    eventIds,
  };
}

function adventurousAtoms(field: V8aPentatonicField, motif: V8aBundle['motif']): {
  bars: WwhAtom[][];
  map: V8aBundle['map'];
} {
  const base: BaseMotif = {
    id: motif.id,
    barCount: 2,
    notes: motif.notes.map((note) => ({ pitch: note.midi, startBeat: note.startBeat, duration: note.duration })),
  };
  const rhythm: RhythmSlot[] = [
    { kind: 'rest', startBeat: 0, duration: 1 },
    { kind: 'note', startBeat: 1, duration: 0.5 },
    { kind: 'note', startBeat: 1.5, duration: 0.5 },
    { kind: 'rest', startBeat: 2, duration: 1 },
    { kind: 'note', startBeat: 3, duration: 1 },
    { kind: 'rest', startBeat: 4, duration: 1 },
    { kind: 'note', startBeat: 5, duration: 0.5 },
    { kind: 'note', startBeat: 5.5, duration: 0.5 },
    { kind: 'rest', startBeat: 6, duration: 1 },
    { kind: 'rest', startBeat: 7, duration: 1 },
  ];
  const mapped = mapMotifPitches({
    motif: base,
    rhythm,
    source: field.source,
    target: field.target,
    method: 'M-NEAR',
    meter: { beats: 4, beatType: 4 },
  });
  const midis = mapped.notes.map((note) => note.pitch);
  if (midis.length !== 5) throw new Error('M-NEAR dropped a motif note');
  const bars = [
    finishBar(
      [wwhRest('quarter'), atomFromMidi(midis[0]!, 'eighth'), atomFromMidi(midis[1]!, 'eighth'), wwhRest('quarter'), atomFromMidi(midis[2]!, 'quarter')],
      'adventurous-1'
    ),
    finishBar(
      [wwhRest('quarter'), atomFromMidi(midis[3]!, 'eighth'), atomFromMidi(midis[4]!, 'eighth'), wwhRest('half')],
      'adventurous-2'
    ),
    finishBar([wwhRest('whole')], 'adventurous-3'),
    finishBar([wwhRest('quarter'), atomFromMidi(motif.notes[0]!.midi, 'eighth'), wwhRest('eighth'), wwhRest('half')], 'adventurous-4'),
  ];
  return {
    bars,
    map: {
      method: 'M-NEAR',
      degreeAlignment: mapped.degreeAlignment,
      sourcePitches: motif.notes.map((note) => note.midi),
      mappedPitches: midis,
      commonToneRetentions: mapped.commonToneRetentions,
      notes: mapped.notes,
    },
  };
}

function approach(id: V8aApproach['id'], bars: WwhAtom[][]): V8aApproach {
  return {
    id,
    seed: V8A_SEED,
    bars: bars.map((atoms, index) => eventsOf(atoms, index + 1)),
    guitarAttackGroups: bars.map((atoms) => atoms.filter((atom) => !atom.rest && !atom.chord).length),
    silenceBars: bars.flatMap((atoms, index) => (atoms.every((atom) => atom.rest) ? [index + 1] : [])),
  };
}

function header(movementTitle: string): WwhScoreHeader {
  return {
    title: 'Black Aura',
    movementTitle,
    composer: 'Michael Bryant',
    software: 'Composer OS WWH V8A',
    tempo: 92,
    transposeOctave: -1,
  };
}

function writtenWindow(guitarBars: WwhAtom[][], templateBass: WwhWrittenBar['bassClone'], rehearsal: string): WwhWrittenBar[] {
  return guitarBars.map((guitar, index) => ({
    guitar,
    bass: [],
    bassClone: templateBass,
    beats: V8A_WINDOW.beats,
    beatType: V8A_WINDOW.beatType,
    divisions: WWH_DIVISIONS,
    fifths: 0,
    mode: 'major',
    guitarTranspose: -1,
    bassTranspose: -1,
    rehearsal: index === 0 ? rehearsal : undefined,
    words: index === 0 ? [`${V8A_WINDOW.id} ${rehearsal}`] : undefined,
    tempoMark: index === 0 ? { beatUnit: 'quarter', dots: 0, perMinute: '92', soundTempo: null } : undefined,
  }));
}

function sourceWritten(index: SourceIndex): WwhWrittenBar[] {
  return index.measures.map((measure) => ({
    guitar: [],
    bass: [],
    guitarClone: measure.guitar.element,
    bassClone: measure.bass.element,
    beats: measure.guitar.beats,
    beatType: measure.guitar.beatType,
    divisions: measure.guitar.divisions,
    fifths: measure.guitar.fifths,
    mode: measure.guitar.mode,
    guitarTranspose: measure.guitar.transposeOctave,
    bassTranspose: measure.bass.transposeOctave,
  }));
}

function duoBars(index: SourceIndex, guitarBars: WwhAtom[][], rehearsal: string): WwhWrittenBar[] {
  const source = sourceWritten(index);
  const template = index.measures[V8A_WINDOW.cutAfterOrder];
  if (!template) throw new Error('window template missing');
  const window = writtenWindow(guitarBars, template.bass.element, rehearsal);
  return [...source.slice(0, V8A_WINDOW.returnOrder), ...window, ...source.slice(V8A_WINDOW.returnOrder)];
}

export function loadBlackAuraIndex(): { index: SourceIndex; sha256: string } {
  const xml = fs.readFileSync(V8A_DUO_FILE, 'utf8');
  const sha256 = createHash('sha256').update(xml).digest('hex');
  return { index: indexSource(xml, sha256), sha256 };
}

export function buildV8aBundle(seed = V8A_SEED): V8aBundle {
  if (seed !== V8A_SEED) throw new Error(`V8A recipe is fixed at seed ${V8A_SEED}`);
  const { index, sha256 } = loadBlackAuraIndex();
  const field = resolveV8aPentatonicField();
  const motif = sourceMotif(index);
  const lyricAtoms = lyricalBars();
  const adventure = adventurousAtoms(field, motif);
  const lyrical = approach('lyrical', lyricAtoms);
  const adventurous = approach('adventurous', adventure.bars);
  return {
    seed,
    sourceSha256: sha256,
    field,
    v8b: inspectV8bParentTriad(),
    motif,
    map: adventure.map,
    lyrical,
    adventurous,
    scores: {
      lyricalExtract: renderWwhDuoScore(writtenWindow(lyricAtoms, index.measures[V8A_WINDOW.cutAfterOrder]!.bass.element, 'LYRICAL'), header('V8A lyrical guitar')),
      adventurousExtract: renderWwhDuoScore(
        writtenWindow(adventure.bars, index.measures[V8A_WINDOW.cutAfterOrder]!.bass.element, 'ADVENTUROUS'),
        header('V8A adventurous guitar')
      ),
      lyricalDuo: renderWwhDuoScore(duoBars(index, lyricAtoms, 'LYRICAL'), header('V8A lyrical duo')),
    },
  };
}

export function writeV8aPilot(outDir: string, bundle = buildV8aBundle()): string[] {
  fs.mkdirSync(outDir, { recursive: true });
  const files: Array<[string, string]> = [
    ['V8A-LYRICAL.musicxml', bundle.scores.lyricalExtract],
    ['V8A-ADVENTUROUS.musicxml', bundle.scores.adventurousExtract],
    ['V8A-DUO-LYRICAL.musicxml', bundle.scores.lyricalDuo],
    [
      'V8A-RECIPE.json',
      `${JSON.stringify(
        {
          seed: bundle.seed,
          source: V8A_DUO_FILE,
          sourceSha256: bundle.sourceSha256,
          window: V8A_WINDOW,
          motif: bundle.motif,
          pentatonic: {
            method: bundle.field.method,
            homeRelationshipId: bundle.field.homeRelationshipId,
            offset: bundle.field.offset,
            source: bundle.field.source,
            target: bundle.field.target,
            sourcePitchClasses: bundle.field.sourcePitchClasses,
            targetPitchClasses: bundle.field.targetPitchClasses,
            degreeAlignment: bundle.map.degreeAlignment,
            sourcePitches: bundle.map.sourcePitches,
            mappedPitches: bundle.map.mappedPitches,
            commonToneRetentions: bundle.map.commonToneRetentions,
          },
          v8b: bundle.v8b,
          lyrical: bundle.lyrical,
          adventurous: bundle.adventurous,
        },
        null,
        2
      )}\n`,
    ],
  ];
  for (const [name, body] of files) fs.writeFileSync(path.join(outDir, name), body);
  return files.map(([name]) => path.join(outDir, name));
}

export function reimportGuitarBass(xml: string): ReturnType<typeof importWwhDuoMusicXml> {
  return importWwhDuoMusicXml(xml);
}
