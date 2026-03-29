/**
 * Song Mode — Phase C1/C2 rhythm overlay (soft, deterministic; guitar + bass phrase feel).
 * C2 FINAL LOCK: mode timing for phrase first/second onset (onset order) runs first in phrase-intent layer; then velocity/grouping/etc.; then note-level overlay.
 * Runs after phrase / identity / cadence / style velocity; before bar-math seal + validation.
 * Note-level durations stay on eighth grid unless a later sub-pass adjusts them.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import type { MeasureModel, NoteEvent, PartModel, ScoreModel } from '../score-model/scoreModelTypes';
import { BEATS_PER_MEASURE } from '../score-model/scoreModelTypes';
import { createRest } from '../score-model/scoreEventBuilder';
import { seededUnit } from './guitarBassDuoHarmony';
import { normalizeMeasureToEighthBeatGrid, snapAttackBeatToGrid } from '../score-integrity/duoEighthBeatGrid';
import { songModePhraseSegments } from './songModePhraseEngineV1';
import {
  JAMES_BROWN_FUNK_OVERLAY_ID,
  JAMES_BROWN_FUNK_OVERLAY_SOFT_PROFILE,
  SONG_MODE_OVERLAY_BASE_WEIGHTS,
} from './jamesBrownFunkOverlay';

export { JAMES_BROWN_FUNK_OVERLAY_ID, JAMES_BROWN_FUNK_OVERLAY_SOFT_PROFILE, SONG_MODE_OVERLAY_BASE_WEIGHTS };

const GRID_8TH = 0.5;
const GRID_16TH = 0.25;

/** Phase C1 overlay ids (jazz / songwriter / ECM). Random selection pool only — excludes Phase C3 JAMES_BROWN_FUNK. */
export const SONG_MODE_RHYTHM_OVERLAY_IDS = [
  'SHORTER',
  'FAGEN',
  'SCHNEIDER',
  'MONK',
  'BLADE',
  'ECM',
] as const;

/** Full registry including Phase C3 funk (manual / explicit only; baseWeight 0). */
export const SONG_MODE_ALL_OVERLAY_IDS = [...SONG_MODE_RHYTHM_OVERLAY_IDS, JAMES_BROWN_FUNK_OVERLAY_ID] as const;

export type SongModeRhythmOverlayId = (typeof SONG_MODE_RHYTHM_OVERLAY_IDS)[number];

/** Phase C2 — phrase-level rhythm intent (metadata + soft velocity/articulation bias only). */
export type PhraseRhythmIntent = {
  entryBias: 'onbeat' | 'offbeat' | 'late';
  groupingBias: 'even' | 'odd' | 'fragmented' | 'arc';
  densityShape: 'flat' | 'burst_rest' | 'swell' | 'sparse';
  barlineBehavior: 'contained' | 'crossing' | 'delayed';
};

export type SongModeRhythmStrength = 'stable' | 'balanced' | 'surprise';

export interface SongModeRhythmOverlayPhraseDebug {
  phraseIndex: number;
  appliedOverlays: { id: string; weight: number }[];
  overlayRhythmProfile: string;
  rhythmIntent: PhraseRhythmIntent;
  rhythmIntentSummary: string;
}

interface OverlaySoftProfile {
  durTighten: number;
  velDelta: number;
  syncAccent: number;
}

/** C2 — minimal note-level profile nudges (SHORTER cross-bar, MONK gaps, ECM sustain, FAGEN sync). */
const OVERLAY_PROFILES: Record<SongModeRhythmOverlayId, OverlaySoftProfile> = {
  SHORTER: { durTighten: 0.48, velDelta: 2, syncAccent: 0.3 },
  FAGEN: { durTighten: 0.11, velDelta: 5, syncAccent: 0.55 },
  SCHNEIDER: { durTighten: 0.1, velDelta: 1, syncAccent: 0.4 },
  MONK: { durTighten: 0.34, velDelta: 7, syncAccent: 0.62 },
  BLADE: { durTighten: 0.2, velDelta: 7, syncAccent: 0.58 },
  ECM: { durTighten: 0.06, velDelta: -6, syncAccent: 0.12 },
};

const OVERLAY_INTENT: Record<SongModeRhythmOverlayId, PhraseRhythmIntent> = {
  SHORTER: {
    entryBias: 'offbeat',
    groupingBias: 'odd',
    densityShape: 'burst_rest',
    barlineBehavior: 'crossing',
  },
  FAGEN: {
    entryBias: 'onbeat',
    groupingBias: 'even',
    densityShape: 'flat',
    barlineBehavior: 'contained',
  },
  SCHNEIDER: {
    entryBias: 'late',
    groupingBias: 'arc',
    densityShape: 'swell',
    barlineBehavior: 'delayed',
  },
  MONK: {
    entryBias: 'late',
    groupingBias: 'fragmented',
    densityShape: 'sparse',
    barlineBehavior: 'contained',
  },
  BLADE: {
    entryBias: 'offbeat',
    groupingBias: 'arc',
    densityShape: 'swell',
    barlineBehavior: 'crossing',
  },
  ECM: {
    entryBias: 'late',
    groupingBias: 'arc',
    densityShape: 'sparse',
    barlineBehavior: 'delayed',
  },
};

const NEUTRAL_INTENT: PhraseRhythmIntent = {
  entryBias: 'onbeat',
  groupingBias: 'even',
  densityShape: 'flat',
  barlineBehavior: 'contained',
};

interface PhraseNoteRef {
  bar: number;
  n: NoteEvent;
  phraseNoteIndex: number;
  phraseNoteCount: number;
}

interface BlendedSoft {
  durTighten: number;
  velDelta: number;
  syncAccent: number;
}

function blendOverlays(applied: { id: string; weight: number }[]): BlendedSoft {
  let dur = 0;
  let vel = 0;
  let sync = 0;
  let wsum = 0;
  for (const o of applied) {
    const p = OVERLAY_PROFILES[o.id as SongModeRhythmOverlayId];
    if (!p) continue;
    const w = o.weight;
    dur += p.durTighten * w;
    vel += p.velDelta * w;
    sync += p.syncAccent * w;
    wsum += w;
  }
  if (wsum < 1e-6) return { durTighten: 0, velDelta: 0, syncAccent: 0 };
  return { durTighten: dur / wsum, velDelta: vel / wsum, syncAccent: sync / wsum };
}

function blendIntentField<T extends string>(
  applied: { id: string; weight: number }[],
  pick: (id: SongModeRhythmOverlayId) => T
): T {
  const weights = new Map<T, number>();
  for (const o of applied) {
    const id = o.id as SongModeRhythmOverlayId;
    if (!OVERLAY_INTENT[id]) continue;
    const v = pick(id);
    weights.set(v, (weights.get(v) ?? 0) + o.weight);
  }
  let best: T | undefined;
  let bestW = -1;
  for (const [k, w] of weights) {
    if (w > bestW) {
      bestW = w;
      best = k;
    }
  }
  return best ?? (pick('FAGEN') as T);
}

/**
 * Deterministic phrase intent from selected overlays + strength tier (Stable / Balanced / Surprise).
 */
export function derivePhraseRhythmIntent(
  applied: { id: string; weight: number }[],
  _strength: SongModeRhythmStrength | undefined,
  _seed: number,
  _phraseIdx: number
): PhraseRhythmIntent {
  if (applied.length === 0) return { ...NEUTRAL_INTENT };
  return {
    entryBias: blendIntentField(applied, (id) => OVERLAY_INTENT[id].entryBias),
    groupingBias: blendIntentField(applied, (id) => OVERLAY_INTENT[id].groupingBias),
    densityShape: blendIntentField(applied, (id) => OVERLAY_INTENT[id].densityShape),
    barlineBehavior: blendIntentField(applied, (id) => OVERLAY_INTENT[id].barlineBehavior),
  };
}

/** C2 — mode-scaled intent strength (Stable / Balanced / Surprise). */
function intentStrengthFromMode(strength: SongModeRhythmStrength | undefined): number {
  const s = strength ?? 'balanced';
  if (s === 'stable') return 0.6;
  if (s === 'balanced') return 1;
  return 1.35;
}

/** C2 final — grouping anchor vs interior contrast by mode (structural, not decorative). */
function modeGroupingStructuralScale(strength: SongModeRhythmStrength | undefined): number {
  const s = strength ?? 'balanced';
  if (s === 'stable') return 0.82;
  if (s === 'balanced') return 1;
  return 1.34;
}

/** Opening phrase bars 1–2: stronger mode read (deterministic). */
function isOpeningTwoBarsOfScore(phraseIdx: number, bar: number): boolean {
  return phraseIdx === 0 && bar >= 1 && bar <= 2;
}

/** First two melodic attacks of the phrase (chronological). */
function isFirstTwoNotesOfPhrase(ref: PhraseNoteRef): boolean {
  return ref.phraseNoteIndex === 0 || ref.phraseNoteIndex === 1;
}

/** Fixed velocity bias for phrase notes 0/1 by mode (before intentStrength scaling in loop). */
function modeEarlyPairVelocityBias(
  strength: SongModeRhythmStrength | undefined,
  phraseNoteIndex: 0 | 1
): number {
  const s = strength ?? 'balanced';
  if (s === 'stable') return phraseNoteIndex === 0 ? -5 : -4;
  if (s === 'balanced') return 0;
  return phraseNoteIndex === 0 ? 12 : 4;
}

function formatIntentSummary(
  intent: PhraseRhythmIntent,
  strength: SongModeRhythmStrength | undefined,
  profile: string
): string {
  const st = strength ?? 'balanced';
  const parts = [
    `${intent.entryBias} entry`,
    `${intent.groupingBias} grouping`,
    intent.densityShape.replace('_', '-'),
    `${intent.barlineBehavior} barline`,
  ];
  return `${profile} (${st}): ${parts.join(', ')}`;
}

function selectOverlaysForPhrase(phraseIdx: number, seed: number): { id: string; weight: number }[] {
  const u0 = seededUnit(seed, phraseIdx, 93100);
  const count = u0 < 0.28 ? 0 : u0 < 0.62 ? 1 : 2;
  if (count === 0) return [];
  const pool = [...SONG_MODE_RHYTHM_OVERLAY_IDS];
  const out: { id: string; weight: number }[] = [];
  for (let k = 0; k < count; k++) {
    const j = Math.floor(seededUnit(seed, phraseIdx, 93110 + k + phraseIdx * 5) * pool.length);
    const id = pool[j];
    pool.splice(j, 1);
    out.push({ id, weight: 0.25 + seededUnit(seed, phraseIdx, 93120 + k * 13) * 0.5 });
  }
  return out;
}

function profileString(overlays: { id: string; weight: number }[]): string {
  if (overlays.length === 0) return 'none';
  return [...overlays.map((o) => o.id)].sort().join('+');
}

function isOffbeatStart(sb: number): boolean {
  return (
    Math.abs(sb - 0.5) < 0.02 ||
    Math.abs(sb - 1.5) < 0.02 ||
    Math.abs(sb - 2.5) < 0.02 ||
    Math.abs(sb - 3.5) < 0.02
  );
}

/** Fixed late shift: clamp(GRID_8TH, GRID_16TH, GRID_8TH * 1.5) on the eighth grid. */
function fixedShiftLateBeats(): number {
  const raw = Math.min(Math.max(GRID_8TH, GRID_16TH), GRID_8TH * 1.5);
  return snapAttackBeatToGrid(raw);
}

function normalizePhraseBars(part: PartModel, startBar: number, endBar: number): void {
  for (let b = startBar; b <= endBar; b++) {
    const m = part.measures.find((x) => x.index === b);
    if (m) normalizeMeasureToEighthBeatGrid(m);
  }
}

interface BarNoteRef {
  bar: number;
  n: NoteEvent;
}

/** Chronological phrase notes (onset order across bars); not phraseNoteIndex. */
function collectPhraseNotesInOnsetOrder(part: PartModel, startBar: number, endBar: number): BarNoteRef[] {
  const out: BarNoteRef[] = [];
  for (let b = startBar; b <= endBar; b++) {
    const m = part.measures.find((x) => x.index === b);
    if (!m) continue;
    for (const e of m.events) {
      if (e.kind === 'note') out.push({ bar: b, n: e as NoteEvent });
    }
  }
  out.sort((a, b) => (a.bar - b.bar) || a.n.startBeat - b.n.startBeat);
  return out;
}

/** Shift note later; duration unchanged; same bar; gap filled with rest. Shift clamps to available room. */
function shiftNoteOnsetLatePreserveDuration(measure: MeasureModel, note: NoteEvent, shiftBeats: number): void {
  const S = snapAttackBeatToGrid;
  const shift = S(shiftBeats);
  if (shift < 1e-6) return;

  const ev = [...measure.events]
    .filter((e) => e.kind === 'note' || e.kind === 'rest')
    .sort((a, b) => a.startBeat - b.startBeat);
  const i = ev.findIndex((e) => e === note);
  if (i < 0) return;

  const nextStart = i + 1 < ev.length ? ev[i + 1].startBeat : BEATS_PER_MEASURE;
  const dur = note.duration;
  const maxByNext = nextStart - note.startBeat - dur;
  const maxByBar = BEATS_PER_MEASURE - note.startBeat - dur;
  const maxAllow = Math.min(maxByNext, maxByBar);
  const actualShift = S(Math.min(shift, Math.max(0, maxAllow)));
  if (actualShift < 1e-6) return;

  const newStart = S(note.startBeat + actualShift);
  const prevEnd =
    i === 0 ? 0 : S(ev[i - 1].startBeat + (ev[i - 1] as { duration: number }).duration);

  if (newStart < prevEnd - 1e-4) return;

  if (newStart > prevEnd + 1e-4) {
    const p = i > 0 ? ev[i - 1] : null;
    if (p && p.kind === 'rest') {
      (p as { duration: number }).duration = S(newStart - p.startBeat);
    } else if (p && p.kind === 'note') {
      const pe = p as NoteEvent;
      const pEnd = S(pe.startBeat + pe.duration);
      if (newStart > pEnd + 1e-4) measure.events.push(createRest(pEnd, S(newStart - pEnd)));
    } else if (i === 0 && newStart > 1e-4) {
      measure.events.push(createRest(0, S(newStart)));
    }
  }

  note.startBeat = newStart;
}

function applyShiftToPhraseNote(part: PartModel, bar: number, note: NoteEvent, shiftBeats: number): void {
  const m = part.measures.find((x) => x.index === bar);
  if (!m) return;
  shiftNoteOnsetLatePreserveDuration(m, note, shiftBeats);
  normalizeMeasureToEighthBeatGrid(m);
}

/**
 * C2 FINAL LOCK — first in phrase-intent layer (after overlays + intent derived).
 * Onset order: firstNote / secondNote. Stable: no shift. Balanced: second only. Surprise: both (later note first in-bar).
 */
function applyPhraseEarlyIdentityLock(
  guitar: PartModel,
  bass: PartModel | undefined,
  startBar: number,
  endBar: number,
  strength: SongModeRhythmStrength | undefined
): void {
  normalizePhraseBars(guitar, startBar, endBar);
  if (bass) normalizePhraseBars(bass, startBar, endBar);

  const shift = fixedShiftLateBeats();
  const s = strength ?? 'balanced';
  if (s === 'stable') return;

  const applyPart = (part: PartModel) => {
    const ordered = collectPhraseNotesInOnsetOrder(part, startBar, endBar);
    if (ordered.length === 0) return;
    const first = ordered[0]!;
    const second = ordered.length > 1 ? ordered[1]! : null;

    if (s === 'balanced') {
      if (second) applyShiftToPhraseNote(part, second.bar, second.n, shift);
      return;
    }

    if (second) applyShiftToPhraseNote(part, second.bar, second.n, shift);
    applyShiftToPhraseNote(part, first.bar, first.n, shift);
  };

  applyPart(guitar);
  if (bass) applyPart(bass);
}

function anchorIndicesForPattern(p: number[]): number[] {
  const out: number[] = [];
  let acc = 0;
  for (const g of p) {
    acc += g;
    out.push(acc - 1);
  }
  return out;
}

function chooseBestGroupingPattern(
  noteCount: number,
  patterns: number[][],
  seed: number,
  phraseIdx: number
): number[] {
  let best = patterns[0]!;
  let bestDiff = 999;
  patterns.forEach((p, idx) => {
    const s = p.reduce((a, b) => a + b, 0);
    const d = Math.abs(s - noteCount);
    if (d < bestDiff || (d === bestDiff && seededUnit(seed, phraseIdx, 93700 + idx) < 0.45)) {
      bestDiff = d;
      best = p;
    }
  });
  return best;
}

function applyGroupingTemplateBias(
  phraseNotes: PhraseNoteRef[],
  intent: PhraseRhythmIntent,
  intentStrength: number,
  strength: SongModeRhythmStrength | undefined,
  seed: number,
  phraseIdx: number,
  guitar: PartModel
): void {
  if (phraseNotes.length === 0) return;
  const nc = phraseNotes.length;
  const struct = modeGroupingStructuralScale(strength);
  const patternsByGrouping: Record<PhraseRhythmIntent['groupingBias'], number[][]> = {
    odd: [
      [3, 3, 2],
      [3, 2, 3],
      [5, 3],
    ],
    even: [
      [2, 2, 2, 2],
      [4, 4],
    ],
    fragmented: [
      [2, 1, 3, 2],
      [1, 2, 1, 2, 2],
      [2, 1, 2, 1, 2],
    ],
    arc: [
      [4, 4],
      [3, 5],
      [2, 3, 3],
    ],
  };
  const pat = chooseBestGroupingPattern(nc, patternsByGrouping[intent.groupingBias], seed, phraseIdx);
  const cycleLen = pat.reduce((a, b) => a + b, 0);
  if (cycleLen <= 0) return;
  const anchors = new Set(anchorIndicesForPattern(pat));
  const accentBoost = 0.34 * intentStrength * struct;
  const durationSkew = 0.2 * intentStrength * struct;
  for (const ref of phraseNotes) {
    const ni = ref.phraseNoteIndex;
    const pos = ni % cycleLen;
    const isAnchor = anchors.has(pos);
    const earlyPair = isFirstTwoNotesOfPhrase(ref);
    const anchorWeight = earlyPair ? (isAnchor ? 1.28 : 1.18) : 1;
    const n = ref.n;
    const base = n.velocity ?? 90;
    if (isAnchor) {
      n.velocity = Math.min(127, Math.round(base + 14 * accentBoost * anchorWeight));
      if (!n.articulation) n.articulation = 'accent';
    } else {
      n.velocity = Math.max(1, Math.round(base - 7 * accentBoost));
    }
    const m = guitar.measures.find((x) => x.index === ref.bar);
    if (!m) continue;
    const ev = [...m.events]
      .filter((e) => e.kind === 'note' || e.kind === 'rest')
      .sort((a, b) => a.startBeat - b.startBeat);
    const niLocal = ev.findIndex((e) => e === n);
    if (niLocal < 0) continue;
    const nextStart =
      niLocal + 1 < ev.length ? ev[niLocal + 1].startBeat : BEATS_PER_MEASURE;
    const room = nextStart - n.startBeat - n.duration;
    if (isAnchor && room > 0.2) {
      const add = Math.min(durationSkew * 0.55 * anchorWeight, room - 0.1);
      n.duration = snapAttackBeatToGrid(Math.min(nextStart - n.startBeat - 0.25, n.duration + add));
    } else if (!isAnchor && n.duration > 0.5 + 1e-4) {
      n.duration = snapAttackBeatToGrid(Math.max(0.5, n.duration - durationSkew * 0.42));
    }
  }
}

function shapeEarlyPhraseDensityPatch(
  guitar: PartModel,
  startBar: number,
  intent: PhraseRhythmIntent,
  intentStrength: number,
  seed: number,
  phraseIdx: number
): void {
  if (intent.densityShape !== 'sparse' && intent.densityShape !== 'burst_rest') return;
  const prob = 0.22 * intentStrength;
  if (seededUnit(seed, phraseIdx, 93850) > prob) return;
  const m = guitar.measures.find((x) => x.index === startBar);
  if (!m) return;
  const notes = m.events.filter((e) => e.kind === 'note') as NoteEvent[];
  notes.sort((a, b) => a.startBeat - b.startBeat);
  for (const n of notes) {
    if (n.startBeat >= 2 - 1e-4) continue;
    const ev = [...m.events]
      .filter((e) => e.kind === 'note' || e.kind === 'rest')
      .sort((a, b) => a.startBeat - b.startBeat);
    const ni = ev.findIndex((e) => e === n);
    if (ni < 0) continue;
    const nextStart = ni + 1 < ev.length ? ev[ni + 1].startBeat : BEATS_PER_MEASURE;
    const maxShorten = GRID_8TH;
    const take = Math.min(maxShorten * intentStrength * 0.45, n.duration - 0.5);
    if (take > 0.08) n.duration = snapAttackBeatToGrid(Math.max(0.5, n.duration - take));
  }
  normalizeMeasureToEighthBeatGrid(m);
}

function biasCrossingBarlineVelocity(
  guitar: PartModel,
  startBar: number,
  endBar: number,
  intent: PhraseRhythmIntent,
  intentStrength: number,
  seed: number,
  phraseIdx: number
): void {
  if (intent.barlineBehavior !== 'crossing') return;
  if (seededUnit(seed, phraseIdx, 93800) > 0.28 * intentStrength) return;
  for (let b = startBar; b < endBar; b++) {
    const m = guitar.measures.find((x) => x.index === b);
    if (!m) continue;
    const notes = m.events.filter((e) => e.kind === 'note') as NoteEvent[];
    if (notes.length === 0) continue;
    notes.sort((a, b) => a.startBeat - b.startBeat);
    const last = notes[notes.length - 1]!;
    const base = last.velocity ?? 90;
    last.velocity = Math.min(127, Math.round(base + 5 * intentStrength));
    if (!last.articulation) last.articulation = 'accent';
  }
}

function softenDelayedBarlineFirstBar(
  guitar: PartModel,
  startBar: number,
  intent: PhraseRhythmIntent,
  intentStrength: number
): void {
  if (intent.barlineBehavior !== 'delayed') return;
  const m = guitar.measures.find((x) => x.index === startBar);
  if (!m) return;
  const str = 0.18 * intentStrength;
  for (const e of m.events) {
    if (e.kind !== 'note') continue;
    const n = e as NoteEvent;
    if (n.startBeat > 1.25 + 1e-4) continue;
    const base = n.velocity ?? 90;
    n.velocity = Math.max(1, Math.round(base - 12 * str));
  }
}

/** Phrase-intent bass support: first phrase bar, first two beats (velocity only; pitch unchanged). */
function applyBassPhraseRhythmSupport(
  bass: PartModel | undefined,
  startBar: number,
  strength: SongModeRhythmStrength | undefined
): void {
  if (!bass) return;
  const s = strength ?? 'balanced';
  const m = bass.measures.find((x) => x.index === startBar);
  if (!m) return;
  for (const e of m.events) {
    if (e.kind !== 'note') continue;
    const n = e as NoteEvent;
    if (n.startBeat >= 2 - 1e-4) continue;
    const base = n.velocity ?? 88;
    const sb = n.startBeat;
    if (s === 'stable') {
      n.velocity = Math.max(1, Math.round(base - 6));
    } else if (s === 'surprise') {
      const off = isOffbeatStart(sb);
      n.velocity = Math.min(127, Math.round(base + (off ? 9 : -3)));
      if (off && !n.articulation) n.articulation = 'accent';
    }
  }
}

function collectPhraseGuitarNotes(
  guitar: PartModel,
  startBar: number,
  endBar: number,
  phraseNoteList: PhraseNoteRef[]
): void {
  phraseNoteList.length = 0;
  for (let b = startBar; b <= endBar; b++) {
    const m = guitar.measures.find((x) => x.index === b);
    if (!m) continue;
    for (const e of m.events) {
      if (e.kind === 'note')
        phraseNoteList.push({ bar: b, n: e as NoteEvent, phraseNoteIndex: 0, phraseNoteCount: 0 });
    }
  }
  phraseNoteList.sort((a, b) => (a.bar - b.bar) || a.n.startBeat - b.n.startBeat);
  const total = phraseNoteList.length;
  for (let i = 0; i < phraseNoteList.length; i++) {
    phraseNoteList[i].phraseNoteIndex = i;
    phraseNoteList[i].phraseNoteCount = total;
  }
}

function applyPhraseRhythmIntentToNotes(
  guitar: PartModel,
  bass: PartModel | undefined,
  phraseNotes: PhraseNoteRef[],
  intent: PhraseRhythmIntent,
  strength: SongModeRhythmStrength | undefined,
  seed: number,
  phraseIdx: number,
  startBar: number,
  endBar: number
): void {
  const intentStrength = intentStrengthFromMode(strength);
  if (phraseNotes.length === 0) return;

  applyGroupingTemplateBias(phraseNotes, intent, intentStrength, strength, seed, phraseIdx, guitar);
  shapeEarlyPhraseDensityPatch(guitar, startBar, intent, intentStrength, seed, phraseIdx);
  biasCrossingBarlineVelocity(guitar, startBar, endBar, intent, intentStrength, seed, phraseIdx);
  softenDelayedBarlineFirstBar(guitar, startBar, intent, intentStrength);
  applyBassPhraseRhythmSupport(bass, startBar, strength);

  const sc = intentStrength;

  for (let i = 0; i < phraseNotes.length; i++) {
    const { n, phraseNoteIndex: ni, phraseNoteCount: nt, bar } = phraseNotes[i];
    const base = n.velocity ?? 90;
    let dv = 0;
    const t = nt > 1 ? ni / (nt - 1) : 0.5;

    switch (intent.densityShape) {
      case 'burst_rest':
        if (t < 0.38) dv += 9;
        else if (t > 0.52 && t < 0.72) dv -= 7;
        break;
      case 'swell':
        dv += Math.round((t - 0.5) * 14);
        break;
      case 'sparse':
        if (t > 0.15 && t < 0.88) dv -= 8;
        break;
      case 'flat':
      default:
        break;
    }

    const sb = n.startBeat;
    switch (intent.groupingBias) {
      case 'even':
        if (sb === 1 || sb === 2 || sb === 3) dv += 4;
        break;
      case 'odd':
        if (isOffbeatStart(sb)) dv += 5;
        break;
      case 'fragmented':
        if (seededUnit(seed, phraseIdx, 93500 + ni) < 0.45) dv += seededUnit(seed, phraseIdx, 93501 + ni) < 0.5 ? 5 : -4;
        break;
      case 'arc':
        dv += Math.round((t - 0.5) * 10);
        break;
      default:
        break;
    }

    switch (intent.barlineBehavior) {
      case 'contained':
        if (bar === endBar && i === phraseNotes.length - 1) dv += 6;
        break;
      case 'crossing':
        if (isOffbeatStart(sb) || sb === 3 || sb === 3.5) dv += 3;
        if (bar < endBar && sb >= 3 - 1e-3) dv += 4;
        if (bar > startBar && (sb === 0 || sb === 0.5)) dv += 3;
        break;
      case 'delayed':
        if ((sb === 0 || sb === 0.5) && !(bar === startBar && i === 0)) dv -= 5;
        break;
      default:
        break;
    }

    if (i === 0) {
      if (intent.entryBias === 'onbeat' && (sb === 0 || sb === 1)) dv += 5;
      if (intent.entryBias === 'offbeat' && isOffbeatStart(sb)) dv += 7;
      if (intent.entryBias === 'late' && sb >= 1 - 1e-3) dv += 5;
    }

    dv = Math.round(dv * sc);
    const openB = isOpeningTwoBarsOfScore(phraseIdx, bar) && ni <= 1 ? 1.45 : 1;
    if (ni === 0) dv += Math.round(modeEarlyPairVelocityBias(strength, 0) * openB);
    if (ni === 1) dv += Math.round(modeEarlyPairVelocityBias(strength, 1) * openB);
    n.velocity = Math.max(1, Math.min(127, base + dv));

    const uArt = seededUnit(seed, phraseIdx, 93600 + ni);
    if (intent.groupingBias === 'fragmented' && uArt < 0.22 * sc) n.articulation = 'staccato';
    else if (intent.densityShape === 'sparse' && uArt < 0.18 * sc) n.articulation = 'tenuto';
  }

  for (let b = startBar; b <= endBar; b++) {
    const m = guitar.measures.find((x) => x.index === b);
    if (m) normalizeMeasureToEighthBeatGrid(m);
  }
}

function applySoftToGuitarMeasure(
  m: MeasureModel,
  b: BlendedSoft,
  seed: number,
  phraseIdx: number,
  barIndex: number
): void {
  const events = m.events.filter((e) => e.kind === 'note' || e.kind === 'rest') as Array<
    NoteEvent | { kind: 'rest'; startBeat: number; duration: number }
  >;
  events.sort((a, b) => a.startBeat - b.startBeat);
  const tighten = Math.min(0.12, 0.035 + b.durTighten * 0.08);

  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (e.kind !== 'note') continue;
    const n = e as NoteEvent;
    const nextStart = i + 1 < events.length ? events[i + 1].startBeat : BEATS_PER_MEASURE;
    const room = nextStart - n.startBeat;
    if (room <= 1e-4) continue;

    let d = n.duration;
    d = snapAttackBeatToGrid(Math.max(0.5, d * (1 - tighten)));
    d = Math.min(d, room - 0.25);
    d = snapAttackBeatToGrid(Math.max(0.5, d));
    if (d < 0.5 - 1e-4) d = 0.5;
    n.duration = d;

    const baseV = n.velocity ?? 90;
    const dv = Math.round(b.velDelta * (0.85 + 0.3 * seededUnit(seed, phraseIdx, 93200 + barIndex + i)));
    n.velocity = Math.max(1, Math.min(127, baseV + dv));

    const sb = n.startBeat;
    const uAcc = seededUnit(seed, phraseIdx, 93300 + barIndex * 3 + i);
    const offBeat =
      Math.abs(sb - 0.5) < 0.01 ||
      Math.abs(sb - 1.5) < 0.01 ||
      Math.abs(sb - 2.5) < 0.01 ||
      Math.abs(sb - 3.5) < 0.01;
    if (offBeat && uAcc < b.syncAccent * 0.38) {
      n.articulation = 'accent';
    } else if (!offBeat && (sb === 1 || sb === 2 || sb === 3) && uAcc < b.syncAccent * 0.22) {
      n.articulation = 'accent';
    }
  }
}

/**
 * Soft rhythm overlay: guitar phrase-intent + note-level bias; bass gets deterministic phrase-intent velocity in phrase opening beats only.
 * Preserves pitches and event count per measure.
 */
export function applySongModeRhythmOverlayC1(score: ScoreModel, context: CompositionContext): void {
  if (context.generationMetadata?.songModeRhythmOverlayDisabled === true) return;
  if (context.generationMetadata?.songModeHookFirstIdentity !== true) return;
  if (context.presetId !== 'guitar_bass_duo') return;
  if (context.form.totalBars !== 32) return;

  const guitar = score.parts.find((p) => p.id === 'guitar') as PartModel | undefined;
  if (!guitar) return;
  const bass = score.parts.find((p) => p.id === 'bass') as PartModel | undefined;

  const segments = songModePhraseSegments();
  const debug: SongModeRhythmOverlayPhraseDebug[] = [];
  const seed = context.seed;
  const strength = (context.generationMetadata as GenerationMetadata).songModeRhythmStrength;
  const phraseBuf: PhraseNoteRef[] = [];

  for (let pi = 0; pi < segments.length; pi++) {
    const { startBar, endBar } = segments[pi];
    const applied = selectOverlaysForPhrase(pi, seed);
    const intent = derivePhraseRhythmIntent(applied, strength, seed, pi);
    const profile = profileString(applied);
    const summary = formatIntentSummary(intent, strength, profile === 'none' ? 'neutral' : profile);

    debug.push({
      phraseIndex: pi,
      appliedOverlays: applied.map((o) => ({ id: o.id, weight: o.weight })),
      overlayRhythmProfile: profile,
      rhythmIntent: intent,
      rhythmIntentSummary: summary,
    });

    applyPhraseEarlyIdentityLock(guitar, bass, startBar, endBar, strength);

    if (applied.length > 0) {
      collectPhraseGuitarNotes(guitar, startBar, endBar, phraseBuf);
      applyPhraseRhythmIntentToNotes(guitar, bass, phraseBuf, intent, strength, seed, pi, startBar, endBar);
    }

    if (applied.length === 0) continue;

    const blend = blendOverlays(applied);
    for (let b = startBar; b <= endBar; b++) {
      const measure = guitar.measures.find((x) => x.index === b);
      if (!measure) continue;
      applySoftToGuitarMeasure(measure, blend, seed, pi, b);
    }
  }

  context.generationMetadata.songModeRhythmOverlayByPhrase = debug;
}
