/**
 * Luther Dickinson southern keys-and-slide flavor - JH-only opt-in post-process.
 * Call-response fills / blues ornaments / triplet pickups / held durations.
 * Does not touch buildRiffScoreModel / riffMelody / riffRhythm.
 * Default OFF (param + env); openIdiomDefault-style opt-in.
 */

import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import type { MeasureModel, NoteEvent, ScoreEvent, ScoreModel } from '../score-model/scoreModelTypes';
import { mulberry32, randInt } from './riffRandom';

export const RIFF_DICKINSON_FLAVOR_ENV = 'COMPOSER_OS_RIFF_DICKINSON_FLAVOR';
export const RIFF_DICKINSON_FLAVOR_VRB = 'jimmy_herring' as const;

/** Minor blues scale degrees from chord root. */
const BLUES_DEGREES = [0, 3, 5, 6, 7, 10] as const;

const EPS = 0.02;
const TRIPLET = 1 / 3;

export function isJimmyHerringVrb(vrbId: string | undefined): boolean {
  if (!vrbId) return false;
  const id = vrbId.trim().toLowerCase();
  return id === 'jimmy_herring' || id === 'herring' || id === 'jh';
}

/**
 * Opt-in gate: JH only - dickinsonFlavor === true or env 1/true/on.
 * Default OFF - existing jimmy_herring output unchanged.
 */
export function isDickinsonFlavorEnabled(opts: {
  dickinsonFlavor?: boolean;
  vrbId?: string;
}): boolean {
  if (!isJimmyHerringVrb(opts.vrbId)) return false;
  if (opts.dickinsonFlavor === true) return true;
  const env = (process.env[RIFF_DICKINSON_FLAVOR_ENV] ?? '').trim().toLowerCase();
  return env === '1' || env === 'true' || env === 'on' || env === 'yes';
}

function rootPcFromChord(chord: string | undefined): number {
  if (!chord?.trim()) return 0;
  const parsed = parseChordSymbol(chord);
  const rm = parsed.harmonyPart.match(/^([A-G](?:#|b)?)/i);
  if (!rm?.[1]) return 0;
  return noteNameToPitchClass(rm[1]) ?? 0;
}

function isStrongBeat(startBeat: number): boolean {
  for (const b of [0, 1, 2, 3]) {
    if (Math.abs(startBeat - b) < 0.12) return true;
  }
  return false;
}

function midiOnBluesNear(anchor: number, rootPc: number, preferBelow: boolean): number {
  const pcs = BLUES_DEGREES.map((d) => (rootPc + d) % 12);
  let best = anchor;
  let bestDist = 99;
  for (const pc of pcs) {
    for (let oct = -1; oct <= 1; oct++) {
      const m = anchor - (anchor % 12) + pc + oct * 12;
      if (m < 40 || m > 88) continue;
      const dist = Math.abs(m - anchor);
      const belowBias = preferBelow && m < anchor ? -0.35 : 0;
      const score = dist + belowBias;
      if (score < bestDist && m !== anchor) {
        bestDist = score;
        best = m;
      }
    }
  }
  return Math.max(40, Math.min(88, best === anchor ? anchor - 1 : best));
}

function voice1Notes(events: ScoreEvent[]): NoteEvent[] {
  return events
    .filter((e): e is NoteEvent => e.kind === 'note' && (e.voice ?? 1) === 1)
    .slice()
    .sort((a, b) => a.startBeat - b.startBeat || a.duration - b.duration);
}

function otherEvents(events: ScoreEvent[]): ScoreEvent[] {
  return events.filter((e) => !(e.kind === 'note' && (e.voice ?? 1) === 1));
}

function noteEnd(n: NoteEvent): number {
  return n.startBeat + n.duration;
}

function overlaps(a: NoteEvent, b: NoteEvent): boolean {
  return a.startBeat < noteEnd(b) - EPS && b.startBeat < noteEnd(a) - EPS;
}

function canPlace(notes: NoteEvent[], candidate: NoteEvent): boolean {
  if (candidate.startBeat < -EPS || candidate.startBeat + candidate.duration > 4 + EPS) return false;
  if (candidate.duration < 0.08) return false;
  for (const n of notes) {
    if (overlaps(candidate, n)) return false;
  }
  return true;
}

function insertSorted(notes: NoteEvent[], n: NoteEvent): void {
  notes.push(n);
  notes.sort((a, b) => a.startBeat - b.startBeat || a.duration - b.duration);
}

/** Triplet-feel pickup before strong-beat riff hits when space allows. */
function addTripletPickups(notes: NoteEvent[], rootPc: number, rng: () => number): void {
  const originals = notes.filter(
    (n) => n.motifRef !== 'dickinson_pickup' && n.motifRef !== 'dickinson_ornament'
  );
  for (const hit of originals) {
    if (!isStrongBeat(hit.startBeat)) continue;
    if (rng() > 0.62) continue;
    const prev = notes.filter((n) => noteEnd(n) <= hit.startBeat + EPS).pop();
    const prevEnd = prev ? noteEnd(prev) : 0;
    const gap = hit.startBeat - prevEnd;
    if (gap < TRIPLET + 0.04) continue;
    const start = hit.startBeat - TRIPLET;
    if (start < prevEnd + EPS) continue;
    const cand: NoteEvent = {
      kind: 'note',
      pitch: midiOnBluesNear(hit.pitch, rootPc, true),
      startBeat: start,
      duration: Math.min(TRIPLET - 0.04, gap - 0.06),
      voice: 1,
      motifRef: 'dickinson_pickup',
      velocity: 78,
    };
    if (canPlace(notes, cand)) insertSorted(notes, cand);
  }
}

/** Blues-scale grace / neighbor ornaments into open space before hits. */
function addBluesOrnaments(notes: NoteEvent[], rootPc: number, rng: () => number): void {
  const targets = notes.filter(
    (n) => n.motifRef !== 'dickinson_ornament' && n.motifRef !== 'dickinson_pickup'
  );
  for (const hit of targets) {
    if (rng() > 0.48) continue;
    const prev = notes.filter((n) => noteEnd(n) <= hit.startBeat + EPS).pop();
    const prevEnd = prev ? noteEnd(prev) : 0;
    const graceDur = 0.125;
    const start = hit.startBeat - graceDur;
    if (start < prevEnd + EPS) continue;
    const cand: NoteEvent = {
      kind: 'note',
      pitch: midiOnBluesNear(hit.pitch, rootPc, true),
      startBeat: start,
      duration: graceDur,
      voice: 1,
      motifRef: 'dickinson_ornament',
      velocity: 70,
    };
    if (canPlace(notes, cand)) insertSorted(notes, cand);
  }
}

/**
 * Call-and-response fills: answer bars (odd) get blues fill cells in the largest gap.
 * Call bars (even) stay lean - contrast is the response.
 */
function addCallResponseFills(
  notes: NoteEvent[],
  barIndex: number,
  rootPc: number,
  rng: () => number
): void {
  if (barIndex % 2 === 0) return;
  if (rng() > 0.4) return;

  type Gap = { start: number; end: number };
  const gaps: Gap[] = [];
  let cursor = 0;
  for (const n of notes) {
    if (n.startBeat > cursor + 0.35) gaps.push({ start: cursor, end: n.startBeat });
    cursor = Math.max(cursor, noteEnd(n));
  }
  if (cursor < 4 - 0.35) gaps.push({ start: cursor, end: 4 });
  gaps.sort((a, b) => b.end - b.start - (a.end - a.start));
  const gap = gaps[0];
  if (!gap || gap.end - gap.start < 0.7) return;

  const span = gap.end - gap.start;
  const nFill = span >= 1.4 ? 3 : 2;
  const step = span / (nFill + 1);
  const anchor = notes[notes.length - 1]?.pitch ?? 60 + rootPc;
  for (let i = 1; i <= nFill; i++) {
    const start = gap.start + step * i - 0.08;
    const dur = Math.min(0.35, step * 0.55);
    const deg = BLUES_DEGREES[randInt(rng, 0, BLUES_DEGREES.length - 1)]!;
    const pc = (rootPc + deg) % 12;
    let pitch = anchor - (anchor % 12) + pc;
    while (pitch > anchor + 7) pitch -= 12;
    while (pitch < anchor - 7) pitch += 12;
    const cand: NoteEvent = {
      kind: 'note',
      pitch: Math.max(45, Math.min(84, pitch)),
      startBeat: start,
      duration: dur,
      voice: 1,
      motifRef: 'dickinson_fill',
      velocity: 82,
    };
    if (canPlace(notes, cand)) insertSorted(notes, cand);
  }
}

/** Duration-driven held phrasing: lengthen notes into following silence. */
function applyHeldSustain(notes: NoteEvent[]): void {
  for (let i = 0; i < notes.length; i++) {
    const n = notes[i]!;
    const nextStart = i + 1 < notes.length ? notes[i + 1]!.startBeat : 4;
    const room = nextStart - n.startBeat;
    if (room <= n.duration + EPS) continue;
    const held = Math.min(room - 0.04, Math.max(n.duration, room * 0.88));
    if (held > n.duration + EPS) n.duration = held;
  }
}

function transformMeasure(measure: MeasureModel, barIndex: number, rng: () => number): void {
  const notes = voice1Notes(measure.events);
  if (notes.length === 0) return;
  const rootPc = rootPcFromChord(measure.chord);

  addTripletPickups(notes, rootPc, rng);
  addBluesOrnaments(notes, rootPc, rng);
  addCallResponseFills(notes, barIndex, rootPc, rng);
  applyHeldSustain(notes);

  measure.events = [...otherEvents(measure.events), ...notes].sort(
    (a, b) =>
      a.startBeat - b.startBeat ||
      (a.kind === 'note' ? a.duration : 0) - (b.kind === 'note' ? b.duration : 0)
  );
}

/**
 * Mutates guitar part in place when enabled. Returns true if flavor applied.
 */
export function applyJimmyHerringDickinsonFlavor(
  score: ScoreModel,
  opts: { seed: number; vrbId?: string; dickinsonFlavor?: boolean }
): boolean {
  if (!isDickinsonFlavorEnabled(opts)) return false;
  const guitar = score.parts.find((p) => p.id === 'guitar');
  if (!guitar?.measures?.length) return false;

  const rng = mulberry32((opts.seed ^ 0xd1c45001) >>> 0);
  for (let i = 0; i < guitar.measures.length; i++) {
    transformMeasure(guitar.measures[i]!, i, rng);
  }
  return true;
}
