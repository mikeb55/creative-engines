/**
 * Operator 1 — Liquid Response.
 * One existing triad-pair realisation under a locked guitar melody.
 * Response occupies source rests and the held portion of notes at least a half note long.
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { importWwhDuoMusicXml, type WwhDuoScore, type WwhImportedMeasure, type WwhImportedNote } from './wwhDuoImport';
import { inspectV8bParentTriad } from './wwhBlackAuraV8aVault';
import { midiOf, soundingFromStringFret, stoppedSpan, V8B_MAX_FRET, V8B_MAX_STOPPED_SPAN } from './wwhBlackAuraV8bRecipe';
import { renderWwhDuoScore, type WwhScoreHeader, type WwhWrittenBar } from './wwhMusicXmlWrite';
import { assertWwhBar, wwhBarTicks, WWH_DUR, type WwhAtom } from './wwhPerformanceTypes';
import {
  pitchName,
  realizeTriadPair,
  type ContextualTone,
  type FretPlacement,
  type LiquidDuration,
  type LiquidSlot,
  type PairContext,
  type ParentTriadInput,
  type TriadQuality,
} from './wwhTriadPair';

export const LIQUID_RESPONSE_OUT_DIR =
  '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/WWH-PERFORMANCE-MOCKUPS/V9-PILOT';

const LETTERS = 'CDEFGAB';
const NATURAL: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const THIRD: Record<TriadQuality, number> = { major: 4, minor: 3, augmented: 4, diminished: 3 };
const FIFTH: Record<TriadQuality, number> = { major: 7, minor: 7, augmented: 8, diminished: 6 };
const LIQUID_QUARTERS: Array<[LiquidDuration, number]> = [
  ['whole', 4],
  ['half', 2],
  ['quarter.', 1.5],
  ['quarter', 1],
  ['eighth', 0.5],
];
const FILL_QUARTERS: Array<[keyof typeof WWH_DUR, number]> = [
  ['whole', 4],
  ['half.', 3],
  ['half', 2],
  ['quarter.', 1.5],
  ['quarter', 1],
  ['eighth', 0.5],
  ['16th', 0.25],
];

export interface LiquidSlotReport {
  bar: number;
  onset: number;
  duration: LiquidDuration;
  place: 'in-rest' | 'under-sustain';
  relation: string;
  sounding: string;
  rhythm: LiquidDuration;
  fingering: string;
  rejections: string[];
}

export interface LiquidResponseResult {
  status: 'written' | 'no-space' | 'no-vault-pair';
  message: string;
  output?: string;
  sourceShaBefore: string;
  sourceShaAfter: string;
  sourceMtimeBeforeMs: number;
  sourceMtimeAfterMs: number;
  slots: LiquidSlotReport[];
  melodyUnchanged: boolean;
  bassUnchanged: boolean;
  otherBarsUnchanged: boolean;
  barMathOk: boolean;
  fretOk: boolean;
  xmlOk: boolean;
}

export interface LiquidResponseRequest {
  source: string;
  startBar: number;
  endBar: number;
  seed: number;
  pairId?: string;
  resolution?: string;
  tension?: string;
  outDir?: string;
  open?: boolean;
}

interface Attack {
  onset: number;
  ticks: number;
  notes: WwhImportedNote[];
}

interface ResponseSlot {
  bar: number;
  onset: number;
  ticks: number;
  duration: LiquidDuration;
  place: 'in-rest' | 'under-sustain';
  melodyMidi: number | null;
  melodyName: string | null;
}

function sha256(file: string): string {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function pieceSlug(title: string): string {
  const words = title.split(/[^A-Za-z0-9]+/).filter(Boolean);
  if (!words.length) return 'Piece';
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('-');
}

function barNumber(measure: WwhImportedMeasure): number {
  const parsed = Number(measure.number);
  return Number.isInteger(parsed) ? parsed : measure.order + 1;
}

function ticksFor(quarters: number, quarter: number): number {
  return Math.round(quarters * quarter);
}

function attacksOf(measure: WwhImportedMeasure): Attack[] {
  const attacks: Attack[] = [];
  let onset = 0;
  for (const note of measure.notes) {
    if (note.chord) {
      const current = attacks[attacks.length - 1];
      if (!current) throw new Error(`bar ${measure.number} starts with a chord tone`);
      current.notes.push(note);
      continue;
    }
    attacks.push({ onset, ticks: note.duration, notes: [note] });
    onset += note.duration;
  }
  return attacks;
}

function soundingPitches(measure: WwhImportedMeasure, onset: number): Array<{ midi: number; name: string }> {
  const found: Array<{ midi: number; name: string }> = [];
  for (const attack of attacksOf(measure)) {
    if (onset < attack.onset || onset >= attack.onset + attack.ticks) continue;
    for (const note of attack.notes) {
      if (note.rest || !note.step || note.octave === undefined) continue;
      const octave = note.octave + measure.transposeOctave;
      found.push({ midi: midiOf(note.step, note.alter ?? 0, octave), name: pitchName(note.step, note.alter ?? 0, octave) });
    }
  }
  return found;
}

function splitLiquid(ticks: number, quarter: number): Array<{ duration: LiquidDuration; ticks: number }> {
  const pieces: Array<{ duration: LiquidDuration; ticks: number }> = [];
  let left = ticks;
  while (left > 0) {
    const fit = LIQUID_QUARTERS.find(([, quarters]) => ticksFor(quarters, quarter) <= left);
    if (!fit) break;
    const size = ticksFor(fit[1], quarter);
    if (size <= 0) break;
    pieces.push({ duration: fit[0], ticks: size });
    left -= size;
  }
  return pieces;
}

function fillRests(ticks: number, quarter: number): WwhAtom[] {
  const atoms: WwhAtom[] = [];
  let left = ticks;
  while (left > 0) {
    const fit = FILL_QUARTERS.find(([, quarters]) => ticksFor(quarters, quarter) <= left);
    if (!fit) throw new Error(`cannot fill ${left} ticks`);
    const size = ticksFor(fit[1], quarter);
    const spec = WWH_DUR[fit[0]];
    atoms.push({ rest: true, divisions: size, type: spec.type, dots: spec.dots });
    left -= size;
  }
  return atoms;
}

function atomFromNote(note: WwhImportedNote): WwhAtom {
  return {
    rest: note.rest,
    step: note.step,
    alter: note.alter,
    octave: note.octave,
    divisions: note.duration,
    type: note.type || 'quarter',
    dots: note.dots,
    chord: note.chord,
    tieStart: note.tieStart,
    tieStop: note.tieStop,
    timeModification: note.timeModification,
  };
}

function responseSlots(measure: WwhImportedMeasure): ResponseSlot[] {
  const quarter = measure.divisions;
  const half = quarter * 2;
  const slots: ResponseSlot[] = [];
  for (const attack of attacksOf(measure)) {
    const head = attack.notes[0];
    if (!head) continue;
    const place = head.rest ? 'in-rest' : attack.ticks >= half ? 'under-sustain' : null;
    if (!place) continue;
    let melodyMidi: number | null = null;
    let melodyName: string | null = null;
    if (place === 'under-sustain' && head.step && head.octave !== undefined) {
      const octave = head.octave + measure.transposeOctave;
      melodyMidi = midiOf(head.step, head.alter ?? 0, octave);
      melodyName = pitchName(head.step, head.alter ?? 0, octave);
    }
    let cursor = attack.onset;
    for (const piece of splitLiquid(attack.ticks, quarter)) {
      slots.push({
        bar: barNumber(measure),
        onset: cursor,
        ticks: piece.ticks,
        duration: piece.duration,
        place,
        melodyMidi,
        melodyName,
      });
      cursor += piece.ticks;
    }
  }
  return slots;
}

export function parseUserTriad(token: string): ParentTriadInput {
  const match = /^([A-G](?:#|b){0,2})(?:\s*(m|min|minor|maj|major|aug|dim|\+|o))?$/i.exec(token.trim());
  if (!match) throw new Error(`triad "${token}" must look like Cm, Ab, F#dim, or C aug`);
  const rootToken = match[1]!;
  const parsedRoot = /^([A-G])(#|b)?(#|b)?$/.exec(rootToken);
  if (!parsedRoot) throw new Error(`triad "${token}" has a bad root`);
  const step = parsedRoot[1]!.toUpperCase();
  const accidental = `${parsedRoot[2] ?? ''}${parsedRoot[3] ?? ''}`;
  if (accidental.includes('#') && accidental.includes('b')) throw new Error(`triad "${token}" mixes sharps and flats`);
  const alter = accidental.includes('b') ? -accidental.length : accidental.length;
  const rootPc = (NATURAL[step]! + alter + 12) % 12;
  const qualityToken = (match[2] ?? 'major').toLowerCase();
  const quality: TriadQuality =
    qualityToken === 'm' || qualityToken === 'min' || qualityToken === 'minor'
      ? 'minor'
      : qualityToken === 'aug' || qualityToken === '+'
        ? 'augmented'
        : qualityToken === 'dim' || qualityToken === 'o'
          ? 'diminished'
          : 'major';
  const spell = (letterSteps: number, semitones: number): string => {
    const index = LETTERS.indexOf(step);
    const degree = LETTERS[(index + letterSteps) % 7]!;
    let degreeAlter = ((rootPc + semitones) % 12) - NATURAL[degree]!;
    degreeAlter = ((degreeAlter % 12) + 12) % 12;
    if (degreeAlter > 6) degreeAlter -= 12;
    const mark = degreeAlter < 0 ? 'b'.repeat(-degreeAlter) : degreeAlter > 0 ? '#'.repeat(degreeAlter) : '';
    return `${degree}${mark}`;
  };
  const notes = [spell(0, 0), spell(2, THIRD[quality]), spell(4, FIFTH[quality])] as [string, string, string];
  const pitchClasses = notes.map((note) => {
    const parsed = /^([A-G])(.*)$/.exec(note)!;
    const pcStep = parsed[1]!;
    const marks = parsed[2] ?? '';
    const pcAlter = marks.includes('b') ? -marks.length : marks.length;
    return (NATURAL[pcStep]! + pcAlter + 12) % 12;
  }) as [number, number, number];
  return {
    id: `${notes[0]}_${quality}`,
    rootSpelling: notes[0],
    quality,
    notes,
    pitchClasses,
    provenance: 'user',
  };
}

function contextFor(duo: WwhDuoScore, startBar: number, endBar: number): PairContext {
  const tones: ContextualTone[] = [];
  const inRange = (measure: WwhImportedMeasure) => {
    const number = barNumber(measure);
    return number >= startBar && number <= endBar;
  };
  const push = (role: ContextualTone['role'], measure: WwhImportedMeasure, note: WwhImportedNote) => {
    if (note.rest || note.chord || !note.step || note.octave === undefined) return;
    const soundingOctave = note.octave + measure.transposeOctave;
    tones.push({
      role,
      printed: pitchName(note.step, note.alter ?? 0, note.octave),
      sounding: pitchName(note.step, note.alter ?? 0, soundingOctave),
      step: note.step,
      alter: note.alter ?? 0,
      soundingMidi: midiOf(note.step, note.alter ?? 0, soundingOctave),
    });
  };
  for (const measure of duo.guitar.measures) {
    if (!inRange(measure)) continue;
    for (const note of measure.notes) push('melody', measure, note);
  }
  for (const measure of duo.bass.measures) {
    if (!inRange(measure)) continue;
    for (const note of measure.notes) push('bass', measure, note);
  }
  return { tones };
}

function clash(midi: number, other: number): 'minor 2nd' | 'minor 9th' | null {
  const distance = Math.abs(midi - other);
  if (distance === 1) return 'minor 2nd';
  if (distance === 13) return 'minor 9th';
  return null;
}

function relationOf(slot: ResponseSlot, pitches: readonly number[]): string {
  if (slot.place === 'in-rest') return 'in-rest';
  if (slot.melodyMidi === null || !pitches.length) return 'under-sustain no-melody';
  return pitches.every((midi) => midi < slot.melodyMidi!) ? 'under-sustain below' : 'under-sustain not-below';
}

function assertGrip(points: readonly FretPlacement[]): void {
  for (const point of points) {
    if (point.fret < 0 || point.fret > V8B_MAX_FRET) throw new Error(`${point.name} fret ${point.fret}`);
    const sounded = soundingFromStringFret(point.stringNumber, point.fret);
    if (sounded.midi !== point.midi) throw new Error(`${point.name} string/fret mismatch`);
  }
  const frets = points.map((point) => point.fret);
  if (stoppedSpan(frets) > V8B_MAX_STOPPED_SPAN) throw new Error(`stopped span ${stoppedSpan(frets)}`);
}

function voiceAtoms(points: readonly FretPlacement[], duration: LiquidDuration, ticks: number, writtenShift: number): WwhAtom[] {
  const spec = WWH_DUR[duration];
  const ordered = [...points].sort((a, b) => a.midi - b.midi || b.stringNumber - a.stringNumber);
  return ordered.map((point, index) => ({
    rest: false,
    step: point.step,
    alter: point.alter,
    octave: point.octave + writtenShift,
    divisions: ticks,
    type: spec.type,
    dots: spec.dots,
    chord: index > 0,
  }));
}

function lane(notes: readonly WwhImportedNote[], voice?: string): string {
  return notes
    .filter((note) => (voice ? note.voice === voice : true))
    .map((note) =>
      note.rest
        ? `R:${note.duration}:v${note.voice}`
        : `${note.step}${note.alter ?? 0}:${note.octave}:${note.duration}:v${note.voice}:${note.chord ? 'c' : 'a'}`
    )
    .join(',');
}

function primaryVoice(measure: WwhImportedMeasure): string {
  const voices = [...new Set(measure.notes.map((note) => note.voice))];
  if (voices.length > 1) {
    throw new Error(
      'missing capability: source guitar already has more than one voice. renderWwhDuoScore can add guitarVoice2 only on a fresh single-voice bar.'
    );
  }
  return voices[0] ?? '1';
}

export function buildLiquidResponse(request: LiquidResponseRequest): LiquidResponseResult {
  if (!Number.isInteger(request.startBar) || !Number.isInteger(request.endBar) || request.endBar < request.startBar) {
    throw new Error('bar range must be integers with endBar >= startBar');
  }
  if (!Number.isInteger(request.seed)) throw new Error('seed must be an integer');
  const sourceStat = fs.statSync(request.source);
  const sourceShaBefore = sha256(request.source);
  const xml = fs.readFileSync(request.source, 'utf8');
  const duo = importWwhDuoMusicXml(xml);
  const empty = (status: LiquidResponseResult['status'], message: string): LiquidResponseResult => {
    const sourceShaAfter = sha256(request.source);
    const sourceMtimeAfterMs = fs.statSync(request.source).mtimeMs;
    return {
      status,
      message,
      sourceShaBefore,
      sourceShaAfter,
      sourceMtimeBeforeMs: sourceStat.mtimeMs,
      sourceMtimeAfterMs,
      slots: [],
      melodyUnchanged: sourceShaBefore === sourceShaAfter,
      bassUnchanged: sourceShaBefore === sourceShaAfter,
      otherBarsUnchanged: sourceShaBefore === sourceShaAfter,
      barMathOk: false,
      fretOk: false,
      xmlOk: false,
    };
  };
  if (!request.resolution || !request.tension) {
    const vault = inspectV8bParentTriad();
    const id = request.pairId ? ` Vault id ${request.pairId}.` : '';
    return empty(
      'no-vault-pair',
      `missing capability: no Vault triad pair for this passage.${id} inspectV8bParentTriad status ${vault.status}. ${vault.reason}`
    );
  }
  const resolution = parseUserTriad(request.resolution);
  const tension = parseUserTriad(request.tension);
  const selected = duo.guitar.measures.filter((measure) => {
    const number = barNumber(measure);
    return number >= request.startBar && number <= request.endBar;
  });
  if (!selected.length) throw new Error(`no bars ${request.startBar}-${request.endBar}`);
  for (const measure of selected) primaryVoice(measure);
  const slots = selected.flatMap(responseSlots);
  if (!slots.length) return empty('no-space', 'NO SPACE');
  const liquidSlots: LiquidSlot[] = slots.map((slot) => ({
    bar: slot.bar,
    duration: slot.duration,
    rest: false,
    kind: 'connect',
  }));
  const realization = realizeTriadPair(resolution, tension, request.seed, liquidSlots, contextFor(duo, request.startBar, request.endBar));
  const reports: LiquidSlotReport[] = [];
  const byBar = new Map<number, Array<{ slot: ResponseSlot; atoms: WwhAtom[] }>>();
  realization.events.forEach((event, index) => {
    const slot = slots[index];
    if (!slot) throw new Error('realiser event has no slot');
    const guitar = duo.guitar.measures.find((measure) => barNumber(measure) === slot.bar);
    const bass = duo.bass.measures.find((measure) => barNumber(measure) === slot.bar);
    if (!guitar || !bass) throw new Error(`bar ${slot.bar} missing`);
    const sounding = [...soundingPitches(guitar, slot.onset), ...soundingPitches(bass, slot.onset)];
    const rejections: string[] = [];
    const kept: FretPlacement[] = [];
    for (const point of event.voicing?.points ?? []) {
      const hit = sounding
        .map((tone) => ({ tone, interval: clash(point.midi, tone.midi) }))
        .find((item) => item.interval);
      if (hit?.interval) {
        rejections.push(
          `bar ${slot.bar} onset ${slot.onset} ${point.name} ${hit.interval} with sounding ${hit.tone.name}`
        );
        continue;
      }
      kept.push(point);
    }
    if (kept.length) assertGrip(kept);
    const writtenShift = -guitar.transposeOctave;
    const atoms = kept.length ? voiceAtoms(kept, slot.duration, slot.ticks, writtenShift) : fillRests(slot.ticks, guitar.divisions);
    const list = byBar.get(slot.bar) ?? [];
    list.push({ slot, atoms });
    byBar.set(slot.bar, list);
    reports.push({
      bar: slot.bar,
      onset: slot.onset,
      duration: slot.duration,
      place: slot.place,
      relation: relationOf(slot, kept.map((point) => point.midi)),
      sounding: kept.length ? kept.map((point) => point.name).join('+') : 'rest',
      rhythm: slot.duration,
      fingering: kept.length ? kept.map((point) => `${point.stringNumber}:${point.fret}`).join('+') : 'rest',
      rejections,
    });
  });
  const bars: WwhWrittenBar[] = duo.guitar.measures.map((guitar, index) => {
    const bass = duo.bass.measures[index];
    if (!bass) throw new Error(`bass bar ${guitar.number} missing`);
    const number = barNumber(guitar);
    const base = {
      beats: guitar.beats,
      beatType: guitar.beatType,
      divisions: guitar.divisions,
      fifths: guitar.fifths,
      mode: guitar.mode,
      guitarTranspose: guitar.transposeOctave,
      bassTranspose: bass.transposeOctave,
      rehearsal: guitar.rehearsal[0],
      words: guitar.words,
      tempoMark: guitar.tempo.perMinute || guitar.tempo.soundTempo ? guitar.tempo : null,
    };
    if (number < request.startBar || number > request.endBar) {
      return { ...base, guitar: [], bass: [], guitarClone: guitar.element, bassClone: bass.element };
    }
    const voice = primaryVoice(guitar);
    const guitarAtoms = guitar.notes.filter((note) => note.voice === voice).map(atomFromNote);
    const ticks = guitar.specTicks ?? wwhBarTicks(guitar.beats, guitar.beatType, guitar.divisions);
    assertWwhBar(guitarAtoms, ticks, `melody ${number}`);
    const voice2 = voice2ForBar(guitar, byBar.get(number) ?? [], ticks);
    assertWwhBar(voice2, ticks, `response ${number}`);
    return { ...base, guitar: guitarAtoms, bass: [], bassClone: bass.element, guitarVoice2: voice2 };
  });
  const header: WwhScoreHeader = {
    title: duo.title,
    movementTitle: `${duo.movementTitle || duo.title} liquid response ${request.startBar}-${request.endBar} seed ${request.seed}`,
    composer: duo.composer,
    software: 'Composer OS WWH Operator 1',
  };
  const score = renderWwhDuoScore(bars, header);
  const outDir = request.outDir ?? LIQUID_RESPONSE_OUT_DIR;
  fs.mkdirSync(outDir, { recursive: true });
  const output = path.join(outDir, `${pieceSlug(duo.title)}-LIQUIDRESP-${request.startBar}-${request.endBar}-seed${request.seed}.musicxml`);
  if (path.resolve(output) === path.resolve(request.source)) throw new Error('refusing to overwrite the source');
  fs.writeFileSync(output, score);
  if (request.open) execFileSync('open', ['-a', 'MuseScore 4', output], { stdio: 'ignore' });
  const sourceShaAfter = sha256(request.source);
  const sourceMtimeAfterMs = fs.statSync(request.source).mtimeMs;
  const written = importWwhDuoMusicXml(fs.readFileSync(output, 'utf8'));
  const compare = compareScores(duo, written, request.startBar, request.endBar);
  return {
    status: 'written',
    message: reports.map((slot) => formatSlot(slot)).join('\n'),
    output,
    sourceShaBefore,
    sourceShaAfter,
    sourceMtimeBeforeMs: sourceStat.mtimeMs,
    sourceMtimeAfterMs,
    slots: reports,
    melodyUnchanged: compare.melody && sourceShaBefore === sourceShaAfter,
    bassUnchanged: compare.bass && sourceShaBefore === sourceShaAfter,
    otherBarsUnchanged: compare.other && sourceShaBefore === sourceShaAfter,
    barMathOk: compare.barMath,
    fretOk: true,
    xmlOk: compare.xml,
  };
}

function formatSlot(slot: LiquidSlotReport): string {
  const rejected = slot.rejections.length ? ` rejected ${slot.rejections.join('; ')}` : '';
  return `bar ${slot.bar} onset ${slot.onset} ${slot.rhythm} ${slot.place} ${slot.relation} sounding ${slot.sounding} fingering ${slot.fingering}${rejected}`;
}

function voice2ForBar(
  measure: WwhImportedMeasure,
  placed: Array<{ slot: ResponseSlot; atoms: WwhAtom[] }>,
  ticks: number
): WwhAtom[] {
  const ordered = [...placed].sort((a, b) => a.slot.onset - b.slot.onset);
  const atoms: WwhAtom[] = [];
  let cursor = 0;
  for (const item of ordered) {
    if (item.slot.onset < cursor) throw new Error(`bar ${item.slot.bar} response slots overlap`);
    if (item.slot.onset > cursor) atoms.push(...fillRests(item.slot.onset - cursor, measure.divisions));
    atoms.push(...item.atoms);
    cursor = item.slot.onset + item.slot.ticks;
  }
  if (cursor < ticks) atoms.push(...fillRests(ticks - cursor, measure.divisions));
  return atoms;
}

function compareScores(
  source: WwhDuoScore,
  written: WwhDuoScore,
  startBar: number,
  endBar: number
): { melody: boolean; bass: boolean; other: boolean; barMath: boolean; xml: boolean } {
  if (written.guitar.measures.length !== source.guitar.measures.length) {
    return { melody: false, bass: false, other: false, barMath: false, xml: false };
  }
  let melody = true;
  let bass = true;
  let other = true;
  let barMath = true;
  let xml = true;
  for (let index = 0; index < source.guitar.measures.length; index += 1) {
    const beforeG = source.guitar.measures[index]!;
    const afterG = written.guitar.measures[index]!;
    const beforeB = source.bass.measures[index]!;
    const afterB = written.bass.measures[index]!;
    const number = barNumber(beforeG);
    const inRange = number >= startBar && number <= endBar;
    if (lane(beforeG.notes, '1') !== lane(afterG.notes, '1')) melody = false;
    if (lane(beforeB.notes) !== lane(afterB.notes)) bass = false;
    if (!inRange && lane(beforeG.notes) !== lane(afterG.notes)) other = false;
    if (inRange && afterG.notes.some((note) => note.voice === '2') === false && beforeG.notes.some((note) => !note.rest)) {
      /* a rest-only bar still needs voice 2 when slots existed; checked via bar math below */
    }
    const ticks = afterG.specTicks ?? wwhBarTicks(afterG.beats, afterG.beatType, afterG.divisions);
    const guitarTicks = afterG.notes.filter((note) => note.voice === '1' && !note.chord).reduce((sum, note) => sum + note.duration, 0);
    const responseTicks = afterG.notes.filter((note) => note.voice === '2' && !note.chord).reduce((sum, note) => sum + note.duration, 0);
    const bassTicks = afterB.notes.filter((note) => !note.chord).reduce((sum, note) => sum + note.duration, 0);
    if (guitarTicks !== ticks || bassTicks !== ticks) barMath = false;
    if (inRange && responseTicks !== ticks) barMath = false;
    if (!afterG.gridAgrees || !afterB.gridAgrees) xml = false;
  }
  return { melody, bass, other, barMath, xml };
}
