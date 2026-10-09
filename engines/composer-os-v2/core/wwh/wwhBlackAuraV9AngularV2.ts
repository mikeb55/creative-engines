/**
 * Black Aura V9 — Angular V2. Hand-authored sketch.
 * Four bars written by hand: prime cell F–F#–Ab–B, inversion, then C–F–B.
 * V9_ANGULAR_V2_SEED is printed only. It does not choose notes.
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { importWwhDuoMusicXml, pitchFingerprint, type WwhImportedNote } from './wwhDuoImport';
import { renderWwhDuoScore, type WwhScoreHeader, type WwhWrittenBar } from './wwhMusicXmlWrite';
import { loadBlackAuraIndex, V8A_DUO_FILE, V8A_WINDOW } from './wwhBlackAuraV8a';
import { readInsertionBass } from './wwhBlackAuraV8c';
import { midiOf, soundingFromStringFret, stoppedSpan, V8B_MAX_FRET, V8B_MAX_STOPPED_SPAN } from './wwhBlackAuraV8bRecipe';
import { assertWwhBar, wwhDyad, wwhNote, wwhRest, wwhTriad, WWH_DIVISIONS, type WwhAtom } from './wwhPerformanceTypes';

export const V9_ANGULAR_V2_FILE =
  '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/WWH-PERFORMANCE-MOCKUPS/V9-PILOT/V9-BLACK-AURA-CREATIVE-ANGULAR-V2.musicxml';
export const V9_ANGULAR_V1_FILE =
  '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/WWH-PERFORMANCE-MOCKUPS/V9-PILOT/V9-BLACK-AURA-CREATIVE-ANGULAR-V1.musicxml';
export const V9_SPACE_FILE =
  '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/WWH-PERFORMANCE-MOCKUPS/V9-PILOT/V9-BLACK-AURA-CREATIVE-SPACE-V1.musicxml';
export const V9_LIQUID_FILE =
  '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/WWH-PERFORMANCE-MOCKUPS/V9-PILOT/V9-BLACK-AURA-CREATIVE-LIQUID-V1.musicxml';
export const V9_WYBLE_FILE =
  '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/WWH-PERFORMANCE-MOCKUPS/V9-PILOT/V9-BLACK-AURA-CREATIVE-WYBLE-V1.musicxml';
/** Printed only. Not used to choose notes. */
export const V9_ANGULAR_V2_SEED = 90025;
const SOURCE_SHA = 'b46ad5eddf329f4975a1be1e868099c3c7cefa005226e936e313e7583b2eedcb';
const LIQUID_SHA = '97d22ad213f3387a65247b807ffb8fb7273f6e0d9227f191d3c764e8033813b3';
const WYBLE_SHA = 'db7a1c0de30c24781a621c949bdbe87a840aecbc571a38591eec4116276ac38c';
const SPACE_SHA = '3ea2f19ded65741d657e7b5c1216f535386c85d3ea712b514a264b71aa05e9cb';
const ANGULAR_V1_SHA = '94e42bcfe5c89ad88fbce90e94eb016926dbbd0b94c8d3cdfeb39a878b350e3c';
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
 * Bar 1 states F–F#–Ab–B. The last attack is the F–B tritone.
 * Bar 2 inverts that line to B–Bb–Ab–F and plants C under the F.
 * Bar 3 recalls the cell in eighths, then holds C–F–B.
 * Bar 4 keeps G–F# so the original F can answer it.
 */
export const ANGULAR_BARS: Slot[][] = [
  [
    { dur: 'eighth', tones: [] },
    { dur: 'eighth', tones: [{ step: 'F', alter: 0, octave: 5, stringNumber: 2, fret: 6 }] },
    { dur: 'eighth', tones: [{ step: 'F', alter: 1, octave: 5, stringNumber: 2, fret: 7 }] },
    { dur: 'quarter', tones: [{ step: 'A', alter: -1, octave: 5, stringNumber: 1, fret: 4 }] },
    { dur: 'eighth', tones: [] },
    {
      dur: 'quarter',
      tones: [
        { step: 'F', alter: 0, octave: 5, stringNumber: 2, fret: 6 },
        { step: 'B', alter: 0, octave: 5, stringNumber: 1, fret: 7 },
      ],
    },
  ],
  [
    { dur: 'quarter', tones: [] },
    { dur: 'eighth', tones: [{ step: 'B', alter: 0, octave: 5, stringNumber: 1, fret: 7 }] },
    { dur: 'eighth', tones: [{ step: 'B', alter: -1, octave: 5, stringNumber: 1, fret: 6 }] },
    { dur: 'eighth', tones: [{ step: 'A', alter: -1, octave: 5, stringNumber: 1, fret: 4 }] },
    {
      dur: 'quarter',
      tones: [
        { step: 'C', alter: 0, octave: 5, stringNumber: 2, fret: 1 },
        { step: 'F', alter: 0, octave: 5, stringNumber: 1, fret: 1 },
      ],
    },
    { dur: 'eighth', tones: [] },
  ],
  [
    { dur: 'eighth', tones: [{ step: 'F', alter: 0, octave: 5, stringNumber: 2, fret: 6 }] },
    { dur: 'eighth', tones: [{ step: 'F', alter: 1, octave: 5, stringNumber: 2, fret: 7 }] },
    { dur: 'eighth', tones: [{ step: 'A', alter: -1, octave: 5, stringNumber: 1, fret: 4 }] },
    { dur: 'eighth', tones: [] },
    {
      dur: 'half',
      tones: [
        { step: 'C', alter: 0, octave: 5, stringNumber: 3, fret: 5 },
        { step: 'F', alter: 0, octave: 5, stringNumber: 2, fret: 6 },
        { step: 'B', alter: 0, octave: 5, stringNumber: 1, fret: 7 },
      ],
    },
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

function soundingMidi(tone: Tone): number {
  return toneMidi(tone) - 12;
}

export function angularV2GuitarBars(): WwhAtom[][] {
  return ANGULAR_BARS.map((slots, index) => {
    const atoms = slots.flatMap(atomsOfSlot);
    assertWwhBar(atoms, BAR_TICKS, `angular-v2-${index + 1}`);
    return atoms;
  });
}

function attackTops(): number[][] {
  return ANGULAR_BARS.map((slots) =>
    slots
      .filter((slot) => slot.tones.length)
      .map((slot) => Math.max(...slot.tones.map(soundingMidi)))
  );
}

function assertMotif(): void {
  const tops = attackTops();
  const prime = [65, 66, 68, 71];
  const inversion = [71, 70, 68, 65];
  if (tops[0]?.join(',') !== prime.join(',')) throw new Error(`bar 1 is not the prime cell: ${tops[0]?.join(',')}`);
  if (tops[1]?.join(',') !== inversion.join(',')) throw new Error(`bar 2 is not the inversion: ${tops[1]?.join(',')}`);
  if (tops[2]?.slice(0, 3).join(',') !== '65,66,68') throw new Error('bar 3 does not recall F–F#–Ab');
  if (tops[2]?.[3] !== 71) throw new Error('bar 3 climax does not return to B');
  if (tops[3]?.join(',') !== '55,54') throw new Error('bar 4 lost G–F#');
  const primeSteps = prime.slice(1).map((midi, index) => midi - prime[index]!);
  const inverseSteps = inversion.slice(1).map((midi, index) => midi - inversion[index]!);
  if (inverseSteps.join(',') !== primeSteps.map((step) => -step).join(',')) {
    throw new Error('bar 2 intervals are not the inversion of bar 1');
  }
  for (const bar of tops.slice(0, 3)) {
    for (let index = 1; index < bar.length; index += 1) {
      const leap = bar[index]! - bar[index - 1]!;
      if (Math.abs(leap) === 11) throw new Error('major seventh leap returned');
    }
  }
  const climax = ANGULAR_BARS[2]?.[4]?.tones.map(soundingMidi).sort((a, b) => a - b) ?? [];
  if (climax.join(',') !== '60,65,71') throw new Error(`climax sonority ${climax.join(',')}`);
}

function assertPlayable(): string[] {
  const sounding: string[] = [];
  let previousStopped: number[] | null = null;
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
        if (sounded.midi !== soundingMidi(tone)) {
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
    });
    if (!rested) throw new Error(`bar ${barIndex + 1} has no silence`);
    sounding.push(names.join(' '));
  });
  if (dyads < 2) throw new Error(`dyads ${dyads}`);
  if (triads !== 1) throw new Error(`triads ${triads}`);
  const heard = new Set(ANGULAR_BARS.flat().flatMap((slot) => slot.tones.map(soundingMidi)));
  for (const midi of CELL) {
    if (!heard.has(midi)) throw new Error(`cell ${midi} missing`);
  }
  assertMotif();
  return sounding;
}

function header(): WwhScoreHeader {
  return {
    title: 'Black Aura',
    movementTitle: 'V9 creative angular duo V2',
    composer: 'Michael Bryant',
    software: 'Composer OS WWH V9 angular V2',
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
    rehearsal: indexBar === 0 ? 'ANGULAR V2' : undefined,
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
  if (sha256File(V9_ANGULAR_V1_FILE) !== ANGULAR_V1_SHA) throw new Error(`angular v1 hash ${when}`);
}

export function buildV9AngularV2Xml(): { xml: string; sounding: string[]; fingerprint: string } {
  assertLockedFiles('before build');
  const sounding = assertPlayable();
  const { index } = loadBlackAuraIndex();
  const bass = readInsertionBass(index);
  const pitched = bass.filter((event) => !event.rest).map((event) => event.id).join(',');
  if (pitched !== 'D-downbeat,A-offbeat,D-pickup') throw new Error(`bass ids ${pitched}`);
  const guitar = angularV2GuitarBars();
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
    if (offset === 0 && !measure.rehearsal.includes('ANGULAR V2')) throw new Error('ANGULAR V2 mark missing');
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
    'V9-BLACK-AURA-CREATIVE-ANGULAR-V1.musicxml',
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

export function writeV9AngularV2Creative(outFile = V9_ANGULAR_V2_FILE): {
  file: string;
  sounding: string[];
  fingerprint: string;
  sha256: string;
} {
  if (fs.existsSync(outFile)) throw new Error(`REFUSE overwrite: ${outFile}`);
  const built = buildV9AngularV2Xml();
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

if (process.argv[1]?.includes('wwhBlackAuraV9AngularV2')) {
  const written = writeV9AngularV2Creative();
  console.log(JSON.stringify({ seed: V9_ANGULAR_V2_SEED, ...written }, null, 2));
}
