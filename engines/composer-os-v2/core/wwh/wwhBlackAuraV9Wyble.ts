/**
 * Black Aura V9 — one new Wyble two-voice guitar insert.
 * Four composed bars. Independent voices. Does not copy Liquid V1 or V8 note lists.
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { importWwhDuoMusicXml, pitchFingerprint, type WwhImportedNote } from './wwhDuoImport';
import { renderWwhDuoScore, type WwhScoreHeader, type WwhWrittenBar } from './wwhMusicXmlWrite';
import { loadBlackAuraIndex, V8A_DUO_FILE, V8A_WINDOW } from './wwhBlackAuraV8a';
import { readInsertionBass } from './wwhBlackAuraV8c';
import { midiOf, stoppedSpan } from './wwhBlackAuraV8bRecipe';
import { assertWwhBar, wwhNote, wwhRest, WWH_DIVISIONS, WWH_DUR, type WwhAtom } from './wwhPerformanceTypes';

export const V9_WYBLE_FILE =
  '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/WWH-PERFORMANCE-MOCKUPS/V9-PILOT/V9-BLACK-AURA-CREATIVE-WYBLE-V1.musicxml';
export const V9_LIQUID_FILE =
  '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/WWH-PERFORMANCE-MOCKUPS/V9-PILOT/V9-BLACK-AURA-CREATIVE-LIQUID-V1.musicxml';
export const V9_WYBLE_SEED = 90022;
const SOURCE_SHA = 'b46ad5eddf329f4975a1be1e868099c3c7cefa005226e936e313e7583b2eedcb';
const BAR_TICKS = 1024;
const MAX_FRET = 12;
const MAX_SPAN = 3;
const MAX_FREE_SHIFT = 4;
const OPEN_MIDI = [64, 59, 55, 50, 45, 40] as const;

type Dur = 'whole' | 'half' | 'quarter' | 'eighth' | '16th';

interface Tone {
  step: string;
  alter: number;
  /** Sounding octave. The staff writes one octave higher. */
  octave: number;
  stringNumber: number;
  fret: number;
  tie?: 'start' | 'stop';
}

interface Slot {
  dur: Dur;
  tone: Tone | null;
}

/**
 * Sounding pitches. Upper voice sings the motif. Lower voice answers.
 * Fingers are standard tuning. Written octave is sounding octave + 1.
 */
const UPPER: Slot[][] = [
  [
    { dur: 'eighth', tone: null },
    { dur: 'eighth', tone: { step: 'F', alter: 0, octave: 4, stringNumber: 2, fret: 6 } },
    { dur: 'quarter', tone: { step: 'A', alter: -1, octave: 4, stringNumber: 1, fret: 4 } },
    { dur: 'eighth', tone: { step: 'F', alter: 0, octave: 4, stringNumber: 1, fret: 1 } },
    { dur: 'eighth', tone: null },
    { dur: 'quarter', tone: { step: 'E', alter: -1, octave: 4, stringNumber: 2, fret: 4 } },
  ],
  [
    { dur: 'quarter', tone: { step: 'D', alter: 0, octave: 4, stringNumber: 2, fret: 3 } },
    { dur: 'eighth', tone: null },
    { dur: 'eighth', tone: { step: 'F', alter: 0, octave: 4, stringNumber: 2, fret: 6 } },
    { dur: 'quarter', tone: { step: 'A', alter: -1, octave: 4, stringNumber: 1, fret: 4 } },
    { dur: 'quarter', tone: { step: 'G', alter: 0, octave: 4, stringNumber: 1, fret: 3 } },
  ],
  [
    { dur: 'half', tone: { step: 'A', alter: -1, octave: 4, stringNumber: 1, fret: 4 } },
    { dur: 'quarter', tone: { step: 'F', alter: 0, octave: 4, stringNumber: 2, fret: 6 } },
    { dur: 'quarter', tone: null },
  ],
  [
    { dur: 'quarter', tone: { step: 'E', alter: -1, octave: 4, stringNumber: 2, fret: 4 } },
    { dur: 'quarter', tone: { step: 'D', alter: 0, octave: 4, stringNumber: 3, fret: 7 } },
    { dur: 'half', tone: null },
  ],
];

const LOWER: Slot[][] = [
  [
    { dur: 'quarter', tone: null },
    { dur: 'eighth', tone: { step: 'C', alter: 0, octave: 4, stringNumber: 3, fret: 5 } },
    { dur: 'eighth', tone: { step: 'B', alter: -1, octave: 3, stringNumber: 3, fret: 3 } },
    {
      dur: 'half',
      tone: { step: 'A', alter: 0, octave: 3, stringNumber: 3, fret: 2, tie: 'start' },
    },
  ],
  [
    {
      dur: 'quarter',
      tone: { step: 'A', alter: 0, octave: 3, stringNumber: 3, fret: 2, tie: 'stop' },
    },
    { dur: 'quarter', tone: { step: 'C', alter: 0, octave: 4, stringNumber: 3, fret: 5 } },
    { dur: 'eighth', tone: { step: 'F', alter: 0, octave: 3, stringNumber: 4, fret: 3 } },
    { dur: 'eighth', tone: { step: 'G', alter: 0, octave: 3, stringNumber: 3, fret: 0 } },
    { dur: 'quarter', tone: { step: 'B', alter: -1, octave: 3, stringNumber: 3, fret: 3 } },
  ],
  [
    { dur: 'eighth', tone: null },
    { dur: 'eighth', tone: { step: 'F', alter: 0, octave: 3, stringNumber: 4, fret: 3 } },
    { dur: 'quarter', tone: { step: 'E', alter: -1, octave: 3, stringNumber: 4, fret: 1 } },
    { dur: 'quarter', tone: { step: 'D', alter: 0, octave: 3, stringNumber: 4, fret: 0 } },
    { dur: 'quarter', tone: { step: 'A', alter: 0, octave: 3, stringNumber: 4, fret: 7 } },
  ],
  [
    { dur: 'eighth', tone: null },
    { dur: 'eighth', tone: { step: 'G', alter: 0, octave: 3, stringNumber: 3, fret: 0 } },
    { dur: 'quarter', tone: { step: 'A', alter: 0, octave: 3, stringNumber: 4, fret: 7 } },
    { dur: 'quarter', tone: { step: 'F', alter: 0, octave: 3, stringNumber: 5, fret: 8 } },
    { dur: 'quarter', tone: null },
  ],
];

function ticksOf(dur: Dur): number {
  return WWH_DUR[dur].divisions;
}

function soundingMidi(tone: Tone): number {
  const open = OPEN_MIDI[tone.stringNumber - 1];
  if (open === undefined) throw new Error(`string ${tone.stringNumber}`);
  return open + tone.fret;
}

function spell(tone: Tone, written: boolean): string {
  const accidental = tone.alter < 0 ? 'b' : tone.alter > 0 ? '#' : '';
  const octave = written ? tone.octave + 1 : tone.octave;
  return `${tone.step}${accidental}${octave}`;
}

function atomsOf(slots: readonly Slot[]): WwhAtom[] {
  return slots.map((slot) => {
    if (!slot.tone) return wwhRest(slot.dur);
    const atom = wwhNote(slot.tone.step, slot.tone.octave + 1, slot.dur, slot.tone.alter);
    if (slot.tone.tie === 'start') atom.tieStart = true;
    if (slot.tone.tie === 'stop') atom.tieStop = true;
    return atom;
  });
}

export function wybleGuitarVoices(): { upper: WwhAtom[][]; lower: WwhAtom[][] } {
  const upper = UPPER.map((slots, index) => {
    const atoms = atomsOf(slots);
    assertWwhBar(atoms, BAR_TICKS, `wyble-upper-${index + 1}`);
    return atoms;
  });
  const lower = LOWER.map((slots, index) => {
    const atoms = atomsOf(slots);
    assertWwhBar(atoms, BAR_TICKS, `wyble-lower-${index + 1}`);
    return atoms;
  });
  return { upper, lower };
}

interface GripNote {
  start: number;
  end: number;
  tone: Tone;
  voice: 'upper' | 'lower';
}

function expand(voice: 'upper' | 'lower', bars: readonly Slot[][]): GripNote[] {
  const notes: GripNote[] = [];
  bars.forEach((slots, barIndex) => {
    let cursor = barIndex * BAR_TICKS;
    slots.forEach((slot) => {
      const start = cursor;
      cursor += ticksOf(slot.dur);
      if (slot.tone) notes.push({ start, end: cursor, tone: slot.tone, voice });
    });
    if (cursor !== (barIndex + 1) * BAR_TICKS) throw new Error(`${voice} bar ${barIndex + 1} ticks ${cursor}`);
  });
  return notes;
}

function assertPlayable(): string[] {
  const sounding: string[] = [];
  for (let bar = 0; bar < UPPER.length; bar += 1) {
    const upper = UPPER[bar]!.map((slot) => (slot.tone ? spell(slot.tone, true) : 'rest')).join(' ');
    const lower = LOWER[bar]!.map((slot) => (slot.tone ? spell(slot.tone, true) : 'rest')).join(' ');
    sounding.push(`upper ${upper} | lower ${lower}`);
  }
  const notes = [...expand('upper', UPPER), ...expand('lower', LOWER)].sort((a, b) => a.start - b.start || a.end - b.end);
  let lastGrip: number[] = [];
  notes.forEach((note) => {
    const tone = note.tone;
    const label = `${note.voice} ${spell(tone, false)}`;
    if (tone.fret < 0 || tone.fret > MAX_FRET) throw new Error(`${label} fret ${tone.fret}`);
    if (tone.stringNumber < 1 || tone.stringNumber > 6) throw new Error(`${label} string`);
    if (midiOf(tone.step, tone.alter, tone.octave + 1) - 12 !== soundingMidi(tone)) {
      throw new Error(`${label} finger ${tone.stringNumber}/${tone.fret} does not sound the written pitch`);
    }
    const held = notes.filter((other) => other !== note && other.end > note.start && other.start <= note.start);
    const grip = [...held.map((other) => other.tone), tone];
    const strings = grip.map((item) => item.stringNumber);
    if (new Set(strings).size !== strings.length) throw new Error(`${label} overlaps a sounding string`);
    if (stoppedSpan(grip.map((item) => item.fret)) > MAX_SPAN) throw new Error(`${label} span`);
    const handFree = held.every((other) => other.tone.fret === 0);
    if (tone.fret > 0 && handFree && lastGrip.length) {
      const near = lastGrip.some((fret) => Math.abs(fret - tone.fret) <= MAX_FREE_SHIFT);
      if (!near) throw new Error(`${label} shift from ${lastGrip.join(',')}`);
    }
    const stopped = grip.map((item) => item.fret).filter((fret) => fret > 0);
    if (stopped.length) lastGrip = stopped;
    if (tone.octave > held.reduce((max, other) => Math.max(max, other.tone.octave), -1) && note.voice === 'lower') {
      const upperHeld = held.filter((other) => other.voice === 'upper');
      if (upperHeld.some((other) => midiOf(other.tone.step, other.tone.alter, other.tone.octave) < midiOf(tone.step, tone.alter, tone.octave))) {
        throw new Error(`${label} crosses above the upper voice`);
      }
    }
  });
  const upperNotes = notes.filter((note) => note.voice === 'upper');
  const lowerNotes = notes.filter((note) => note.voice === 'lower');
  let contrary = 0;
  let oblique = 0;
  for (let index = 1; index < upperNotes.length; index += 1) {
    const up = midiOf(upperNotes[index]!.tone.step, upperNotes[index]!.tone.alter, upperNotes[index]!.tone.octave) -
      midiOf(upperNotes[index - 1]!.tone.step, upperNotes[index - 1]!.tone.alter, upperNotes[index - 1]!.tone.octave);
    const lowWindow = lowerNotes.filter((note) => note.start >= upperNotes[index - 1]!.start && note.start <= upperNotes[index]!.start);
    const low = lowWindow.length >= 2
      ? midiOf(lowWindow[lowWindow.length - 1]!.tone.step, lowWindow[lowWindow.length - 1]!.tone.alter, lowWindow[lowWindow.length - 1]!.tone.octave) -
        midiOf(lowWindow[0]!.tone.step, lowWindow[0]!.tone.alter, lowWindow[0]!.tone.octave)
      : 0;
    if (up !== 0 && low !== 0 && Math.sign(up) !== Math.sign(low)) contrary += 1;
    if ((up === 0 && low !== 0) || (up !== 0 && low === 0)) oblique += 1;
  }
  if (contrary < 2) throw new Error(`contrary motion ${contrary}`);
  if (oblique < 2) throw new Error(`oblique motion ${oblique}`);
  const motif = UPPER[0]!.filter((slot) => slot.tone).map((slot) => `${slot.tone!.step}${slot.tone!.alter}`);
  if (motif.join(',') !== 'F0,A-1,F0,E-1') throw new Error(`bar 1 motif ${motif.join(',')}`);
  const tail = LOWER[2]!.filter((slot) => slot.tone).map((slot) => `${slot.tone!.step}${slot.tone!.alter}`);
  if (!tail.join(',').includes('E-1,D0')) throw new Error(`lower motif tail ${tail.join(',')}`);
  return sounding;
}

function header(): WwhScoreHeader {
  return {
    title: 'Black Aura',
    movementTitle: 'V9 creative wyble duo',
    composer: 'Michael Bryant',
    software: 'Composer OS WWH V9 wyble',
    tempo: 92,
    transposeOctave: -1,
  };
}

function duoBars(upper: WwhAtom[][], lower: WwhAtom[][]): WwhWrittenBar[] {
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
  const window: WwhWrittenBar[] = upper.map((guitar, indexBar) => ({
    guitar,
    guitarVoice2: lower[indexBar],
    bass: [],
    bassClone: template.bass.element,
    beats: 4,
    beatType: 4,
    divisions: WWH_DIVISIONS,
    fifths: template.guitar.fifths,
    mode: template.guitar.mode,
    guitarTranspose: -1,
    bassTranspose: -1,
    rehearsal: indexBar === 0 ? 'WYBLE' : undefined,
    tempoMark: indexBar === 0 ? { beatUnit: 'quarter', dots: 0, perMinute: '92', soundTempo: null } : undefined,
  }));
  return [...source.slice(0, V8A_WINDOW.returnOrder), ...window, ...source.slice(V8A_WINDOW.returnOrder)];
}

function sha256File(file: string): string {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function toneId(note: WwhImportedNote): string {
  if (note.rest) return `R:${note.duration}:${note.voice}`;
  return `${note.step}${note.alter ?? 0}${note.octave}:${note.duration}:${note.chord ? 'c' : 'a'}:${note.voice}:${note.tieStart ? 's' : ''}${note.tieStop ? 't' : ''}`;
}

function lane(notes: readonly WwhImportedNote[]): string {
  return notes.map(toneId).join(',');
}

function voiceTicks(notes: readonly WwhImportedNote[]): Map<string, number> {
  const sums = new Map<string, number>();
  for (const note of notes) {
    if (note.chord) continue;
    sums.set(note.voice, (sums.get(note.voice) ?? 0) + note.duration);
  }
  return sums;
}

export function buildV9WybleXml(): { xml: string; sounding: string[]; fingerprint: string } {
  const before = sha256File(V8A_DUO_FILE);
  if (before !== SOURCE_SHA) throw new Error(`source hash is ${before}`);
  const liquidBefore = sha256File(V9_LIQUID_FILE);
  const sounding = assertPlayable();
  const { index } = loadBlackAuraIndex();
  const bass = readInsertionBass(index);
  const pitched = bass.filter((event) => !event.rest).map((event) => event.id).join(',');
  if (pitched !== 'D-downbeat,A-offbeat,D-pickup') throw new Error(`bass ids ${pitched}`);
  const voices = wybleGuitarVoices();
  const xml = renderWwhDuoScore(duoBars(voices.upper, voices.lower), header());
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
  let tieStart = 0;
  let tieStop = 0;
  for (const measure of duo.guitar.measures.slice(head, tail)) {
    if (measure.transposeOctave !== -1) throw new Error('guitar octave-change is not -1');
    if (measure.beats !== 4 || measure.beatType !== 4 || measure.divisions !== 256 || measure.specTicks !== 1024) {
      throw new Error('insert guitar meter');
    }
    if (!measure.gridAgrees) throw new Error('insert guitar grid');
    if (!measure.hasBackup) throw new Error('insert guitar has no second voice');
    if (measure.harmony.length) throw new Error('insert guitar carries a chord symbol');
    const ticks = voiceTicks(measure.notes);
    if (ticks.size !== 2 || ticks.get('1') !== 1024 || ticks.get('2') !== 1024) {
      throw new Error(`insert guitar voices ${[...ticks.entries()].join(' ')}`);
    }
    for (const note of measure.notes) {
      if (note.chord) throw new Error('insert guitar stacks a chord tone');
      if (note.tieStart) tieStart += 1;
      if (note.tieStop) tieStop += 1;
    }
  }
  if (tieStart !== 1 || tieStop !== 1) throw new Error(`tie balance start ${tieStart} stop ${tieStop}`);
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
    'V9-BLACK-AURA-CREATIVE-LIQUID-V1.musicxml',
  ];
  for (const name of prior) {
    const file = `/Users/user/Documents/DEVS/ECM-Album-Nov-2027/WWH-PERFORMANCE-MOCKUPS/V9-PILOT/${name}`;
    const old = importWwhDuoMusicXml(fs.readFileSync(file, 'utf8'));
    const oldPrint = pitchFingerprint(old.guitar.measures.slice(head, tail));
    if (oldPrint === fingerprint) throw new Error(`insert matches ${name}`);
  }
  if (sha256File(V8A_DUO_FILE) !== SOURCE_SHA) throw new Error('source changed during build');
  if (sha256File(V9_LIQUID_FILE) !== liquidBefore) throw new Error('liquid file changed during build');
  return { xml, sounding, fingerprint };
}

export function writeV9WybleCreative(outFile = V9_WYBLE_FILE): { file: string; sounding: string[]; fingerprint: string } {
  if (fs.existsSync(outFile)) throw new Error(`REFUSE overwrite: ${outFile}`);
  const built = buildV9WybleXml();
  fs.writeFileSync(outFile, built.xml, { flag: 'wx' });
  const reread = importWwhDuoMusicXml(fs.readFileSync(outFile, 'utf8'));
  if (reread.guitar.measures.length !== 43) throw new Error('written file failed re-import');
  const head = V8A_WINDOW.returnOrder;
  const tail = head + V8A_WINDOW.bars;
  for (const measure of reread.guitar.measures.slice(head, tail)) {
    if (!measure.gridAgrees || !measure.hasBackup) throw new Error('written insert failed voice grid');
  }
  if (sha256File(V8A_DUO_FILE) !== SOURCE_SHA) throw new Error('source changed during write');
  if (pitchFingerprint(reread.guitar.measures.slice(head, tail)) !== built.fingerprint) {
    throw new Error('written fingerprint drifted');
  }
  return { file: outFile, sounding: built.sounding, fingerprint: built.fingerprint };
}

if (process.argv[1]?.includes('wwhBlackAuraV9Wyble')) {
  const written = writeV9WybleCreative();
  console.log(JSON.stringify({ seed: V9_WYBLE_SEED, ...written }, null, 2));
}
