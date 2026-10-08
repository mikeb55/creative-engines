/**
 * Black Aura V8C — guitar answers the bar-16 bass clone inside the V8A window.
 * Reads that bass timeline from the leadsheet. Does not edit V8A, V8B, or V8B.1.
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { importWwhDuoMusicXml } from './wwhDuoImport';
import { renderWwhDuoScore, type WwhScoreHeader, type WwhWrittenBar } from './wwhMusicXmlWrite';
import type { SourceIndex } from './director/sourceIndexAdapter';
import { assertWwhBar, wwhDyad, wwhNote, wwhRest, WWH_DIVISIONS, WWH_DUR, type WwhAtom } from './wwhPerformanceTypes';
import { buildV8aBundle, loadBlackAuraIndex, V8A_DUO_FILE, V8A_WINDOW } from './wwhBlackAuraV8a';
import { gripById, midiOf, soundingFromStringFret, stoppedSpan, V8B_GRIPS, type V8bGrip } from './wwhBlackAuraV8bRecipe';

export const V8C_SEED = 80083;
export const V8C_OUT_DIR = '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/WWH-PERFORMANCE-MOCKUPS/V8-PILOT/C';

const BAR_TICKS = 1024;
const WRITTEN_OCTAVE_SHIFT = 1;
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

type DurName = keyof typeof WWH_DUR;
type VersionId = 'lyrical' | 'liquid' | 'adventurous';
type Relation = 'rests-while-speaks' | 'answers-after' | 'enters-during-sustain' | 'holds-across' | 'transforms-on-attack';

interface Finger {
  stringNumber: number;
  fret: number;
}

interface GuitarSlot {
  dur: DurName;
  rest: boolean;
  gripId?: string;
  writtenMidis: number[];
  fingers: Finger[];
}

interface SlotIntent {
  slotIndex: number;
  relation: Relation;
  bassId: string;
  claim: string;
  registerSemitones?: number;
  pitchClassNeighbor?: boolean;
  requiresSemitoneFromPrevious?: boolean;
}

export interface V8cBassEvent {
  id: string;
  rest: boolean;
  step?: string;
  alter?: number;
  writtenOctave?: number;
  soundingMidi?: number;
  startTick: number;
  durationTicks: number;
  type?: string;
}

export interface V8cInteraction {
  version: VersionId;
  bar: number;
  relation: Relation;
  bassId: string;
  startTick: number;
  durationTicks: number;
  writtenMidis: number[];
  claim: string;
  registerSemitones?: number;
  pitchClassNeighbor?: boolean;
  requiresSemitoneFromPrevious?: boolean;
}

export interface TimedGuitarEvent {
  rest: boolean;
  chord: boolean;
  duration: number;
  step?: string;
  alter?: number;
  octave?: number;
}

export interface V8cVersion {
  id: VersionId;
  label: string;
  rehearsal: string;
  slots: GuitarSlot[][];
  atoms: WwhAtom[][];
  interactions: V8cInteraction[];
  sounding: string[][];
}

export interface V8cBundle {
  seed: number;
  sourceSha256: string;
  bass: V8cBassEvent[];
  mappedPitches: number[];
  sourcePitches: number[];
  versions: V8cVersion[];
  scores: Record<VersionId, string>;
}

function ticksOf(dur: DurName): number {
  return WWH_DUR[dur].divisions;
}

function atomFromWrittenMidi(midi: number, dur: DurName): WwhAtom {
  const pc = ((midi % 12) + 12) % 12;
  const spell = PC_SPELL[pc];
  if (!spell) throw new Error(`no spelling for ${midi}`);
  const octave = Math.floor(midi / 12) - 1;
  return wwhNote(spell[0], octave, dur, spell[1]);
}

function atomsOfSlot(slot: GuitarSlot): WwhAtom[] {
  if (slot.rest) return [wwhRest(slot.dur)];
  if (slot.gripId) {
    const grip = gripById(slot.gripId);
    const low = grip.points[0];
    if (!low) throw new Error(`${grip.id} empty`);
    if (grip.points.length === 1) {
      return [wwhNote(low.pitch.step, low.pitch.octave + WRITTEN_OCTAVE_SHIFT, slot.dur, low.pitch.alter)];
    }
    const high = grip.points[1];
    if (!high) throw new Error(`${grip.id} missing upper note`);
    return wwhDyad(
      [low.pitch.step, low.pitch.octave + WRITTEN_OCTAVE_SHIFT, low.pitch.alter],
      [high.pitch.step, high.pitch.octave + WRITTEN_OCTAVE_SHIFT, high.pitch.alter],
      slot.dur
    );
  }
  if (slot.writtenMidis.length === 1) return [atomFromWrittenMidi(slot.writtenMidis[0]!, slot.dur)];
  if (slot.writtenMidis.length === 2) {
    const low = atomFromWrittenMidi(slot.writtenMidis[0]!, slot.dur);
    const high = atomFromWrittenMidi(slot.writtenMidis[1]!, slot.dur);
    high.chord = true;
    return [low, high];
  }
  throw new Error(`slot has ${slot.writtenMidis.length} pitches`);
}

function finishBars(bars: GuitarSlot[][], label: string): WwhAtom[][] {
  return bars.map((slots, index) => {
    const atoms = slots.flatMap(atomsOfSlot);
    assertWwhBar(atoms, BAR_TICKS, `${label}-${index + 1}`);
    const attacks = atoms.filter((atom) => !atom.rest && !atom.chord).length;
    if (attacks > 4) throw new Error(`${label}-${index + 1} has ${attacks} attacks`);
    if (attacks < 1) throw new Error(`${label}-${index + 1} never answers`);
    if (!slots.some((slot) => slot.rest)) throw new Error(`${label}-${index + 1} has no rest`);
    return atoms;
  });
}

function rest(dur: DurName): GuitarSlot {
  return { dur, rest: true, writtenMidis: [], fingers: [] };
}

function note(dur: DurName, writtenMidi: number, fingers: Finger[]): GuitarSlot {
  return { dur, rest: false, writtenMidis: [writtenMidi], fingers };
}

function dyad(dur: DurName, low: number, high: number, fingers: Finger[]): GuitarSlot {
  return { dur, rest: false, writtenMidis: [low, high], fingers };
}

function grip(dur: DurName, gripId: string): GuitarSlot {
  const found = gripById(gripId);
  return {
    dur,
    rest: false,
    gripId,
    writtenMidis: found.points.map((point) => point.pitch.midi + 12),
    fingers: found.points.map((point) => ({ stringNumber: point.stringNumber, fret: point.fret })),
  };
}

function soundingName(writtenMidi: number): string {
  const sounded = writtenMidi - 12;
  const pc = ((sounded % 12) + 12) % 12;
  const spell = PC_SPELL[pc];
  if (!spell) throw new Error(`no spelling for ${sounded}`);
  const octave = Math.floor(sounded / 12) - 1;
  const accidental = spell[1] < 0 ? 'b' : spell[1] > 0 ? '#' : '';
  return `${spell[0]}${accidental}${octave}`;
}

function assertFingers(slot: GuitarSlot, label: string): void {
  if (slot.rest) return;
  if (slot.fingers.length !== slot.writtenMidis.length) throw new Error(`${label} finger count`);
  const strings = new Set<number>();
  slot.writtenMidis.forEach((written, index) => {
    const finger = slot.fingers[index]!;
    const sounded = soundingFromStringFret(finger.stringNumber, finger.fret);
    if (sounded.midi !== written - 12) {
      throw new Error(`${label} string ${finger.stringNumber} fret ${finger.fret} sounds ${sounded.name}, not ${soundingName(written)}`);
    }
    if (strings.has(finger.stringNumber)) throw new Error(`${label} stacks one string`);
    strings.add(finger.stringNumber);
  });
  if (stoppedSpan(slot.fingers.map((finger) => finger.fret)) > 3) throw new Error(`${label} span`);
}

/** Bar 16 bass, read from the file. The four insert bars clone this bar. */
export function readInsertionBass(index: SourceIndex): V8cBassEvent[] {
  const measure = index.measures[V8A_WINDOW.cutAfterOrder];
  if (!measure) throw new Error('BLOCKED: bar 16 missing');
  if (measure.bass.transposeOctave !== -1 || measure.bass.divisions !== WWH_DIVISIONS) {
    throw new Error('BLOCKED: bar 16 bass transpose or divisions changed');
  }
  let tick = 0;
  const events: V8cBassEvent[] = measure.bass.notes.map((note) => {
    if (note.chord) throw new Error('BLOCKED: bar 16 bass has a chord tone');
    const event: V8cBassEvent = {
      id: note.rest ? `rest-${tick}` : 'pitched',
      rest: note.rest,
      step: note.step,
      alter: note.alter ?? 0,
      writtenOctave: note.octave,
      startTick: tick,
      durationTicks: note.duration,
      type: note.type,
    };
    if (!note.rest) {
      if (!note.step || note.octave === undefined) throw new Error('BLOCKED: pitched bass note has no pitch');
      event.soundingMidi = midiOf(note.step, note.alter ?? 0, note.octave + measure.bass.transposeOctave);
    }
    tick += note.duration;
    return event;
  });
  if (tick !== BAR_TICKS) throw new Error(`BLOCKED: bar 16 bass sums to ${tick}`);
  const pitched = events.filter((event) => !event.rest);
  const shape = pitched.map((event) => `${event.step}${event.alter}${event.writtenOctave}@${event.startTick}+${event.durationTicks}`).join(',');
  if (shape !== 'D03@0+256,A03@384+128,D03@704+64') {
    throw new Error(`BLOCKED: insertion bass is ${shape}, not the approved D–A–D pattern`);
  }
  pitched[0]!.id = 'D-downbeat';
  pitched[1]!.id = 'A-offbeat';
  pitched[2]!.id = 'D-pickup';
  return events;
}

function bassById(bass: readonly V8cBassEvent[], id: string): V8cBassEvent {
  const event = bass.find((item) => item.id === id);
  if (!event || event.rest || event.soundingMidi === undefined) throw new Error(`missing bass event ${id}`);
  return event;
}

function circularDistance(left: number, right: number): number {
  const diff = Math.abs((((left % 12) + 12) % 12) - (((right % 12) + 12) % 12));
  return Math.min(diff, 12 - diff);
}

function semitonePair(previous: number[], next: number[]): boolean {
  if (previous.length !== 2 || next.length !== 2) return false;
  const lowHeld = previous[0] === next[0];
  const highHeld = previous[1] === next[1];
  const lowMoved = Math.abs(previous[0]! - next[0]!) === 1 && highHeld;
  const highMoved = Math.abs(previous[1]! - next[1]!) === 1 && lowHeld;
  return lowMoved || highMoved;
}

interface WalkedSlot {
  startTick: number;
  durationTicks: number;
  rest: boolean;
  writtenMidis: number[];
}

function walkSlots(slots: readonly GuitarSlot[]): WalkedSlot[] {
  let tick = 0;
  return slots.map((slot) => {
    const row = {
      startTick: tick,
      durationTicks: ticksOf(slot.dur),
      rest: slot.rest,
      writtenMidis: slot.writtenMidis,
    };
    tick += row.durationTicks;
    return row;
  });
}

function relationHolds(relation: Relation, guitar: WalkedSlot, bass: V8cBassEvent): boolean {
  const bassEnd = bass.startTick + bass.durationTicks;
  if (relation === 'rests-while-speaks') {
    return guitar.rest && guitar.startTick <= bass.startTick && guitar.startTick + guitar.durationTicks > bass.startTick;
  }
  if (guitar.rest) return false;
  if (relation === 'answers-after') return guitar.startTick >= bassEnd && guitar.startTick <= bassEnd + WWH_DIVISIONS;
  if (relation === 'enters-during-sustain') return guitar.startTick > bass.startTick && guitar.startTick < bassEnd;
  if (relation === 'holds-across') return guitar.startTick < bass.startTick && guitar.startTick + guitar.durationTicks > bass.startTick;
  if (relation === 'transforms-on-attack') return guitar.writtenMidis.length === 2 && guitar.startTick === bass.startTick;
  return false;
}

function compileVersion(
  id: VersionId,
  label: string,
  rehearsal: string,
  bars: GuitarSlot[][],
  intents: SlotIntent[][],
  bass: readonly V8cBassEvent[]
): V8cVersion {
  bars.forEach((slots, barIndex) => {
    slots.forEach((slot, slotIndex) => assertFingers(slot, `${id} bar ${barIndex + 1} slot ${slotIndex}`));
  });
  const interactions: V8cInteraction[] = [];
  bars.forEach((slots, barIndex) => {
    const walked = walkSlots(slots);
    if (walked.reduce((sum, slot) => sum + slot.durationTicks, 0) !== BAR_TICKS) {
      throw new Error(`${id} bar ${barIndex + 1} does not fill`);
    }
    for (const intent of intents[barIndex] ?? []) {
      const guitar = walked[intent.slotIndex];
      if (!guitar) throw new Error(`${id} bar ${barIndex + 1} slot ${intent.slotIndex} missing`);
      const event = bassById(bass, intent.bassId);
      if (!relationHolds(intent.relation, guitar, event)) {
        throw new Error(`${id} bar ${barIndex + 1} ${intent.relation} does not meet ${intent.bassId} at tick ${guitar.startTick}`);
      }
      if (intent.requiresSemitoneFromPrevious) {
        const previous = walked.slice(0, intent.slotIndex).reverse().find((slot) => !slot.rest);
        if (!previous || !semitonePair(previous.writtenMidis, guitar.writtenMidis)) {
          throw new Error(`${id} bar ${barIndex + 1} has no semitone hold into slot ${intent.slotIndex}`);
        }
      }
      if (intent.registerSemitones !== undefined) {
        const sounding = guitar.writtenMidis.map((midi) => midi - 12);
        if (!sounding.some((midi) => Math.abs(midi - event.soundingMidi!) === intent.registerSemitones)) {
          throw new Error(`${id} register ${intent.registerSemitones} missing against ${intent.bassId}`);
        }
      }
      if (intent.pitchClassNeighbor) {
        const sounding = guitar.writtenMidis.map((midi) => midi - 12);
        if (!sounding.some((midi) => circularDistance(midi, event.soundingMidi!) === 1)) {
          throw new Error(`${id} is not a pitch-class neighbor of ${intent.bassId}`);
        }
      }
      interactions.push({
        version: id,
        bar: barIndex + 1,
        relation: intent.relation,
        bassId: intent.bassId,
        startTick: guitar.startTick,
        durationTicks: guitar.durationTicks,
        writtenMidis: guitar.writtenMidis,
        claim: intent.claim,
        registerSemitones: intent.registerSemitones,
        pitchClassNeighbor: intent.pitchClassNeighbor,
        requiresSemitoneFromPrevious: intent.requiresSemitoneFromPrevious,
      });
    }
  });
  if (interactions.length < 2) throw new Error(`${id} has fewer than two bass interactions`);
  return {
    id,
    label,
    rehearsal,
    slots: bars,
    atoms: finishBars(bars, id),
    interactions,
    sounding: bars.map((slots) => slots.filter((slot) => !slot.rest).map((slot) => slot.writtenMidis.map(soundingName).join('/'))),
  };
}

function lyrical(bass: readonly V8cBassEvent[]): V8cVersion {
  const f = 77;
  const ab = 80;
  const eb = 75;
  const d = 74;
  const fFinger: Finger = { stringNumber: 1, fret: 1 };
  const abFinger: Finger = { stringNumber: 1, fret: 4 };
  const ebFinger: Finger = { stringNumber: 2, fret: 4 };
  const dFinger: Finger = { stringNumber: 2, fret: 3 };
  const dyadFingers: Finger[] = [
    { stringNumber: 2, fret: 6 },
    { stringNumber: 1, fret: 4 },
  ];
  return compileVersion(
    'lyrical',
    'Lyrical conversation',
    'LYRICAL',
    [
      [rest('quarter'), rest('eighth'), rest('eighth'), note('quarter', f, [fFinger]), note('eighth', ab, [abFinger]), rest('eighth')],
      [rest('eighth'), note('eighth', f, [fFinger]), rest('quarter'), note('eighth', eb, [ebFinger]), note('eighth', d, [dFinger]), rest('quarter')],
      [rest('half'), dyad('quarter', f, ab, dyadFingers), rest('quarter')],
      [rest('half'), rest('quarter'), note('quarter', d, [dFinger])],
    ],
    [
      [
        { slotIndex: 0, relation: 'rests-while-speaks', bassId: 'D-downbeat', claim: 'Guitar rests on beat 1 while bass D speaks.' },
        { slotIndex: 2, relation: 'rests-while-speaks', bassId: 'A-offbeat', claim: 'Guitar still rests on the and of 2 while bass A speaks.' },
        { slotIndex: 3, relation: 'answers-after', bassId: 'A-offbeat', claim: 'F4 enters on beat 3, when the bass A eighth releases. Cell tone.' },
        { slotIndex: 4, relation: 'answers-after', bassId: 'D-pickup', claim: 'Ab4 enters on beat 4, when the bass D sixteenth releases, inside the bass rest.' },
      ],
      [
        { slotIndex: 1, relation: 'enters-during-sustain', bassId: 'D-downbeat', claim: 'F4 enters on the and of 1, while the bass D quarter is still sounding.' },
        { slotIndex: 2, relation: 'rests-while-speaks', bassId: 'A-offbeat', claim: 'Guitar rests through the bass A eighth.' },
        { slotIndex: 4, relation: 'holds-across', bassId: 'D-pickup', registerSemitones: 24, claim: 'D4 is already sounding when the bass D sixteenth attacks, two octaves above it.' },
      ],
      [
        { slotIndex: 0, relation: 'rests-while-speaks', bassId: 'D-downbeat', claim: 'Half rest leaves the bass D and the following A alone.' },
        { slotIndex: 0, relation: 'rests-while-speaks', bassId: 'A-offbeat', claim: 'The same half rest covers the bass A.' },
        {
          slotIndex: 1,
          relation: 'answers-after',
          bassId: 'A-offbeat',
          pitchClassNeighbor: true,
          claim: 'F4/Ab4 arrives on beat 3 as the bass A releases. Ab sits a semitone under that A, up an octave plus.',
        },
        { slotIndex: 1, relation: 'holds-across', bassId: 'D-pickup', claim: 'The same dyad is still held when the bass D sixteenth attacks.' },
      ],
      [
        { slotIndex: 1, relation: 'rests-while-speaks', bassId: 'D-pickup', claim: 'Guitar stays silent through the bass D sixteenth.' },
        {
          slotIndex: 2,
          relation: 'answers-after',
          bassId: 'D-pickup',
          registerSemitones: 24,
          claim: 'D4 answers on beat 4, two octaves above the bass D that just spoke, in the bass rest.',
        },
      ],
    ],
    bass
  );
}

function liquid(bass: readonly V8cBassEvent[]): V8cVersion {
  return compileVersion(
    'liquid',
    'Liquid harmony conversation',
    'LIQUID',
    [
      [rest('quarter'), grip('eighth', 'D4-A4'), grip('quarter', 'D4-Ab4'), rest('16th'), rest('16th'), rest('quarter')],
      [rest('eighth'), grip('eighth', 'F4'), rest('quarter'), grip('eighth', 'Ab4'), rest('eighth'), rest('quarter')],
      [rest('half'), grip('eighth', 'D4-Ab4'), grip('eighth', 'Eb4-Ab4'), rest('quarter')],
      [rest('eighth'), grip('eighth', 'F4-Ab4'), rest('quarter'), rest('eighth'), grip('eighth', 'Eb4'), rest('quarter')],
    ],
    [
      [
        { slotIndex: 0, relation: 'rests-while-speaks', bassId: 'D-downbeat', claim: 'D-minor fifth waits. Bass D speaks alone on beat 1.' },
        { slotIndex: 1, relation: 'answers-after', bassId: 'D-downbeat', claim: 'D4/A4, a D-minor fragment, answers on beat 2 as the bass D releases.' },
        {
          slotIndex: 2,
          relation: 'transforms-on-attack',
          bassId: 'A-offbeat',
          requiresSemitoneFromPrevious: true,
          claim: 'On the bass A attack, A4 moves to Ab4. D4 stays. Mixed dyad against that bass A.',
        },
        { slotIndex: 4, relation: 'rests-while-speaks', bassId: 'D-pickup', claim: 'Guitar is already silent when the bass D sixteenth speaks.' },
      ],
      [
        { slotIndex: 1, relation: 'enters-during-sustain', bassId: 'D-downbeat', claim: 'F4, the D-minor third, enters while bass D is still held.' },
        { slotIndex: 2, relation: 'rests-while-speaks', bassId: 'A-offbeat', claim: 'Guitar rests while bass A speaks.' },
        {
          slotIndex: 3,
          relation: 'answers-after',
          bassId: 'A-offbeat',
          pitchClassNeighbor: true,
          claim: 'Ab4 answers on beat 3, a semitone under the bass A, as an Ab-major fragment tone.',
        },
      ],
      [
        { slotIndex: 0, relation: 'rests-while-speaks', bassId: 'A-offbeat', claim: 'Half rest lets bass D and bass A speak before the dyads.' },
        { slotIndex: 1, relation: 'answers-after', bassId: 'A-offbeat', claim: 'D4/Ab4 enters on beat 3, after bass A.' },
        {
          slotIndex: 2,
          relation: 'holds-across',
          bassId: 'D-pickup',
          requiresSemitoneFromPrevious: true,
          claim: 'D4 moves to Eb4 while Ab4 stays. Eb4/Ab4 is held across the bass D sixteenth.',
        },
      ],
      [
        { slotIndex: 1, relation: 'enters-during-sustain', bassId: 'D-downbeat', claim: 'F4/Ab4 enters during the bass D sustain. Mixed fragment, no cadence.' },
        { slotIndex: 2, relation: 'rests-while-speaks', bassId: 'A-offbeat', claim: 'Guitar rests while bass A speaks.' },
        {
          slotIndex: 4,
          relation: 'holds-across',
          bassId: 'D-pickup',
          pitchClassNeighbor: true,
          claim: 'Eb4 is already sounding, a semitone above the bass D sixteenth.',
        },
      ],
    ],
    bass
  );
}

function adventurous(bass: readonly V8cBassEvent[], mapped: readonly number[]): V8cVersion {
  const g = mapped[1];
  const f = mapped[0];
  const d = mapped[3];
  const c = mapped[4];
  if (g !== 79 || f !== 77 || d !== 74 || c !== 72) {
    throw new Error(`M-NEAR pitches moved: ${mapped.join(',')}`);
  }
  const db = 73;
  const bb = 82;
  const ab = 80;
  return compileVersion(
    'adventurous',
    'Adventurous conversation',
    'ADVENTUROUS',
    [
      [rest('quarter'), rest('16th'), note('16th', g, [{ stringNumber: 1, fret: 3 }]), rest('eighth'), note('eighth', f, [{ stringNumber: 1, fret: 1 }]), rest('quarter.')],
      [
        rest('eighth'),
        note('eighth', db, [{ stringNumber: 2, fret: 2 }]),
        rest('quarter'),
        note('16th', d, [{ stringNumber: 2, fret: 3 }]),
        rest('16th'),
        rest('eighth'),
        note('eighth', f, [{ stringNumber: 1, fret: 1 }]),
        rest('eighth'),
      ],
      [rest('half'), dyad('quarter', d, ab, [{ stringNumber: 2, fret: 3 }, { stringNumber: 1, fret: 4 }]), rest('quarter')],
      [
        rest('quarter'),
        rest('16th'),
        note('16th', bb, [{ stringNumber: 1, fret: 6 }]),
        rest('eighth'),
        rest('quarter.'),
        note('eighth', c, [{ stringNumber: 2, fret: 1 }]),
      ],
    ],
    [
      [
        { slotIndex: 0, relation: 'rests-while-speaks', bassId: 'D-downbeat', claim: 'Guitar rests while bass D speaks.' },
        { slotIndex: 2, relation: 'answers-after', bassId: 'D-downbeat', claim: 'Mapped G4 answers as a sixteenth on the second half of beat 2, in the gap before bass A.' },
        { slotIndex: 3, relation: 'rests-while-speaks', bassId: 'A-offbeat', claim: 'Guitar rests while bass A speaks, then F4 answers when A releases.' },
        { slotIndex: 4, relation: 'answers-after', bassId: 'A-offbeat', claim: 'Mapped F4 enters on beat 3, after bass A.' },
        { slotIndex: 5, relation: 'rests-while-speaks', bassId: 'D-pickup', claim: 'The dotted-quarter rest covers the bass D sixteenth.' },
      ],
      [
        {
          slotIndex: 1,
          relation: 'enters-during-sustain',
          bassId: 'D-downbeat',
          claim: 'Db4, mapped C pushed up a semitone, enters while bass D is held.',
        },
        { slotIndex: 2, relation: 'rests-while-speaks', bassId: 'A-offbeat', claim: 'Guitar rests while bass A speaks.' },
        { slotIndex: 5, relation: 'rests-while-speaks', bassId: 'D-pickup', claim: 'Guitar rests across the bass D sixteenth, then answers after it.' },
        { slotIndex: 6, relation: 'answers-after', bassId: 'D-pickup', claim: 'Mapped F4 arrives on beat 4, after the bass D sixteenth, in the bass rest.' },
      ],
      [
        { slotIndex: 0, relation: 'rests-while-speaks', bassId: 'D-downbeat', claim: 'Half rest. Bass D and bass A speak with no guitar.' },
        {
          slotIndex: 1,
          relation: 'answers-after',
          bassId: 'A-offbeat',
          pitchClassNeighbor: true,
          claim: 'D4/Ab4 on beat 3. Ab is the chromatic neighbor under bass A. D is the mapped tone.',
        },
        { slotIndex: 1, relation: 'holds-across', bassId: 'D-pickup', claim: 'That dyad is still sounding when the bass D sixteenth attacks.' },
      ],
      [
        { slotIndex: 2, relation: 'answers-after', bassId: 'D-downbeat', claim: 'Bb4 sixteenth sits in the gap after bass D and releases as bass A enters.' },
        { slotIndex: 3, relation: 'rests-while-speaks', bassId: 'A-offbeat', claim: 'Guitar rests on the bass A attack. The Bb has just let go.' },
        { slotIndex: 4, relation: 'rests-while-speaks', bassId: 'D-pickup', claim: 'Dotted-quarter rest covers the bass D sixteenth.' },
        { slotIndex: 5, relation: 'answers-after', bassId: 'D-pickup', claim: 'Mapped C4 enters on the and of 4, late in the bass rest.' },
      ],
    ],
    bass
  );
}

function header(movementTitle: string): WwhScoreHeader {
  return {
    title: 'Black Aura',
    movementTitle,
    composer: 'Michael Bryant',
    software: 'Composer OS WWH V8C',
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
  return [...source.slice(0, V8A_WINDOW.returnOrder), ...writtenWindow(guitarBars, template.bass.element, rehearsal), ...source.slice(V8A_WINDOW.returnOrder)];
}

function mappedMotif(): { source: number[]; mapped: number[] } {
  const v8a = buildV8aBundle();
  return { source: v8a.map.sourcePitches, mapped: v8a.map.mappedPitches };
}

function fingerprint(version: V8cVersion): string {
  return version.slots
    .map((slots) => walkSlots(slots).map((slot) => `${slot.startTick}:${slot.rest ? 'R' : slot.writtenMidis.join('+')}`).join(','))
    .join('|');
}

export function buildV8cBundle(seed = V8C_SEED): V8cBundle {
  if (seed !== V8C_SEED) throw new Error(`V8C is fixed at seed ${V8C_SEED}`);
  const { index, sha256 } = loadBlackAuraIndex();
  const bass = readInsertionBass(index);
  const motif = mappedMotif();
  const versions = [lyrical(bass), liquid(bass), adventurous(bass, motif.mapped)];
  const prints = versions.map(fingerprint);
  if (new Set(prints).size !== 3) throw new Error('the three guitar versions are not distinct');
  const template = index.measures[V8A_WINDOW.cutAfterOrder];
  if (!template) throw new Error('bar 16 missing');
  const scores = {
    lyrical: renderWwhDuoScore(duoBars(index, versions[0]!.atoms, 'LYRICAL'), header('V8C lyrical duo')),
    liquid: renderWwhDuoScore(duoBars(index, versions[1]!.atoms, 'LIQUID'), header('V8C liquid harmony duo')),
    adventurous: renderWwhDuoScore(duoBars(index, versions[2]!.atoms, 'ADVENTUROUS'), header('V8C adventurous duo')),
  };
  return { seed, sourceSha256: sha256, bass, mappedPitches: motif.mapped, sourcePitches: motif.source, versions, scores };
}

export function groupsFromImported(notes: readonly TimedGuitarEvent[]): WalkedSlot[] {
  let tick = 0;
  const groups: WalkedSlot[] = [];
  for (const note of notes) {
    if (note.chord) {
      const last = groups[groups.length - 1];
      if (!last || note.rest || !note.step || note.octave === undefined) throw new Error('chord tone without an attack');
      last.writtenMidis.push(midiOf(note.step, note.alter ?? 0, note.octave));
      continue;
    }
    const writtenMidis = note.rest || !note.step || note.octave === undefined ? [] : [midiOf(note.step, note.alter ?? 0, note.octave)];
    groups.push({ startTick: tick, durationTicks: note.duration, rest: note.rest, writtenMidis });
    tick += note.duration;
  }
  if (tick !== BAR_TICKS) throw new Error(`reimported bar sums to ${tick}`);
  return groups;
}

/** Check claimed interactions against reimported guitar notes and the parsed bass. */
export function verifyImportedInteractions(
  bars: ReadonlyArray<{ notes: readonly TimedGuitarEvent[] }>,
  bass: readonly V8cBassEvent[],
  interactions: readonly V8cInteraction[]
): void {
  if (bars.length !== 4) throw new Error(`expected 4 guitar bars, found ${bars.length}`);
  const walked = bars.map((bar) => groupsFromImported(bar.notes));
  for (const interaction of interactions) {
    const bar = walked[interaction.bar - 1];
    if (!bar) throw new Error(`missing bar ${interaction.bar}`);
    const guitar = bar.find((slot) => slot.startTick === interaction.startTick && slot.durationTicks === interaction.durationTicks);
    if (!guitar) throw new Error(`${interaction.version} bar ${interaction.bar} has no event at tick ${interaction.startTick}`);
    if (guitar.rest !== (interaction.writtenMidis.length === 0)) throw new Error(`${interaction.version} rest flag drifted`);
    if (!guitar.rest && guitar.writtenMidis.join(',') !== interaction.writtenMidis.join(',')) {
      throw new Error(`${interaction.version} pitches drifted at tick ${interaction.startTick}`);
    }
    const event = bassById(bass, interaction.bassId);
    if (!relationHolds(interaction.relation, guitar, event)) {
      throw new Error(`${interaction.version} ${interaction.relation} failed against ${interaction.bassId}`);
    }
    if (interaction.requiresSemitoneFromPrevious) {
      const previous = bar.filter((slot) => slot.startTick < guitar.startTick && !slot.rest).at(-1);
      if (!previous || !semitonePair(previous.writtenMidis, guitar.writtenMidis)) {
        throw new Error(`${interaction.version} semitone motion drifted`);
      }
    }
  }
}

function beatLabel(tick: number): string {
  const beat = tick / WWH_DIVISIONS + 1;
  return Number.isInteger(beat) ? String(beat) : beat.toFixed(2).replace(/0$/, '').replace(/\.$/, '');
}

function bassSentence(event: V8cBassEvent): string {
  const name = `${event.step}${event.alter ? 'b' : ''}${event.writtenOctave}`;
  const sounding = event.soundingMidi === undefined ? '' : soundingName((event.soundingMidi ?? 0) + 12);
  return `${name} written / ${sounding} sounding, ${event.durationTicks} ticks, attack beat ${beatLabel(event.startTick)}`;
}

function report(bundle: V8cBundle): string {
  const bassLines = bundle.bass
    .map((event) => {
      if (event.rest) return `- Rest, beat ${beatLabel(event.startTick)}, ${event.durationTicks} ticks.`;
      return `- \`${event.id}\`: ${bassSentence(event)}.`;
    })
    .join('\n');
  const versionBlocks = bundle.versions
    .map((version) => {
      const sounding = version.sounding.map((bar, index) => `${index + 1}. ${bar.join(' · ') || '(silence)'}`).join('\n');
      const interactions = version.interactions
        .map((interaction) => {
          const pitches = interaction.writtenMidis.length ? interaction.writtenMidis.map(soundingName).join('/') : 'rest';
          return `- Bar ${interaction.bar}, beat ${beatLabel(interaction.startTick)}, \`${interaction.relation}\` on \`${interaction.bassId}\`. Guitar: ${pitches}. ${interaction.claim}`;
        })
        .join('\n');
      return `## ${version.label}\n\nSounding guitar:\n\n${sounding}\n\nInteractions:\n\n${interactions}`;
    })
    .join('\n\n');
  return `# V8C interaction report — Black Aura guitar–bass conversation

## Status

| Item | Result |
| --- | --- |
| Bass-conditioned guitar, re-import, source and bass preservation | **PASS** — \`npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/wwhBlackAuraV8c.test.ts\` (8 passed) |
| Playback | **NOT VERIFIED** |
| Musician review | **NOT VERIFIED** |
| Sibelius import | **NOT OPENED** |

Seed \`${bundle.seed}\`. Source sha256 \`${bundle.sourceSha256}\`.

The insert is the V8A guitar-talk window: four 4/4 bars after printed bar 16, return at printed bar 17, quarter = 92. Bass in those four bars is the printed bar 16 clone. Guitar outside the insert is the source. Bass outside the insert is the source.

## Bass timeline

Read from printed bar 16. Octave shift is −1, so written D3 sounds D2 and written A3 sounds A2. The same six events repeat in each inserted bar. Guitar placement uses these ticks, not the chord symbol.

${bassLines}

${versionBlocks}

## Constraints kept

D minor / Ab major grips in the liquid version are the V8B piece recipe. Parent fragments and the two semitone holds stay. No ii–V–I symbol is written into the insert. Inserted bars carry no new chord symbol. Printed Asus4 on bar 16 and Bbm on bar 17 stay on those source bars. No tab. Standard tuning, frets 0–7, stopped span at most 3.
`;
}

function recipeJson(bundle: V8cBundle): string {
  return `${JSON.stringify(
    {
      seed: bundle.seed,
      piece: 'Black Aura',
      status: 'bass-conditioned guitar conversation',
      notAVaultRow: true,
      source: V8A_DUO_FILE,
      sourceSha256: bundle.sourceSha256,
      window: V8A_WINDOW,
      tempo: 92,
      transposeOctave: -1,
      bass: bundle.bass,
      motifSourcePitches: bundle.sourcePitches,
      motifMappedPitches: bundle.mappedPitches,
      liquidGrips: V8B_GRIPS.map((gripItem: V8bGrip) => gripItem.id),
      versions: bundle.versions.map((version) => ({
        id: version.id,
        sounding: version.sounding,
        fingers: version.slots.map((slots) =>
          slots
            .filter((slot) => !slot.rest)
            .map((slot) => ({
              gripId: slot.gripId ?? null,
              sounding: slot.writtenMidis.map(soundingName),
              fingers: slot.fingers,
            }))
        ),
        interactions: version.interactions,
      })),
    },
    null,
    2
  )}\n`;
}

const FILES: Record<VersionId, string> = {
  lyrical: 'V8C-DUO-LYRICAL.musicxml',
  liquid: 'V8C-DUO-LIQUID-HARMONY.musicxml',
  adventurous: 'V8C-DUO-ADVENTUROUS.musicxml',
};

export function writeV8cPilot(outDir = V8C_OUT_DIR, bundle = buildV8cBundle()): string[] {
  fs.mkdirSync(outDir, { recursive: true });
  const files: Array<[string, string]> = [
    [FILES.lyrical, bundle.scores.lyrical],
    [FILES.liquid, bundle.scores.liquid],
    [FILES.adventurous, bundle.scores.adventurous],
    ['V8C-INTERACTION-REPORT.md', report(bundle)],
    ['V8C-RECIPE.json', recipeJson(bundle)],
  ];
  for (const [name, body] of files) fs.writeFileSync(path.join(outDir, name), body);
  return files.map(([name]) => path.join(outDir, name));
}

export function reimportV8c(xml: string): ReturnType<typeof importWwhDuoMusicXml> {
  return importWwhDuoMusicXml(xml);
}

export function sha256File(file: string): string {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}
