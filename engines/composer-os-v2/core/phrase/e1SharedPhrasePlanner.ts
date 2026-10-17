/**
 * V3.4 E1 checkpoint 1 — opt-in shared phrase planner.
 * Six pilot grammars. Off unless `e1PhrasePlanner` is true.
 * Harmony symbols are not rewritten. BHL worlds are not touched.
 */

import { applyOperator } from '../motif-ops/operators';
import type { Motif, MotifNoteEvent } from '../motif-ops/types';
import { chordTonesFromSymbol, noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { normalizeSongwriterStyleKey } from '../song-mode/songwriterStyleProfiles';
import type { NoteEvent, RestEvent, ScoreEvent, ScoreModel } from '../score-model/scoreModelTypes';
import { validateStrictBarMath } from '../score-integrity/strictBarMath';

export const E1_PHRASE_PLANNER_VERSION = 'e1-checkpoint1-1';

export const E1_PILOT_IDS = [
  'john_barry',
  'andrew_hill',
  'bartok',
  'kenny_wheeler',
  'jim_hall',
  'wayne_shorter',
] as const;

export type E1PilotId = (typeof E1_PILOT_IDS)[number];

export type E1Ablation = 'rhythm' | 'motif' | 'rests' | 'transform' | 'secondary';

export interface E1PhrasePlannerReceipt {
  version: string;
  enabled: true;
  status: 'applied' | 'refused';
  profileId: E1PilotId | null;
  ruleId: 'BY-1' | 'HI-1' | 'BA-1' | 'WH-1' | 'HA-1' | 'SH-1' | null;
  seed: number;
  ablate: E1Ablation | null;
  operators: string[];
  transform: string;
  reason?: string;
}

const RULE: Record<E1PilotId, E1PhrasePlannerReceipt['ruleId']> = {
  john_barry: 'BY-1',
  andrew_hill: 'HI-1',
  bartok: 'BA-1',
  kenny_wheeler: 'WH-1',
  jim_hall: 'HA-1',
  wayne_shorter: 'SH-1',
};

const GUITAR_LOW = 52;
const GUITAR_HIGH = 84;
const BASS_LOW = 28;
const BASS_HIGH = 55;
const SEED_REL = [0, 2, 7, 5];
const MAJOR = [0, 2, 4, 5, 7, 9, 11];

interface Span {
  at: number;
  len: number;
  midi: number | null;
}

export interface E1PhrasePlannerRequest {
  seed: number;
  songwriterId?: string | null;
  ablate?: E1Ablation;
  leadSheetLocked?: boolean;
}

function mod12(n: number): number {
  return ((n % 12) + 12) % 12;
}

function isPilot(id: string | null): id is E1PilotId {
  return !!id && (E1_PILOT_IDS as readonly string[]).includes(id);
}

function sequenceSemitones(seed: number): number {
  return [2, 3, 5][Math.abs(seed) % 3]!;
}

function chordAt(symbol: string | undefined): { rootPc: number; fifthPc: number } {
  const raw = (symbol ?? '').trim() || 'C';
  const parsed = parseChordSymbol(raw);
  const tones = chordTonesFromSymbol(parsed.harmonyPart || 'C', { lockedHarmony: true });
  const named = noteNameToPitchClass(parsed.harmonyPart.replace(/[^A-G#b].*$/i, ''));
  const rootPc = named ?? mod12(tones.root);
  return { rootPc, fifthPc: mod12(rootPc + 7) };
}

function placePc(pc: number, low: number, high: number, prefer: number): number {
  let best = low;
  let bestD = 99;
  for (let midi = low; midi <= high; midi++) {
    if (mod12(midi) !== mod12(pc)) continue;
    const d = Math.abs(midi - prefer);
    if (d < bestD) {
      bestD = d;
      best = midi;
    }
  }
  return best;
}

function fold(midi: number, low: number, high: number): number {
  let m = Math.round(midi);
  while (m < low) m += 12;
  while (m > high) m -= 12;
  if (m < low) m = low;
  if (m > high) m = high;
  return m;
}

function inMajor(pc: number, tonic: number): boolean {
  return MAJOR.includes(mod12(pc - tonic));
}

function snapMajor(midi: number, tonic: number, low: number, high: number): number {
  let m = fold(midi, low, high);
  if (inMajor(m, tonic)) return m;
  for (let d = 1; d <= 6; d++) {
    if (m - d >= low && inMajor(m - d, tonic)) return m - d;
    if (m + d <= high && inMajor(m + d, tonic)) return m + d;
  }
  return placePc(tonic, low, high, m);
}

function seedMotif(anchor: number, rel: readonly number[], quarter: number): Motif {
  const events: MotifNoteEvent[] = rel.map((step, i) => ({
    onset: i * quarter,
    duration: quarter,
    midi: anchor + step,
  }));
  return { id: 'e1-seed', events };
}

function operatedMidis(motif: Motif, ops: Array<{ op: 'transpose' | 'invert' | 'augment' | 'fragment-head' | 'transpose-in-field' | 'displace'; params?: Record<string, number> }>, low: number, high: number): { midis: number[]; operators: string[] } {
  let current = motif;
  const operators: string[] = [];
  for (const step of ops) {
    const result = applyOperator(current, step.op, step.params);
    current = result.motif;
    operators.push(step.op);
  }
  const midis = current.events
    .filter((event) => event.midi !== null)
    .map((event) => fold(event.midi as number, low, high));
  return { midis, operators };
}

function normalizeSpans(spans: Span[], total: number): Span[] {
  const sorted = spans
    .filter((span) => span.len > 0)
    .map((span) => ({ ...span }))
    .sort((a, b) => a.at - b.at);
  const out: Span[] = [];
  let cursor = 0;
  for (const span of sorted) {
    const at = Math.max(span.at, cursor);
    const end = Math.min(span.at + span.len, total);
    if (at > cursor) out.push({ at: cursor, len: at - cursor, midi: null });
    if (end > at) out.push({ at, len: end - at, midi: span.midi });
    cursor = Math.max(cursor, end);
  }
  if (cursor < total) out.push({ at: cursor, len: total - cursor, midi: null });
  return out;
}

function tile(pattern: Span[], patternEighths: number, total: number): Span[] {
  const out: Span[] = [];
  for (let origin = 0; origin < total; origin += patternEighths) {
    const room = Math.min(patternEighths, total - origin);
    for (const span of pattern) {
      if (span.at >= room) continue;
      out.push({ at: origin + span.at, len: Math.min(span.len, room - span.at), midi: span.midi });
    }
  }
  return normalizeSpans(out, total);
}

function bassCycle(chords: Array<{ rootPc: number; fifthPc: number }>, eighthsPerBar: number): Span[] {
  const spans: Span[] = [];
  chords.forEach((chord, bar) => {
    const origin = bar * eighthsPerBar;
    const half = eighthsPerBar / 2;
    spans.push({ at: origin, len: half, midi: placePc(chord.rootPc, BASS_LOW, BASS_HIGH, 40) });
    spans.push({ at: origin + half, len: half, midi: placePc(chord.fifthPc, BASS_LOW, BASS_HIGH, 36) });
  });
  return spans;
}

function barryLead(midis: number[]): Span[] {
  const spans: Span[] = [
    { at: 0, len: 8, midi: midis[0]! },
    { at: 8, len: 12, midi: midis[1] ?? midis[0]! },
    { at: 20, len: 4, midi: midis[2] ?? midis[0]! },
  ];
  return normalizeSpans(spans, 32);
}

function hillPair(leadMidis: number[], answerMidis: number[], displaceEighths: number, chords: Array<{ rootPc: number; fifthPc: number }>, bar0: number): { lead: Span[]; bass: Span[] } {
  const lead: Span[] = [];
  const bass: Span[] = [];
  const phraseBars = chords.slice(bar0, bar0 + 4);
  phraseBars.forEach((chord, local) => {
    const origin = (bar0 + local) * 8;
    if (local === 0 || local === 1) {
      const shift = local === 1 ? displaceEighths : 0;
      leadMidis.slice(0, 4).forEach((midi, i) => {
        lead.push({ at: origin + shift + i, len: 1, midi });
      });
      bass.push({ at: origin, len: 2, midi: placePc(chord.rootPc, BASS_LOW, BASS_HIGH, 40) });
      bass.push({ at: origin + 3, len: 1, midi: placePc(chord.fifthPc, BASS_LOW, BASS_HIGH, 43) });
      bass.push({ at: origin + 4, len: 2, midi: placePc(chord.rootPc, BASS_LOW, BASS_HIGH, 40) });
    } else if (local === 2) {
      answerMidis.slice(0, 4).forEach((midi, i) => {
        lead.push({ at: origin + i, len: 1, midi });
      });
    } else {
      bass.push({ at: origin + 2, len: 2, midi: placePc(chord.rootPc, BASS_LOW, BASS_HIGH, 40) });
      bass.push({ at: origin + 4, len: 2, midi: placePc(chord.fifthPc, BASS_LOW, BASS_HIGH, 43) });
    }
  });
  return { lead, bass };
}

function bartokPair(
  leadMidis: number[],
  answerMidis: number[],
  reversed: boolean,
  bar0: number,
): { lead: Span[]; bass: Span[] } {
  const forward = [2, 2, 3, 1];
  const reverse = [1, 3, 2, 2];
  const leadDur = reversed ? reverse : forward;
  const returnDur = reversed ? forward : reverse;
  const lead: Span[] = [];
  const bass: Span[] = [];
  const origin = bar0 * 8;
  let cursor = origin;
  leadDur.forEach((len, i) => {
    lead.push({ at: cursor, len, midi: leadMidis[i % leadMidis.length]! });
    cursor += len;
  });
  const next = origin + 8;
  cursor = next;
  returnDur.forEach((len, i) => {
    lead.push({ at: cursor, len, midi: leadMidis[i % leadMidis.length]! });
    cursor += len;
  });
  cursor = origin + 1;
  [1, 2, 2, 2].forEach((len, i) => {
    bass.push({ at: cursor, len, midi: fold(answerMidis[i % answerMidis.length]! - 24, BASS_LOW, BASS_HIGH) });
    cursor += len;
  });
  cursor = next;
  returnDur.forEach((len, i) => {
    bass.push({ at: cursor, len, midi: fold(leadMidis[i % leadMidis.length]! - 24, BASS_LOW, BASS_HIGH) });
    cursor += len;
  });
  return { lead, bass };
}

function wheelerPhrase(midis: number[], chords: Array<{ rootPc: number; fifthPc: number }>, bar0: number, tonic: number): { lead: Span[]; bass: Span[] } {
  const snap = (midi: number) => snapMajor(midi, tonic, GUITAR_LOW, GUITAR_HIGH);
  const target = snap(midis[2] ?? midis[0]!);
  const lead: Span[] = [
    { at: bar0 * 8 + 1, len: 1, midi: snap(midis[0]!) },
    { at: bar0 * 8 + 2, len: 2, midi: snap(midis[1] ?? midis[0]!) },
    { at: bar0 * 8 + 4, len: 6, midi: target },
    { at: (bar0 + 1) * 8 + 2, len: 2, midi: snap(midis[3] ?? midis[0]!) },
    { at: (bar0 + 1) * 8 + 4, len: 2, midi: snap(midis[0]!) },
    { at: (bar0 + 2) * 8 + 2, len: 4, midi: target },
    { at: (bar0 + 2) * 8 + 6, len: 2, midi: snap(midis[1] ?? midis[0]!) },
    { at: (bar0 + 3) * 8, len: 6, midi: snap(midis[0]!) },
  ];
  const bass: Span[] = [];
  for (let i = 0; i < 4; i++) {
    const chord = chords[bar0 + i] ?? chords[0]!;
    const origin = (bar0 + i) * 8;
    bass.push({ at: origin, len: 4, midi: placePc(chord.rootPc, BASS_LOW, BASS_HIGH, 40) });
    bass.push({ at: origin + 4, len: 4, midi: placePc(chord.fifthPc, BASS_LOW, BASS_HIGH, 36) });
  }
  return { lead, bass };
}

function hallPair(statement: number[], answer: number[], chords: Array<{ rootPc: number; fifthPc: number }>, bar0: number): { lead: Span[]; bass: Span[] } {
  const lead: Span[] = [];
  const bass: Span[] = [];
  statement.slice(0, 3).forEach((midi, i) => {
    lead.push({ at: bar0 * 8 + i, len: 1, midi });
  });
  const chord = chords[bar0 + 1] ?? chords[bar0]!;
  answer.slice(0, 2).forEach((midi, i) => {
    bass.push({
      at: (bar0 + 1) * 8 + i,
      len: 1,
      midi: fold(midi - 12, BASS_LOW, BASS_HIGH) || placePc(chord.rootPc, BASS_LOW, BASS_HIGH, 40),
    });
  });
  return { lead, bass };
}

function shorterPhrase(midis: number[], chords: Array<{ rootPc: number; fifthPc: number }>, bar0: number, displace: number): { lead: Span[]; bass: Span[] } {
  const cell = midis.slice(0, 4);
  const salient = cell[2] ?? cell[0]!;
  const lead: Span[] = [];
  const origin = bar0 * 8 + displace;
  lead.push({ at: origin + 1, len: 1, midi: cell[0]! });
  lead.push({ at: origin + 2, len: 1, midi: cell[1] ?? cell[0]! });
  lead.push({ at: origin + 3, len: 1, midi: cell[2] ?? cell[0]! });
  lead.push({ at: origin + 4, len: 1, midi: cell[3] ?? cell[0]! });
  lead.push({ at: origin + 5, len: 7, midi: salient });
  lead.push({ at: origin + 16, len: 1, midi: cell[0]! });
  lead.push({ at: origin + 17, len: 1, midi: cell[1] ?? cell[0]! });
  lead.push({ at: origin + 18, len: 1, midi: cell[2] ?? cell[0]! });
  lead.push({ at: origin + 19, len: 1, midi: cell[3] ?? cell[0]! });
  lead.push({ at: origin + 24, len: 2, midi: cell[0]! });
  lead.push({ at: origin + 26, len: 2, midi: cell[3] ?? cell[0]! });
  const bass: Span[] = [];
  for (let i = 0; i < 4; i++) {
    const chord = chords[bar0 + i] ?? chords[0]!;
    const barAt = (bar0 + i) * 8;
    if (i === 1) {
      bass.push({ at: barAt + 2, len: 4, midi: placePc(chord.rootPc, BASS_LOW, BASS_HIGH, 40) });
      bass.push({ at: barAt + 6, len: 2, midi: placePc(chord.fifthPc, BASS_LOW, BASS_HIGH, 36) });
    } else {
      bass.push({ at: barAt, len: 6, midi: placePc(chord.rootPc, BASS_LOW, BASS_HIGH, 40) });
      bass.push({ at: barAt + 6, len: 2, midi: placePc(chord.fifthPc, BASS_LOW, BASS_HIGH, 36) });
    }
  }
  return {
    lead: lead.filter((span) => span.at < (bar0 + 4) * 8),
    bass,
  };
}

function ablateRhythm(spans: Span[], total: number): Span[] {
  const notes = normalizeSpans(spans, total).filter((span) => span.midi !== null);
  const out: Span[] = [];
  for (const span of notes) {
    const end = span.at + span.len;
    let at = span.at - (span.at % 2);
    if (at < span.at) at += 2;
    for (; at + 2 <= end; at += 2) {
      out.push({ at, len: 2, midi: span.midi });
    }
  }
  return normalizeSpans(out, total);
}

function ablateMotif(spans: Span[], total: number, roots: number[], low: number, high: number): Span[] {
  return normalizeSpans(spans, total).map((span) => {
    if (span.midi === null) return span;
    const bar = Math.floor(span.at / 8);
    return { ...span, midi: placePc(roots[bar] ?? roots[0] ?? 0, low, high, low + 12) };
  });
}

function ablateRests(spans: Span[], total: number, fallback: number): Span[] {
  let last = fallback;
  return normalizeSpans(spans, total).map((span) => {
    if (span.midi !== null) {
      last = span.midi;
      return span;
    }
    return { ...span, midi: last };
  });
}

function spansToEvents(spans: Span[], barCount: number, voice: number, motifRef: string): ScoreEvent[][] {
  const bars: ScoreEvent[][] = Array.from({ length: barCount }, () => []);
  const covered = normalizeSpans(spans, barCount * 8);
  for (let bar = 0; bar < barCount; bar++) {
    const origin = bar * 8;
    const slices: Array<{ at: number; len: number; midi: number | null; tie: NoteEvent['notation'] }> = [];
    for (const span of covered) {
      const start = Math.max(span.at, origin);
      const end = Math.min(span.at + span.len, origin + 8);
      if (end <= start) continue;
      const crossesOut = span.midi !== null && end < span.at + span.len;
      const crossesIn = span.midi !== null && start > span.at;
      let tie: NoteEvent['notation'];
      if (crossesIn && crossesOut) tie = { tie: 'continue' };
      else if (crossesOut) tie = { tie: 'start' };
      else if (crossesIn) tie = { tie: 'stop' };
      slices.push({ at: (start - origin) / 2, len: (end - start) / 2, midi: span.midi, tie });
    }
    let cursor = 0;
    for (const slice of slices) {
      if (slice.at > cursor + 1e-9) {
        bars[bar]!.push({ kind: 'rest', startBeat: cursor, duration: slice.at - cursor, voice });
      }
      if (slice.midi === null) {
        const rest: RestEvent = { kind: 'rest', startBeat: slice.at, duration: slice.len, voice };
        bars[bar]!.push(rest);
      } else {
        const note: NoteEvent = {
          kind: 'note',
          pitch: slice.midi,
          startBeat: slice.at,
          duration: slice.len,
          voice,
          motifRef,
          ...(slice.tie ? { notation: slice.tie } : {}),
        };
        bars[bar]!.push(note);
      }
      cursor = slice.at + slice.len;
    }
    if (cursor < 4 - 1e-9) {
      bars[bar]!.push({ kind: 'rest', startBeat: cursor, duration: 4 - cursor, voice });
    }
  }
  return bars;
}

function buildVoices(
  profile: E1PilotId,
  chords: Array<{ rootPc: number; fifthPc: number }>,
  seed: number,
  transform: boolean,
): { lead: Span[]; bass: Span[]; operators: string[]; transform: string } {
  const barCount = chords.length;
  const total = barCount * 8;
  const half = Math.floor(barCount / 2) * 8;
  const anchor = placePc(chords[0]?.rootPc ?? 2, GUITAR_LOW, GUITAR_HIGH, 62);
  const tonic = chords[0]?.rootPc ?? 0;
  const seq = sequenceSemitones(seed);
  const operators: string[] = [];
  const base = seedMotif(anchor, SEED_REL, 1);
  const chromatic = seedMotif(anchor, [0, 1, 3, 2], 1);

  const lead: Span[] = [];
  const bass: Span[] = [];
  let transformLabel = 'none';

  if (profile === 'john_barry') {
    const plain = operatedMidis(base, [{ op: 'augment', params: { factor: 2 } }], GUITAR_LOW, GUITAR_HIGH);
    const moved = operatedMidis(
      base,
      [
        { op: 'transpose', params: { semitones: seq } },
        { op: 'augment', params: { factor: 2 } },
      ],
      GUITAR_LOW,
      GUITAR_HIGH,
    );
    operators.push(...plain.operators, ...moved.operators);
    transformLabel = transform ? `transpose+${seq} then augment` : 'augment only';
    for (let origin = 0; origin < total; origin += 32) {
      const useMoved = transform && origin >= half;
      const phrase = barryLead(useMoved ? moved.midis : plain.midis).map((span) => ({
        ...span,
        at: span.at + origin,
      }));
      lead.push(...phrase);
    }
    bass.push(...bassCycle(chords, 8));
  } else if (profile === 'andrew_hill') {
    const cell = operatedMidis(base, [], GUITAR_LOW, GUITAR_HIGH);
    const inverted = operatedMidis(base, [{ op: 'invert' }], GUITAR_LOW, GUITAR_HIGH);
    operators.push('invert');
    transformLabel = transform ? 'return restores eighth alignment' : 'displaced repeat';
    for (let bar = 0; bar + 3 < barCount; bar += 4) {
      const displace = transform && bar * 8 >= half ? 0 : 1;
      const pair = hillPair(cell.midis, inverted.midis, displace, chords, bar);
      lead.push(...pair.lead);
      bass.push(...pair.bass);
    }
  } else if (profile === 'bartok') {
    const cell = operatedMidis(chromatic, [], GUITAR_LOW, GUITAR_HIGH);
    const inverted = operatedMidis(chromatic, [{ op: 'invert' }], GUITAR_LOW, GUITAR_HIGH);
    operators.push('invert');
    transformLabel = transform ? 'second half reverses the opening group' : 'short-long group';
    for (let bar = 0; bar + 1 < barCount; bar += 2) {
      const reversed = transform && bar * 8 >= half;
      const pair = bartokPair(cell.midis, inverted.midis, reversed, bar);
      lead.push(...pair.lead);
      bass.push(...pair.bass);
    }
  } else if (profile === 'kenny_wheeler') {
    const plain = operatedMidis(base, [], GUITAR_LOW, GUITAR_HIGH);
    const field = MAJOR.map((degree) => mod12(tonic + degree));
    const moved = applyOperator({ ...base, field }, 'transpose-in-field', { degrees: 1 });
    operators.push('transpose-in-field');
    const movedMidis = moved.motif.events
      .filter((event) => event.midi !== null)
      .map((event) => snapMajor(event.midi as number, tonic, GUITAR_LOW, GUITAR_HIGH));
    transformLabel = transform ? 'collection degree +1 on the return' : 'reference collection';
    for (let bar = 0; bar + 3 < barCount; bar += 4) {
      const midis = transform && bar * 8 >= half ? movedMidis : plain.midis;
      const phrase = wheelerPhrase(midis, chords, bar, tonic);
      lead.push(...phrase.lead);
      bass.push(...phrase.bass);
    }
  } else if (profile === 'jim_hall') {
    const statement = operatedMidis(base, [{ op: 'fragment-head', params: { count: 3 } }], GUITAR_LOW, GUITAR_HIGH);
    const short = operatedMidis(base, [{ op: 'fragment-head', params: { count: 2 } }], GUITAR_LOW, GUITAR_HIGH);
    const inverted = operatedMidis(
      base,
      [
        { op: 'invert' },
        { op: 'fragment-head', params: { count: 2 } },
      ],
      GUITAR_LOW,
      GUITAR_HIGH,
    );
    operators.push('fragment-head', 'invert');
    transformLabel = transform ? 'answer inverts the cell' : 'shortened echo';
    for (let bar = 0; bar + 1 < barCount; bar += 2) {
      const answer = transform && bar * 8 >= half ? inverted.midis : short.midis;
      const pair = hallPair(statement.midis, answer, chords, bar);
      lead.push(...pair.lead);
      bass.push(...pair.bass);
    }
  } else {
    const cell = operatedMidis(base, [], GUITAR_LOW, GUITAR_HIGH);
    const moved = operatedMidis(base, [{ op: 'displace', params: { beats: 1 } }], GUITAR_LOW, GUITAR_HIGH);
    operators.push('displace');
    transformLabel = transform ? 'motif displaced by one beat' : 'kernel on the original grid';
    for (let bar = 0; bar + 3 < barCount; bar += 4) {
      const displace = transform && bar * 8 >= half ? 2 : 0;
      const phrase = shorterPhrase(displace > 0 ? moved.midis : cell.midis, chords, bar, displace);
      lead.push(...phrase.lead);
      bass.push(...phrase.bass);
    }
  }

  return {
    lead: normalizeSpans(lead, total),
    bass: normalizeSpans(bass, total),
    operators: [...new Set(operators)],
    transform: transformLabel,
  };
}

function cloneScore(score: ScoreModel): ScoreModel {
  return {
    ...score,
    parts: score.parts.map((part) => ({
      ...part,
      measures: part.measures.map((measure) => ({
        ...measure,
        events: measure.events.map((event) => ({ ...event })),
      })),
    })),
  };
}

export function applyE1SharedPhrasePlanner(
  score: ScoreModel,
  request: E1PhrasePlannerRequest,
): { score: ScoreModel; receipt: E1PhrasePlannerReceipt } {
  const profileId = isPilot(normalizeSongwriterStyleKey(request.songwriterId ?? '') ?? request.songwriterId ?? null)
    ? ((normalizeSongwriterStyleKey(request.songwriterId ?? '') ?? request.songwriterId) as E1PilotId)
    : null;
  const base: E1PhrasePlannerReceipt = {
    version: E1_PHRASE_PLANNER_VERSION,
    enabled: true,
    status: 'refused',
    profileId,
    ruleId: profileId ? RULE[profileId] : null,
    seed: request.seed,
    ablate: request.ablate ?? null,
    operators: [],
    transform: 'none',
  };
  if (!profileId || !base.ruleId) {
    return { score, receipt: { ...base, reason: 'songwriter is outside the six-pilot set' } };
  }
  if (request.leadSheetLocked) {
    return { score, receipt: { ...base, reason: 'source-locked lead-sheet notes' } };
  }
  const guitar = score.parts.find((part) => part.instrumentIdentity === 'clean_electric_guitar');
  const bass = score.parts.find((part) => part.instrumentIdentity === 'acoustic_upright_bass');
  if (!guitar || !bass || guitar.measures.length === 0 || guitar.measures.length !== bass.measures.length) {
    return { score, receipt: { ...base, reason: 'guitar and bass parts are not aligned' } };
  }
  if (guitar.measures.some((measure) => (measure.measureBeatSpanQuarters ?? 4) !== 4)) {
    return { score, receipt: { ...base, reason: 'pilot planner currently requires 4/4' } };
  }
  const chordsBefore = guitar.measures.map((measure) => measure.chord ?? '');
  const chords = guitar.measures.map((measure) => chordAt(measure.chord));
  const built = buildVoices(profileId, chords, request.seed, request.ablate !== 'transform');
  let lead = built.lead;
  let bassSpans = built.bass;
  const roots = chords.map((chord) => chord.rootPc);
  const total = guitar.measures.length * 8;
  if (request.ablate === 'rhythm') {
    lead = ablateRhythm(lead, total);
    bassSpans = ablateRhythm(bassSpans, total);
  } else if (request.ablate === 'motif') {
    lead = ablateMotif(lead, total, roots, GUITAR_LOW, GUITAR_HIGH);
    bassSpans = ablateMotif(bassSpans, total, roots, BASS_LOW, BASS_HIGH);
  } else if (request.ablate === 'rests') {
    lead = ablateRests(lead, total, placePc(roots[0] ?? 0, GUITAR_LOW, GUITAR_HIGH, 64));
    bassSpans = ablateRests(bassSpans, total, placePc(roots[0] ?? 0, BASS_LOW, BASS_HIGH, 40));
  } else if (request.ablate === 'secondary') {
    bassSpans = lead.map((span) => ({
      ...span,
      midi: span.midi === null ? null : fold(span.midi - 24, BASS_LOW, BASS_HIGH),
    }));
  }
  const motifRef = `e1:${base.ruleId}`;
  const leadBars = spansToEvents(lead, guitar.measures.length, 1, motifRef);
  const bassBars = spansToEvents(bassSpans, bass.measures.length, 1, motifRef);
  const next = cloneScore(score);
  const nextGuitar = next.parts.find((part) => part.instrumentIdentity === 'clean_electric_guitar')!;
  const nextBass = next.parts.find((part) => part.instrumentIdentity === 'acoustic_upright_bass')!;
  nextGuitar.measures.forEach((measure, index) => {
    measure.events = leadBars[index] ?? measure.events;
  });
  nextBass.measures.forEach((measure, index) => {
    measure.events = bassBars[index] ?? measure.events;
  });
  const chordsAfter = nextGuitar.measures.map((measure) => measure.chord ?? '');
  if (chordsAfter.join('|') !== chordsBefore.join('|')) {
    return { score, receipt: { ...base, reason: 'planner attempted to change harmony symbols' } };
  }
  const math = validateStrictBarMath(next);
  if (!math.valid) {
    return { score, receipt: { ...base, operators: built.operators, reason: math.errors[0] ?? 'bar math failed' } };
  }
  return {
    score: next,
    receipt: {
      ...base,
      status: 'applied',
      operators: built.operators,
      transform: built.transform,
    },
  };
}
