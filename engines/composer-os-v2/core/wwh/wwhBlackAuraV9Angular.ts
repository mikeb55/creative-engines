/**
 * Black Aura V9 — one new angular guitar insert.
 * Four composed bars after printed bar 16. Single voice.
 * Andrew Hill / Slonimsky development of F–Ab–F–Eb–D.
 * Does not copy Liquid V1, Wyble V1, or Space V1.
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { importWwhDuoMusicXml, pitchFingerprint, type WwhImportedNote } from './wwhDuoImport';
import { renderWwhDuoScore, type WwhScoreHeader, type WwhWrittenBar } from './wwhMusicXmlWrite';
import { loadBlackAuraIndex, V8A_DUO_FILE, V8A_WINDOW } from './wwhBlackAuraV8a';
import { readInsertionBass } from './wwhBlackAuraV8c';
import { midiOf, soundingFromStringFret, stoppedSpan, V8B_MAX_FRET, V8B_MAX_STOPPED_SPAN } from './wwhBlackAuraV8bRecipe';
import { assertWwhBar, wwhDyad, wwhNote, wwhRest, wwhTriad, WWH_DIVISIONS, type WwhAtom } from './wwhPerformanceTypes';

export const V9_ANGULAR_FILE =
  '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/WWH-PERFORMANCE-MOCKUPS/V9-PILOT/V9-BLACK-AURA-CREATIVE-ANGULAR-V1.musicxml';
export const V9_SPACE_FILE =
  '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/WWH-PERFORMANCE-MOCKUPS/V9-PILOT/V9-BLACK-AURA-CREATIVE-SPACE-V1.musicxml';
export const V9_LIQUID_FILE =
  '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/WWH-PERFORMANCE-MOCKUPS/V9-PILOT/V9-BLACK-AURA-CREATIVE-LIQUID-V1.musicxml';
export const V9_WYBLE_FILE =
  '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/WWH-PERFORMANCE-MOCKUPS/V9-PILOT/V9-BLACK-AURA-CREATIVE-WYBLE-V1.musicxml';
export const V9_ANGULAR_SEED = 90024;
const SOURCE_SHA = 'b46ad5eddf329f4975a1be1e868099c3c7cefa005226e936e313e7583b2eedcb';
const LIQUID_SHA = '97d22ad213f3387a65247b807ffb8fb7273f6e0d9227f191d3c764e8033813b3';
const WYBLE_SHA = 'db7a1c0de30c24781a621c949bdbe87a840aecbc571a38591eec4116276ac38c';
const SPACE_SHA = '3ea2f19ded65741d657e7b5c1216f535386c85d3ea712b514a264b71aa05e9cb';
const BASS_PLACEHOLDER = 'Placeholder — repeats bar 16';
const BAR_TICKS = 1024;
const MAX_FREE_SHIFT = 4;
const CELL = [65, 66, 68, 71] as const;

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
}

/**
 * Written staff. Sounding pitch is one octave lower.
 * Cell 65–66–68–71 is F4, F#4, Ab4, B4 sounding.
 * Leaps of 6, 11, and 1 reshape F–Ab–F–Eb–D. They are not a repeating machine.
 * Bar 2 drops a major seventh onto Bb, then leaves it unresolved.
 */
const ANGULAR_BARS: Slot[][] = [
  [
    { dur: 'eighth', tones: [] },
    { dur: 'eighth', tones: [{ step: 'F', alter: 0, octave: 5, stringNumber: 2, fret: 6 }] },
    { dur: 'quarter', tones: [{ step: 'B', alter: 0, octave: 5, stringNumber: 1, fret: 7 }] },
    { dur: 'eighth', tones: [] },
    { dur: 'eighth', tones: [{ step: 'F', alter: 1, octave: 5, stringNumber: 2, fret: 7 }] },
    {
      dur: 'quarter',
      tones: [
        { step: 'D', alter: 0, octave: 5, stringNumber: 2, fret: 3 },
        { step: 'A', alter: -1, octave: 5, stringNumber: 1, fret: 4 },
      ],
    },
  ],
  [
    { dur: 'eighth', tones: [] },
    { dur: 'eighth', tones: [{ step: 'A', alter: 0, octave: 5, stringNumber: 1, fret: 5 }] },
    { dur: 'quarter', tones: [{ step: 'B', alter: -1, octave: 4, stringNumber: 3, fret: 3 }] },
    { dur: 'quarter', tones: [] },
    {
      dur: 'quarter',
      tones: [
        { step: 'F', alter: 0, octave: 5, stringNumber: 2, fret: 6 },
        { step: 'B', alter: 0, octave: 5, stringNumber: 1, fret: 7 },
      ],
    },
  ],
  [
    { dur: 'eighth', tones: [{ step: 'E', alter: -1, octave: 5, stringNumber: 2, fret: 4 }] },
    { dur: 'eighth', tones: [{ step: 'D', alter: 0, octave: 5, stringNumber: 3, fret: 7 }] },
    { dur: 'quarter', tones: [] },
    { dur: 'eighth', tones: [{ step: 'F', alter: 0, octave: 5, stringNumber: 2, fret: 6 }] },
    {
      dur: 'quarter',
      tones: [
        { step: 'C', alter: 0, octave: 5, stringNumber: 3, fret: 5 },
        { step: 'F', alter: 0, octave: 5, stringNumber: 2, fret: 6 },
        { step: 'B', alter: 0, octave: 5, stringNumber: 1, fret: 7 },
      ],
    },
    { dur: 'eighth', tones: [] },
  ],
  [
    { dur: 'eighth', tones: [] },
    { dur: 'eighth', tones: [{ step: 'G', alter: 0, octave: 4, stringNumber: 3, fret: 0 }] },
    { dur: 'quarter', tones: [] },
    { dur: 'quarter', tones: [{ step: 'F', alter: 1, octave: 4, stringNumber: 4, fret: 4 }] },
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
  return `${tone.step}${accidental}${tone.octave}`;
}

export function angularGuitarBars(): WwhAtom[][] {
  return ANGULAR_BARS.map((slots, index) => {
    const atoms = slots.flatMap(atomsOfSlot);
    assertWwhBar(atoms, BAR_TICKS, `angular-${index + 1}`);
    return atoms;
  });
}

function assertPlayable(): string[] {
  const sounding: string[] = [];
  let previousStopped: number[] | null = null;
  const tops: number[] = [];
  let dyads = 0;
  let triads = 0;
  ANGULAR_BARS.forEach((slots, barIndex) => {
    const names: string[] = [];
    let rested = false;
    slots.forEach((slot, slotIndex) => {
      const label = `bar ${barIndex + 1} slot ${slotIndex + 1}`;
      if (!slot.tones.length) {
        names.push('rest');
        rested = true;
        previousStopped = null;
        return;
      }
      if (slot.tones.length === 2) dyads += 1;
      if (slot.tones.length === 3) triads += 1;
      if (slot.tones.length > 3) throw new Error(`${label} is denser than a triad`);
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
      const stopped = slot.tones.map((tone) => tone.fret).filter((fret) => fret > 0);
      if (previousStopped && stopped.length) {
        for (const from of previousStopped) {
          for (const to of stopped) {
            if (Math.abs(from - to) > MAX_FREE_SHIFT) throw new Error(`${label} shift ${from} to ${to}`);
          }
        }
      }
      previousStopped = stopped.length ? stopped : null;
      names.push(slot.tones.map(spell).join('/'));
      const top = [...slot.tones].sort((a, b) => toneMidi(b) - toneMidi(a))[0]!;
      tops.push(toneMidi(top) - 12);
    });
    if (!rested) throw new Error(`bar ${barIndex + 1} has no silence`);
    sounding.push(names.join(' '));
  });
  if (dyads < 2) throw new Error(`dyads ${dyads}`);
  if (triads !== 1) throw new Error(`triads ${triads}`);
  const heard = new Set(ANGULAR_BARS.flat().flatMap((slot) => slot.tones.map((tone) => toneMidi(tone) - 12)));
  for (const midi of CELL) {
    if (!heard.has(midi)) throw new Error(`cell ${midi} missing`);
  }
  const leaps: number[] = [];
  for (let index = 1; index < tops.length; index += 1) leaps.push(tops[index]! - tops[index - 1]!);
  for (const interval of [6, 11, 1]) {
    if (!leaps.some((leap) => Math.abs(leap) === interval)) throw new Error(`interval ${interval} missing`);
  }
  const repeated = leaps.slice(1).every((leap, index) => leap === leaps[index]);
  if (repeated) throw new Error('leaps repeat one mechanical interval');
  const order = tops.map((midi) => ((midi % 12) + 12) % 12).join(',');
  if (order.startsWith('5,8,5,3,2')) throw new Error('literal motif copy');
  const pair = leaps.findIndex((leap) => leap === -1);
  if (pair < 0) throw new Error('Eb–D semitone missing');
  const last = tops[tops.length - 1]!;
  if (last !== 54) throw new Error(`last sounding pitch ${last} does not lead to bar 17 F`);
  return sounding;
}

function header(): WwhScoreHeader {
  return {
    title: 'Black Aura',
    movementTitle: 'V9 creative angular duo',
    composer: 'Michael Bryant',
    software: 'Composer OS WWH V9 angular',
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
    rehearsal: indexBar === 0 ? 'ANGULAR' : undefined,
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

function assertLockedFiles(when: string): void {
  if (sha256File(V8A_DUO_FILE) !== SOURCE_SHA) throw new Error(`source hash ${when}`);
  if (sha256File(V9_LIQUID_FILE) !== LIQUID_SHA) throw new Error(`liquid hash ${when}`);
  if (sha256File(V9_WYBLE_FILE) !== WYBLE_SHA) throw new Error(`wyble hash ${when}`);
  if (sha256File(V9_SPACE_FILE) !== SPACE_SHA) throw new Error(`space hash ${when}`);
}

export function buildV9AngularXml(): { xml: string; sounding: string[]; fingerprint: string } {
  assertLockedFiles('before build');
  const sounding = assertPlayable();
  const { index } = loadBlackAuraIndex();
  const bass = readInsertionBass(index);
  const pitched = bass.filter((event) => !event.rest).map((event) => event.id).join(',');
  if (pitched !== 'D-downbeat,A-offbeat,D-pickup') throw new Error(`bass ids ${pitched}`);
  const guitar = angularGuitarBars();
  const xml = renderWwhDuoScore(duoBars(guitar), header());
  if (xml.includes('<technical') || xml.includes('TAB') || xml.includes('<sign>TAB</sign>')) {
    throw new Error('export contains tablature');
  }
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
  const originalBar17 = duo.guitar.measures[tail]!;
  const originalFirst = originalBar17.notes.find((note) => !note.rest);
  if (!originalFirst || originalFirst.step !== 'F' || (originalFirst.alter ?? 0) !== 0 || originalFirst.octave !== 4) {
    throw new Error('original bar 17 does not enter on F4');
  }
  if (originalBar17.notes[0]?.rest !== true || originalBar17.notes[0].duration !== 128) {
    throw new Error('original bar 17 does not open with an eighth rest');
  }
  const template = lane(index.measures[V8A_WINDOW.cutAfterOrder]!.bass.notes);
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
    if (offset === 0 && !measure.rehearsal.includes('ANGULAR')) throw new Error('ANGULAR mark missing');
    if (offset === 0 && measure.tempo.perMinute !== '92') throw new Error(`tempo ${measure.tempo.perMinute}`);
  });
  const lastInsert = duo.guitar.measures[tail - 1]!;
  const lastPitched = [...lastInsert.notes].reverse().find((note) => !note.rest);
  if (!lastPitched || lastPitched.step !== 'F' || lastPitched.alter !== 1 || lastPitched.octave !== 4) {
    throw new Error('insert does not end on F#4');
  }
  if (!lastInsert.notes[lastInsert.notes.length - 1]?.rest) throw new Error('insert does not end with silence');
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
    'V9-BLACK-AURA-CREATIVE-SPACE-V1.musicxml',
  ];
  for (const name of prior) {
    const file = `/Users/user/Documents/DEVS/ECM-Album-Nov-2027/WWH-PERFORMANCE-MOCKUPS/V9-PILOT/${name}`;
    const old = importWwhDuoMusicXml(fs.readFileSync(file, 'utf8'));
    const oldPrint = pitchFingerprint(old.guitar.measures.slice(head, head + V8A_WINDOW.bars));
    if (oldPrint === fingerprint) throw new Error(`insert matches ${name}`);
  }
  assertLockedFiles('after build');
  return { xml, sounding, fingerprint };
}

export function writeV9AngularCreative(outFile = V9_ANGULAR_FILE): {
  file: string;
  sounding: string[];
  fingerprint: string;
  sha256: string;
} {
  if (fs.existsSync(outFile)) throw new Error(`REFUSE overwrite: ${outFile}`);
  const built = buildV9AngularXml();
  fs.writeFileSync(outFile, built.xml, { flag: 'wx' });
  const reread = importWwhDuoMusicXml(fs.readFileSync(outFile, 'utf8'));
  if (reread.guitar.measures.length !== 43 || reread.bass.measures.length !== 43) {
    throw new Error('written file failed re-import');
  }
  const head = V8A_WINDOW.returnOrder;
  const tail = head + V8A_WINDOW.bars;
  for (const measure of reread.guitar.measures.slice(head, tail)) {
    if (!measure.gridAgrees || measure.hasBackup || measure.specTicks !== 1024) {
      throw new Error('written insert failed the single-voice grid');
    }
    if (measure.transposeOctave !== -1) throw new Error('written guitar octave-change drifted');
  }
  const returnBar = reread.guitar.measures[tail]!;
  const returnNote = returnBar.notes.find((note) => !note.rest);
  if (!returnNote || returnNote.step !== 'F' || returnNote.octave !== 4) {
    throw new Error('written file lost the bar 17 entrance');
  }
  if (!reread.bass.measures[head]?.words.includes(BASS_PLACEHOLDER)) throw new Error('written placeholder text missing');
  if (pitchFingerprint(reread.guitar.measures.slice(head, tail)) !== built.fingerprint) {
    throw new Error('written fingerprint drifted');
  }
  assertLockedFiles('after write');
  return { file: outFile, sounding: built.sounding, fingerprint: built.fingerprint, sha256: sha256File(outFile) };
}

if (process.argv[1]?.includes('wwhBlackAuraV9Angular')) {
  const written = writeV9AngularCreative();
  console.log(JSON.stringify({ seed: V9_ANGULAR_SEED, ...written }, null, 2));
}
