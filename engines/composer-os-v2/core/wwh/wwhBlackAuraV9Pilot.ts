/**
 * Black Aura V9 pilot — four source-preserving duo scores.
 * Writes MusicXML already produced by V8A and V8C. Does not compose new notes.
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { importWwhDuoMusicXml, pitchFingerprint, type WwhImportedNote } from './wwhDuoImport';
import { buildV8aBundle, V8A_DUO_FILE, V8A_SEED, V8A_WINDOW } from './wwhBlackAuraV8a';
import { midiOf, soundingFromStringFret, stoppedSpan, V8B_MAX_FRET, V8B_MAX_STOPPED_SPAN, V8B_OPEN_STRING_MIDI } from './wwhBlackAuraV8bRecipe';
import { buildV8cBundle, V8C_SEED, type V8cVersion } from './wwhBlackAuraV8c';

export const V9_EXPECTED_SOURCE_SHA256 = 'b46ad5eddf329f4975a1be1e868099c3c7cefa005226e936e313e7583b2eedcb';
export const V9_OUT_DIR = '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/WWH-PERFORMANCE-MOCKUPS/V9-PILOT';
export const V9_SOURCE_MEASURES = 39;
export const V9_INSERT_BARS = V8A_WINDOW.bars;
export const V9_TOTAL_MEASURES = V9_SOURCE_MEASURES + V9_INSERT_BARS;

const INSERT_TICKS = 1024;
const DIVISIONS = 256;

export interface V9FretPoint {
  stringNumber: number;
  fret: number;
}

export interface V9FretAssignment extends V9FretPoint {
  bar: number;
  attackIndex: number;
  writtenStep: string;
  writtenAlter: number;
  writtenOctave: number;
  soundingMidi: number;
}

export interface V9RetainedFingerEvent {
  bar: number;
  soundingMidi: number[];
  fingers: V9FretPoint[];
}

export type V9Playability =
  | { status: 'V8C_FINGERING_RETAINED'; events: V9RetainedFingerEvent[] }
  | {
      status: 'FEASIBLE';
      tuning: 'standard';
      maxFret: number;
      maxTransitionFrets: number;
      assignments: V9FretAssignment[];
    }
  | { status: 'PLAYABILITY UNVERIFIED'; reason: string };

export interface V9Candidate {
  id: 'v8c-lyrical' | 'v8c-liquid' | 'v8c-adventurous' | 'v8a-lyrical-duo';
  fileName: string;
  generator: string;
  seed: number;
  xml: string;
  guitarFingerprint: string;
  playability: V9Playability;
}

export interface V9Pilot {
  sourceFile: string;
  sourceSha256: string;
  candidates: V9Candidate[];
}

interface Attack {
  bar: number;
  attackIndex: number;
  notes: WwhImportedNote[];
}

function sha256File(file: string): string {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function assertSourceHash(actual: string, when: string): void {
  if (actual !== V9_EXPECTED_SOURCE_SHA256) {
    throw new Error(`Black Aura source hash ${when} is ${actual}`);
  }
}

function insertGuitar(xml: string): WwhImportedNote[][] {
  const duo = importWwhDuoMusicXml(xml);
  const head = V8A_WINDOW.returnOrder;
  return duo.guitar.measures.slice(head, head + V8A_WINDOW.bars).map((measure) => measure.notes);
}

function guitarFingerprint(xml: string): string {
  const duo = importWwhDuoMusicXml(xml);
  const head = V8A_WINDOW.returnOrder;
  return pitchFingerprint(duo.guitar.measures.slice(head, head + V8A_WINDOW.bars));
}

function attackGroups(notes: readonly WwhImportedNote[]): WwhImportedNote[][] {
  const groups: WwhImportedNote[][] = [];
  for (const note of notes) {
    if (note.rest) continue;
    if (note.chord) {
      const last = groups[groups.length - 1];
      if (!last) throw new Error('chord tone without an attack');
      last.push(note);
      continue;
    }
    groups.push([note]);
  }
  return groups;
}

function writtenMidi(note: WwhImportedNote): number {
  if (!note.step || note.octave === undefined) throw new Error('pitched note is missing a pitch');
  return midiOf(note.step, note.alter ?? 0, note.octave);
}

function retainV8cFingers(version: V8cVersion, xml: string): V9Playability {
  const bars = insertGuitar(xml);
  if (bars.length !== version.slots.length) {
    throw new Error(`${version.id} finger evidence does not cover the insert`);
  }
  const events: V9RetainedFingerEvent[] = [];
  bars.forEach((notes, index) => {
    const groups = attackGroups(notes);
    const pitched = version.slots[index]!.filter((slot) => !slot.rest);
    if (pitched.length !== groups.length) {
      throw new Error(`${version.id} bar ${index + 1} finger slots do not match the MusicXML attacks`);
    }
    pitched.forEach((slot, slotIndex) => {
      const group = groups[slotIndex]!;
      const midis = group.map(writtenMidi);
      if (midis.join(',') !== slot.writtenMidis.join(',')) {
        throw new Error(`${version.id} bar ${index + 1} pitches drifted from the retained fingering`);
      }
      if (slot.fingers.length !== slot.writtenMidis.length) {
        throw new Error(`${version.id} bar ${index + 1} finger count drifted`);
      }
      const strings = new Set<number>();
      slot.fingers.forEach((finger, fingerIndex) => {
        const sounded = soundingFromStringFret(finger.stringNumber, finger.fret);
        if (sounded.midi !== slot.writtenMidis[fingerIndex]! - 12) {
          throw new Error(`${version.id} retained finger does not sound the written pitch`);
        }
        if (strings.has(finger.stringNumber)) throw new Error(`${version.id} stacks one string`);
        strings.add(finger.stringNumber);
      });
      if (stoppedSpan(slot.fingers.map((finger) => finger.fret)) > V8B_MAX_STOPPED_SPAN) {
        throw new Error(`${version.id} retained span exceeds ${V8B_MAX_STOPPED_SPAN}`);
      }
      events.push({
        bar: index + 1,
        soundingMidi: slot.writtenMidis.map((midi) => midi - 12),
        fingers: slot.fingers.map((finger) => ({ stringNumber: finger.stringNumber, fret: finger.fret })),
      });
    });
  });
  return { status: 'V8C_FINGERING_RETAINED', events };
}

function positionsFor(soundingMidi: number): V9FretPoint[] {
  const found: V9FretPoint[] = [];
  for (let index = 0; index < V8B_OPEN_STRING_MIDI.length; index += 1) {
    const fret = soundingMidi - V8B_OPEN_STRING_MIDI[index]!;
    if (fret < 0 || fret > V8B_MAX_FRET) continue;
    const sounded = soundingFromStringFret(index + 1, fret);
    if (sounded.midi !== soundingMidi) continue;
    found.push({ stringNumber: index + 1, fret });
  }
  return found;
}

function gripOptions(pitches: readonly V9FretPoint[][]): V9FretPoint[][] {
  const out: V9FretPoint[][] = [];
  const walk = (index: number, acc: V9FretPoint[]) => {
    if (index === pitches.length) {
      if (new Set(acc.map((point) => point.stringNumber)).size !== acc.length) return;
      if (stoppedSpan(acc.map((point) => point.fret)) > V8B_MAX_STOPPED_SPAN) return;
      out.push(acc);
      return;
    }
    for (const option of pitches[index] ?? []) walk(index + 1, [...acc, option]);
  };
  walk(0, []);
  return out;
}

function transitionOk(previous: readonly V9FretPoint[], next: readonly V9FretPoint[]): boolean {
  const left = previous.map((point) => point.fret).filter((fret) => fret > 0);
  const right = next.map((point) => point.fret).filter((fret) => fret > 0);
  if (!left.length || !right.length) return true;
  return left.every((from) => right.every((to) => Math.abs(from - to) <= V8B_MAX_STOPPED_SPAN));
}

function fretDistance(previous: readonly V9FretPoint[], next: readonly V9FretPoint[]): number {
  let distance = 0;
  for (const from of previous) {
    for (const to of next) distance = Math.max(distance, Math.abs(from.fret - to.fret));
  }
  return distance;
}

function assignConservative(attacks: readonly Attack[], transposeOctave: number): V9FretAssignment[] | null {
  const choices = attacks.map((attack) => attack.notes.map((note) => positionsFor(midiOf(note.step!, note.alter ?? 0, note.octave! + transposeOctave))));
  if (choices.some((row) => row.some((options) => options.length === 0))) return null;
  const search = (index: number, previous: V9FretPoint[] | null): V9FretPoint[][] | null => {
    if (index === attacks.length) return [];
    const options = gripOptions(choices[index]!).sort((left, right) => {
      const leftDistance = previous ? fretDistance(previous, left) : left[0]!.stringNumber * 8 + left[0]!.fret;
      const rightDistance = previous ? fretDistance(previous, right) : right[0]!.stringNumber * 8 + right[0]!.fret;
      return leftDistance - rightDistance;
    });
    for (const option of options) {
      if (previous && !transitionOk(previous, option)) continue;
      const rest = search(index + 1, option);
      if (rest) return [option, ...rest];
    }
    return null;
  };
  const path = search(0, null);
  if (!path) return null;
  return attacks.flatMap((attack, index) =>
    path[index]!.map((point, noteIndex) => {
      const note = attack.notes[noteIndex]!;
      return {
        bar: attack.bar,
        attackIndex: attack.attackIndex,
        writtenStep: note.step!,
        writtenAlter: note.alter ?? 0,
        writtenOctave: note.octave!,
        soundingMidi: midiOf(note.step!, note.alter ?? 0, note.octave! + transposeOctave),
        stringNumber: point.stringNumber,
        fret: point.fret,
      };
    })
  );
}

function assessV8aPlayability(xml: string): V9Playability {
  const duo = importWwhDuoMusicXml(xml);
  const head = V8A_WINDOW.returnOrder;
  const measures = duo.guitar.measures.slice(head, head + V8A_WINDOW.bars);
  if (measures.length !== V8A_WINDOW.bars) {
    return { status: 'PLAYABILITY UNVERIFIED', reason: 'insert is not four bars' };
  }
  if (measures.some((measure) => measure.transposeOctave !== -1)) {
    return { status: 'PLAYABILITY UNVERIFIED', reason: 'guitar octave-change is not -1' };
  }
  const attacks: Attack[] = measures.flatMap((measure, index) =>
    attackGroups(measure.notes).map((notes, attackIndex) => ({ bar: index + 1, attackIndex, notes }))
  );
  if (!attacks.length) return { status: 'PLAYABILITY UNVERIFIED', reason: 'insert guitar has no pitched attacks' };
  const assignments = assignConservative(attacks, -1);
  if (!assignments) {
    return {
      status: 'PLAYABILITY UNVERIFIED',
      reason: `no standard-tuning path within frets 0–${V8B_MAX_FRET} and transition span ${V8B_MAX_STOPPED_SPAN}`,
    };
  }
  return {
    status: 'FEASIBLE',
    tuning: 'standard',
    maxFret: V8B_MAX_FRET,
    maxTransitionFrets: V8B_MAX_STOPPED_SPAN,
    assignments,
  };
}

function candidate(
  id: V9Candidate['id'],
  fileName: string,
  generator: string,
  seed: number,
  xml: string,
  playability: V9Playability
): V9Candidate {
  return { id, fileName, generator, seed, xml, guitarFingerprint: guitarFingerprint(xml), playability };
}

export function buildV9Pilot(): V9Pilot {
  const sourceSha256 = sha256File(V8A_DUO_FILE);
  assertSourceHash(sourceSha256, 'before build');
  const v8c = buildV8cBundle(V8C_SEED);
  const v8a = buildV8aBundle(V8A_SEED);
  if (v8c.sourceSha256 !== sourceSha256 || v8a.sourceSha256 !== sourceSha256) {
    throw new Error('V8 bundle source hash drifted from the leadsheet');
  }
  const byId = new Map(v8c.versions.map((version) => [version.id, version]));
  const lyrical = byId.get('lyrical');
  const liquid = byId.get('liquid');
  const adventurous = byId.get('adventurous');
  if (!lyrical || !liquid || !adventurous) throw new Error('V8C bundle is missing a guitar version');
  const candidates = [
    candidate('v8c-lyrical', 'V9-BLACK-AURA-V8C-LYRICAL.musicxml', 'buildV8cBundle(80083).scores.lyrical', V8C_SEED, v8c.scores.lyrical, retainV8cFingers(lyrical, v8c.scores.lyrical)),
    candidate('v8c-liquid', 'V9-BLACK-AURA-V8C-LIQUID.musicxml', 'buildV8cBundle(80083).scores.liquid', V8C_SEED, v8c.scores.liquid, retainV8cFingers(liquid, v8c.scores.liquid)),
    candidate(
      'v8c-adventurous',
      'V9-BLACK-AURA-V8C-ADVENTUROUS.musicxml',
      'buildV8cBundle(80083).scores.adventurous',
      V8C_SEED,
      v8c.scores.adventurous,
      retainV8cFingers(adventurous, v8c.scores.adventurous)
    ),
    candidate(
      'v8a-lyrical-duo',
      'V9-BLACK-AURA-V8A-LYRICAL-DUO.musicxml',
      'buildV8aBundle(80081).scores.lyricalDuo',
      V8A_SEED,
      v8a.scores.lyricalDuo,
      assessV8aPlayability(v8a.scores.lyricalDuo)
    ),
  ];
  const prints = candidates.map((row) => row.guitarFingerprint);
  if (new Set(prints).size !== candidates.length) throw new Error('the four guitar inserts are not distinct');
  if (sha256File(V8A_DUO_FILE) !== sourceSha256) throw new Error('source hash changed during build');
  return { sourceFile: V8A_DUO_FILE, sourceSha256, candidates };
}

export function writeV9Pilot(outDir = V9_OUT_DIR, pilot = buildV9Pilot()): string[] {
  const before = sha256File(V8A_DUO_FILE);
  assertSourceHash(before, 'before write');
  if (before !== pilot.sourceSha256) throw new Error('pilot was built from a different source hash');
  fs.mkdirSync(outDir, { recursive: true });
  const targets = pilot.candidates.map((row) => path.join(outDir, row.fileName));
  const existing = targets.filter((file) => fs.existsSync(file));
  if (existing.length) throw new Error(`REFUSE overwrite: ${existing.join(', ')}`);
  const written: string[] = [];
  try {
    for (const row of pilot.candidates) {
      const file = path.join(outDir, row.fileName);
      fs.writeFileSync(file, row.xml, { flag: 'wx' });
      written.push(file);
    }
  } catch (error) {
    for (const file of written) fs.rmSync(file, { force: true });
    throw error;
  }
  const after = sha256File(V8A_DUO_FILE);
  assertSourceHash(after, 'after write');
  return written;
}
