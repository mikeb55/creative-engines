/**
 * Black Aura V9 — Space. Hand-authored sketch.
 * Four bars after printed bar 16, written by hand. Single voice. V9_SPACE_SEED is printed only. It does not choose notes.
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { importWwhDuoMusicXml, pitchFingerprint, type WwhImportedNote } from './wwhDuoImport';
import { renderWwhDuoScore, type WwhScoreHeader, type WwhWrittenBar } from './wwhMusicXmlWrite';
import { loadBlackAuraIndex, V8A_DUO_FILE, V8A_WINDOW } from './wwhBlackAuraV8a';
import { readInsertionBass } from './wwhBlackAuraV8c';
import { midiOf, soundingFromStringFret, stoppedSpan, V8B_MAX_FRET, V8B_MAX_STOPPED_SPAN } from './wwhBlackAuraV8bRecipe';
import { assertWwhBar, wwhDyad, wwhNote, wwhRest, WWH_DIVISIONS, type WwhAtom } from './wwhPerformanceTypes';

export const V9_SPACE_FILE =
  '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/WWH-PERFORMANCE-MOCKUPS/V9-PILOT/V9-BLACK-AURA-CREATIVE-SPACE-V1.musicxml';
export const V9_LIQUID_FILE =
  '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/WWH-PERFORMANCE-MOCKUPS/V9-PILOT/V9-BLACK-AURA-CREATIVE-LIQUID-V1.musicxml';
export const V9_WYBLE_FILE =
  '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/WWH-PERFORMANCE-MOCKUPS/V9-PILOT/V9-BLACK-AURA-CREATIVE-WYBLE-V1.musicxml';
/** Printed only. Not used to choose notes. */
export const V9_SPACE_SEED = 90023;
const SOURCE_SHA = 'b46ad5eddf329f4975a1be1e868099c3c7cefa005226e936e313e7583b2eedcb';
const LIQUID_SHA = '97d22ad213f3387a65247b807ffb8fb7273f6e0d9227f191d3c764e8033813b3';
const WYBLE_SHA = 'db7a1c0de30c24781a621c949bdbe87a840aecbc571a38591eec4116276ac38c';
const BASS_PLACEHOLDER = 'Placeholder — repeats bar 16';
const BAR_TICKS = 1024;

type Dur = 'whole' | 'half' | 'quarter' | 'eighth' | '16th';

interface Tone {
  step: string;
  alter: number;
  /** Written octave. Octave-change −1 sounds one octave lower. */
  octave: number;
  stringNumber: number;
  fret: number;
}

interface Slot {
  dur: Dur;
  tones: Tone[];
  tie?: 'start' | 'stop';
}

/**
 * Written staff. Sounding pitch is one octave lower.
 * F–Ab–F–Eb–D unfolds as long tones. Open strings ring beside them.
 * Bass D–A–D is left alone on purpose, then answered late.
 */
export const SPACE_BARS: Slot[][] = [
  [
    { dur: 'quarter', tones: [] },
    { dur: 'quarter', tones: [] },
    {
      dur: 'half',
      tie: 'start',
      tones: [
        { step: 'A', alter: 0, octave: 3, stringNumber: 5, fret: 0 },
        { step: 'F', alter: 0, octave: 4, stringNumber: 4, fret: 3 },
      ],
    },
  ],
  [
    {
      dur: 'quarter',
      tie: 'stop',
      tones: [
        { step: 'A', alter: 0, octave: 3, stringNumber: 5, fret: 0 },
        { step: 'F', alter: 0, octave: 4, stringNumber: 4, fret: 3 },
      ],
    },
    { dur: 'quarter', tones: [] },
    {
      dur: 'half',
      tones: [
        { step: 'D', alter: 0, octave: 4, stringNumber: 4, fret: 0 },
        { step: 'A', alter: -1, octave: 4, stringNumber: 3, fret: 1 },
      ],
    },
  ],
  [
    { dur: 'half', tones: [] },
    {
      dur: 'half',
      tones: [
        { step: 'F', alter: 0, octave: 4, stringNumber: 4, fret: 3 },
        { step: 'B', alter: 0, octave: 4, stringNumber: 2, fret: 0 },
      ],
    },
  ],
  [
    { dur: 'quarter', tones: [] },
    { dur: 'quarter', tones: [] },
    { dur: 'quarter', tones: [{ step: 'E', alter: -1, octave: 4, stringNumber: 4, fret: 1 }] },
    { dur: 'quarter', tones: [{ step: 'D', alter: 0, octave: 4, stringNumber: 4, fret: 0 }] },
  ],
];

function toneMidi(tone: Tone): number {
  return midiOf(tone.step, tone.alter, tone.octave);
}

function atomsOfSlot(slot: Slot): WwhAtom[] {
  let atoms: WwhAtom[];
  if (!slot.tones.length) atoms = [wwhRest(slot.dur)];
  else if (slot.tones.length === 1) {
    const tone = slot.tones[0]!;
    atoms = [wwhNote(tone.step, tone.octave, slot.dur, tone.alter)];
  } else if (slot.tones.length === 2) {
    const ordered = [...slot.tones].sort((a, b) => toneMidi(a) - toneMidi(b));
    const low = ordered[0]!;
    const high = ordered[1]!;
    atoms = wwhDyad([low.step, low.octave, low.alter], [high.step, high.octave, high.alter], slot.dur);
  } else {
    throw new Error(`slot has ${slot.tones.length} notes`);
  }
  if (slot.tie === 'start') atoms.forEach((atom) => {
    if (!atom.rest) atom.tieStart = true;
  });
  if (slot.tie === 'stop') atoms.forEach((atom) => {
    if (!atom.rest) atom.tieStop = true;
  });
  return atoms;
}

function spell(tone: Tone): string {
  const accidental = tone.alter < 0 ? 'b' : tone.alter > 0 ? '#' : '';
  return `${tone.step}${accidental}${tone.octave}`;
}

export function spaceGuitarBars(): WwhAtom[][] {
  return SPACE_BARS.map((slots, index) => {
    const atoms = slots.flatMap(atomsOfSlot);
    assertWwhBar(atoms, BAR_TICKS, `space-${index + 1}`);
    return atoms;
  });
}

function assertPlayable(): string[] {
  const sounding: string[] = [];
  let previous: Tone[] | null = null;
  const motif: string[] = [];
  SPACE_BARS.forEach((slots, barIndex) => {
    const names: string[] = [];
    slots.forEach((slot, slotIndex) => {
      const label = `bar ${barIndex + 1} slot ${slotIndex + 1}`;
      if (slot.dur === 'eighth' || slot.dur === '16th') throw new Error(`${label} is too short for sustained space`);
      if (!slot.tones.length) {
        names.push('rest');
        return;
      }
      if (slot.tones.length > 2) throw new Error(`${label} compacts a chord`);
      const strings = new Set<number>();
      slot.tones.forEach((tone) => {
        if (strings.has(tone.stringNumber)) throw new Error(`${label} stacks one string`);
        strings.add(tone.stringNumber);
        const sounded = soundingFromStringFret(tone.stringNumber, tone.fret);
        if (sounded.midi !== toneMidi(tone) - 12) {
          throw new Error(`${label} finger ${tone.stringNumber}/${tone.fret} does not sound ${spell(tone)}`);
        }
        if (tone.fret < 0 || tone.fret > V8B_MAX_FRET) throw new Error(`${label} fret ${tone.fret}`);
        if (tone.octave > 4) throw new Error(`${label} leaves the low-mid space register`);
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
      if (slot.tie !== 'stop') {
        const stopped = slot.tones.filter((tone) => tone.fret > 0);
        const lead = stopped.length === 1 ? stopped[0] : [...slot.tones].sort((a, b) => toneMidi(b) - toneMidi(a))[0];
        if (lead) motif.push(`${lead.step}${lead.alter}`);
      }
    });
    sounding.push(names.join(' '));
  });
  if (motif.join(',') !== 'F0,A-1,F0,E-1,D0') throw new Error(`motif ${motif.join(',')}`);
  return sounding;
}

function header(): WwhScoreHeader {
  return {
    title: 'Black Aura',
    movementTitle: 'V9 creative space duo',
    composer: 'Michael Bryant',
    software: 'Composer OS WWH V9 space',
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
    rehearsal: indexBar === 0 ? 'SPACE' : undefined,
    bassWords: indexBar === 0 ? [BASS_PLACEHOLDER] : undefined,
    tempoMark: indexBar === 0 ? { beatUnit: 'quarter', dots: 0, perMinute: '92', soundTempo: null } : undefined,
  }));
  return [...source.slice(0, V8A_WINDOW.returnOrder), ...window, ...source.slice(V8A_WINDOW.returnOrder)];
}

function sha256File(file: string): string {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function toneId(note: WwhImportedNote): string {
  if (note.rest) return `R:${note.duration}`;
  return `${note.step}${note.alter ?? 0}${note.octave}:${note.duration}:${note.chord ? 'c' : 'a'}:${note.voice}`;
}

function lane(notes: readonly WwhImportedNote[]): string {
  return notes.map(toneId).join(',');
}

export function buildV9SpaceXml(): { xml: string; sounding: string[]; fingerprint: string } {
  const before = sha256File(V8A_DUO_FILE);
  if (before !== SOURCE_SHA) throw new Error(`source hash is ${before}`);
  if (sha256File(V9_LIQUID_FILE) !== LIQUID_SHA) throw new Error('liquid file is not the locked V1');
  if (sha256File(V9_WYBLE_FILE) !== WYBLE_SHA) throw new Error('wyble file is not the locked V1');
  const sounding = assertPlayable();
  const { index } = loadBlackAuraIndex();
  const bass = readInsertionBass(index);
  const pitched = bass.filter((event) => !event.rest).map((event) => event.id).join(',');
  if (pitched !== 'D-downbeat,A-offbeat,D-pickup') throw new Error(`bass ids ${pitched}`);
  const guitar = spaceGuitarBars();
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
  let tieStart = 0;
  let tieStop = 0;
  let short = 0;
  duo.guitar.measures.slice(head, tail).forEach((measure, offset) => {
    if (measure.transposeOctave !== -1) throw new Error('guitar octave-change is not -1');
    if (measure.beats !== 4 || measure.beatType !== 4 || measure.divisions !== 256 || measure.specTicks !== 1024) {
      throw new Error('insert guitar meter');
    }
    if (!measure.gridAgrees) throw new Error('insert guitar grid');
    if (measure.hasBackup) throw new Error('insert guitar opens a second voice');
    if (measure.harmony.length) throw new Error('insert guitar carries a chord symbol');
    const ticks = measure.notes.filter((note) => !note.chord).reduce((sum, note) => sum + note.duration, 0);
    if (ticks !== 1024) throw new Error(`insert guitar ticks ${ticks}`);
    for (const note of measure.notes) {
      if (note.duration < 256) short += 1;
      if (note.tieStart) tieStart += 1;
      if (note.tieStop) tieStop += 1;
      if (!note.rest && (note.octave ?? 0) > 4) throw new Error('insert guitar leaves octave 4');
    }
    if (offset === 0 && !measure.rehearsal.includes('SPACE')) throw new Error('SPACE mark missing');
  });
  if (short) throw new Error('insert guitar uses a value shorter than a quarter');
  if (tieStart !== 2 || tieStop !== 2) throw new Error(`tie balance start ${tieStart} stop ${tieStop}`);
  duo.bass.measures.slice(head, tail).forEach((measure, offset) => {
    if (lane(measure.notes) !== template) throw new Error('insert bass is not bar 16');
    if (measure.specTicks !== 1024 || !measure.gridAgrees) throw new Error('insert bass grid');
    if (offset === 0 && !measure.words.includes(BASS_PLACEHOLDER)) throw new Error('bass placeholder text missing');
    if (offset > 0 && measure.words.includes(BASS_PLACEHOLDER)) throw new Error('placeholder text repeated');
  });
  for (const measure of duo.guitar.measures) {
    if (measure.transposeOctave !== -1) throw new Error('guitar transpose drifted');
  }
  for (const measure of [...duo.bass.measures.slice(0, head), ...duo.bass.measures.slice(tail)]) {
    if (measure.words.includes(BASS_PLACEHOLDER)) throw new Error('placeholder text landed outside the insert');
  }
  const fingerprint = pitchFingerprint(duo.guitar.measures.slice(head, tail));
  const prior = [
    'V9-BLACK-AURA-V8C-LIQUID.musicxml',
    'V9-BLACK-AURA-V8C-LYRICAL.musicxml',
    'V9-BLACK-AURA-V8C-ADVENTUROUS.musicxml',
    'V9-BLACK-AURA-V8A-LYRICAL-DUO.musicxml',
    'V9-BLACK-AURA-CREATIVE-LIQUID-V1.musicxml',
    'V9-BLACK-AURA-CREATIVE-WYBLE-V1.musicxml',
  ];
  for (const name of prior) {
    const file = `/Users/user/Documents/DEVS/ECM-Album-Nov-2027/WWH-PERFORMANCE-MOCKUPS/V9-PILOT/${name}`;
    const old = importWwhDuoMusicXml(fs.readFileSync(file, 'utf8'));
    const oldPrint = pitchFingerprint(old.guitar.measures.slice(head, tail));
    if (oldPrint === fingerprint) throw new Error(`insert matches ${name}`);
  }
  if (sha256File(V8A_DUO_FILE) !== SOURCE_SHA) throw new Error('source changed during build');
  if (sha256File(V9_LIQUID_FILE) !== LIQUID_SHA) throw new Error('liquid file changed during build');
  if (sha256File(V9_WYBLE_FILE) !== WYBLE_SHA) throw new Error('wyble file changed during build');
  return { xml, sounding, fingerprint };
}

export function writeV9SpaceCreative(outFile = V9_SPACE_FILE): { file: string; sounding: string[]; fingerprint: string; sha256: string } {
  if (fs.existsSync(outFile)) throw new Error(`REFUSE overwrite: ${outFile}`);
  const built = buildV9SpaceXml();
  fs.writeFileSync(outFile, built.xml, { flag: 'wx' });
  const reread = importWwhDuoMusicXml(fs.readFileSync(outFile, 'utf8'));
  if (reread.guitar.measures.length !== 43 || reread.bass.measures.length !== 43) {
    throw new Error('written file failed re-import');
  }
  const head = V8A_WINDOW.returnOrder;
  const tail = head + V8A_WINDOW.bars;
  for (const measure of reread.guitar.measures.slice(head, tail)) {
    if (!measure.gridAgrees || measure.hasBackup) throw new Error('written insert failed the single-voice grid');
  }
  if (!reread.bass.measures[head]?.words.includes(BASS_PLACEHOLDER)) throw new Error('written placeholder text missing');
  if (sha256File(V8A_DUO_FILE) !== SOURCE_SHA) throw new Error('source changed during write');
  if (sha256File(V9_LIQUID_FILE) !== LIQUID_SHA) throw new Error('liquid file changed during write');
  if (sha256File(V9_WYBLE_FILE) !== WYBLE_SHA) throw new Error('wyble file changed during write');
  if (pitchFingerprint(reread.guitar.measures.slice(head, tail)) !== built.fingerprint) {
    throw new Error('written fingerprint drifted');
  }
  return { file: outFile, sounding: built.sounding, fingerprint: built.fingerprint, sha256: sha256File(outFile) };
}

if (process.argv[1]?.includes('wwhBlackAuraV9Space')) {
  const written = writeV9SpaceCreative();
  console.log(JSON.stringify({ seed: V9_SPACE_SEED, ...written }, null, 2));
}
