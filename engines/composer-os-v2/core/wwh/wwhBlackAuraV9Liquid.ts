/**
 * Black Aura V9 — Liquid. Hand-authored sketch.
 * Four bars written by hand. V9_LIQUID_SEED is printed only. It does not choose notes.
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { importWwhDuoMusicXml, pitchFingerprint, type WwhImportedNote } from './wwhDuoImport';
import { renderWwhDuoScore, type WwhScoreHeader, type WwhWrittenBar } from './wwhMusicXmlWrite';
import { loadBlackAuraIndex, V8A_DUO_FILE, V8A_WINDOW } from './wwhBlackAuraV8a';
import { readInsertionBass } from './wwhBlackAuraV8c';
import { midiOf, soundingFromStringFret, stoppedSpan, V8B_MAX_FRET, V8B_MAX_STOPPED_SPAN } from './wwhBlackAuraV8bRecipe';
import { assertWwhBar, wwhDyad, wwhNote, wwhRest, wwhTriad, WWH_DIVISIONS, type WwhAtom } from './wwhPerformanceTypes';

export const V9_LIQUID_FILE =
  '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/WWH-PERFORMANCE-MOCKUPS/V9-PILOT/V9-BLACK-AURA-CREATIVE-LIQUID-V1.musicxml';
/** Printed only. Not used to choose notes. */
export const V9_LIQUID_SEED = 90021;
const SOURCE_SHA = 'b46ad5eddf329f4975a1be1e868099c3c7cefa005226e936e313e7583b2eedcb';
const BAR_TICKS = 1024;

type Dur = 'whole' | 'half' | 'quarter' | 'eighth' | '16th';

interface Tone {
  step: string;
  alter: number;
  octave: number;
  stringNumber: number;
  fret: number;
}

interface Slot {
  dur: Dur;
  tones: Tone[];
}

/** Written pitches. Octave-change -1 sounds them one octave lower. */
export const LIQUID_BARS: Slot[][] = [
  [
    { dur: 'quarter', tones: [] },
    {
      dur: 'eighth',
      tones: [
        { step: 'C', alter: 0, octave: 5, stringNumber: 3, fret: 5 },
        { step: 'F', alter: 0, octave: 5, stringNumber: 2, fret: 6 },
      ],
    },
    {
      dur: 'eighth',
      tones: [
        { step: 'C', alter: 0, octave: 5, stringNumber: 3, fret: 5 },
        { step: 'A', alter: -1, octave: 5, stringNumber: 1, fret: 4 },
      ],
    },
    {
      dur: 'eighth',
      tones: [
        { step: 'A', alter: 0, octave: 5, stringNumber: 1, fret: 5 },
        { step: 'F', alter: 0, octave: 5, stringNumber: 2, fret: 6 },
      ],
    },
    {
      dur: 'eighth',
      tones: [
        { step: 'C', alter: 0, octave: 5, stringNumber: 3, fret: 5 },
        { step: 'E', alter: -1, octave: 5, stringNumber: 2, fret: 4 },
      ],
    },
    {
      dur: 'quarter',
      tones: [
        { step: 'C', alter: 0, octave: 5, stringNumber: 3, fret: 5 },
        { step: 'D', alter: 0, octave: 5, stringNumber: 2, fret: 3 },
      ],
    },
  ],
  [
    { dur: 'eighth', tones: [] },
    {
      dur: 'quarter',
      tones: [
        { step: 'C', alter: 0, octave: 5, stringNumber: 3, fret: 5 },
        { step: 'E', alter: -1, octave: 5, stringNumber: 2, fret: 4 },
      ],
    },
    {
      dur: 'eighth',
      tones: [
        { step: 'C', alter: 0, octave: 5, stringNumber: 3, fret: 5 },
        { step: 'G', alter: 0, octave: 5, stringNumber: 1, fret: 3 },
      ],
    },
    {
      dur: 'eighth',
      tones: [
        { step: 'A', alter: -1, octave: 4, stringNumber: 4, fret: 6 },
        { step: 'G', alter: 0, octave: 5, stringNumber: 1, fret: 3 },
      ],
    },
    {
      dur: 'quarter',
      tones: [
        { step: 'A', alter: -1, octave: 4, stringNumber: 4, fret: 6 },
        { step: 'E', alter: -1, octave: 5, stringNumber: 2, fret: 4 },
      ],
    },
    {
      dur: 'eighth',
      tones: [
        { step: 'C', alter: 0, octave: 5, stringNumber: 3, fret: 5 },
        { step: 'E', alter: -1, octave: 5, stringNumber: 2, fret: 4 },
      ],
    },
  ],
  [
    { dur: 'half', tones: [] },
    {
      dur: 'eighth',
      tones: [
        { step: 'D', alter: 0, octave: 5, stringNumber: 3, fret: 7 },
        { step: 'F', alter: 0, octave: 5, stringNumber: 2, fret: 6 },
        { step: 'A', alter: 0, octave: 5, stringNumber: 1, fret: 5 },
      ],
    },
    {
      dur: 'eighth',
      tones: [
        { step: 'D', alter: 0, octave: 5, stringNumber: 3, fret: 7 },
        { step: 'F', alter: 0, octave: 5, stringNumber: 2, fret: 6 },
        { step: 'A', alter: -1, octave: 5, stringNumber: 1, fret: 4 },
      ],
    },
    {
      dur: 'quarter',
      tones: [
        { step: 'F', alter: 0, octave: 5, stringNumber: 2, fret: 6 },
        { step: 'A', alter: -1, octave: 5, stringNumber: 1, fret: 4 },
      ],
    },
  ],
  [
    { dur: 'quarter', tones: [] },
    {
      dur: 'eighth',
      tones: [
        { step: 'E', alter: -1, octave: 5, stringNumber: 2, fret: 4 },
        { step: 'A', alter: -1, octave: 5, stringNumber: 1, fret: 4 },
      ],
    },
    {
      dur: 'eighth',
      tones: [
        { step: 'E', alter: -1, octave: 5, stringNumber: 2, fret: 4 },
        { step: 'G', alter: 0, octave: 5, stringNumber: 1, fret: 3 },
      ],
    },
    {
      dur: 'quarter',
      tones: [
        { step: 'D', alter: 0, octave: 5, stringNumber: 2, fret: 3 },
        { step: 'F', alter: 0, octave: 5, stringNumber: 1, fret: 1 },
      ],
    },
    { dur: 'quarter', tones: [] },
  ],
];

function toneMidi(tone: Tone): number {
  return midiOf(tone.step, tone.alter, tone.octave);
}

function atomsOfSlot(slot: Slot): WwhAtom[] {
  if (!slot.tones.length) return [wwhRest(slot.dur)];
  const ordered = [...slot.tones].sort((a, b) => toneMidi(a) - toneMidi(b));
  if (ordered.length === 1) {
    const tone = ordered[0]!;
    return [wwhNote(tone.step, tone.octave, slot.dur, tone.alter)];
  }
  if (ordered.length === 2) {
    const low = ordered[0]!;
    const high = ordered[1]!;
    return wwhDyad([low.step, low.octave, low.alter], [high.step, high.octave, high.alter], slot.dur);
  }
  if (ordered.length === 3) {
    const low = ordered[0]!;
    const mid = ordered[1]!;
    const high = ordered[2]!;
    return wwhTriad(
      [low.step, low.octave, low.alter],
      [mid.step, mid.octave, mid.alter],
      [high.step, high.octave, high.alter],
      slot.dur
    );
  }
  throw new Error(`slot has ${ordered.length} notes`);
}

function spell(tone: Tone): string {
  const accidental = tone.alter < 0 ? 'b' : tone.alter > 0 ? '#' : '';
  return `${tone.step}${accidental}${tone.octave - 1}`;
}

export function liquidGuitarBars(): WwhAtom[][] {
  return LIQUID_BARS.map((slots, index) => {
    const atoms = slots.flatMap(atomsOfSlot);
    assertWwhBar(atoms, BAR_TICKS, `liquid-${index + 1}`);
    return atoms;
  });
}

function assertPlayable(): string[] {
  const sounding: string[] = [];
  let previous: Tone[] | null = null;
  LIQUID_BARS.forEach((slots, barIndex) => {
    const names: string[] = [];
    slots.forEach((slot, slotIndex) => {
      const label = `bar ${barIndex + 1} slot ${slotIndex + 1}`;
      if (!slot.tones.length) {
        names.push('rest');
        return;
      }
      const strings = new Set<number>();
      slot.tones.forEach((tone) => {
        if (strings.has(tone.stringNumber)) throw new Error(`${label} stacks one string`);
        strings.add(tone.stringNumber);
        const sounded = soundingFromStringFret(tone.stringNumber, tone.fret);
        if (sounded.midi !== toneMidi(tone) - 12) {
          throw new Error(`${label} finger ${tone.stringNumber}/${tone.fret} does not sound ${spell(tone)}`);
        }
        if (tone.fret < 0 || tone.fret > V8B_MAX_FRET) throw new Error(`${label} fret ${tone.fret}`);
      });
      if (stoppedSpan(slot.tones.map((tone) => tone.fret)) > V8B_MAX_STOPPED_SPAN) {
        throw new Error(`${label} span`);
      }
      if (previous) {
        const left = previous.map((tone) => tone.fret).filter((fret) => fret > 0);
        const right = slot.tones.map((tone) => tone.fret).filter((fret) => fret > 0);
        if (left.length && right.length) {
          for (const from of left) {
            for (const to of right) {
              if (Math.abs(from - to) > V8B_MAX_STOPPED_SPAN) {
                throw new Error(`${label} transition ${from} to ${to}`);
              }
            }
          }
        }
      }
      previous = slot.tones;
      names.push(slot.tones.map(spell).join('/'));
    });
    sounding.push(names.join(' '));
  });
  return sounding;
}

function header(): WwhScoreHeader {
  return {
    title: 'Black Aura',
    movementTitle: 'V9 creative liquid duo',
    composer: 'Michael Bryant',
    software: 'Composer OS WWH V9 liquid',
    tempo: 92,
    transposeOctave: -1,
  };
}

function duoBars(guitarBars: WwhAtom[][]): WwhWrittenBar[] {
  const { index } = loadBlackAuraIndex();
  readInsertionBass(index);
  const template = index.measures[V8A_WINDOW.cutAfterOrder];
  if (!template) throw new Error('bar 16 missing');
  const source: WwhWrittenBar[] = index.measures.map((measure) => ({
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
  const window: WwhWrittenBar[] = guitarBars.map((guitar, indexBar) => ({
    guitar,
    bass: [],
    bassClone: template.bass.element,
    beats: 4,
    beatType: 4,
    divisions: WWH_DIVISIONS,
    fifths: template.guitar.fifths,
    mode: template.guitar.mode,
    guitarTranspose: -1,
    bassTranspose: -1,
    rehearsal: indexBar === 0 ? 'LIQUID' : undefined,
    tempoMark: indexBar === 0 ? { beatUnit: 'quarter', dots: 0, perMinute: '92', soundTempo: null } : undefined,
  }));
  return [...source.slice(0, V8A_WINDOW.returnOrder), ...window, ...source.slice(V8A_WINDOW.returnOrder)];
}

function sha256File(file: string): string {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function tone(note: WwhImportedNote): string {
  if (note.rest) return `R:${note.duration}`;
  return `${note.step}${note.alter ?? 0}${note.octave}:${note.duration}:${note.chord ? 'c' : 'a'}:${note.voice}`;
}

function lane(notes: readonly WwhImportedNote[]): string {
  return notes.map(tone).join(',');
}

export function buildV9LiquidXml(): { xml: string; sounding: string[]; fingerprint: string } {
  const before = sha256File(V8A_DUO_FILE);
  if (before !== SOURCE_SHA) throw new Error(`source hash is ${before}`);
  const sounding = assertPlayable();
  const { index } = loadBlackAuraIndex();
  const bass = readInsertionBass(index);
  const pitched = bass.filter((event) => !event.rest).map((event) => event.id).join(',');
  if (pitched !== 'D-downbeat,A-offbeat,D-pickup') throw new Error(`bass ids ${pitched}`);
  const guitar = liquidGuitarBars();
  const xml = renderWwhDuoScore(duoBars(guitar), header());
  const duo = importWwhDuoMusicXml(xml);
  if (duo.guitar.measures.length !== 43 || duo.bass.measures.length !== 43) {
    throw new Error(`measure count guitar ${duo.guitar.measures.length} bass ${duo.bass.measures.length}`);
  }
  const head = V8A_WINDOW.returnOrder;
  const tail = head + V8A_WINDOW.bars;
  for (let order = 0; order < head; order += 1) {
    if (lane(duo.guitar.measures[order]!.notes) !== lane(index.measures[order]!.guitar.notes)) {
      throw new Error(`guitar drift before insert at ${order}`);
    }
    if (lane(duo.bass.measures[order]!.notes) !== lane(index.measures[order]!.bass.notes)) {
      throw new Error(`bass drift before insert at ${order}`);
    }
  }
  for (let order = head; order < index.measures.length; order += 1) {
    const out = tail + (order - head);
    if (lane(duo.guitar.measures[out]!.notes) !== lane(index.measures[order]!.guitar.notes)) {
      throw new Error(`guitar drift after insert at ${order}`);
    }
    if (lane(duo.bass.measures[out]!.notes) !== lane(index.measures[order]!.bass.notes)) {
      throw new Error(`bass drift after insert at ${order}`);
    }
  }
  const template = lane(index.measures[V8A_WINDOW.cutAfterOrder]!.bass.notes);
  for (const measure of duo.guitar.measures.slice(head, tail)) {
    if (measure.transposeOctave !== -1) throw new Error('guitar octave-change is not -1');
    if (measure.beats !== 4 || measure.beatType !== 4 || measure.divisions !== 256 || measure.specTicks !== 1024) {
      throw new Error('insert guitar meter');
    }
    if (!measure.gridAgrees) throw new Error('insert guitar grid');
    const ticks = measure.notes.filter((note) => !note.chord).reduce((sum, note) => sum + note.duration, 0);
    if (ticks !== 1024) throw new Error(`insert guitar ticks ${ticks}`);
  }
  for (const measure of duo.bass.measures.slice(head, tail)) {
    if (lane(measure.notes) !== template) throw new Error('insert bass is not bar 16');
    if (measure.specTicks !== 1024 || !measure.gridAgrees) throw new Error('insert bass grid');
  }
  for (const measure of duo.guitar.measures) {
    if (measure.transposeOctave !== -1) throw new Error('guitar transpose drifted');
  }
  const fingerprint = pitchFingerprint(duo.guitar.measures.slice(head, tail));
  const prior = [
    'V9-BLACK-AURA-V8C-LIQUID.musicxml',
    'V9-BLACK-AURA-V8C-LYRICAL.musicxml',
    'V9-BLACK-AURA-V8C-ADVENTUROUS.musicxml',
    'V9-BLACK-AURA-V8A-LYRICAL-DUO.musicxml',
  ];
  for (const name of prior) {
    const file = `/Users/user/Documents/DEVS/ECM-Album-Nov-2027/WWH-PERFORMANCE-MOCKUPS/V9-PILOT/${name}`;
    const old = importWwhDuoMusicXml(fs.readFileSync(file, 'utf8'));
    const oldPrint = pitchFingerprint(old.guitar.measures.slice(head, tail));
    if (oldPrint === fingerprint) throw new Error(`insert matches ${name}`);
  }
  if (sha256File(V8A_DUO_FILE) !== SOURCE_SHA) throw new Error('source changed during build');
  return { xml, sounding, fingerprint };
}

export function writeV9LiquidCreative(outFile = V9_LIQUID_FILE): { file: string; sounding: string[]; fingerprint: string } {
  if (fs.existsSync(outFile)) throw new Error(`REFUSE overwrite: ${outFile}`);
  const built = buildV9LiquidXml();
  fs.writeFileSync(outFile, built.xml, { flag: 'wx' });
  const reread = importWwhDuoMusicXml(fs.readFileSync(outFile, 'utf8'));
  if (reread.guitar.measures.length !== 43) throw new Error('written file failed re-import');
  if (sha256File(V8A_DUO_FILE) !== SOURCE_SHA) throw new Error('source changed during write');
  return { file: outFile, sounding: built.sounding, fingerprint: built.fingerprint };
}

if (process.argv[1]?.includes('wwhBlackAuraV9Liquid')) {
  const written = writeV9LiquidCreative();
  console.log(JSON.stringify({ seed: V9_LIQUID_SEED, ...written }, null, 2));
}
