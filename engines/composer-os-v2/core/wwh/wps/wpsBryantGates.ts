/**
 * WPS V1.4 Bryant signature, anti-cliché, and candidate gates.
 * Reads a finished duo score. Does not write MusicXML and does not pick a candidate.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { V8B_OPEN_STRING_MIDI } from '../wwhBlackAuraV8bRecipe';
import type { WwhImportedMeasure, WwhImportedNote, WwhImportedPart } from '../wwhDuoImport';

const HERE = path.dirname(fileURLToPath(import.meta.url));

export const BRYANT_SIGNATURE_PATH = path.join(HERE, 'wps-bryant-signature.json');
export const BRYANT_PREFERENCES_PATH = path.join(HERE, 'wps-bryant-preferences.md');

const PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const OPEN_MIDI = new Set<number>(V8B_OPEN_STRING_MIDI);
const MINOR_PENT = [0, 3, 5, 7, 10];
const HOOK_FRAGMENT = 3;

export const BRYANT_DEVICES = [
  'LIQUID',
  'TRITONE_FIELDS',
  'FOREIGN_BASS_GRIP',
  'HOOK_EROSION',
  'ACTIVE_SILENCE',
  'OPEN_STRING_CLUSTER',
] as const;

export const BRYANT_BANS = [
  'FUNCTIONAL_CADENCE',
  'SCALE_RUN',
  'MAJ7_SHARP11',
  'PARALLEL_GRIP',
  'VOICING_CYCLE',
] as const;

export const BRYANT_GRIP_TYPES = [
  'quartal',
  'cluster-with-2nd',
  'open-string',
  'liquid',
  'triad-over-foreign-bass',
  'drop-2',
] as const;

export const BRYANT_FORM_CHORUSES = ['HEAD_IN', 'SOLO_1', 'SOLO_2', 'BASS_SOLO', 'HEAD_OUT'] as const;

export const BRYANT_CANDIDATE_ROLES = ['SOLO_1', 'SOLO_2', 'BASS_SOLO'] as const;

export type BryantDevice = (typeof BRYANT_DEVICES)[number];
export type BryantBan = (typeof BRYANT_BANS)[number];
export type BryantGripType = (typeof BRYANT_GRIP_TYPES)[number];
export type BryantFormChorus = (typeof BRYANT_FORM_CHORUSES)[number];
export type BryantCandidateRole = (typeof BRYANT_CANDIDATE_ROLES)[number];

export interface BryantSignatureFile {
  listeningGuide: { melodyPercent: number; harmonyPercent: number; rhythmPercent: number; note: string };
  signatureDevices: { minimumPerEdition: number; poolSize: number };
  antiClicheBans: { anyHitFailsWps: boolean };
  chordalVariety: { minimumGripTypes: number; gripTypes: string[] };
  soloContrast: {
    SOLO_2: { minWideIntervalShare: number; wideIntervalSemitones: number; minRangeSemitones: number; minFieldCollisions: number; minSilentBars: number };
    mustDifferIn: string[];
  };
  candidateRule: { candidatesPerChorus: number; presentToMike: number; autoSelect: false };
}

export interface BryantGate {
  id: string;
  ok: boolean;
  bars: number[];
  detail: string;
}

export interface BryantChorusReport {
  id: string;
  bars: number[];
  present: boolean;
  ok: boolean;
  reasons: string[];
  anchor: string;
}

export interface BryantSoloNumbers {
  present: boolean;
  notes: number;
  intervals: number;
  wideShare: number;
  meanInterval: number;
  range: number;
  low: number | null;
  high: number | null;
  density: number;
  meanRegister: number | null;
  fieldCollisions: number;
  silentBars: number;
  linear: boolean;
  motivic: boolean;
  nonFunctional: boolean;
}

export interface BryantAssessment {
  ok: boolean;
  devices: BryantGate[];
  bans: BryantGate[];
  signatureCount: number;
  signatureMinimum: number;
  deviceByBar: Array<{ bar: number; devices: string[] }>;
  gripTypes: BryantGripType[];
  gripTypeCount: number;
  solo1: BryantSoloNumbers;
  solo2: BryantSoloNumbers;
  contrast: BryantGate;
  choruses: BryantChorusReport[];
  failures: string[];
  listeningGuide: string;
}

export interface BryantAssessInput {
  guitar: WwhImportedPart;
  bass: WwhImportedPart;
  leadsheetGuitar?: WwhImportedPart;
  protectedGuitarSilences?: number[];
  hookPitches?: string[];
  chorusLength?: number;
  /** Non-empty text keeps a maj7#11 voicing from failing the ban. */
  maj7Sharp11Justification?: string;
}

interface Attack {
  bar: number;
  onset: number;
  end: number;
  midis: number[];
  pcs: number[];
  duration: number;
  rest: boolean;
}

interface Melodic {
  bar: number;
  midi: number;
  pc: number;
  duration: number;
}

export interface BryantCandidateInput {
  id: string;
  role: BryantCandidateRole;
  chorus: number;
  seed: number;
  leadDevice: BryantDevice;
  signatureDevices: BryantDevice[];
  antiClichePass: boolean;
  soloContrast: number;
}

export interface BryantRankedCandidate extends BryantCandidateInput {
  score: number;
}

export interface BryantCandidateRank {
  role: BryantCandidateRole;
  chorus: number;
  ranked: BryantRankedCandidate[];
  presentToMike: BryantRankedCandidate[];
  selected: null;
  errors: string[];
}

export function loadBryantSignature(): BryantSignatureFile {
  return JSON.parse(fs.readFileSync(BRYANT_SIGNATURE_PATH, 'utf8')) as BryantSignatureFile;
}

/** Generators call this before offering candidates for the next tune. */
export function readBryantPreferencesLog(): string {
  if (!fs.existsSync(BRYANT_PREFERENCES_PATH)) {
    throw new Error(`Bryant preferences log is missing: ${BRYANT_PREFERENCES_PATH}`);
  }
  return fs.readFileSync(BRYANT_PREFERENCES_PATH, 'utf8');
}

export function rankBryantCandidates(items: readonly BryantCandidateInput[]): BryantCandidateRank[] {
  const spec = loadBryantSignature();
  const need = spec.candidateRule.candidatesPerChorus;
  const show = spec.candidateRule.presentToMike;
  const groups = new Map<string, BryantCandidateInput[]>();
  for (const item of items) {
    const key = `${item.role}:${item.chorus}`;
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }
  const out: BryantCandidateRank[] = [];
  for (const [key, group] of groups) {
    const [role, chorusText] = key.split(':');
    const errors: string[] = [];
    if (group.length !== need) errors.push(`${key} has ${group.length} candidates, need ${need}`);
    const seeds = new Set(group.map((item) => item.seed));
    const devices = new Set(group.map((item) => item.leadDevice));
    if (seeds.size !== group.length) errors.push(`${key} repeats a seed`);
    if (devices.size !== group.length) errors.push(`${key} repeats a lead device`);
    const ranked = group
      .map((item) => ({
        ...item,
        score: item.signatureDevices.length * 100 + (item.antiClichePass ? 20 : 0) + item.soloContrast,
      }))
      .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
    out.push({
      role: role as BryantCandidateRole,
      chorus: Number(chorusText),
      ranked,
      presentToMike: errors.length ? [] : ranked.slice(0, show),
      selected: null,
      errors,
    });
  }
  return out;
}

function pitchClassOfName(name: string): number | null {
  const match = name.trim().match(/^([A-G])([#b])?/);
  if (!match) return null;
  const natural = PC[match[1]!];
  if (natural == null) return null;
  const alter = match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0;
  return (natural + alter + 120) % 12;
}

function midiOf(note: WwhImportedNote, transposeOctave: number): number | null {
  if (note.rest || !note.step || note.octave == null) return null;
  return (note.octave + 1) * 12 + PC[note.step]! + (note.alter ?? 0) + transposeOctave * 12;
}

function barTicks(measure: WwhImportedMeasure): number {
  return Math.round((measure.divisions * measure.beats * 4) / measure.beatType);
}

function attacksOf(part: WwhImportedPart): Attack[] {
  const attacks: Attack[] = [];
  let cursor = 0;
  part.measures.forEach((measure, index) => {
    const bar = index + 1;
    const transpose = measure.transposeOctave ?? 0;
    let onset = cursor;
    let current: Attack | null = null;
    const close = () => {
      if (current) attacks.push(current);
      current = null;
    };
    for (const note of measure.notes) {
      if (note.chord && current) {
        const midi = midiOf(note, transpose);
        if (midi != null) {
          current.midis.push(midi);
          current.pcs.push(((midi % 12) + 12) % 12);
        }
        continue;
      }
      close();
      const midi = midiOf(note, transpose);
      current = {
        bar,
        onset,
        end: onset + note.duration,
        midis: midi == null ? [] : [midi],
        pcs: midi == null ? [] : [((midi % 12) + 12) % 12],
        duration: note.duration,
        rest: note.rest || midi == null,
      };
      onset += note.duration;
    }
    close();
    cursor += barTicks(measure);
  });
  return attacks;
}

function soundingBass(bass: Attack[], start: number, end: number): number[] {
  const pcs = new Set<number>();
  for (const attack of bass) {
    if (attack.rest || attack.end <= start || attack.onset >= end) continue;
    for (const pc of attack.pcs) pcs.add(pc);
  }
  return [...pcs];
}

function bassAtOnset(bass: Attack[], onset: number): number | null {
  let found: Attack | null = null;
  for (const attack of bass) {
    if (attack.rest) continue;
    if (attack.onset <= onset && attack.end > onset) found = attack;
  }
  if (!found || found.pcs.length === 0) return null;
  return found.pcs[0]!;
}

function uniqueSorted(bars: number[]): number[] {
  return [...new Set(bars)].sort((a, b) => a - b);
}

function formatBars(bars: number[]): string {
  return bars.length ? bars.join(', ') : 'none';
}

function pentatonic(root: number): Set<number> {
  return new Set(MINOR_PENT.map((step) => (root + step) % 12));
}

function containedInOnePentatonic(pcs: number[]): boolean {
  for (let root = 0; root < 12; root += 1) {
    const field = pentatonic(root);
    if (pcs.every((pc) => field.has(pc))) return true;
  }
  return false;
}

function tritoneCollision(pcs: number[]): string | null {
  if (pcs.length < 2 || containedInOnePentatonic(pcs)) return null;
  for (let root = 0; root < 6; root += 1) {
    const low = pentatonic(root);
    const high = pentatonic((root + 6) % 12);
    const inLow = pcs.some((pc) => low.has(pc) && !high.has(pc));
    const inHigh = pcs.some((pc) => high.has(pc) && !low.has(pc));
    if (inLow && inHigh) return `${NAMES[root]} / ${NAMES[(root + 6) % 12]}`;
  }
  return null;
}

function triadRoot(pcs: number[]): number | null {
  if (pcs.length < 3) return null;
  const set = new Set(pcs);
  const shapes = [
    [0, 4, 7],
    [0, 3, 7],
    [0, 3, 6],
    [0, 4, 8],
  ];
  for (const pc of set) {
    for (const shape of shapes) {
      if (shape.every((step) => set.has((pc + step) % 12))) return pc;
    }
  }
  return null;
}

function gripRoot(pcs: number[], midis: number[]): number {
  return triadRoot(pcs) ?? (((Math.min(...midis) % 12) + 12) % 12);
}

function shapeOf(midis: number[]): string {
  const sorted = [...midis].sort((a, b) => a - b);
  const low = sorted[0]!;
  return sorted.map((midi) => midi - low).join('-');
}

function isQuartal(midis: number[]): boolean {
  const sorted = [...midis].sort((a, b) => a - b);
  if (sorted.length < 2) return false;
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i]! - sorted[i - 1]! !== 5) return false;
  }
  return true;
}

function hasSecond(midis: number[]): boolean {
  const sorted = [...midis].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i += 1) {
    const gap = sorted[i]! - sorted[i - 1]!;
    if (gap === 1 || gap === 2) return true;
  }
  return false;
}

function isClusterWithSecond(midis: number[]): boolean {
  if (!hasSecond(midis)) return false;
  const sorted = [...midis].sort((a, b) => a - b);
  return sorted[sorted.length - 1]! - sorted[0]! <= 6;
}

function isOpenStringGrip(midis: number[]): boolean {
  const open = midis.some((midi) => OPEN_MIDI.has(midi));
  const fretted = midis.some((midi) => !OPEN_MIDI.has(midi));
  return open && fretted;
}

function isDrop2(midis: number[]): boolean {
  if (midis.length !== 4) return false;
  const sorted = [...midis].sort((a, b) => a - b);
  const gap = sorted[1]! - sorted[0]!;
  const upper = sorted[3]! - sorted[1]!;
  return gap >= 12 && upper <= 12;
}

function isMaj7Sharp11(pcs: number[]): boolean {
  if (pcs.length < 4) return false;
  const set = new Set(pcs);
  for (const root of set) {
    const has = (step: number) => set.has((root + step) % 12);
    if (has(4) && has(6) && has(11)) return true;
  }
  return false;
}

function hookPcs(pitches: string[]): number[] {
  return pitches.map(pitchClassOfName).filter((pc): pc is number => pc != null);
}

function melodyOf(attacks: Attack[]): Melodic[] {
  return attacks
    .filter((attack) => !attack.rest && attack.midis.length > 0)
    .map((attack) => {
      const midi = Math.max(...attack.midis);
      return { bar: attack.bar, midi, pc: ((midi % 12) + 12) % 12, duration: attack.duration };
    });
}

function findOrdered(melody: Melodic[], target: number[]): Array<{ from: number; to: number; bars: number[] }> {
  const hits: Array<{ from: number; to: number; bars: number[] }> = [];
  if (target.length === 0) return hits;
  for (let start = 0; start <= melody.length - target.length; start += 1) {
    let matched = true;
    for (let step = 0; step < target.length; step += 1) {
      if (melody[start + step]!.pc !== target[step]) {
        matched = false;
        break;
      }
    }
    if (!matched) continue;
    const slice = melody.slice(start, start + target.length);
    hits.push({ from: start, to: start + target.length - 1, bars: uniqueSorted(slice.map((note) => note.bar)) });
  }
  return hits;
}

function silentBars(guitar: Attack[], bars: number[]): number[] {
  return bars.filter((bar) => !guitar.some((attack) => attack.bar === bar && !attack.rest));
}

function roleFromWords(words: string[]): BryantFormChorus | null {
  const text = words.join(' ').toLowerCase();
  if (/\bhead\s*out\b/.test(text)) return 'HEAD_OUT';
  if (/\bhead\s*in\b/.test(text)) return 'HEAD_IN';
  if (/\bbass\s*solo\b/.test(text)) return 'BASS_SOLO';
  if (/\bsolo\s*2\b/.test(text)) return 'SOLO_2';
  if (/\bsolo\s*1\b/.test(text)) return 'SOLO_1';
  return null;
}

function chorusSpans(guitar: WwhImportedPart, chorusLength: number | undefined): Array<{ id: string; bars: number[]; present: boolean }> {
  const total = guitar.measures.length;
  const length = chorusLength && chorusLength > 0 && total % chorusLength === 0 ? chorusLength : total;
  const count = length > 0 ? total / length : 1;
  const spans: Array<{ id: string; bars: number[]; present: boolean }> = [];
  for (let index = 0; index < count; index += 1) {
    const bars = Array.from({ length }, (_, offset) => index * length + offset + 1);
    let role: BryantFormChorus | null = null;
    for (const bar of bars) {
      const measure = guitar.measures[bar - 1];
      role = roleFromWords([...(measure?.words ?? []), ...(measure?.rehearsal ?? [])]) ?? role;
    }
    spans.push({ id: role ?? (count === 1 ? 'UNLABELLED' : `CHORUS_${index + 1}`), bars, present: true });
  }
  return spans;
}

function emptySolo(): BryantSoloNumbers {
  return {
    present: false,
    notes: 0,
    intervals: 0,
    wideShare: 0,
    meanInterval: 0,
    range: 0,
    low: null,
    high: null,
    density: 0,
    meanRegister: null,
    fieldCollisions: 0,
    silentBars: 0,
    linear: false,
    motivic: false,
    nonFunctional: false,
  };
}

function soloNumbers(
  attacks: Attack[],
  bars: number[],
  wideAt: number,
  collisions: Map<number, string>,
  functionalBars: Set<number>
): BryantSoloNumbers {
  const inChorus = attacks.filter((attack) => bars.includes(attack.bar));
  const singles = inChorus.filter((attack) => !attack.rest && attack.midis.length === 1);
  const melody = singles.map((attack) => attack.midis[0]!);
  const intervals: number[] = [];
  for (let i = 1; i < melody.length; i += 1) intervals.push(Math.abs(melody[i]! - melody[i - 1]!));
  const wide = intervals.filter((interval) => interval >= wideAt).length;
  const low = melody.length ? Math.min(...melody) : null;
  const high = melody.length ? Math.max(...melody) : null;
  const cellCounts = new Map<string, number>();
  for (let i = 1; i < melody.length; i += 1) {
    const cell = `${melody[i]! - melody[i - 1]!}`;
    cellCounts.set(cell, (cellCounts.get(cell) ?? 0) + 1);
  }
  const motivic = [...cellCounts.values()].some((count) => count >= 2);
  const chordAttacks = inChorus.filter((attack) => attack.midis.length >= 2).length;
  const pitched = inChorus.filter((attack) => !attack.rest).length;
  const linear = pitched > 0 && chordAttacks / pitched < 0.35 && singles.length >= 4;
  const fieldCollisions = bars.filter((bar) => collisions.has(bar)).length;
  return {
    present: true,
    notes: singles.length,
    intervals: intervals.length,
    wideShare: intervals.length ? wide / intervals.length : 0,
    meanInterval: intervals.length ? intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length : 0,
    range: low != null && high != null ? high - low : 0,
    low,
    high,
    density: bars.length ? pitched / bars.length : 0,
    meanRegister: melody.length ? melody.reduce((sum, midi) => sum + midi, 0) / melody.length : null,
    fieldCollisions,
    silentBars: silentBars(attacks, bars).length,
    linear,
    motivic,
    nonFunctional: !bars.some((bar) => functionalBars.has(bar)),
  };
}

function firstBarDurations(part: WwhImportedPart | undefined): number[] {
  if (!part) return [];
  const attacks = attacksOf(part).filter((attack) => attack.bar === 1 && !attack.rest);
  return attacks.map((attack) => attack.duration);
}

function lastLeadsheetPc(part: WwhImportedPart | undefined): number | null {
  if (!part) return null;
  const melody = melodyOf(attacksOf(part));
  return melody.length ? melody[melody.length - 1]!.pc : null;
}

export function assessBryantEdition(input: BryantAssessInput): BryantAssessment {
  const spec = loadBryantSignature();
  const protectedBars = new Set(input.protectedGuitarSilences ?? []);
  const guitar = attacksOf(input.guitar);
  const bass = attacksOf(input.bass);
  const grips = guitar.filter((attack) => attack.midis.length >= 2);
  const hook = hookPcs(input.hookPitches ?? []);
  const melody = melodyOf(guitar);
  const collisions = new Map<number, string>();
  const deviceBars: Record<BryantDevice, number[]> = {
    LIQUID: [],
    TRITONE_FIELDS: [],
    FOREIGN_BASS_GRIP: [],
    HOOK_EROSION: [],
    ACTIVE_SILENCE: [],
    OPEN_STRING_CLUSTER: [],
  };
  const liquidIndexes = new Set<number>();

  for (let i = 1; i < grips.length; i += 1) {
    const left = new Set(grips[i - 1]!.pcs);
    const right = new Set(grips[i]!.pcs);
    if (left.size < 2 || left.size !== right.size) continue;
    const onlyLeft = [...left].filter((pc) => !right.has(pc));
    const onlyRight = [...right].filter((pc) => !left.has(pc));
    if (onlyLeft.length === 1 && onlyRight.length === 1) {
      deviceBars.LIQUID.push(grips[i - 1]!.bar, grips[i]!.bar);
      liquidIndexes.add(i - 1);
      liquidIndexes.add(i);
    }
  }

  for (const attack of grips) {
    const fields = tritoneCollision(attack.pcs);
    if (fields) {
      deviceBars.TRITONE_FIELDS.push(attack.bar);
      collisions.set(attack.bar, fields);
    }
    const under = soundingBass(bass, attack.onset, attack.end);
    const root = gripRoot(attack.pcs, attack.midis);
    if (under.length > 0 && under.some((pc) => pc !== root)) deviceBars.FOREIGN_BASS_GRIP.push(attack.bar);
    if (isOpenStringGrip(attack.midis) && hasSecond(attack.midis)) deviceBars.OPEN_STRING_CLUSTER.push(attack.bar);
  }

  const fullHits = hook.length >= HOOK_FRAGMENT ? findOrdered(melody, hook) : [];
  const opening = fullHits[0];
  const fragments: number[][] = [];
  if (hook.length >= HOOK_FRAGMENT) {
    for (let size = HOOK_FRAGMENT; size <= hook.length; size += 1) {
      for (let offset = 0; offset <= hook.length - size; offset += 1) {
        fragments.push(hook.slice(offset, offset + size));
      }
    }
  }
  for (const fragment of fragments) {
    for (const hit of findOrdered(melody, fragment)) {
      const sameAsOpening = opening && hit.from >= opening.from && hit.to <= opening.to;
      if (sameAsOpening) continue;
      deviceBars.HOOK_EROSION.push(...hit.bars);
    }
  }

  const spans = chorusSpans(input.guitar, input.chorusLength);
  for (const span of spans) {
    const extra = silentBars(guitar, span.bars).filter((bar) => !protectedBars.has(bar));
    deviceBars.ACTIVE_SILENCE.push(...extra);
  }

  for (const device of BRYANT_DEVICES) deviceBars[device] = uniqueSorted(deviceBars[device]);

  const banBars: Record<BryantBan, number[]> = {
    FUNCTIONAL_CADENCE: [],
    SCALE_RUN: [],
    MAJ7_SHARP11: [],
    PARALLEL_GRIP: [],
    VOICING_CYCLE: [],
  };
  const functionalBars = new Set<number>();
  for (let i = 0; i < grips.length - 1; i += 1) {
    const from = bassAtOnset(bass, grips[i]!.onset);
    const to = bassAtOnset(bass, grips[i + 1]!.onset);
    if (from == null || to == null) continue;
    if ((to - from + 12) % 12 !== 5) continue;
    if (grips[i + 1]!.bar - grips[i]!.bar > 2) continue;
    const dominantThird = (from + 4) % 12;
    const tonic = to;
    if (!grips[i]!.pcs.includes(dominantThird) || !grips[i + 1]!.pcs.includes(tonic)) continue;
    banBars.FUNCTIONAL_CADENCE.push(grips[i]!.bar, grips[i + 1]!.bar);
    functionalBars.add(grips[i]!.bar);
    functionalBars.add(grips[i + 1]!.bar);
  }

  let run: Attack[] = [];
  const pushRun = () => {
    if (run.length > 6) banBars.SCALE_RUN.push(...run.map((attack) => attack.bar));
    run = [];
  };
  for (const attack of guitar) {
    if (attack.rest || attack.midis.length !== 1) {
      pushRun();
      continue;
    }
    const previous = run[run.length - 1];
    if (!previous) {
      run = [attack];
      continue;
    }
    const gap = Math.abs(attack.midis[0]! - previous.midis[0]!);
    if (gap === 1 || gap === 2) run.push(attack);
    else {
      pushRun();
      run = [attack];
    }
  }
  pushRun();

  const justified = (input.maj7Sharp11Justification ?? '').trim().length > 0;
  for (const attack of grips) {
    if (isMaj7Sharp11(attack.pcs) && !justified) banBars.MAJ7_SHARP11.push(attack.bar);
  }

  let parallel: Attack[] = [];
  const pushParallel = () => {
    // Two parallel moves are three grips. More than twice is a fourth grip.
    if (parallel.length > 3) banBars.PARALLEL_GRIP.push(...parallel.map((attack) => attack.bar));
    parallel = [];
  };
  for (const attack of grips) {
    const previous = parallel[parallel.length - 1];
    const shape = shapeOf(attack.midis);
    if (!previous) {
      parallel = [attack];
      continue;
    }
    const same = shape === shapeOf(previous.midis);
    const moved = Math.min(...attack.midis) !== Math.min(...previous.midis);
    if (same && moved) parallel.push(attack);
    else {
      pushParallel();
      parallel = [attack];
    }
  }
  pushParallel();

  const cycleByChorus = spans.map((span) => {
    const shapes = grips.filter((attack) => span.bars.includes(attack.bar)).map((attack) => shapeOf(attack.midis));
    return { id: span.id, bars: span.bars, shapes };
  });
  for (let i = 0; i < cycleByChorus.length; i += 1) {
    for (let j = i + 1; j < cycleByChorus.length; j += 1) {
      const left = cycleByChorus[i]!;
      const right = cycleByChorus[j]!;
      if (left.shapes.length < 2) continue;
      if (left.shapes.join('|') === right.shapes.join('|')) {
        banBars.VOICING_CYCLE.push(...left.bars, ...right.bars);
      }
    }
  }
  for (const ban of BRYANT_BANS) banBars[ban] = uniqueSorted(banBars[ban]);

  const gripTypeSet = new Set<BryantGripType>();
  for (const attack of grips) {
    if (isQuartal(attack.midis)) gripTypeSet.add('quartal');
    if (isClusterWithSecond(attack.midis)) gripTypeSet.add('cluster-with-2nd');
    if (isOpenStringGrip(attack.midis)) gripTypeSet.add('open-string');
    if (liquidIndexes.has(grips.indexOf(attack))) gripTypeSet.add('liquid');
    const root = gripRoot(attack.pcs, attack.midis);
    const under = soundingBass(bass, attack.onset, attack.end);
    if (triadRoot(attack.pcs) != null && under.some((pc) => pc !== root)) gripTypeSet.add('triad-over-foreign-bass');
    if (isDrop2(attack.midis)) gripTypeSet.add('drop-2');
  }
  const gripTypes = BRYANT_GRIP_TYPES.filter((type) => gripTypeSet.has(type));

  const fingerprint = firstBarDurations(input.leadsheetGuitar);
  const arrival = lastLeadsheetPc(input.leadsheetGuitar);
  const present = new Map(spans.map((span) => [span.id, span]));
  const choruses: BryantChorusReport[] = [];

  const anchorFor = (bars: number[]): string => {
    const names = (input.hookPitches ?? []).join('–');
    if (hook.length >= HOOK_FRAGMENT) {
      const hits = findOrdered(
        melody.filter((note) => bars.includes(note.bar)),
        hook
      );
      if (hits.length) return `hook interval ${names || hook.map((pc) => NAMES[pc]).join('–')} at bars ${formatBars(hits[0]!.bars)}`;
    }
    const rhythmBars = bars.filter((bar) => {
      const durations = guitar.filter((attack) => attack.bar === bar && !attack.rest).map((attack) => attack.duration);
      return fingerprint.length > 0 && durations.join(',') === fingerprint.join(',');
    });
    if (rhythmBars.length) return `rhythmic fingerprint of leadsheet bar 1 at bars ${formatBars(rhythmBars)}`;
    if (arrival != null) {
      const arrivalBars = bars.filter((bar) => melody.some((note) => note.bar === bar && note.pc === arrival));
      if (arrivalBars.length) return `arrival ${NAMES[arrival]} at bars ${formatBars(arrivalBars)}`;
    }
    return 'none';
  };

  const signatureCount = BRYANT_DEVICES.filter((device) => deviceBars[device].length > 0).length;
  const silenceByChorus = (bars: number[]) => silentBars(guitar, bars).filter((bar) => !protectedBars.has(bar));

  for (const span of spans) {
    const reasons: string[] = [];
    const anchor = anchorFor(span.bars);
    if (anchor === 'none') reasons.push('no source anchor');
    const silence = silenceByChorus(span.bars);
    if (silence.length === 0) reasons.push('no active silence besides protected rests');
    for (const ban of BRYANT_BANS) {
      const hit = banBars[ban].filter((bar) => span.bars.includes(bar));
      if (hit.length) reasons.push(`${ban} at bars ${formatBars(hit)}`);
    }
    if (span.id === 'UNLABELLED' || span.id.startsWith('CHORUS_')) {
      if (signatureCount < spec.signatureDevices.minimumPerEdition) {
        reasons.push(`signature devices ${signatureCount} of ${spec.signatureDevices.poolSize}, need ${spec.signatureDevices.minimumPerEdition}`);
      }
      reasons.push('form chorus label is absent');
    }
    if (span.id === 'HEAD_IN' || span.id === 'HEAD_OUT' || span.id === 'BASS_SOLO') {
      const localTypes = gripTypesIn(grips, span.bars, liquidIndexes, bass);
      if (localTypes.length < spec.chordalVariety.minimumGripTypes) {
        reasons.push(`grip types ${localTypes.length} (${localTypes.join(', ') || 'none'}), need ${spec.chordalVariety.minimumGripTypes}`);
      }
    }
    choruses.push({ id: span.id, bars: span.bars, present: true, ok: reasons.length === 0, reasons, anchor });
  }

  const solo2Rule = spec.soloContrast.SOLO_2;
  const soloSpan = (id: BryantFormChorus) => present.get(id)?.bars ?? [];
  const solo1 = soloSpan('SOLO_1').length
    ? soloNumbers(guitar, soloSpan('SOLO_1'), solo2Rule.wideIntervalSemitones, collisions, functionalBars)
    : emptySolo();
  const solo2 = soloSpan('SOLO_2').length
    ? soloNumbers(guitar, soloSpan('SOLO_2'), solo2Rule.wideIntervalSemitones, collisions, functionalBars)
    : emptySolo();

  if (solo1.present) {
    const row = choruses.find((chorus) => chorus.id === 'SOLO_1');
    if (row) {
      if (!solo1.linear || !solo1.motivic || !solo1.nonFunctional) {
        row.reasons.push(
          `SOLO 1 inside linear=${solo1.linear} motivic=${solo1.motivic} nonFunctional=${solo1.nonFunctional}`
        );
      }
      row.ok = row.reasons.length === 0;
    }
  }
  if (solo2.present) {
    const row = choruses.find((chorus) => chorus.id === 'SOLO_2');
    if (row) {
      if (solo2.wideShare < solo2Rule.minWideIntervalShare) row.reasons.push(`wide intervals ${(solo2.wideShare * 100).toFixed(0)}%`);
      if (solo2.range < solo2Rule.minRangeSemitones) row.reasons.push(`range ${solo2.range} semitones`);
      if (solo2.fieldCollisions < solo2Rule.minFieldCollisions) row.reasons.push(`field collisions ${solo2.fieldCollisions}`);
      if (solo2.silentBars < solo2Rule.minSilentBars) row.reasons.push(`silent bars ${solo2.silentBars}`);
      row.ok = row.reasons.length === 0;
    }
  }

  const contrast = contrastGate(solo1, solo2, spec.soloContrast.mustDifferIn);
  if (!contrast.ok) {
    for (const id of ['SOLO_1', 'SOLO_2'] as const) {
      const row = choruses.find((chorus) => chorus.id === id);
      if (row && !row.reasons.includes(contrast.detail)) row.reasons.push(contrast.detail);
      if (row) row.ok = row.reasons.length === 0;
    }
  }

  for (const id of BRYANT_FORM_CHORUSES) {
    if (choruses.some((chorus) => chorus.id === id)) continue;
    const reasons = [`${id} is not in the score`];
    if (id === 'HEAD_IN' || id === 'HEAD_OUT' || id === 'BASS_SOLO') reasons.push('chordal variety has no chorus to count');
    if (id === 'SOLO_1' || id === 'SOLO_2') reasons.push('solo contrast has no chorus to measure');
    reasons.push('no source anchor');
    choruses.push({ id, bars: [], present: false, ok: false, reasons, anchor: 'none' });
  }

  const devices: BryantGate[] = BRYANT_DEVICES.map((id) => {
    const bars = deviceBars[id];
    const perChorus = id === 'ACTIVE_SILENCE';
    const silenceOk = spans.every((span) => silenceByChorus(span.bars).length > 0);
    const ok = perChorus ? silenceOk && bars.length > 0 : bars.length > 0;
    return { id, ok, bars, detail: ok ? `bars ${formatBars(bars)}` : `bars ${formatBars(bars)}` };
  });
  const used = devices.filter((gate) => gate.id !== 'ACTIVE_SILENCE' ? gate.bars.length > 0 : gate.ok).length;
  const signatureOk = used >= spec.signatureDevices.minimumPerEdition;
  const bans: BryantGate[] = BRYANT_BANS.map((id) => {
    const bars = banBars[id];
    const ok = id === 'MAJ7_SHARP11' ? bars.length === 0 : bars.length === 0;
    const detail =
      id === 'MAJ7_SHARP11' && justified && bars.length === 0
        ? 'no maj7#11 voicing'
        : `bars ${formatBars(bars)}`;
    return { id, ok, bars, detail };
  });

  const deviceByBarMap = new Map<number, string[]>();
  for (const gate of devices) {
    for (const bar of gate.bars) {
      const list = deviceByBarMap.get(bar) ?? [];
      list.push(gate.id);
      deviceByBarMap.set(bar, list);
    }
  }
  const deviceByBar = [...deviceByBarMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([bar, names]) => ({ bar, devices: names }));

  const failures: string[] = [];
  if (!signatureOk) failures.push(`signature ${used} of ${BRYANT_DEVICES.length}, need ${spec.signatureDevices.minimumPerEdition}`);
  for (const ban of bans) if (!ban.ok) failures.push(`${ban.id} bars ${formatBars(ban.bars)}`);
  for (const chorus of choruses) if (!chorus.ok) failures.push(`${chorus.id}: ${chorus.reasons.join('; ')}`);
  if (!contrast.ok) failures.push(contrast.detail);

  const listeningGuide = `65/20/40 listening guide (${spec.listeningGuide.melodyPercent}/${spec.listeningGuide.harmonyPercent}/${spec.listeningGuide.rhythmPercent}). Not a gate.`;
  const editionOk = signatureOk && bans.every((ban) => ban.ok) && choruses.every((chorus) => chorus.ok) && contrast.ok;
  return {
    ok: editionOk,
    devices,
    bans,
    signatureCount: used,
    signatureMinimum: spec.signatureDevices.minimumPerEdition,
    deviceByBar,
    gripTypes,
    gripTypeCount: gripTypes.length,
    solo1,
    solo2,
    contrast,
    choruses,
    failures,
    listeningGuide,
  };
}

function gripTypesIn(grips: Attack[], bars: number[], liquidIndexes: Set<number>, bass: Attack[]): BryantGripType[] {
  const found = new Set<BryantGripType>();
  grips.forEach((attack, index) => {
    if (!bars.includes(attack.bar)) return;
    if (isQuartal(attack.midis)) found.add('quartal');
    if (isClusterWithSecond(attack.midis)) found.add('cluster-with-2nd');
    if (isOpenStringGrip(attack.midis)) found.add('open-string');
    if (liquidIndexes.has(index)) found.add('liquid');
    const root = gripRoot(attack.pcs, attack.midis);
    const under = soundingBass(bass, attack.onset, attack.end);
    if (triadRoot(attack.pcs) != null && under.some((pc) => pc !== root)) found.add('triad-over-foreign-bass');
    if (isDrop2(attack.midis)) found.add('drop-2');
  });
  return BRYANT_GRIP_TYPES.filter((type) => found.has(type));
}

function contrastGate(solo1: BryantSoloNumbers, solo2: BryantSoloNumbers, axes: string[]): BryantGate {
  if (!solo1.present || !solo2.present) {
    return { id: 'SOLO_CONTRAST', ok: false, bars: [], detail: 'SOLO 1 and SOLO 2 are not both in the score' };
  }
  const profile = Math.abs(solo1.wideShare - solo2.wideShare) >= 0.15 || Math.abs(solo1.meanInterval - solo2.meanInterval) >= 2;
  const density = Math.abs(solo1.density - solo2.density) >= 1.5;
  const register =
    solo1.meanRegister != null && solo2.meanRegister != null && Math.abs(solo1.meanRegister - solo2.meanRegister) >= 5;
  const ok = profile && density && register;
  const detail = [
    `interval profile wide ${(solo1.wideShare * 100).toFixed(0)}% / ${(solo2.wideShare * 100).toFixed(0)}%, mean ${solo1.meanInterval.toFixed(1)} / ${solo2.meanInterval.toFixed(1)}`,
    `density ${solo1.density.toFixed(2)} / ${solo2.density.toFixed(2)}`,
    `register ${solo1.meanRegister?.toFixed(1) ?? 'none'} / ${solo2.meanRegister?.toFixed(1) ?? 'none'}`,
    `SOLO 2 wide ${(solo2.wideShare * 100).toFixed(0)}% range ${solo2.range} collisions ${solo2.fieldCollisions} silent ${solo2.silentBars}`,
    `axes ${axes.join(', ')} ${ok ? 'differ' : 'do not all differ'}`,
  ].join('; ');
  return { id: 'SOLO_CONTRAST', ok, bars: [], detail };
}

export function formatBryantReport(report: BryantAssessment): string[] {
  const lines: string[] = [];
  lines.push('Bryant V1.4 signature and anti-cliché gates. Style gates. 65/20/40 is not a quota.');
  lines.push(report.listeningGuide);
  lines.push(
    `Bryant signature ${report.signatureCount} of ${BRYANT_DEVICES.length} (need ${report.signatureMinimum}): ${report.signatureCount >= report.signatureMinimum ? 'PASS' : 'FAIL'}`
  );
  for (const gate of report.devices) lines.push(`Bryant gate ${gate.id}: ${gate.ok ? 'PASS' : 'FAIL'} bars ${formatBars(gate.bars)}`);
  for (const ban of report.bans) lines.push(`Bryant ban ${ban.id}: ${ban.ok ? 'PASS' : 'FAIL'} bars ${formatBars(ban.bars)}`);
  lines.push(`Bryant grip types ${report.gripTypeCount}: ${report.gripTypes.join(', ') || 'none'}`);
  lines.push(`Bryant solo contrast: ${report.contrast.ok ? 'PASS' : 'FAIL'} ${report.contrast.detail}`);
  lines.push(formatSoloLine('SOLO 1', report.solo1));
  lines.push(formatSoloLine('SOLO 2', report.solo2));
  lines.push('Bryant device-by-bar');
  if (!report.deviceByBar.length) lines.push('bar none');
  for (const row of report.deviceByBar) lines.push(`bar ${row.bar}: ${row.devices.join(', ')}`);
  for (const chorus of report.choruses) {
    const where = chorus.bars.length ? `bars ${chorus.bars[0]}–${chorus.bars[chorus.bars.length - 1]}` : 'absent';
    lines.push(
      `Bryant chorus ${chorus.id} ${where}: ${chorus.ok ? 'PASS' : 'FAIL'} anchor ${chorus.anchor}${chorus.reasons.length ? `; ${chorus.reasons.join('; ')}` : ''}`
    );
  }
  return lines;
}

function formatSoloLine(label: string, solo: BryantSoloNumbers): string {
  if (!solo.present) return `Bryant ${label}: absent`;
  return [
    `Bryant ${label}: notes ${solo.notes}`,
    `wide ${(solo.wideShare * 100).toFixed(0)}%`,
    `mean interval ${solo.meanInterval.toFixed(1)}`,
    `range ${solo.range}`,
    `density ${solo.density.toFixed(2)}`,
    `register ${solo.meanRegister?.toFixed(1) ?? 'none'}`,
    `collisions ${solo.fieldCollisions}`,
    `silent ${solo.silentBars}`,
  ].join(', ');
}

