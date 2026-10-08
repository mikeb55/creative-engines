/**
 * Piece-agnostic triad-pair helper.
 * Validates spelled major, minor, augmented and diminished triads,
 * describes their relationship, and searches a short playable guitar realisation.
 * Not a Tonality Vault row and not a global harmonic rule.
 */

import { midiOf, stoppedSpan, V8B_OPEN_STRING_MIDI } from './wwhBlackAuraV8bRecipe';

export const TRIAD_PAIR_SEARCH = {
  maxVoicingsPerEvent: 24,
  beamWidth: 8,
  finalCandidates: 3,
  maxFret: 7,
  maxStoppedSpan: 3,
} as const;

const NATURAL: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const DEGREES = ['root', 'third', 'fifth'] as const;
const QUALITY_INTERVALS = {
  major: { third: 4, fifth: 7 },
  minor: { third: 3, fifth: 7 },
  augmented: { third: 4, fifth: 8 },
  diminished: { third: 3, fifth: 6 },
} as const;

export type TriadQuality = keyof typeof QUALITY_INTERVALS;
export type TriadProvenance = 'user' | 'Vault' | 'suggested';
export type TriadDegree = (typeof DEGREES)[number];
export type LiquidDuration = 'whole' | 'half' | 'quarter' | 'quarter.' | 'eighth';

export interface ParentTriadInput {
  id?: string;
  rootSpelling: string;
  quality: TriadQuality;
  notes: [string, string, string];
  pitchClasses: [number, number, number];
  provenance: TriadProvenance;
}

export interface SpelledTone {
  spelling: string;
  step: string;
  alter: number;
  pc: number;
  degree: TriadDegree;
}

export interface ValidatedTriad {
  id: string;
  rootSpelling: string;
  quality: TriadQuality;
  notes: [SpelledTone, SpelledTone, SpelledTone];
  pitchClasses: [number, number, number];
  provenance: TriadProvenance;
}

export interface ContextualTone {
  role: 'melody' | 'bass';
  printed: string;
  sounding: string;
  step: string;
  alter: number;
  soundingMidi: number;
}

export interface PairContext {
  tones: readonly ContextualTone[];
  printedHarmony?: readonly string[];
}

export interface ChromaticLink {
  from: string;
  to: string;
  semitones: number;
}

export interface RelationshipAnalysis {
  sharedPitchClasses: number[];
  identicalCommonTones: string[];
  enharmonicEquivalents: Array<{ left: string; right: string; pitchClass: number }>;
  chromaticDistances: ChromaticLink[];
  retainedCandidates: string[];
  movingCandidates: ChromaticLink[];
  melody: string[];
  bass: string[];
  /** Three clauses each: harmonic fact → possible musical use → caution. */
  advice: string[];
}

export interface FretPlacement {
  name: string;
  step: string;
  alter: number;
  octave: number;
  midi: number;
  stringNumber: number;
  fret: number;
  parents: string[];
  spelling: string;
}

export interface LiquidSlot {
  bar: number;
  duration: LiquidDuration;
  rest: boolean;
  kind?: 'resolution' | 'connect' | 'move' | 'hinge' | 'single';
  singleIndex?: number;
}

export interface PairVoicing {
  id: string;
  role: 'resolution_fragment' | 'tension_fragment' | 'retained' | 'mixed_fragment' | 'single';
  points: FretPlacement[];
  stoppedSpan: number;
}

export interface VoiceMovement {
  fromId: string;
  toId: string;
  held: Array<{ name: string; stringNumber: number; fret: number; midi: number }>;
  moved: Array<{
    from: string;
    to: string;
    semitones: number;
    stringNumber: number;
    fromFret: number;
    toFret: number;
  }>;
}

export interface RealizationEvent {
  bar: number;
  duration: LiquidDuration;
  rest: boolean;
  voicing: PairVoicing | null;
}

export interface TriadPairRealization {
  seed: number;
  resolution: ValidatedTriad;
  tension: ValidatedTriad;
  analysis: RelationshipAnalysis;
  events: RealizationEvent[];
  movements: VoiceMovement[];
  finalists: Array<{ rank: number; score: number; attacks: string[] }>;
  consideredPerEvent: number[];
  pathsKeptPerStep: number[];
  densityReduced: boolean;
  search: typeof TRIAD_PAIR_SEARCH;
  feasibility: 'automated';
  humanPlayability: 'NOT VERIFIED';
}

interface Tone {
  spelling: string;
  step: string;
  alter: number;
  pc: number;
  parentIds: string[];
  degrees: Array<{ parentId: string; degree: TriadDegree }>;
}

interface Pos extends FretPlacement {
  tone: Tone;
}

function mod12(value: number): number {
  return ((value % 12) + 12) % 12;
}

export function accidentalText(alter: number): string {
  if (alter === 0) return '';
  if (alter < 0) return 'b'.repeat(-alter);
  return '#'.repeat(alter);
}

export function parseSpelledPitch(token: string): { spelling: string; step: string; alter: number; pc: number } {
  const match = /^([A-G])([b#]*)$/.exec(token.trim());
  if (!match) throw new Error(`bad pitch spelling ${token}`);
  const marks = match[2] ?? '';
  if (marks.includes('b') && marks.includes('#')) throw new Error(`mixed accidentals in ${token}`);
  const step = match[1]!;
  const alter = marks.includes('b') ? -marks.length : marks.length;
  const natural = NATURAL[step];
  if (natural === undefined) throw new Error(`bad step ${step}`);
  return { spelling: `${step}${accidentalText(alter)}`, step, alter, pc: mod12(natural + alter) };
}

/** Octave is the spelled octave, including B# and Cb, not the enharmonic letter. */
export function octaveForSpelling(step: string, alter: number, midi: number): number {
  const natural = NATURAL[step];
  if (natural === undefined) throw new Error(`bad step ${step}`);
  const raw = midi - natural - alter;
  if (raw % 12 !== 0) throw new Error(`${step}${accidentalText(alter)} is not midi ${midi}`);
  return raw / 12 - 1;
}

export function pitchName(step: string, alter: number, octave: number): string {
  return `${step}${accidentalText(alter)}${octave}`;
}

function idFor(root: string, quality: TriadQuality): string {
  return `${root.replace(/#/g, 's')}_${quality}`;
}

function letterDistance(from: string, to: string): number {
  const letters = 'CDEFGAB';
  const a = letters.indexOf(from);
  const b = letters.indexOf(to);
  if (a < 0 || b < 0) throw new Error(`bad letter ${from}${to}`);
  return (b - a + 7) % 7;
}

export function validateParentTriad(input: ParentTriadInput): ValidatedTriad {
  if (!QUALITY_INTERVALS[input.quality]) throw new Error(`bad triad quality ${input.quality}`);
  if (!['user', 'Vault', 'suggested'].includes(input.provenance)) {
    throw new Error(`bad provenance ${input.provenance}`);
  }
  if (input.pitchClasses.length !== 3 || input.notes.length !== 3) throw new Error('a triad has three notes');
  const root = parseSpelledPitch(input.rootSpelling);
  const notes = input.notes.map((token, index) => {
    const parsed = parseSpelledPitch(token);
    const degree = DEGREES[index];
    if (!degree) throw new Error('missing degree');
    if (!Number.isInteger(input.pitchClasses[index]) || input.pitchClasses[index]! < 0 || input.pitchClasses[index]! > 11) {
      throw new Error(`pitch class ${input.pitchClasses[index]} is outside 0–11`);
    }
    if (parsed.pc !== input.pitchClasses[index]) {
      throw new Error(`${parsed.spelling} is pitch class ${parsed.pc}, not ${input.pitchClasses[index]}`);
    }
    return { ...parsed, degree };
  }) as [SpelledTone, SpelledTone, SpelledTone];
  if (notes[0].spelling !== root.spelling) {
    throw new Error(`root spelling ${root.spelling} does not match ${notes[0].spelling}`);
  }
  const thirdSteps = letterDistance(notes[0].step, notes[1].step);
  const fifthSteps = letterDistance(notes[0].step, notes[2].step);
  if (thirdSteps !== 2 || fifthSteps !== 4) {
    throw new Error(`${notes.map((note) => note.spelling).join(' ')} is not spelled as a third plus a fifth`);
  }
  const expected = QUALITY_INTERVALS[input.quality];
  const third = mod12(notes[1].pc - notes[0].pc);
  const fifth = mod12(notes[2].pc - notes[0].pc);
  if (third !== expected.third || fifth !== expected.fifth) {
    throw new Error(`${input.quality} expects intervals ${expected.third}/${expected.fifth}, got ${third}/${fifth}`);
  }
  if (new Set(notes.map((note) => note.pc)).size !== 3) throw new Error('triad pitch classes are not distinct');
  return {
    id: input.id ?? idFor(root.spelling, input.quality),
    rootSpelling: root.spelling,
    quality: input.quality,
    notes,
    pitchClasses: [notes[0].pc, notes[1].pc, notes[2].pc],
    provenance: input.provenance,
  };
}

function signedDistance(from: number, to: number): number {
  let delta = mod12(to - from);
  if (delta > 6) delta -= 12;
  return delta;
}

function relationOf(tone: ContextualTone, resolution: ValidatedTriad, tension: ValidatedTriad): string {
  const inResolution = resolution.notes.some((note) => note.step === tone.step && note.alter === tone.alter);
  const inTension = tension.notes.some((note) => note.step === tone.step && note.alter === tone.alter);
  if (inResolution && inTension) return `${tone.sounding} is spelled in both parents`;
  if (inResolution) return `${tone.sounding} is spelled in ${resolution.id}`;
  if (inTension) return `${tone.sounding} is spelled in ${tension.id}`;
  const pc = mod12(tone.soundingMidi);
  const enharmonic = [...resolution.notes, ...tension.notes].find((note) => note.pc === pc);
  if (enharmonic) return `${tone.sounding} matches ${enharmonic.spelling} only as an enharmonic`;
  return `${tone.sounding} is outside both parents`;
}

export function analyzeTriadPair(
  resolutionInput: ParentTriadInput,
  tensionInput: ParentTriadInput,
  context?: PairContext
): RelationshipAnalysis {
  const resolution = validateParentTriad(resolutionInput);
  const tension = validateParentTriad(tensionInput);
  if (resolution.id === tension.id) throw new Error(`both parents are named ${resolution.id}`);
  const left = new Map(resolution.notes.map((note) => [note.spelling, note]));
  const right = new Map(tension.notes.map((note) => [note.spelling, note]));
  const identicalCommonTones = resolution.notes.filter((note) => right.has(note.spelling)).map((note) => note.spelling);
  const enharmonicEquivalents: RelationshipAnalysis['enharmonicEquivalents'] = [];
  for (const note of resolution.notes) {
    for (const other of tension.notes) {
      if (note.pc === other.pc && note.spelling !== other.spelling) {
        enharmonicEquivalents.push({ left: note.spelling, right: other.spelling, pitchClass: note.pc });
      }
    }
  }
  const sharedPitchClasses = resolution.pitchClasses.filter((pc) => tension.pitchClasses.includes(pc));
  const chromaticDistances: ChromaticLink[] = [];
  for (const note of resolution.notes) {
    for (const other of tension.notes) {
      chromaticDistances.push({
        from: note.spelling,
        to: other.spelling,
        semitones: signedDistance(note.pc, other.pc),
      });
    }
  }
  chromaticDistances.sort((a, b) => Math.abs(a.semitones) - Math.abs(b.semitones) || a.from.localeCompare(b.from));
  const movingCandidates = chromaticDistances.filter((link) => Math.abs(link.semitones) === 1 || Math.abs(link.semitones) === 2);
  const melody = (context?.tones ?? []).filter((tone) => tone.role === 'melody').map((tone) => relationOf(tone, resolution, tension));
  const bass = (context?.tones ?? []).filter((tone) => tone.role === 'bass').map((tone) => relationOf(tone, resolution, tension));
  return {
    sharedPitchClasses: [...sharedPitchClasses].sort((a, b) => a - b),
    identicalCommonTones,
    enharmonicEquivalents,
    chromaticDistances,
    retainedCandidates: identicalCommonTones,
    movingCandidates,
    melody,
    bass,
    advice: adviceLines(resolution, tension, identicalCommonTones, enharmonicEquivalents, sharedPitchClasses, movingCandidates, melody, bass, context?.printedHarmony ?? []),
  };
}

function listMotions(links: readonly ChromaticLink[], size: number): string {
  const chosen = links.filter((link) => Math.abs(link.semitones) === size);
  return chosen.map((link) => `${link.from} to ${link.to}`).join(', ');
}

function adviceLines(
  resolution: ValidatedTriad,
  tension: ValidatedTriad,
  common: readonly string[],
  enharmonics: RelationshipAnalysis['enharmonicEquivalents'],
  shared: readonly number[],
  moving: readonly ChromaticLink[],
  melody: readonly string[],
  bass: readonly string[],
  printedHarmony: readonly string[]
): string[] {
  let field: string;
  if (common.length) {
    field = `Identically spelled common tones: ${common.join(', ')}. Shared pitch classes: ${shared.join(', ')}. → Keep those spellings as retained voices where the grip can hold them. → A matching pitch class with a different spelling is not one of these retained voices.`;
  } else if (shared.length) {
    const pairs = enharmonics.map((item) => `${item.left}/${item.right}`).join(', ');
    field = `Shared pitch classes ${shared.join(', ')} are enharmonic only (${pairs}). No identically spelled common tone. → The sounding pitch can stay, with each parent's own spelling. → Do not call an enharmonic match a common tone.`;
  } else {
    field = `No shared pitch classes between ${resolution.rootSpelling} ${resolution.quality} and ${tension.rootSpelling} ${tension.quality}. → Mixed fragments can put one tone from each parent in the same grip. → A mixed grip is not either parent triad, and smoothness depends on register and fingering.`;
  }
  const semitone = listMotions(moving, 1);
  const whole = listMotions(moving, 2);
  const motionFact = semitone
    ? `One-semitone motions: ${semitone}.`
    : whole
      ? `No semitone link. Whole-step motions: ${whole}.`
      : 'No one- or two-semitone motion between parent tones.';
  const motion = `${motionFact} → Move one voice by that distance and keep another voice where the fingering allows it. → The distance is a fingering fact, not a prediction of how the music will feel.`;
  const printed = printedHarmony.length ? ` Printed symbols stay ${printedHarmony.join(' | ')}.` : '';
  const heard = melody.length || bass.length
    ? `Melody: ${melody.join('; ') || 'none supplied'}. Bass: ${bass.join('; ') || 'none supplied'}.${printed}`
    : 'No melody or bass events were supplied.';
  const events = `${heard} → Use spelled members as single notes inside the pair, and leave non-members out of the generated harmony. → Source melody, bass and printed symbols outside this realisation stay as written.`;
  return [field, motion, events];
}

function collectTones(resolution: ValidatedTriad, tension: ValidatedTriad): Tone[] {
  const map = new Map<string, Tone>();
  for (const parent of [resolution, tension]) {
    for (const note of parent.notes) {
      const existing = map.get(note.spelling);
      if (existing) {
        existing.parentIds.push(parent.id);
        existing.degrees.push({ parentId: parent.id, degree: note.degree });
      } else {
        map.set(note.spelling, {
          spelling: note.spelling,
          step: note.step,
          alter: note.alter,
          pc: note.pc,
          parentIds: [parent.id],
          degrees: [{ parentId: parent.id, degree: note.degree }],
        });
      }
    }
  }
  return [...map.values()];
}

function positionsFor(tone: Tone, floorMidi: number, ceilMidi: number): Pos[] {
  const found: Pos[] = [];
  for (let stringNumber = 1; stringNumber <= 6; stringNumber += 1) {
    const open = V8B_OPEN_STRING_MIDI[stringNumber - 1];
    if (open === undefined) continue;
    for (let fret = 0; fret <= TRIAD_PAIR_SEARCH.maxFret; fret += 1) {
      const midi = open + fret;
      if (mod12(midi) !== tone.pc || midi < floorMidi || midi > ceilMidi) continue;
      const octave = octaveForSpelling(tone.step, tone.alter, midi);
      const name = pitchName(tone.step, tone.alter, octave);
      found.push({
        tone,
        name,
        step: tone.step,
        alter: tone.alter,
        octave,
        midi,
        stringNumber,
        fret,
        parents: tone.parentIds,
        spelling: tone.spelling,
      });
    }
  }
  return found;
}

function positions(tone: Tone): Pos[] {
  const strict = positionsFor(tone, 60, 71);
  if (strict.length) return strict;
  const relaxed = positionsFor(tone, 55, 74);
  if (relaxed.length) return relaxed;
  return positionsFor(tone, 40, 76);
}

export function placeTriad(input: ParentTriadInput): FretPlacement[] {
  const triad = validateParentTriad(input);
  const tone = (note: SpelledTone): Tone => ({
    spelling: note.spelling,
    step: note.step,
    alter: note.alter,
    pc: note.pc,
    parentIds: [triad.id],
    degrees: [{ parentId: triad.id, degree: note.degree }],
  });
  return triad.notes.flatMap((note) => positions(tone(note)));
}

function roleFor(points: readonly Pos[], resolutionId: string, tensionId: string): PairVoicing['role'] {
  if (points.length === 1) return 'single';
  const allCommon = points.every((point) => point.tone.parentIds.length > 1);
  if (allCommon) return 'retained';
  const allResolution = points.every((point) => point.tone.parentIds.includes(resolutionId));
  const allTension = points.every((point) => point.tone.parentIds.includes(tensionId));
  if (allResolution && !allTension) return 'resolution_fragment';
  if (allTension && !allResolution) return 'tension_fragment';
  return 'mixed_fragment';
}

function voicingFrom(points: readonly Pos[], resolutionId: string, tensionId: string): PairVoicing {
  const ordered = [...points].sort((a, b) => a.midi - b.midi || b.stringNumber - a.stringNumber);
  const span = stoppedSpan(ordered.map((point) => point.fret));
  return {
    id: ordered.map((point) => `${point.name}@${point.stringNumber}:${point.fret}`).join('+'),
    role: roleFor(ordered, resolutionId, tensionId),
    points: ordered.map(({ tone: _tone, ...point }) => point),
    stoppedSpan: span,
  };
}

function combine(groups: Pos[][], resolutionId: string, tensionId: string): PairVoicing[] {
  const out: PairVoicing[] = [];
  const walk = (index: number, acc: Pos[]) => {
    if (index === groups.length) {
      if (new Set(acc.map((point) => point.stringNumber)).size !== acc.length) return;
      if (new Set(acc.map((point) => point.tone.pc)).size !== acc.length) return;
      if (stoppedSpan(acc.map((point) => point.fret)) > TRIAD_PAIR_SEARCH.maxStoppedSpan) return;
      out.push(voicingFrom(acc, resolutionId, tensionId));
      return;
    }
    for (const pos of groups[index] ?? []) walk(index + 1, [...acc, pos]);
  };
  walk(0, []);
  return out;
}

function byEase(list: PairVoicing[]): PairVoicing[] {
  return [...list].sort((a, b) => a.stoppedSpan - b.stoppedSpan || fretSum(a) - fretSum(b) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

function fretSum(voicing: PairVoicing): number {
  return voicing.points.reduce((sum, point) => sum + point.fret, 0);
}

function toneByDegree(tones: readonly Tone[], parentId: string, degree: TriadDegree): Tone | undefined {
  return tones.find((tone) => tone.degrees.some((item) => item.parentId === parentId && item.degree === degree));
}

function dyadsOf(tones: readonly Tone[], resolutionId: string, tensionId: string): PairVoicing[] {
  const out: PairVoicing[] = [];
  for (let i = 0; i < tones.length; i += 1) {
    for (let j = i + 1; j < tones.length; j += 1) {
      const left = tones[i];
      const right = tones[j];
      if (!left || !right || left.pc === right.pc) continue;
      out.push(...combine([positions(left), positions(right)], resolutionId, tensionId));
    }
  }
  return out;
}

function triadsOf(parentTones: readonly Tone[], resolutionId: string, tensionId: string): PairVoicing[] {
  if (parentTones.length !== 3) return [];
  return combine(parentTones.map((tone) => positions(tone)), resolutionId, tensionId);
}

function cap(list: PairVoicing[]): PairVoicing[] {
  const seen = new Set<string>();
  const unique: PairVoicing[] = [];
  for (const voicing of list) {
    if (seen.has(voicing.id)) continue;
    seen.add(voicing.id);
    unique.push(voicing);
  }
  return unique.slice(0, TRIAD_PAIR_SEARCH.maxVoicingsPerEvent);
}

function poolFor(
  kind: NonNullable<LiquidSlot['kind']>,
  resolution: ValidatedTriad,
  tension: ValidatedTriad,
  tones: readonly Tone[],
  single: Tone | undefined
): PairVoicing[] {
  const resTones = tones.filter((tone) => tone.parentIds.includes(resolution.id));
  const tenTones = tones.filter((tone) => tone.parentIds.includes(tension.id));
  const commons = tones.filter((tone) => tone.parentIds.length > 1);
  if (kind === 'single') {
    if (!single) return [];
    return cap(positions(single).map((pos) => voicingFrom([pos], resolution.id, tension.id)));
  }
  const resolutionTriads = byEase(triadsOf(resTones, resolution.id, tension.id));
  const tensionTriads = byEase(triadsOf(tenTones, resolution.id, tension.id));
  const retainedDyads = byEase(dyadsOf(commons, resolution.id, tension.id).filter((voicing) => voicing.role === 'retained'));
  const resolutionDyads = byEase(dyadsOf(resTones, resolution.id, tension.id));
  const mixed = byEase(dyadsOf(tones, resolution.id, tension.id).filter((voicing) => voicing.role === 'mixed_fragment'));
  const allDyads = byEase(dyadsOf(tones, resolution.id, tension.id));
  if (kind === 'resolution') return cap([...resolutionTriads, ...resolutionDyads]);
  if (kind === 'hinge' && commons.length) return cap([...retainedDyads, ...tensionTriads, ...resolutionTriads, ...allDyads]);
  if (kind === 'hinge') return cap([...mixed, ...resolutionDyads, ...tensionTriads, ...allDyads]);
  return cap([...resolutionTriads, ...tensionTriads, ...retainedDyads, ...mixed, ...allDyads]);
}

function singleTargets(resolution: ValidatedTriad, tension: ValidatedTriad, tones: readonly Tone[], context: PairContext | undefined): Tone[] {
  const melody = (context?.tones ?? []).filter((tone) => tone.role === 'melody');
  const members = melody
    .map((tone) => tones.find((item) => item.step === tone.step && item.alter === tone.alter))
    .filter((tone): tone is Tone => Boolean(tone));
  const commons = tones.filter((tone) => tone.parentIds.length > 1);
  const onlyResolution = tones.filter((tone) => tone.parentIds.length === 1 && tone.parentIds[0] === resolution.id);
  const onlyTension = tones.filter((tone) => tone.parentIds.length === 1 && tone.parentIds[0] === tension.id);
  const pick = (tone: Tone | undefined, fallback: Tone): Tone => tone ?? fallback;
  const fallback = tones[0];
  if (!fallback) throw new Error('pair has no tones');
  if (members.length >= 4) {
    const first = members.slice(0, 4);
    return [...first, pick(first[2], fallback), pick(first[1], fallback)];
  }
  if (commons.length >= 2) {
    return [
      pick(commons[0], fallback),
      pick(commons[1], fallback),
      pick(onlyTension[0], pick(commons[0], fallback)),
      pick(toneByDegree(tones, resolution.id, 'fifth'), pick(onlyResolution[0], fallback)),
      pick(commons[1], fallback),
      pick(commons[0], fallback),
    ];
  }
  const root = toneByDegree(tones, resolution.id, 'root') ?? fallback;
  const fifth = toneByDegree(tones, resolution.id, 'fifth') ?? fallback;
  const third = toneByDegree(tones, resolution.id, 'third') ?? fallback;
  const tensionRoot = toneByDegree(tones, tension.id, 'root') ?? fallback;
  const tensionFifth = toneByDegree(tones, tension.id, 'fifth') ?? fallback;
  const tensionThird = toneByDegree(tones, tension.id, 'third') ?? fallback;
  if (commons.length === 1) {
    return [pick(commons[0], fallback), root, tensionRoot, fifth, pick(commons[0], fallback), tensionFifth];
  }
  return [root, fifth, tensionRoot, tensionFifth, third, tensionThird];
}

function registeredHolds(prev: PairVoicing, next: PairVoicing): number {
  let holds = 0;
  const used = new Set<number>();
  for (const point of prev.points) {
    const index = next.points.findIndex(
      (other, item) => !used.has(item) && other.stringNumber === point.stringNumber && other.fret === point.fret && other.midi === point.midi
    );
    if (index >= 0) {
      used.add(index);
      holds += 1;
    }
  }
  return holds;
}

function sameStringMoves(prev: PairVoicing, next: PairVoicing): number[] {
  const moves: number[] = [];
  const used = new Set<number>();
  for (const point of prev.points) {
    const held = next.points.some((other) => other.stringNumber === point.stringNumber && other.fret === point.fret && other.midi === point.midi);
    if (held) continue;
    const index = next.points.findIndex((other, item) => !used.has(item) && other.stringNumber === point.stringNumber);
    if (index < 0) continue;
    used.add(index);
    moves.push(next.points[index]!.midi - point.midi);
  }
  return moves;
}

function scoreVoicing(voicing: PairVoicing, prev: PairVoicing | null, kind: NonNullable<LiquidSlot['kind']>): number {
  let score = 80 - voicing.stoppedSpan * 6 - Math.abs(centroid(voicing) - 65);
  if (kind === 'resolution' && voicing.role === 'resolution_fragment') score += 40;
  if ((kind === 'resolution' || kind === 'connect' || kind === 'move') && voicing.points.length === 3) score += 55;
  if (kind === 'hinge' && voicing.role === 'retained' && voicing.points.length === 2) score += 48;
  if (kind === 'hinge' && voicing.role === 'mixed_fragment') score += 36;
  if (!prev) return score;
  const holds = registeredHolds(prev, voicing);
  const moves = sameStringMoves(prev, voicing);
  score += holds * 80;
  if (holds >= 1 && moves.length === 1 && Math.abs(moves[0]!) === 1) score += 36;
  if (holds >= 1 && moves.length === 1 && Math.abs(moves[0]!) === 2) score += 30;
  if (holds === 0) score -= 45;
  if ((kind === 'move' || kind === 'hinge') && voicing.id === prev.id) score -= 70;
  if (kind === 'connect' && voicing.id === prev.id) score -= 90;
  return score;
}

function centroid(voicing: PairVoicing): number {
  return voicing.points.reduce((sum, point) => sum + point.midi, 0) / voicing.points.length;
}

function stableRank(seed: number, label: string): number {
  let hash = seed >>> 0;
  for (let index = 0; index < label.length; index += 1) hash = Math.imul(hash ^ label.charCodeAt(index), 16777619);
  return hash >>> 0;
}

interface Path {
  score: number;
  picks: PairVoicing[];
  tie: number;
}

function signature(path: Path): string {
  return path.picks.map((voicing) => voicing.points.map((point) => point.midi).join('+')).join('|');
}

function relate(prev: PairVoicing, next: PairVoicing): VoiceMovement {
  const held: VoiceMovement['held'] = [];
  const moved: VoiceMovement['moved'] = [];
  const used = new Set<number>();
  for (const point of prev.points) {
    const index = next.points.findIndex(
      (other, item) => !used.has(item) && other.stringNumber === point.stringNumber && other.fret === point.fret && other.midi === point.midi
    );
    if (index >= 0) {
      used.add(index);
      held.push({ name: point.name, stringNumber: point.stringNumber, fret: point.fret, midi: point.midi });
    }
  }
  for (const point of prev.points) {
    if (held.some((item) => item.stringNumber === point.stringNumber && item.fret === point.fret)) continue;
    const index = next.points.findIndex((other, item) => !used.has(item) && other.stringNumber === point.stringNumber);
    if (index < 0) continue;
    used.add(index);
    const target = next.points[index]!;
    moved.push({
      from: point.name,
      to: target.name,
      semitones: target.midi - point.midi,
      stringNumber: point.stringNumber,
      fromFret: point.fret,
      toFret: target.fret,
    });
  }
  return { fromId: prev.id, toId: next.id, held, moved };
}

function assertFeasible(voicing: PairVoicing): void {
  if (voicing.stoppedSpan > TRIAD_PAIR_SEARCH.maxStoppedSpan) throw new Error(`${voicing.id} span ${voicing.stoppedSpan}`);
  const strings = new Set<number>();
  for (const point of voicing.points) {
    if (point.fret < 0 || point.fret > TRIAD_PAIR_SEARCH.maxFret) throw new Error(`${point.name} fret ${point.fret}`);
    const open = V8B_OPEN_STRING_MIDI[point.stringNumber - 1];
    if (open === undefined || open + point.fret !== point.midi) throw new Error(`${point.name} string/fret mismatch`);
    if (midiOf(point.step, point.alter, point.octave) !== point.midi) throw new Error(`${point.name} spelling mismatch`);
    if (strings.has(point.stringNumber)) throw new Error(`${voicing.id} stacks one string`);
    strings.add(point.stringNumber);
  }
}

export function realizeTriadPair(
  resolutionInput: ParentTriadInput,
  tensionInput: ParentTriadInput,
  seed: number,
  slots: readonly LiquidSlot[],
  context?: PairContext
): TriadPairRealization {
  const resolution = validateParentTriad(resolutionInput);
  const tension = validateParentTriad(tensionInput);
  const analysis = analyzeTriadPair(resolutionInput, tensionInput, context);
  const tones = collectTones(resolution, tension);
  const singles = singleTargets(resolution, tension, tones, context);
  const pitched = slots.filter((slot) => !slot.rest);
  const pools: PairVoicing[][] = [];
  let densityReduced = false;
  let beam: Path[] = [{ score: 0, picks: [], tie: seed }];
  const pathsKept: number[] = [];
  pitched.forEach((slot, index) => {
    const kind = slot.kind ?? 'connect';
    const single = kind === 'single' ? singles[slot.singleIndex ?? index] : undefined;
    const pool = poolFor(kind, resolution, tension, tones, single);
    pools.push(pool);
    if (!pool.length) {
      densityReduced = true;
      pathsKept.push(beam.length);
      return;
    }
    const next: Path[] = [];
    for (const path of beam) {
      const prev = path.picks[path.picks.length - 1] ?? null;
      for (const voicing of pool) {
        const step = scoreVoicing(voicing, prev, kind);
        const label = `${path.picks.map((item) => item.id).join('|')}>${voicing.id}`;
        next.push({ score: path.score + step, picks: [...path.picks, voicing], tie: stableRank(seed, label) });
      }
    }
    next.sort((a, b) => b.score - a.score || a.tie - b.tie);
    beam = next.slice(0, TRIAD_PAIR_SEARCH.beamWidth);
    pathsKept.push(beam.length);
  });
  if (!beam[0] || beam[0].picks.length === 0) throw new Error('no playable realisation');
  const ranked = [...beam].sort((a, b) => b.score - a.score || a.tie - b.tie);
  const finals: Path[] = [];
  const seen = new Set<string>();
  for (const path of ranked) {
    const key = signature(path);
    if (seen.has(key)) continue;
    seen.add(key);
    finals.push(path);
    if (finals.length === TRIAD_PAIR_SEARCH.finalCandidates) break;
  }
  const winner = finals[0]!;
  for (let slotIndex = 0; slotIndex < pools.length && finals.length < TRIAD_PAIR_SEARCH.finalCandidates; slotIndex += 1) {
    for (const alt of pools[slotIndex] ?? []) {
      const picks = winner.picks.slice();
      if (!picks.length) break;
      picks[Math.min(slotIndex, picks.length - 1)] = alt;
      const grafted: Path = { score: winner.score - finals.length, picks, tie: slotIndex };
      const key = signature(grafted);
      if (seen.has(key)) continue;
      seen.add(key);
      finals.push(grafted);
      if (finals.length === TRIAD_PAIR_SEARCH.finalCandidates) break;
    }
  }
  const chosen = finals[0] ?? winner;
  for (const voicing of chosen.picks) assertFeasible(voicing);
  let poolIndex = 0;
  let pickIndex = 0;
  const events: RealizationEvent[] = slots.map((slot) => {
    if (slot.rest) return { bar: slot.bar, duration: slot.duration, rest: true, voicing: null };
    const pool = pools[poolIndex];
    poolIndex += 1;
    if (!pool || pool.length === 0) return { bar: slot.bar, duration: slot.duration, rest: true, voicing: null };
    const voicing = chosen.picks[pickIndex] ?? null;
    pickIndex += 1;
    if (!voicing) return { bar: slot.bar, duration: slot.duration, rest: true, voicing: null };
    return { bar: slot.bar, duration: slot.duration, rest: false, voicing };
  });
  const sounded = events.flatMap((event) => (event.voicing ? [event.voicing] : []));
  const movements: VoiceMovement[] = [];
  for (let index = 1; index < sounded.length; index += 1) {
    const prev = sounded[index - 1];
    const next = sounded[index];
    if (prev && next) movements.push(relate(prev, next));
  }
  return {
    seed,
    resolution,
    tension,
    analysis,
    events,
    movements,
    finalists: finals.slice(0, TRIAD_PAIR_SEARCH.finalCandidates).map((path, index) => ({
      rank: index + 1,
      score: path.score,
      attacks: path.picks.map((voicing) => voicing.points.map((point) => point.name).join('/')),
    })),
    consideredPerEvent: pools.map((pool) => pool.length),
    pathsKeptPerStep: pathsKept,
    densityReduced,
    search: TRIAD_PAIR_SEARCH,
    feasibility: 'automated',
    humanPlayability: 'NOT VERIFIED',
  };
}
