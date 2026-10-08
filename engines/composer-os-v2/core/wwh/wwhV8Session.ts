/**
 * WWH V8 desktop session.
 * Calls the existing Black Aura generators and writes a new file under SESSIONS.
 * Does not rewrite the leadsheet or the approved V8A / V8B / V8B.1 / V8C scores.
 */

import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { WwhImportedNote } from './wwhDuoImport';
import { importWwhDuoMusicXml, pitchFingerprint } from './wwhDuoImport';
import { loadBlackAuraIndex, V8A_DUO_FILE, V8A_WINDOW } from './wwhBlackAuraV8a';
import { loadBlackAuraPairContext, scoreBlackAuraLiquidPair } from './wwhBlackAuraV8b1';
import { midiOf, V8B_OPEN_STRING_MIDI, V8B_SEED } from './wwhBlackAuraV8bRecipe';
import { buildV8cBundle, V8C_SEED } from './wwhBlackAuraV8c';
import {
  analyzeTriadPair,
  validateParentTriad,
  type ParentTriadInput,
  type RelationshipAnalysis,
  type TriadQuality,
} from './wwhTriadPair';

export const V8_SESSION_DIR = path.resolve(path.dirname(V8A_DUO_FILE), '..', 'WWH-PERFORMANCE-MOCKUPS', 'V8-PILOT', 'SESSIONS');

const QUALITIES = new Set<TriadQuality>(['major', 'minor', 'augmented', 'diminished']);
const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
const NATURAL: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const INTERVALS: Record<TriadQuality, { third: number; fifth: number }> = {
  major: { third: 4, fifth: 7 },
  minor: { third: 3, fifth: 7 },
  augmented: { third: 4, fifth: 8 },
  diminished: { third: 3, fifth: 6 },
};

export type V8Approach = 'lyrical' | 'liquid' | 'adventurous';
export type CheckState = 'PASS' | 'FAIL' | 'NOT VERIFIED';

export interface V8ParentRequest {
  rootSpelling: string;
  quality: TriadQuality;
}

export interface V8SessionRequest {
  piece: string;
  approach: V8Approach;
  seed: number;
  pair?: { resolution: V8ParentRequest; tension: V8ParentRequest };
}

export interface V8SessionResult {
  ok: true;
  runId: string;
  timestamp: string;
  piece: 'Black Aura';
  approach: V8Approach;
  pairLabel: string | null;
  seed: number;
  musicXmlPath: string;
  sourcePreservation: CheckState;
  sourcePreservationDetail: string;
  guitarFeasibility: CheckState;
  guitarFeasibilityDetail: string;
  bassBehaviour: 'preserved';
  bassDetail: string;
  pitchedGuitarNotes: number;
  eventFingerprint: string;
}

function accidentalText(alter: number): string {
  if (alter < 0) return 'b'.repeat(-alter);
  if (alter > 0) return '#'.repeat(alter);
  return '';
}

function parseRoot(token: string): { step: string; alter: number; spelling: string; pc: number } {
  const match = /^([A-G])([b#]*)$/.exec(token.trim());
  if (!match) throw new Error(`Root spelling "${token}" is not a note name. Use a letter A–G with flats (b) or sharps (#), such as Ab or F#.`);
  if (match[2]!.includes('b') && match[2]!.includes('#')) throw new Error(`Root spelling "${token}" mixes flats and sharps.`);
  const step = match[1]!;
  const alter = match[2]!.includes('b') ? -match[2]!.length : match[2]!.length;
  if (alter < -2 || alter > 2) throw new Error(`Root spelling "${token}" has more than a double accidental.`);
  const pc = (NATURAL[step]! + alter + 12) % 12;
  return { step, alter, spelling: `${step}${accidentalText(alter)}`, pc };
}

function spellDegree(rootStep: string, rootPc: number, letterSteps: number, semitones: number): string {
  const index = LETTERS.indexOf(rootStep as (typeof LETTERS)[number]);
  const step = LETTERS[(index + letterSteps) % 7]!;
  const target = (rootPc + semitones) % 12;
  let alter = target - NATURAL[step]!;
  alter = ((alter % 12) + 12) % 12;
  if (alter > 6) alter -= 12;
  if (alter < -2 || alter > 2) {
    throw new Error(`Cannot spell the triad from ${rootStep} without changing that root spelling.`);
  }
  return `${step}${accidentalText(alter)}`;
}

/** Spell the triad from the requested root. The validator rejects a mismatch. The root spelling is not replaced. */
export function parentTriadFromRoot(request: V8ParentRequest): ParentTriadInput {
  if (!QUALITIES.has(request.quality)) throw new Error(`Quality "${String(request.quality)}" is not major, minor, augmented, or diminished.`);
  const root = parseRoot(request.rootSpelling);
  const intervals = INTERVALS[request.quality];
  const third = spellDegree(root.step, root.pc, 2, intervals.third);
  const fifth = spellDegree(root.step, root.pc, 4, intervals.fifth);
  const notes = [root.spelling, third, fifth] as [string, string, string];
  const pitchClasses = notes.map((note) => {
    const parsed = parseRoot(note);
    return parsed.pc;
  }) as [number, number, number];
  const input: ParentTriadInput = {
    rootSpelling: root.spelling,
    quality: request.quality,
    notes,
    pitchClasses,
    provenance: 'user',
  };
  validateParentTriad(input);
  return input;
}

export function adviseBlackAuraPair(resolution: V8ParentRequest, tension: V8ParentRequest): RelationshipAnalysis {
  const left = parentTriadFromRoot(resolution);
  const right = parentTriadFromRoot(tension);
  const { context } = loadBlackAuraPairContext();
  return analyzeTriadPair(left, right, context);
}

function lane(notes: readonly WwhImportedNote[]): string {
  return notes
    .map((note) => (note.rest ? `R:${note.duration}` : `${note.step}${note.alter ?? 0}${note.octave}:${note.duration}:${note.chord ? 'c' : 'a'}`))
    .join(',');
}

function soundingMidi(step: string, alter: number, octave: number, transpose: number): number {
  return midiOf(step, alter, octave + transpose);
}

function pitchHasFret(sounding: number, maxFret: number): boolean {
  return V8B_OPEN_STRING_MIDI.some((open) => {
    const fret = sounding - open;
    return fret >= 0 && fret <= maxFret;
  });
}

function assertSessionsDir(file: string): void {
  const resolved = path.resolve(file);
  const root = path.resolve(V8_SESSION_DIR);
  const relative = path.relative(root, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Refusing to write outside the V8 session folder.');
  const blocked = path.resolve(root, '..');
  for (const name of ['A', 'B', 'B1', 'C']) {
    if (resolved.startsWith(path.join(blocked, name) + path.sep)) throw new Error(`Refusing to write into approved V8 ${name}.`);
  }
  if (fs.existsSync(resolved)) throw new Error(`Refusing to overwrite ${resolved}`);
}

function preservation(xml: string): { state: CheckState; detail: string; pitched: number } {
  const duo = importWwhDuoMusicXml(xml);
  const { index } = loadBlackAuraIndex();
  const head = V8A_WINDOW.returnOrder;
  const tail = head + V8A_WINDOW.bars;
  if (duo.guitar.measures.length !== index.measures.length + V8A_WINDOW.bars) {
    return { state: 'FAIL', detail: 'Measure count does not match the source plus four inserted bars.', pitched: 0 };
  }
  for (let order = 0; order < head; order += 1) {
    if (lane(duo.guitar.measures[order]!.notes) !== lane(index.measures[order]!.guitar.notes)) {
      return { state: 'FAIL', detail: `Guitar before the insert changed at order ${order}.`, pitched: 0 };
    }
    if (lane(duo.bass.measures[order]!.notes) !== lane(index.measures[order]!.bass.notes)) {
      return { state: 'FAIL', detail: `Bass before the insert changed at order ${order}.`, pitched: 0 };
    }
  }
  for (let order = head; order < index.measures.length; order += 1) {
    const out = tail + (order - head);
    if (lane(duo.guitar.measures[out]!.notes) !== lane(index.measures[order]!.guitar.notes)) {
      return { state: 'FAIL', detail: `Guitar after the insert changed at order ${order}.`, pitched: 0 };
    }
    if (lane(duo.bass.measures[out]!.notes) !== lane(index.measures[order]!.bass.notes)) {
      return { state: 'FAIL', detail: `Bass after the insert changed at order ${order}.`, pitched: 0 };
    }
  }
  const template = lane(index.measures[V8A_WINDOW.cutAfterOrder]!.bass.notes);
  let pitched = 0;
  for (const measure of duo.guitar.measures.slice(head, tail)) {
    const ticks = measure.notes.filter((note) => !note.chord).reduce((sum, note) => sum + note.duration, 0);
    if (ticks !== 1024) return { state: 'FAIL', detail: 'An inserted guitar bar does not sum to 4/4.', pitched };
    pitched += measure.notes.filter((note) => !note.rest).length;
    for (const note of measure.notes) {
      if (note.rest || !note.step || note.octave === undefined) continue;
      const sounded = soundingMidi(note.step, note.alter ?? 0, note.octave, measure.transposeOctave);
      if (!pitchHasFret(sounded, 12)) return { state: 'FAIL', detail: `${note.step}${note.octave} has no fret in 0–12.`, pitched };
    }
  }
  for (const measure of duo.bass.measures.slice(head, tail)) {
    if (lane(measure.notes) !== template) return { state: 'FAIL', detail: 'Inserted bass is not the bar 16 pattern.', pitched };
  }
  if (pitched < 1) return { state: 'FAIL', detail: 'Inserted guitar has no pitched notes.', pitched };
  return {
    state: 'PASS',
    detail: 'Source guitar and bass outside the four-bar insert match the leadsheet. Inserted bass matches printed bar 16.',
    pitched,
  };
}

function liquidFeasibility(realization: ReturnType<typeof scoreBlackAuraLiquidPair>['realization'], writtenFrom: string): { state: CheckState; detail: string } {
  for (const event of realization.events) {
    if (!event.voicing) continue;
    for (const point of event.voicing.points) {
      if (point.fret < 0 || point.fret > 7) return { state: 'FAIL', detail: `${point.name} is fret ${point.fret}.` };
      const open = V8B_OPEN_STRING_MIDI[point.stringNumber - 1];
      if (open === undefined || open + point.fret !== point.midi) return { state: 'FAIL', detail: `${point.name} string/fret mismatch.` };
    }
    const frets = event.voicing.points.map((point) => point.fret);
    const stopped = frets.filter((fret) => fret > 0);
    if (stopped.length >= 2 && Math.max(...stopped) - Math.min(...stopped) > 3) {
      return { state: 'FAIL', detail: `${event.voicing.id} span is over 3.` };
    }
  }
  return {
    state: 'PASS',
    detail:
      writtenFrom === 'approved-v8b-baseline'
        ? 'PASS — approved V8B grips, standard tuning, frets 0–7, stopped span at most 3. Human playability NOT VERIFIED.'
        : 'PASS — V8B.1 search grips, standard tuning, frets 0–7, stopped span at most 3. Human playability NOT VERIFIED.',
  };
}

function melodyFeasibility(xml: string): { state: CheckState; detail: string } {
  const duo = importWwhDuoMusicXml(xml);
  const head = V8A_WINDOW.returnOrder;
  for (const measure of duo.guitar.measures.slice(head, head + V8A_WINDOW.bars)) {
    for (const note of measure.notes) {
      if (note.rest || !note.step || note.octave === undefined) continue;
      const sounded = soundingMidi(note.step, note.alter ?? 0, note.octave, measure.transposeOctave);
      if (!pitchHasFret(sounded, 12)) return { state: 'FAIL', detail: `No standard-tuning fret 0–12 for sounding midi ${sounded}.` };
    }
  }
  return { state: 'PASS', detail: 'PASS — each inserted guitar pitch has a standard-tuning fret from 0 to 12. Grip span NOT VERIFIED. Human playability NOT VERIFIED.' };
}

function isApprovedDmAb(resolution: ParentTriadInput, tension: ParentTriadInput): boolean {
  return (
    resolution.rootSpelling === 'D' &&
    resolution.quality === 'minor' &&
    resolution.notes.join(',') === 'D,F,A' &&
    tension.rootSpelling === 'Ab' &&
    tension.quality === 'major' &&
    tension.notes.join(',') === 'Ab,C,Eb'
  );
}

export function generateWwhV8Session(request: V8SessionRequest, now = new Date()): V8SessionResult {
  if (request.piece !== 'black-aura') throw new Error('Only Black Aura is supported. The other WWH pieces are not yet supported.');
  if (!Number.isInteger(request.seed) || request.seed < 0 || request.seed > 2_147_483_647) {
    throw new Error('Seed must be an integer from 0 through 2147483647.');
  }
  const sourceBefore = createHash('sha256').update(fs.readFileSync(V8A_DUO_FILE)).digest('hex');
  let xml = '';
  let pairLabel: string | null = null;
  let feasibility: { state: CheckState; detail: string } = { state: 'NOT VERIFIED', detail: 'No guitar check ran.' };
  if (request.approach === 'lyrical' || request.approach === 'adventurous') {
    if (request.pair) throw new Error(`${request.approach === 'lyrical' ? 'Lyrical' : 'Adventurous'} does not use a triad pair. Clear the pair before generating.`);
    xml = buildV8cBundle(request.seed).scores[request.approach];
  } else if (request.approach === 'liquid') {
    if (!request.pair) throw new Error('Liquid Harmony needs parent A and parent B.');
    const resolution = parentTriadFromRoot(request.pair.resolution);
    const tension = parentTriadFromRoot(request.pair.tension);
    pairLabel = `${resolution.rootSpelling} ${resolution.quality} / ${tension.rootSpelling} ${tension.quality}`;
    if (isApprovedDmAb(resolution, tension) && request.seed === V8C_SEED) {
      xml = buildV8cBundle(request.seed).scores.liquid;
    } else if (isApprovedDmAb(resolution, tension) && request.seed !== V8B_SEED) {
      throw new Error(`D minor / Ab major is V8C liquid at seed ${V8C_SEED}, or the approved V8B notes at seed ${V8B_SEED}. This seed was ${request.seed}.`);
    } else {
      const scored = scoreBlackAuraLiquidPair(resolution, tension, request.seed);
      xml = scored.duo;
      feasibility = liquidFeasibility(scored.realization, scored.writtenFrom);
    }
  } else {
    throw new Error('Approach must be lyrical, liquid, or adventurous.');
  }
  if (!xml.includes('<pitch>')) throw new Error('Generator returned MusicXML with no pitched notes.');
  const kept = preservation(xml);
  if (feasibility.state === 'NOT VERIFIED') {
    const checked = melodyFeasibility(xml);
    const v8c = xml.includes('Composer OS WWH V8C') && checked.state === 'PASS';
    feasibility = {
      state: checked.state,
      detail: v8c ? `PASS — V8C ${request.approach} guitar. ${checked.detail.replace(/^PASS — /, '')}` : checked.detail,
    };
  }
  if (kept.state !== 'PASS') throw new Error(kept.detail);
  if (feasibility.state !== 'PASS') throw new Error(feasibility.detail);
  const sourceAfter = createHash('sha256').update(fs.readFileSync(V8A_DUO_FILE)).digest('hex');
  if (sourceAfter !== sourceBefore) throw new Error('The Black Aura leadsheet changed during generation.');
  const runId = `v8-${now.getTime().toString(36)}-${randomBytes(3).toString('hex')}`;
  const slug = (pairLabel ?? request.approach).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const dir = path.join(V8_SESSION_DIR, runId);
  const musicXmlPath = path.join(dir, `Black-Aura-${slug}.musicxml`);
  assertSessionsDir(musicXmlPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(musicXmlPath, xml);
  const duo = importWwhDuoMusicXml(xml);
  return {
    ok: true,
    runId,
    timestamp: now.toISOString(),
    piece: 'Black Aura',
    approach: request.approach,
    pairLabel,
    seed: request.seed,
    musicXmlPath,
    sourcePreservation: kept.state,
    sourcePreservationDetail: kept.detail,
    guitarFeasibility: feasibility.state,
    guitarFeasibilityDetail: feasibility.detail,
    bassBehaviour: 'preserved',
    bassDetail: 'Inserted bass is the printed bar 16 pattern. It was not generated.',
    pitchedGuitarNotes: kept.pitched,
    eventFingerprint: `${pitchFingerprint(duo.guitar.measures)}||${pitchFingerprint(duo.bass.measures)}`,
  };
}

export const V8_FIXED_SEEDS = { v8c: V8C_SEED, liquidBaseline: V8B_SEED } as const;
