/**
 * Hexatonic Phase H3 — guitar and upright-bass phrases.
 * Scalar collections and WPS triad pairs stay on the H2 registry.
 * Pitch maps go through mapMotifPitches (M-DEG / M-NEAR).
 */

import type { BaseMotif } from '../motif/motifTypes';
import {
  inGuitarRange,
  mapMotifPitches,
  type MotifMapMethod,
  type PentatonicCollectionView,
} from '../pentatonic/motifTransform';
import {
  accidentalDelta,
  canonicalPitchSet,
  mod12,
  parseNoteToken,
  sharpName,
  spellFromReference,
} from '../pentatonic/pitch';
import { getHexatonicScalar, rootSpelled, scalarTriadsAt } from './collections';
import { hexatonicPhraseToMusicXml } from './phraseExport';
import {
  HEXATONIC_PHRASE_VERSION,
  type HexatonicAttack,
  type HexatonicBmef,
  type HexatonicPhrase,
  type HexatonicPhraseBar,
  type HexatonicPhraseRequest,
  type HexatonicSurface,
} from './phraseTypes';
import {
  exchangeTriads,
  measureHexatonicDistance,
  nearestTone,
  symmetryLandingId,
} from './relations';
import { getHexatonicWpsPair, transposeHexatonicWpsPair } from './triadPairs';
import { pitchClassOf, spellName, type Spelled, type VaultTriadQuality } from '../wwh/wps/wpsTonalityVaultRecord';

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
const GUITAR_STRINGS = [40, 45, 50, 55, 59, 64];
const BASS_LOW = 28;
const BASS_HIGH = 55;

const OUTSIDE_SCALAR: Record<string, string> = {
  hex_western_claim_not_ritsu: 'hex_major_omit_seventh',
  hex_major_omit_seventh: 'hex_western_claim_not_ritsu',
  hex_major_omit_fourth: 'hex_western_claim_not_ritsu',
  hex_lydian_triad_pair: 'hex_whole_tone_even',
  hex_minor_primary: 'hex_western_claim_not_ritsu',
  hex_whole_tone_even: 'hex_whole_tone_odd',
  hex_whole_tone_odd: 'hex_whole_tone_even',
  hex_augmented_t0: 'hex_augmented_t1',
  hex_augmented_t1: 'hex_augmented_t2',
  hex_augmented_t2: 'hex_augmented_t3',
  hex_augmented_t3: 'hex_augmented_t0',
};

const SCALAR_SHAPES: readonly (readonly number[])[] = [
  [0, 2, 4],
  [0, 3, 1],
  [0, 4, 2],
  [1, 4, 0],
  [0, 2, 5],
  [0, 3, 5],
  [2, 5, 1],
  [0, 4],
  [1, 3, 0, 4],
  [0, 5, 2],
];

const NAMED_TRIAD_SHAPES: readonly (readonly number[])[] = [
  [0, 2, 4],
  [0, 4, 2],
  [2, 0, 4],
  [0, 2, 4, 2],
];

const WPS_SHAPES: readonly (readonly number[])[] = [
  [0, 2, 1],
  [2, 0, 1],
  [1, 0, 2],
  [0, 2],
  [2, 0],
  [0, 2, 1, 0],
];

const RHYTHMS: Record<number, readonly (readonly number[])[]> = {
  2: [[2, 2]],
  3: [[1, 1, 2], [1.5, 0.5, 2]],
  4: [[1, 0.5, 0.5, 2], [0.5, 0.5, 1, 2]],
};

interface OrderedCollection {
  id: string;
  pitchClasses: number[];
  spellings: string[];
  centre: string;
}

interface LineNote {
  midi: number;
  pc: number;
  spelling: string;
  duration: number;
}

interface Slot {
  duration: number;
  pitches: number[];
  spellings: string[];
  surface: HexatonicSurface;
}

export function outsideScalarId(homeId: string): string {
  const outside = OUTSIDE_SCALAR[homeId];
  if (!outside) throw new Error(`no outside collection for ${homeId}`);
  return outside;
}

export function transposedScalarOrder(id: string, semitones: number): OrderedCollection {
  const row = getHexatonicScalar(id);
  if (!row) throw new Error(`unknown hexatonic scalar ${id}`);
  const steps = mod12(semitones);
  const centre = tonicName(row.referenceSpelling[0]!, steps);
  const origin = parseNoteToken(row.referenceSpelling[0]!)!;
  const originLetter = LETTERS.indexOf(origin.letter as (typeof LETTERS)[number]);
  const intervals = row.referenceSpelling.map((token) => mod12(parseNoteToken(token)!.pc - origin.pc));
  const letterSteps = row.referenceSpelling.map((token) => {
    const letter = parseNoteToken(token)!.letter;
    return (LETTERS.indexOf(letter as (typeof LETTERS)[number]) - originLetter + 7) % 7;
  });
  const spellings = spellFromReference(centre, intervals, letterSteps);
  const pitchClasses = spellings.map((token) => {
    const parsed = parseNoteToken(token);
    if (!parsed) throw new Error(`hexatonic spelling ${token} failed`);
    return parsed.pc;
  });
  if (canonicalPitchSet(pitchClasses).length !== 6) throw new Error(`${id} collapsed at centre ${centre}`);
  return { id, pitchClasses, spellings, centre };
}

function tonicName(first: string, semitones: number): string {
  const parsed = parseNoteToken(first);
  if (!parsed) throw new Error(`tonic ${first} is not a note`);
  const pc = mod12(parsed.pc + semitones);
  const natural = parseNoteToken(parsed.letter)!.pc;
  const delta = accidentalDelta(pc, natural);
  if (Math.abs(delta) > 2) return sharpName(pc);
  const mark = delta === 0 ? '' : delta === 1 ? '#' : delta === 2 ? '##' : delta === -1 ? 'b' : 'bb';
  return `${parsed.letter}${mark}`;
}

function mix(seed: number, label: string): number {
  let hash = (seed >>> 0) || 1;
  for (let index = 0; index < label.length; index += 1) {
    hash ^= label.charCodeAt(index)!;
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0 || 1;
}

function viewOf(collection: OrderedCollection): PentatonicCollectionView {
  return {
    name: collection.id,
    archetypeId: collection.id,
    referenceNote: collection.centre,
    homeRelationshipLabel: null,
    orderedPitchClasses: collection.pitchClasses,
  };
}

function midiNear(pc: number, anchor: number, low: number, high: number): number {
  let best = low;
  let distance = 999;
  for (let midi = low; midi <= high; midi += 1) {
    if (mod12(midi) !== mod12(pc)) continue;
    const gap = Math.abs(midi - anchor);
    if (gap < distance) {
      distance = gap;
      best = midi;
    }
  }
  return best;
}

function bassMidi(pc: number): number {
  return midiNear(pc, 40, BASS_LOW, BASS_HIGH);
}

function lineFromDegrees(degrees: readonly number[], collection: OrderedCollection, durations: readonly number[]): LineNote[] {
  let anchor = 64;
  return degrees.map((degree, index) => {
    const pc = collection.pitchClasses[degree];
    const spelling = collection.spellings[degree];
    if (pc === undefined || spelling === undefined) throw new Error(`${collection.id} has no degree ${degree}`);
    const midi = midiNear(pc, anchor, 52, 76);
    anchor = midi;
    return { midi, pc, spelling, duration: durations[index]! };
  });
}

function mapLine(
  line: readonly LineNote[],
  source: OrderedCollection,
  target: OrderedCollection,
  method: MotifMapMethod
): { line: LineNote[]; commonToneRetentions: number; scaleRunValid: boolean } {
  let beat = 0;
  const motif: BaseMotif = {
    id: `${source.id}->${target.id}`,
    barCount: 1,
    notes: line.map((note) => {
      const startBeat = beat;
      beat += note.duration;
      return { pitch: note.midi, startBeat, duration: note.duration };
    }),
  };
  const mapped = mapMotifPitches({
    motif,
    rhythm: motif.notes.map((note) => ({ kind: 'note' as const, startBeat: note.startBeat, duration: note.duration })),
    source: viewOf(source),
    target: viewOf(target),
    method,
    meter: { beats: 4, beatType: 4 },
  });
  const next = mapped.notes.map((note, index) => {
    const pc = mod12(note.pitch);
    const degree = target.pitchClasses.findIndex((pitchClass) => pitchClass === pc);
    const spelling = degree >= 0 ? target.spellings[degree]! : sharpName(pc);
    return { midi: note.pitch, pc, spelling, duration: line[index]!.duration };
  });
  return { line: next, commonToneRetentions: mapped.commonToneRetentions.length, scaleRunValid: mapped.scaleRun.valid };
}

function snapNearest(note: LineNote, collection: OrderedCollection): LineNote {
  const tone = nearestTone(note.midi, collection.pitchClasses);
  if (note.pc === tone.to) return note;
  const midi = midiNear(tone.to, note.midi, Math.max(40, note.midi - 6), Math.min(88, note.midi + 6));
  const degree = collection.pitchClasses.findIndex((pitchClass) => pitchClass === tone.to);
  return {
    midi,
    pc: tone.to,
    spelling: degree >= 0 ? collection.spellings[degree]! : sharpName(tone.to),
    duration: note.duration,
  };
}

function shiftRegister(midi: number): { midi: number; semitones: number } {
  if (inGuitarRange(midi + 12)) return { midi: midi + 12, semitones: 12 };
  if (inGuitarRange(midi - 12)) return { midi: midi - 12, semitones: -12 };
  throw new Error(`register shift left guitar range at ${midi}`);
}

function repairDisplacement(line: LineNote[], home: readonly number[], outside: OrderedCollection): { line: LineNote[]; repaired: boolean } {
  const homeSet = new Set(canonicalPitchSet(home));
  if (line.some((note) => !homeSet.has(note.pc))) return { line, repaired: false };
  const foreign = outside.pitchClasses.filter((pitchClass) => !homeSet.has(pitchClass));
  if (foreign.length === 0) throw new Error(`${outside.id} does not leave home`);
  const last = line[line.length - 1]!;
  let best = foreign[0]!;
  let distance = 99;
  for (const pitchClass of foreign) {
    const gap = Math.min((pitchClass - last.pc + 12) % 12, (last.pc - pitchClass + 12) % 12);
    if (gap < distance) {
      distance = gap;
      best = pitchClass;
    }
  }
  const degree = outside.pitchClasses.indexOf(best);
  const midi = midiNear(best, last.midi, 52, 76);
  const next = line.map((note, index) =>
    index === line.length - 1
      ? { midi, pc: best, spelling: outside.spellings[degree] ?? sharpName(best), duration: note.duration }
      : note
  );
  return { line: next, repaired: true };
}

export function guitarFretSpan(midis: readonly number[]): { ok: boolean; span: number } {
  if (midis.length <= 1) return { ok: true, span: 0 };
  if (midis.length > 3) return { ok: false, span: 99 };
  const options = midis.map((midi) => {
    const row: { stringIndex: number; fret: number }[] = [];
    GUITAR_STRINGS.forEach((open, stringIndex) => {
      const fret = midi - open;
      if (fret >= 0 && fret <= 18) row.push({ stringIndex, fret });
    });
    return row;
  });
  if (options.some((row) => row.length === 0)) return { ok: false, span: 99 };
  let best = 99;
  const walk = (index: number, used: number, low: number, high: number) => {
    if (index > 0 && high - low > 4) return;
    if (index === midis.length) {
      best = Math.min(best, high - low);
      return;
    }
    for (const choice of options[index]!) {
      const bit = 1 << choice.stringIndex;
      if (used & bit) continue;
      const nextLow = index === 0 ? choice.fret : Math.min(low, choice.fret);
      const nextHigh = index === 0 ? choice.fret : Math.max(high, choice.fret);
      if (nextHigh - nextLow > 4) continue;
      walk(index + 1, used | bit, nextLow, nextHigh);
    }
  };
  walk(0, 0, 0, 0);
  return { span: best, ok: best <= 4 };
}

function placeChord(pcs: readonly number[], spellings: readonly string[]): { pitches: number[]; spellings: string[] } {
  const pools = pcs.map((pc) => {
    const midis: number[] = [];
    for (let midi = 48; midi <= 84; midi += 1) if (mod12(midi) === mod12(pc)) midis.push(midi);
    return midis;
  });
  let best: { pitches: number[]; span: number; spread: number } | null = null;
  const choose = (index: number, acc: number[]) => {
    if (index === pools.length) {
      const found = guitarFretSpan(acc);
      if (!found.ok) return;
      const spread = Math.max(...acc) - Math.min(...acc);
      if (!best || found.span < best.span || (found.span === best.span && spread < best.spread)) {
        best = { pitches: [...acc], span: found.span, spread };
      }
      return;
    }
    for (const midi of pools[index]!) choose(index + 1, [...acc, midi]);
  };
  choose(0, []);
  if (!best) throw new Error(`no four-fret guitar voicing for ${pcs.join(',')}`);
  const chosen = best.pitches;
  const used = spellings.map((spelling, index) => ({ spelling, pc: mod12(pcs[index]!) }));
  const ordered = chosen.map((pitch) => {
    const pc = mod12(pitch);
    const match = used.find((item) => item.pc === pc);
    return { pitch, spelling: match?.spelling ?? sharpName(pc) };
  });
  return { pitches: ordered.map((note) => note.pitch), spellings: ordered.map((note) => note.spelling) };
}

function fragmentSlots(line: readonly LineNote[]): Slot[] {
  const body = (line.length >= 3 ? line.slice(0, -1) : line.slice(0, 1)).map((note) => ({ ...note }));
  const last = body[body.length - 1];
  if (last && last.duration >= 1) last.duration -= 0.5;
  const sounding = body.reduce((sum, note) => sum + note.duration, 0);
  const trailing = 4 - 0.5 - sounding;
  if (trailing < -1e-6) throw new Error('fragment does not fit the bar');
  const slots: Slot[] = [{ duration: 0.5, pitches: [], spellings: [], surface: 'rest' }];
  for (const note of body) {
    slots.push({ duration: note.duration, pitches: [note.midi], spellings: [note.spelling], surface: 'melody' });
  }
  if (trailing > 1e-6) slots.push({ duration: roundBeat(trailing), pitches: [], spellings: [], surface: 'rest' });
  return slots;
}

function roundBeat(value: number): number {
  return Math.round(value * 2) / 2;
}

function melodySlots(line: readonly LineNote[]): Slot[] {
  return line.map((note) => ({
    duration: note.duration,
    pitches: [note.midi],
    spellings: [note.spelling],
    surface: 'melody' as const,
  }));
}

function restSlot(duration: number): Slot {
  return { duration, pitches: [], spellings: [], surface: 'rest' };
}

function bassSlot(duration: number, midi: number, spelling: string): Slot {
  return { duration, pitches: [midi], spellings: [spelling], surface: 'bass' };
}

function lay(slots: readonly Slot[], part: 'guitar' | 'bass'): HexatonicAttack[] {
  let beat = 0;
  const attacks = slots.map((slot) => {
    const attack: HexatonicAttack = {
      part,
      startBeat: roundBeat(beat),
      duration: roundBeat(slot.duration),
      pitches: slot.pitches,
      spellings: slot.spellings,
      pitchClasses: slot.pitches.map((pitch) => mod12(pitch)),
      surface: slot.surface,
    };
    beat += slot.duration;
    return attack;
  });
  if (Math.abs(beat - 4) > 1e-6) throw new Error(`${part} bar sums to ${beat}`);
  return attacks;
}

function maxChain(pcs: readonly number[], ordered: readonly number[]): number {
  const size = ordered.length;
  let run = 1;
  let max = pcs.length > 0 ? 1 : 0;
  for (let index = 1; index < pcs.length; index += 1) {
    const left = ordered.indexOf(mod12(pcs[index - 1]!));
    const right = ordered.indexOf(mod12(pcs[index]!));
    if (left < 0 || right < 0) {
      run = 1;
      continue;
    }
    const gap = Math.abs(left - right);
    const step = Math.min(gap, size - gap) === 1;
    run = step ? run + 1 : 1;
    if (run > max) max = run;
  }
  return max;
}

function coverPair(ordered: number[], spellings: string[], used: readonly number[]): { pitches: number[]; spellings: string[] } {
  const missing = ordered.filter((pc) => !used.includes(pc));
  const second = ordered.find((pc) => pc !== missing[0]) ?? ordered[0]!;
  const pcs = missing.length >= 2 ? missing.slice(0, 2) : missing.length === 1 ? [missing[0]!, second] : [ordered[0]!, ordered[Math.min(2, ordered.length - 1)]!];
  const names = pcs.map((pc) => {
    const index = ordered.indexOf(pc);
    return spellings[index] ?? sharpName(pc);
  });
  return placeChord(pcs, names);
}

function spell(note: Spelled): string {
  return spellName(note);
}

export function generateHexatonicPhrase(request: HexatonicPhraseRequest): HexatonicPhrase {
  if (!Number.isInteger(request.centre) || request.centre < 0 || request.centre > 11) {
    throw new Error('hexatonic centre must be an integer from 0 to 11');
  }
  if (!Number.isInteger(request.seed)) throw new Error('hexatonic seed must be an integer');
  const scalar = Boolean(request.scalarId);
  const wps = Boolean(request.wpsId);
  if (scalar === wps) throw new Error('choose one hexatonic scalar or one WPS pair');
  return scalar ? generateScalar(request) : generateWps(request);
}

function generateScalar(request: HexatonicPhraseRequest): HexatonicPhrase {
  const homeId = request.scalarId!;
  const outsideId = outsideScalarId(homeId);
  const home = transposedScalarOrder(homeId, request.centre);
  const outside = transposedScalarOrder(outsideId, request.centre);
  const method: MotifMapMethod = request.method ?? (request.seed % 2 === 0 ? 'M-DEG' : 'M-NEAR');
  const named = scalarTriadsAt(homeId, rootSpelled(request.centre));
  const shapes = named ? NAMED_TRIAD_SHAPES : SCALAR_SHAPES;
  const degrees = shapes[mix(request.seed, homeId) % shapes.length]!;
  const rhythm = RHYTHMS[degrees.length]![mix(request.seed, `${homeId}:rhythm`) % RHYTHMS[degrees.length]!.length]!;
  const cell = lineFromDegrees(degrees, home, rhythm);
  const developed = mapLine(cell, home, outside, method);
  const displaced = repairDisplacement(developed.line, home.pitchClasses, outside);
  const shared = canonicalPitchSet(home.pitchClasses).filter((pc) => outside.pitchClasses.includes(pc));
  const returnMethod: MotifMapMethod = shared.length === 0 ? 'M-NEAR' : 'M-DEG';
  const returned = mapLine(displaced.line, outside, home, returnMethod);
  let returnLine = returnMethod === 'M-NEAR' ? returned.line.map((note) => snapNearest(note, home)) : returned.line;
  const shifted = shiftRegister(returnLine[returnLine.length - 1]!.midi);
  returnLine = returnLine.map((note, index) =>
    index === returnLine.length - 1 ? { ...note, midi: shifted.midi } : note
  );
  const upper = named?.[1];
  const returnChord = upper
    ? placeChord([...upper.pitchClasses], [...upper.spelling])
    : placeChord(
        [0, 2, 4].map((degree) => home.pitchClasses[degree]!),
        [0, 2, 4].map((degree) => home.spellings[degree]!)
      );
  const outsideDyad = coverPair(outside.pitchClasses, outside.spellings, []);
  const bassRoot = bassMidi(home.pitchClasses[0]!);
  const bassMove = bassMidi(home.pitchClasses[3]!);
  const rootSpelling = home.spellings[0]!;
  const moveSpelling = home.spellings[3]!;
  const bars = assemble({
    homeId,
    outsideId,
    centre: home.centre,
    source: `scalar ${homeId}`,
    inside: melodySlots(cell),
    fragment: fragmentSlots(cell),
    outside: melodySlots(displaced.line),
    outsideChord: outsideDyad,
    returning: melodySlots(returnLine),
    returnChord,
    bassRoot,
    bassRootSpelling: rootSpelling,
    bassMove,
    bassMoveSpelling: moveSpelling,
  });
  assertChains(bars, home.pitchClasses, outside.pitchClasses);
  const landing = symmetryLandingId(homeId, request.centre);
  return finish({
    request,
    family: 'scalar',
    homeId,
    outsideId,
    centreName: home.centre,
    developmentMethod: method,
    returnMethod,
    displacementRepair: displaced.repaired,
    cellDegrees: degrees,
    parentSymbol: null,
    harrisLabel: null,
    provenance: 'h1-scalar',
    resolutionQuality: named?.[0]?.quality ?? null,
    tensionQuality: named?.[1]?.quality ?? null,
    resolutionSpelling: named ? [...named[0]!.spelling] : null,
    tensionSpelling: named ? [...named[1]!.spelling] : null,
    shellOutsideUnion: [],
    symmetryLandingId: landing,
    bars,
    homePcs: home.pitchClasses,
    outsidePcs: outside.pitchClasses,
    commonToneRetentions: returned.commonToneRetentions,
    nearestTone: returnMethod === 'M-NEAR',
    registerSemitones: shifted.semitones,
  });
}

function generateWps(request: HexatonicPhraseRequest): HexatonicPhrase {
  const wpsId = request.wpsId!;
  const root = rootSpelled(request.centre);
  const pair = transposeHexatonicWpsPair(wpsId, root);
  const stored = getHexatonicWpsPair(wpsId);
  if (!stored) throw new Error(`unknown WPS pair ${wpsId}`);
  const resolution = orderedTriad(`${wpsId}:resolution`, pair.resolution.pitchClasses, pair.resolution.spelling, spell(root));
  const tension = orderedTriad(`${wpsId}:tension`, pair.tension.pitchClasses, pair.tension.spelling, spell(root));
  const method: MotifMapMethod = request.method ?? (request.seed % 2 === 0 ? 'M-DEG' : 'M-NEAR');
  const degrees = WPS_SHAPES[mix(request.seed, wpsId) % WPS_SHAPES.length]!;
  const rhythm = RHYTHMS[degrees.length]![mix(request.seed, `${wpsId}:rhythm`) % RHYTHMS[degrees.length]!.length]!;
  const cell = lineFromDegrees(degrees, resolution, rhythm);
  const developed = mapLine(cell, resolution, tension, method);
  const displaced = repairDisplacement(developed.line, resolution.pitchClasses, tension);
  const returned = mapLine(displaced.line, tension, resolution, 'M-NEAR');
  let returnLine = returned.line.map((note) => snapNearest(note, resolution));
  const shifted = shiftRegister(returnLine[returnLine.length - 1]!.midi);
  returnLine = returnLine.map((note, index) =>
    index === returnLine.length - 1 ? { ...note, midi: shifted.midi } : note
  );
  const outsideDyad = coverPair(
    tension.pitchClasses,
    tension.spellings,
    displaced.line.map((note) => note.pc)
  );
  const returnChord = placeChord(resolution.pitchClasses, resolution.spellings);
  const rootPc = pitchClassOf(root);
  const shell = pair.shellOutsideUnion[0];
  const bassRoot = bassMidi(rootPc);
  const bassMove = shell === undefined ? (bassRoot + 12 <= BASS_HIGH ? bassRoot + 12 : bassRoot - 12) : bassMidi(shell);
  const bars = assemble({
    homeId: resolution.id,
    outsideId: tension.id,
    centre: resolution.centre,
    source: `${pair.provenance} · parent ${stored.parentSymbol} · ${pair.resolution.quality} / ${pair.tension.quality}`,
    inside: melodySlots(cell),
    fragment: fragmentSlots(cell),
    outside: melodySlots(displaced.line),
    outsideChord: outsideDyad,
    returning: melodySlots(returnLine),
    returnChord,
    bassRoot,
    bassRootSpelling: spell(root),
    bassMove,
    bassMoveSpelling: shell === undefined ? spell(root) : sharpName(shell),
  });
  assertChains(bars, pair.pitchClasses, pair.pitchClasses);
  exchangeTriads(pair.resolution.input, pair.tension.input);
  return finish({
    request,
    family: 'wps-pair',
    homeId: wpsId,
    outsideId: `${wpsId}:tension`,
    centreName: resolution.centre,
    developmentMethod: method,
    returnMethod: 'M-NEAR',
    displacementRepair: displaced.repaired,
    cellDegrees: degrees,
    parentSymbol: stored.parentSymbol,
    harrisLabel: stored.harrisLabel,
    provenance: pair.provenance,
    resolutionQuality: pair.resolution.quality,
    tensionQuality: pair.tension.quality,
    resolutionSpelling: [...pair.resolution.spelling],
    tensionSpelling: [...pair.tension.spelling],
    shellOutsideUnion: [...pair.shellOutsideUnion],
    symmetryLandingId: null,
    bars,
    homePcs: resolution.pitchClasses,
    outsidePcs: tension.pitchClasses,
    commonToneRetentions: returned.commonToneRetentions,
    nearestTone: true,
    registerSemitones: shifted.semitones,
  });
}

function orderedTriad(id: string, pitchClasses: readonly number[], spelling: readonly string[], centre: string): OrderedCollection {
  return { id, pitchClasses: [...pitchClasses], spellings: [...spelling], centre };
}

function assemble(args: {
  homeId: string;
  outsideId: string;
  centre: string;
  source: string;
  inside: Slot[];
  fragment: Slot[];
  outside: Slot[];
  outsideChord: { pitches: number[]; spellings: string[] };
  returning: Slot[];
  returnChord: { pitches: number[]; spellings: string[] };
  bassRoot: number;
  bassRootSpelling: string;
  bassMove: number;
  bassMoveSpelling: string;
}): HexatonicPhraseBar[] {
  const plans: { role: HexatonicPhraseBar['role']; id: string; guitar: Slot[]; bass: Slot[] }[] = [
    { role: 'inside', id: args.homeId, guitar: args.inside, bass: [bassSlot(4, args.bassRoot, args.bassRootSpelling)] },
    { role: 'inside', id: args.homeId, guitar: args.fragment, bass: [restSlot(4)] },
    { role: 'outside', id: args.outsideId, guitar: args.outside, bass: [bassSlot(4, args.bassRoot, args.bassRootSpelling)] },
    {
      role: 'outside',
      id: args.outsideId,
      guitar: [restSlot(2), { duration: 2, pitches: args.outsideChord.pitches, spellings: args.outsideChord.spellings, surface: args.outsideChord.pitches.length === 3 ? 'triad' : 'dyad' }],
      bass: [bassSlot(1, args.bassRoot, args.bassRootSpelling), bassSlot(1, args.bassMove, args.bassMoveSpelling), restSlot(2)],
    },
    { role: 'return', id: args.homeId, guitar: args.returning, bass: [bassSlot(4, args.bassRoot, args.bassRootSpelling)] },
    {
      role: 'return',
      id: args.homeId,
      guitar: [restSlot(2), { duration: 2, pitches: args.returnChord.pitches, spellings: args.returnChord.spellings, surface: 'triad' }],
      bass: [bassSlot(2, args.bassRoot, args.bassRootSpelling), restSlot(2)],
    },
  ];
  return plans.map((plan, index) => ({
    index: index + 1,
    role: plan.role,
    collectionId: plan.id,
    direction:
      index === 0
        ? 'INSIDE'
        : index === 2
          ? 'OUTSIDE'
          : index === 4
            ? 'RETURN'
            : index === 5
              ? `${args.homeId} · ${args.outsideId} · centre ${args.centre} · ${args.source}`
              : '',
    attacks: [...lay(plan.guitar, 'guitar'), ...lay(plan.bass, 'bass')],
  }));
}

function assertChains(bars: readonly HexatonicPhraseBar[], home: readonly number[], outside: readonly number[]): void {
  const melody = (indexes: number[], ordered: readonly number[]) => {
    const pcs = indexes.flatMap((index) =>
      bars[index]!.attacks.filter((attack) => attack.part === 'guitar' && attack.surface === 'melody').flatMap((attack) => attack.pitchClasses)
    );
    if (maxChain(pcs, ordered) >= 4) throw new Error('hexatonic phrase ran the collection');
  };
  melody([0, 1], home);
  melody([2], outside);
  melody([4], home);
}

function finish(args: {
  request: HexatonicPhraseRequest;
  family: HexatonicPhrase['family'];
  homeId: string;
  outsideId: string;
  centreName: string;
  developmentMethod: MotifMapMethod;
  returnMethod: MotifMapMethod;
  displacementRepair: boolean;
  cellDegrees: readonly number[];
  parentSymbol: string | null;
  harrisLabel: string | null;
  provenance: string;
  resolutionQuality: VaultTriadQuality | null;
  tensionQuality: VaultTriadQuality | null;
  resolutionSpelling: readonly string[] | null;
  tensionSpelling: readonly string[] | null;
  shellOutsideUnion: readonly number[];
  symmetryLandingId: string | null;
  bars: HexatonicPhraseBar[];
  homePcs: readonly number[];
  outsidePcs: readonly number[];
  commonToneRetentions: number;
  nearestTone: boolean;
  registerSemitones: number;
}): HexatonicPhrase {
  const guitar = (role: HexatonicPhraseBar['role']) =>
    args.bars.filter((bar) => bar.role === role).flatMap((bar) => bar.attacks.filter((attack) => attack.part === 'guitar' && attack.pitches.length > 0));
  const member = (role: HexatonicPhraseBar['role'], allowed: readonly number[]) => {
    const set = new Set(canonicalPitchSet(allowed));
    const notes = guitar(role);
    return notes.length > 0 && notes.every((attack) => attack.pitchClasses.every((pc) => set.has(pc)));
  };
  const outsideNotes = guitar('outside');
  const outsideOnly = new Set(
    outsideNotes.flatMap((attack) => attack.pitchClasses).filter((pc) => !args.homePcs.includes(pc))
  );
  if (outsideOnly.size === 0) throw new Error(`${args.homeId} outside phrase stayed inside`);
  for (const attack of args.bars.flatMap((bar) => bar.attacks)) {
    if (attack.part === 'guitar' && attack.pitches.length > 3) throw new Error('guitar wrote more than three notes');
    if (attack.part === 'guitar' && attack.pitches.length > 1) {
      const span = guitarFretSpan(attack.pitches);
      if (!span.ok) throw new Error(`guitar span ${span.span} at bar ${attack.startBeat}`);
    }
    if (attack.part === 'guitar' && attack.pitches.some((pitch) => !inGuitarRange(pitch))) {
      throw new Error('guitar pitch left E2–E6');
    }
    if (attack.part === 'bass' && attack.pitches.some((pitch) => pitch < BASS_LOW || pitch > BASS_HIGH)) {
      throw new Error('bass pitch left E1–G3');
    }
  }
  const distance = measureHexatonicDistance(args.homePcs, args.outsidePcs);
  const cell = args.bars[0]!.attacks.filter((attack) => attack.part === 'guitar' && attack.surface === 'melody');
  const restated = args.bars[4]!.attacks.filter((attack) => attack.part === 'guitar' && attack.surface === 'melody');
  const cellPcs = cell.map((attack) => attack.pitchClasses[0]!);
  const returnPcs = restated.map((attack) => attack.pitchClasses[0]!);
  const sharedReturn = cellPcs.filter((pc) => returnPcs.includes(pc)).length;
  const rhythmRestated =
    cell.length === restated.length &&
    cell.every((attack, index) => attack.duration === restated[index]!.duration && attack.startBeat === restated[index]!.startBeat);
  const rests = args.bars.flatMap((bar) => bar.attacks).filter((attack) => attack.pitches.length === 0);
  const guitarNotes = args.bars.flatMap((bar) => bar.attacks).filter((attack) => attack.part === 'guitar' && attack.pitches.length > 0);
  const guitarMidis = guitarNotes.flatMap((attack) => attack.pitches);
  const simultaneous = Math.max(...guitarNotes.map((attack) => attack.pitches.length));
  const spans = guitarNotes.filter((attack) => attack.pitches.length > 1).map((attack) => guitarFretSpan(attack.pitches).span);
  const fragmentCount = args.bars[1]!.attacks.filter((attack) => attack.part === 'guitar' && attack.surface === 'melody').length;
  const transformations = [
    fragmentCount < cell.length ? 'fragmentation' : '',
    'rhythmic-displacement',
    'register-change',
    args.developmentMethod,
    args.returnMethod,
    guitarNotes.some((attack) => attack.surface === 'dyad') ? 'dyad' : '',
    guitarNotes.some((attack) => attack.surface === 'triad') ? 'triad' : '',
    rests.length > 0 ? 'rest' : '',
    rhythmRestated ? 'cell-restatement' : '',
  ].filter(Boolean);
  const bmef: HexatonicBmef = {
    name: 'BMEF',
    role: 'descriptive',
    artisticApproval: false,
    humanPlayability: 'NOT VERIFIED',
    note: 'Descriptive H3 measures for motif, density, register, collection, displacement, return, and guitar constraints. Not artistic approval. No Black Aura BMEF score is issued.',
    motifRecurrence: {
      cellNotes: cell.length,
      returnNotes: restated.length,
      sharedPitchClasses: sharedReturn,
      rhythmRestated,
    },
    transformations,
    noteDensityPerBar: guitarNotes.length / args.bars.length,
    restCount: rests.length,
    restBeats: rests.reduce((sum, attack) => sum + attack.duration, 0),
    phraseBars: args.bars.length,
    phraseBeats: args.bars.length * 4,
    registerSpan: Math.max(...guitarMidis) - Math.min(...guitarMidis),
    registerChanged: args.registerSemitones !== 0,
    collectionMembership: {
      inside: member('inside', args.family === 'wps-pair' ? args.homePcs : args.homePcs),
      outside: member('outside', args.outsidePcs),
      return: member('return', args.family === 'wps-pair' ? args.homePcs : args.homePcs),
    },
    harmonicDisplacement: {
      outsideOnlyPitchClasses: outsideOnly.size,
      distanceClass: distance.distanceClass,
      sharedPitchClasses: distance.sharedCount,
    },
    returnEvidence: {
      method: args.returnMethod,
      commonToneRetentions: args.commonToneRetentions,
      nearestTone: args.nearestTone,
      registerOrRhythmChange: args.registerSemitones !== 0,
      homeRecovered: member('return', args.family === 'wps-pair' ? args.homePcs : args.homePcs),
    },
    guitar: {
      maxSimultaneous: simultaneous,
      maxFretSpan: spans.length > 0 ? Math.max(...spans) : 0,
      sixNoteChords: guitarNotes.filter((attack) => new Set(attack.pitchClasses).size >= 6).length,
      inRange: guitarMidis.every((pitch) => inGuitarRange(pitch)),
    },
  };
  if (!bmef.collectionMembership.inside || !bmef.collectionMembership.outside || !bmef.collectionMembership.return) {
    throw new Error('phrase left its collection');
  }
  if (!bmef.motifRecurrence.rhythmRestated || !bmef.returnEvidence.homeRecovered) throw new Error('return did not restate the cell');
  if (!bmef.transformations.includes('fragmentation') || !bmef.transformations.includes('dyad') || !bmef.transformations.includes('triad')) {
    throw new Error('phrase missed a required surface');
  }
  const phrase: HexatonicPhrase = {
    version: HEXATONIC_PHRASE_VERSION,
    seed: args.request.seed,
    centre: args.request.centre,
    centreName: args.centreName,
    family: args.family,
    homeId: args.homeId,
    outsideId: args.outsideId,
    developmentMethod: args.developmentMethod,
    returnMethod: args.returnMethod,
    displacementRepair: args.displacementRepair,
    cellDegrees: args.cellDegrees,
    parentSymbol: args.parentSymbol,
    harrisLabel: args.harrisLabel,
    provenance: args.provenance,
    resolutionQuality: args.resolutionQuality,
    tensionQuality: args.tensionQuality,
    resolutionSpelling: args.resolutionSpelling,
    tensionSpelling: args.tensionSpelling,
    shellOutsideUnion: args.shellOutsideUnion,
    symmetryLandingId: args.symmetryLandingId,
    bars: args.bars,
    bmef,
    musicXml: '',
  };
  phrase.musicXml = hexatonicPhraseToMusicXml({
    ...phrase,
    title: args.family === 'wps-pair' ? `Hexatonic WPS ${args.homeId} ${args.centreName}` : `Hexatonic ${args.homeId} ${args.centreName}`,
  });
  return phrase;
}
