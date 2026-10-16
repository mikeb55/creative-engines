/**
 * H6-C1 — consonant triadic transformations.
 * Pitch classes, common tones, and voice-leading come from the existing modules.
 * P, L, R, H, N, and S are defined on major and minor triads only.
 * A word is applied left to right and is not rewritten as another word.
 */

import { canonicalPitchSet, mod12 } from '../pentatonic/pitch';
import { minimumAssignment } from '../pentatonic/fieldDistance';
import { pitchClassOf, spellName, type Spelled } from '../wwh/wps/wpsTonalityVaultRecord';
import { parseSpelledPitch } from '../wwh/wwhTriadPair';
import { listHexatonicScalars } from './collections';
import { CORE_CANDIDATES } from './coreLaboratory';
import { commonToneCount, minVoiceLeading, triadAt } from './tertianTriadUniverse';
import { listHexatonicWpsPairs } from './triadPairs';

export const TRIADIC_OPERATIONS = ['P', 'L', 'R', 'H', 'N', 'S'] as const;
export type TriadicOperation = (typeof TRIADIC_OPERATIONS)[number];
export const PLR_OPERATIONS = ['P', 'L', 'R'] as const;

export type ConsonantQuality = 'major' | 'minor';

export interface SpelledConsonantTriad {
  quality: ConsonantQuality;
  rootPc: number;
  rootSpelling: string;
  notes: readonly [string, string, string];
  pitchClasses: readonly [number, number, number];
}

export interface TriadRequest {
  quality: string;
  rootPc?: number;
  notes?: readonly [string, string, string];
}

export interface VoiceMotion {
  fromSpelling: string;
  toSpelling: string;
  fromPc: number;
  toPc: number;
  semitones: number;
  direction: 'hold' | 'up' | 'down' | 'tritone';
  retained: boolean;
}

export interface TriadInversion {
  figure: '5/3' | '6/3' | '6/4';
  bass: string;
  notes: readonly [string, string, string];
}

export interface TriadicApplication {
  ok: true;
  operation: TriadicOperation;
  /** PLR is the consonant neo-Riemannian group. H, N, and S are named consonant operations, not dim/aug maps. */
  group: 'PLR' | 'named';
  source: SpelledConsonantTriad;
  target: SpelledConsonantTriad;
  sharedPitchClasses: readonly number[];
  motions: readonly VoiceMotion[];
  voiceLeading: number;
  inversions: readonly TriadInversion[];
}

export interface TriadicRefusal {
  ok: false;
  reason: string;
}

export type TriadicResult = TriadicApplication | TriadicRefusal;

export interface TransformationPath {
  operations: readonly TriadicOperation[];
  voiceLeading: number;
  target: SpelledConsonantTriad;
}

const STEPS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
type StepName = (typeof STEPS)[number];
const STEP_PC: Record<StepName, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const STEP_INDEX: Record<StepName, number> = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };

const PREFERRED_ROOT: readonly Spelled[] = [
  { step: 'C', alter: 0 },
  { step: 'C', alter: 1 },
  { step: 'D', alter: 0 },
  { step: 'E', alter: -1 },
  { step: 'E', alter: 0 },
  { step: 'F', alter: 0 },
  { step: 'F', alter: 1 },
  { step: 'G', alter: 0 },
  { step: 'A', alter: -1 },
  { step: 'A', alter: 0 },
  { step: 'B', alter: -1 },
  { step: 'B', alter: 0 },
];

const UNSUPPORTED = 'P, L, R, H, N, and S apply to major and minor triads. Diminished and augmented triads stay outside those operations.';

function spelled(step: StepName, alter: Spelled['alter']): Spelled {
  return { step, alter };
}

function asSpelled(token: string): Spelled {
  const parsed = parseSpelledPitch(token);
  if (!STEPS.includes(parsed.step as StepName)) throw new Error(`bad step ${parsed.step}`);
  if (parsed.alter < -2 || parsed.alter > 2) throw new Error(`alter ${parsed.alter} is outside a double accidental`);
  return spelled(parsed.step as StepName, parsed.alter as Spelled['alter']);
}

function degree(root: Spelled, letterSteps: number, semitones: number): Spelled {
  const step = STEPS[(STEP_INDEX[root.step] + letterSteps) % 7]!;
  let alter = mod12(pitchClassOf(root) + semitones - STEP_PC[step]);
  if (alter > 6) alter -= 12;
  if (alter < -2 || alter > 2) throw new Error(`cannot spell ${spellName(root)} + ${semitones}`);
  return spelled(step, alter as Spelled['alter']);
}

function notesOf(root: Spelled, quality: ConsonantQuality): [Spelled, Spelled, Spelled] {
  return [root, degree(root, 2, quality === 'major' ? 4 : 3), degree(root, 4, 7)];
}

function spellingsFor(pitchClass: number): Spelled[] {
  const found: Spelled[] = [];
  for (const step of STEPS) {
    for (const alter of [-2, -1, 0, 1, 2] as const) {
      if (mod12(STEP_PC[step] + alter) === mod12(pitchClass)) found.push(spelled(step, alter));
    }
  }
  return found;
}

function pack(root: Spelled, quality: ConsonantQuality): SpelledConsonantTriad {
  const notes = notesOf(root, quality);
  const pitchClasses = notes.map((note) => pitchClassOf(note)) as [number, number, number];
  const expected = triadAt(quality, pitchClassOf(root)).pitchClasses;
  if (canonicalPitchSet(pitchClasses).join(',') !== canonicalPitchSet(expected).join(',')) {
    throw new Error(`spelling ${notes.map(spellName).join(' ')} left the ${quality} triad`);
  }
  return {
    quality,
    rootPc: mod12(pitchClassOf(root)),
    rootSpelling: spellName(root),
    notes: notes.map(spellName) as [string, string, string],
    pitchClasses,
  };
}

function chooseRoot(pitchClass: number, quality: ConsonantQuality, source: SpelledConsonantTriad | null): Spelled {
  if (source && source.rootPc === mod12(pitchClass)) return asSpelled(source.rootSpelling);
  const sourceNotes = source?.notes ?? [];
  const letters = new Set(sourceNotes.map((token) => asSpelled(token).step));
  const preferred = PREFERRED_ROOT[mod12(pitchClass)]!;
  let best: Spelled = preferred;
  let bestScore = -1;
  for (const root of spellingsFor(pitchClass)) {
    let score = 0;
    try {
      const notes = notesOf(root, quality);
      for (const note of notes) {
        const token = spellName(note);
        const pc = pitchClassOf(note);
        if (sourceNotes.some((spelling, index) => spelling === token && source.pitchClasses[index] === pc)) score += 100;
        else if (letters.has(note.step)) score += 2;
        score -= Math.abs(note.alter);
      }
    } catch {
      continue;
    }
    if (spellName(root) === spellName(preferred)) score += 5;
    if (score > bestScore) {
      best = root;
      bestScore = score;
    }
  }
  return best;
}

export function consonantTriad(request: TriadRequest): SpelledConsonantTriad | TriadicRefusal {
  if (request.quality !== 'major' && request.quality !== 'minor') return { ok: false, reason: UNSUPPORTED };
  const quality = request.quality;
  if (request.notes) {
    if (request.notes.length !== 3) return { ok: false, reason: 'a triad has three notes' };
    let parsed: Spelled[];
    try {
      parsed = request.notes.map((token) => asSpelled(token));
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : String(error) };
    }
    const built = pack(parsed[0]!, quality);
    if (built.notes.join(' ') !== request.notes.join(' ')) {
      return { ok: false, reason: `${request.notes.join(' ')} is not a stacked ${quality} triad` };
    }
    if (request.rootPc !== undefined && mod12(request.rootPc) !== built.rootPc) {
      return { ok: false, reason: 'root pitch class does not match the spelling' };
    }
    return built;
  }
  if (request.rootPc === undefined || !Number.isInteger(request.rootPc)) return { ok: false, reason: 'root pitch class is required' };
  try {
    return pack(PREFERRED_ROOT[mod12(request.rootPc)]!, quality);
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

function modeOf(quality: ConsonantQuality): 1 | -1 {
  return quality === 'major' ? 1 : -1;
}

function qualityOf(mode: 1 | -1): ConsonantQuality {
  return mode === 1 ? 'major' : 'minor';
}

/** Musical root map. This is not a rewrite of one operation as a product of the others. */
function mapRoot(rootPc: number, mode: 1 | -1, operation: TriadicOperation): { rootPc: number; mode: 1 | -1 } {
  if (operation === 'P') return { rootPc, mode: (mode === 1 ? -1 : 1) };
  if (operation === 'R') return mode === 1 ? { rootPc: mod12(rootPc - 3), mode: -1 } : { rootPc: mod12(rootPc + 3), mode: 1 };
  if (operation === 'L') return mode === 1 ? { rootPc: mod12(rootPc + 4), mode: -1 } : { rootPc: mod12(rootPc - 4), mode: 1 };
  if (operation === 'H') return mode === 1 ? { rootPc: mod12(rootPc - 4), mode: -1 } : { rootPc: mod12(rootPc + 4), mode: 1 };
  if (operation === 'S') return mode === 1 ? { rootPc: mod12(rootPc + 1), mode: -1 } : { rootPc: mod12(rootPc - 1), mode: 1 };
  return mode === 1 ? { rootPc: mod12(rootPc + 5), mode: -1 } : { rootPc: mod12(rootPc - 5), mode: 1 };
}

export function signedSemitones(from: number, to: number): number {
  let delta = mod12(to - from);
  if (delta > 6) delta -= 12;
  return delta;
}

function directionOf(semitones: number): VoiceMotion['direction'] {
  if (semitones === 0) return 'hold';
  if (semitones === 6 || semitones === -6) return 'tritone';
  return semitones > 0 ? 'up' : 'down';
}

export function voiceMotions(source: SpelledConsonantTriad, target: SpelledConsonantTriad): VoiceMotion[] {
  const from = source.notes.map((spelling, index) => ({ spelling, pc: source.pitchClasses[index]! }));
  const to = target.notes.map((spelling, index) => ({ spelling, pc: target.pitchClasses[index]! }));
  const used = new Set<number>();
  const motions: VoiceMotion[] = [];
  const pending: typeof from = [];
  for (const note of from) {
    const hit = to.findIndex((other, index) => !used.has(index) && other.pc === note.pc);
    if (hit < 0) {
      pending.push(note);
      continue;
    }
    used.add(hit);
    motions.push({
      fromSpelling: note.spelling,
      toSpelling: to[hit]!.spelling,
      fromPc: note.pc,
      toPc: note.pc,
      semitones: 0,
      direction: 'hold',
      retained: true,
    });
  }
  const rest = to.filter((_, index) => !used.has(index));
  const assignment = minimumAssignment(pending.map((note) => note.pc), rest.map((note) => note.pc));
  for (const pair of assignment.pairs) {
    if (pair.from < 0 || pair.to < 0) continue;
    const sourceNote = pending.find((note) => note.pc === pair.from);
    const targetNote = rest.find((note) => note.pc === pair.to);
    if (!sourceNote || !targetNote) continue;
    const semitones = signedSemitones(sourceNote.pc, targetNote.pc);
    motions.push({
      fromSpelling: sourceNote.spelling,
      toSpelling: targetNote.spelling,
      fromPc: sourceNote.pc,
      toPc: targetNote.pc,
      semitones,
      direction: directionOf(semitones),
      retained: false,
    });
  }
  return motions;
}

export function triadInversions(triad: SpelledConsonantTriad): TriadInversion[] {
  const [root, third, fifth] = triad.notes;
  return [
    { figure: '5/3', bass: root, notes: [root, third, fifth] },
    { figure: '6/3', bass: third, notes: [third, fifth, root] },
    { figure: '6/4', bass: fifth, notes: [fifth, root, third] },
  ];
}

function application(source: SpelledConsonantTriad, operation: TriadicOperation, target: SpelledConsonantTriad): TriadicApplication {
  const motions = voiceMotions(source, target);
  const shared = canonicalPitchSet(motions.filter((motion) => motion.retained).map((motion) => motion.fromPc));
  const voiceLeading = motions.reduce((sum, motion) => sum + Math.abs(motion.semitones), 0);
  const counted = minVoiceLeading(source.pitchClasses, target.pitchClasses);
  if (voiceLeading !== counted) throw new Error(`voice-leading ${voiceLeading} left the shared assignment ${counted}`);
  if (shared.length !== commonToneCount(source.pitchClasses, target.pitchClasses)) {
    throw new Error('retained tones left the common-tone count');
  }
  return {
    ok: true,
    operation,
    group: operation === 'P' || operation === 'L' || operation === 'R' ? 'PLR' : 'named',
    source,
    target,
    sharedPitchClasses: shared,
    motions,
    voiceLeading,
    inversions: triadInversions(target),
  };
}

export function applyTriadicTransformation(request: TriadRequest, operation: TriadicOperation): TriadicResult {
  if (!TRIADIC_OPERATIONS.includes(operation)) return { ok: false, reason: `unknown transformation ${operation}` };
  const source = consonantTriad(request);
  if ('ok' in source) return source;
  const mapped = mapRoot(source.rootPc, modeOf(source.quality), operation);
  try {
    const target = pack(chooseRoot(mapped.rootPc, qualityOf(mapped.mode), source), qualityOf(mapped.mode));
    return application(source, operation, target);
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

export function applyTriadicWord(request: TriadRequest, operations: readonly TriadicOperation[]): TriadicResult | { ok: true; source: SpelledConsonantTriad; target: SpelledConsonantTriad; operations: readonly TriadicOperation[]; voiceLeading: number } {
  const source = consonantTriad(request);
  if ('ok' in source) return source;
  let cursor: SpelledConsonantTriad = source;
  let voiceLeading = 0;
  for (const operation of operations) {
    const step = applyTriadicTransformation(cursor, operation);
    if (!step.ok) return step;
    cursor = step.target;
    voiceLeading += step.voiceLeading;
  }
  return { ok: true, source, target: cursor, operations, voiceLeading };
}

export interface NeighbourRow {
  operation: TriadicOperation | null;
  group: 'PLR' | 'named' | 'common-tone';
  target: SpelledConsonantTriad;
  sharedPitchClasses: readonly number[];
  motions: readonly VoiceMotion[];
  voiceLeading: number;
  inversions: readonly TriadInversion[];
  explanation: string;
}

function explain(operation: TriadicOperation | null, step: { sharedPitchClasses: readonly number[]; motions: readonly VoiceMotion[]; voiceLeading: number; target: SpelledConsonantTriad }): string {
  const moving = step.motions.filter((motion) => !motion.retained);
  const moveText = moving.map((motion) => `${motion.fromSpelling} ${motion.direction} ${Math.abs(motion.semitones)} to ${motion.toSpelling}`).join(', ') || 'no voice moves';
  const name = operation ?? 'common-tone';
  return `${name}: ${step.sharedPitchClasses.length} shared, voice-leading ${step.voiceLeading}. ${moveText}. Target ${step.target.notes.join(' ')} ${step.target.quality}.`;
}

export function namedNeighbours(request: TriadRequest): NeighbourRow[] | TriadicRefusal {
  const source = consonantTriad(request);
  if ('ok' in source) return source;
  const rows: NeighbourRow[] = [];
  for (const operation of TRIADIC_OPERATIONS) {
    const step = applyTriadicTransformation(source, operation);
    if (!step.ok) return step;
    rows.push({
      operation,
      group: step.group,
      target: step.target,
      sharedPitchClasses: step.sharedPitchClasses,
      motions: step.motions,
      voiceLeading: step.voiceLeading,
      inversions: step.inversions,
      explanation: explain(operation, step),
    });
  }
  return rows;
}

export function commonToneNeighbours(request: TriadRequest): NeighbourRow[] | TriadicRefusal {
  const source = consonantTriad(request);
  if ('ok' in source) return source;
  const named = namedNeighbours(source);
  if (!Array.isArray(named)) return named;
  const seen = new Set(named.map((row) => `${row.target.quality}:${row.target.rootPc}`));
  const rows: NeighbourRow[] = [];
  for (const quality of ['major', 'minor'] as const) {
    for (let rootPc = 0; rootPc < 12; rootPc += 1) {
      const key = `${quality}:${rootPc}`;
      if (key === `${source.quality}:${source.rootPc}` || seen.has(key)) continue;
      const target = consonantTriad({ quality, rootPc });
      if ('ok' in target) continue;
      if (commonToneCount(source.pitchClasses, target.pitchClasses) < 1) continue;
      const motions = voiceMotions(source, target);
      const shared = canonicalPitchSet(motions.filter((motion) => motion.retained).map((motion) => motion.fromPc));
      const row = {
        operation: null as TriadicOperation | null,
        group: 'common-tone' as const,
        target,
        sharedPitchClasses: shared,
        motions,
        voiceLeading: minVoiceLeading(source.pitchClasses, target.pitchClasses),
        inversions: triadInversions(target),
        explanation: '',
      };
      row.explanation = explain(null, row);
      rows.push(row);
    }
  }
  return rows;
}

function sameTriad(left: SpelledConsonantTriad, right: SpelledConsonantTriad): boolean {
  return left.quality === right.quality && left.rootPc === right.rootPc;
}

function searchPath(source: SpelledConsonantTriad, target: SpelledConsonantTriad, operations: readonly TriadicOperation[], mode: 'hops' | 'motion'): TriadicOperation[] | null {
  if (sameTriad(source, target)) return [];
  const rankOf = (hops: number, motion: number) => (mode === 'hops' ? hops * 1000 + motion : motion * 1000 + hops);
  const goal = `${target.quality}:${target.rootPc}`;
  const best = new Map<string, number>();
  const queue: { key: string; triad: SpelledConsonantTriad; word: TriadicOperation[]; motion: number }[] = [{
    key: `${source.quality}:${source.rootPc}`,
    triad: source,
    word: [],
    motion: 0,
  }];
  best.set(queue[0]!.key, 0);
  while (queue.length) {
    queue.sort((left, right) => rankOf(left.word.length, left.motion) - rankOf(right.word.length, right.motion));
    const current = queue.shift()!;
    if (rankOf(current.word.length, current.motion) > (best.get(current.key) ?? Infinity)) continue;
    if (current.key === goal) return current.word;
    if (current.word.length >= 6) continue;
    for (const operation of operations) {
      const step = applyTriadicTransformation(current.triad, operation);
      if (!step.ok) continue;
      const word = [...current.word, operation];
      const motion = current.motion + step.voiceLeading;
      const key = `${step.target.quality}:${step.target.rootPc}`;
      const rank = rankOf(word.length, motion);
      if (rank >= (best.get(key) ?? Infinity)) continue;
      best.set(key, rank);
      queue.push({ key, triad: step.target, word, motion });
    }
  }
  return null;
}

export function shortPlrPath(from: TriadRequest, to: TriadRequest): TransformationPath | TriadicRefusal {
  const source = consonantTriad(from);
  if ('ok' in source) return source;
  const target = consonantTriad(to);
  if ('ok' in target) return target;
  const operations = searchPath(source, target, PLR_OPERATIONS, 'hops');
  if (!operations) return { ok: false, reason: 'no P/L/R path' };
  const replay = applyTriadicWord(source, operations);
  if (!('target' in replay) || !replay.ok) return { ok: false, reason: 'path did not replay' };
  if (!sameTriad(replay.target, target)) return { ok: false, reason: 'P/L/R path missed the target' };
  return { operations, voiceLeading: replay.voiceLeading, target: replay.target };
}

export function minimumMotionPath(from: TriadRequest, to: TriadRequest): TransformationPath | TriadicRefusal {
  const source = consonantTriad(from);
  if ('ok' in source) return source;
  const target = consonantTriad(to);
  if ('ok' in target) return target;
  const operations = searchPath(source, target, TRIADIC_OPERATIONS, 'motion');
  if (!operations) return { ok: false, reason: 'no transformation path' };
  const replay = applyTriadicWord(source, operations);
  if (!('target' in replay) || !replay.ok) return { ok: false, reason: 'path did not replay' };
  if (!sameTriad(replay.target, target)) return { ok: false, reason: 'minimum-motion path missed the target' };
  return { operations, voiceLeading: replay.voiceLeading, target: replay.target };
}

export function explainTriadicRelation(from: TriadRequest, to: TriadRequest): { ok: true; text: string; path: TransformationPath } | TriadicRefusal {
  const motion = minimumMotionPath(from, to);
  if ('ok' in motion) return motion;
  const plr = shortPlrPath(from, to);
  const plrText = 'ok' in plr ? '' : ` P/L/R word ${plr.operations.join('') || 'identity'} is a separate path and is not replaced.`;
  const named = motion.operations.length === 1 ? motion.operations[0] : null;
  return {
    ok: true,
    path: motion,
    text: `${named ?? (motion.operations.join('') || 'same triad')}. Voice-leading ${motion.voiceLeading}. Target ${motion.target.notes.join(' ')}.${plrText}`,
  };
}

function pairKey(left: readonly number[], right: readonly number[]): string {
  return [canonicalPitchSet(left).join(','), canonicalPitchSet(right).join(',')].sort().join('|');
}

function shiftKey(left: readonly number[], right: readonly number[], semitones: number): string {
  return pairKey(left.map((pitchClass) => pitchClass + semitones), right.map((pitchClass) => pitchClass + semitones));
}

export interface CataloguePairMatch {
  family: 'scalar' | 'wps' | 'provisional';
  id: string;
  referencePc: number;
}

/** Unordered triad-pair match against the existing catalogue. No new colour id is minted. */
export function matchCataloguePair(left: readonly number[], right: readonly number[]): CataloguePairMatch | null {
  const query = pairKey(left, right);
  const scan = (family: CataloguePairMatch['family'], id: string, a: readonly number[], b: readonly number[]) => {
    for (let semitones = 0; semitones < 12; semitones += 1) {
      if (shiftKey(a, b, semitones) === query) return { family, id, referencePc: semitones };
    }
    return null;
  };
  for (const candidate of CORE_CANDIDATES) {
    const found = scan(
      'provisional',
      candidate.id,
      candidate.leftSpelling.map((token) => parseSpelledPitch(token).pc),
      candidate.rightSpelling.map((token) => parseSpelledPitch(token).pc),
    );
    if (found) return found;
  }
  for (const pair of listHexatonicWpsPairs()) {
    const found = scan('wps', pair.id, pair.resolution.pitchClasses, pair.tension.pitchClasses);
    if (found) return found;
  }
  for (const scalar of listHexatonicScalars()) {
    const reading = scalar.triadReading;
    if (!reading || reading.length < 2) continue;
    const found = scan('scalar', scalar.id, reading[0]!.pitchClasses, reading[1]!.pitchClasses);
    if (found) return found;
  }
  return null;
}
