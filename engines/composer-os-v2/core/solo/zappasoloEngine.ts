/**
 * Frank Zappa Phase B — solo / melodic generator (Slonimsky backbone + Zappa PDF vocabulary).
 * Phase 1: 7/8 rhythmic cell lock. Phase 2: sticky anchor (3–4 notes, tritone/m6 leap) + ≥0.75 development similarity (shift / augment / compress).
 * Phase 4: cross-bar callbacks (bar 1 → 5,9,13…), one controlled cell-disruption bar per section, callback receipt on motif metadata.
 */

import type { CompositionContext, FormMap, GenerationMetadata } from '../compositionContext';
import { chordTonesForChordSymbol, noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { getChordForBar } from '../harmony/harmonyResolution';
import type { BarMeterMap } from '../rhythm/barMeterTypes';
import { resolveMeterForBar } from '../rhythm/oddMeterQuantiser';
import {
  generateSlonimskyPattern,
  inferSlonimskyChordTypeCategory,
  resolveAllowedOutsideLevelForSlonimsky,
  selectSlonimskyPattern,
  SLONIMSKY_STYLE_PROFILE_MAP,
  type SlonimskyContext,
  type SlonimskyNote,
} from '../slonimsky/slonimskyEngine';
import type { MeasureModel, NoteEvent, PartModel, ScoreModel, ScoreEvent } from '../score-model/scoreModelTypes';
import type {
  SoloLine,
  SoloNote,
  SoloPhrase,
  ZappaCrossBarCallbackReceipt,
  ZappaMotifAnchorReceipt,
  ZappaMotifOwnershipReceipt,
  ZappaMotifPhraseReceipt,
  ZappaRhythmicCellDefinition,
  ZappasoloOptions,
} from './soloTypes';
import {
  applyZappaGuideTonePitchNudges,
  applyZappaPhraseGoalTargeting,
  buildZappaSmoothedGuideToneReceipt,
} from './zappaVoiceLeading';

const ROOT_AT_START = /^([A-G](?:#|b)?)/;

/** Default Zappa solo generation range (E3–C6). Written pitch uses +12 semitones in {@link soloLineToPartModel}. */
const ZAPPA_SOLO_DEFAULT_MIDI_LOW = 52;
const ZAPPA_SOLO_DEFAULT_MIDI_HIGH = 84;
const ZAPPA_SOLO_EXPORT_MIDI_SHIFT = 12;
/** Matches `medium` tier in {@link zappaSoloOptionsFromTiers} when options omit density. */
const ZAPPA_SOLO_DEFAULT_DENSITY_NUMERIC = 0.72;
const ZAPPA_SOLO_MIN_NOTES_PER_BAR = 2;

/**
 * Written MIDI for Zappa solo export: +12 shift, then while &gt; 84 subtract 12, then hard clamp to [52, 84].
 * With {@link midiToPitch}, MusicXML &lt;octave&gt;7 appears for MIDI ≥ 96; cap 84 ⇒ octave ≤ 6 (no octave 7).
 */
function zappaSoloExportWrittenMidi(snMidi: number): number {
  const maxWritten = ZAPPA_SOLO_DEFAULT_MIDI_HIGH;
  const minWritten = ZAPPA_SOLO_DEFAULT_MIDI_LOW;
  let pitch = Math.round(Number(snMidi));
  if (!Number.isFinite(pitch)) pitch = minWritten;
  pitch += ZAPPA_SOLO_EXPORT_MIDI_SHIFT;
  while (pitch > maxWritten) {
    pitch -= 12;
  }
  pitch = Math.min(pitch, maxWritten);
  return Math.max(minWritten, pitch);
}

function seededUnit(seed: number, salt = 0): number {
  let s = ((seed ^ salt * 1103515245) >>> 0) as number;
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 0xffffffff;
}

function harmonyRootPcFromSymbol(symbol: string): number | undefined {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const head = hp.includes('/') ? hp.slice(0, hp.indexOf('/')) : hp;
  const m = head.match(ROOT_AT_START);
  if (!m?.[1]) return undefined;
  return noteNameToPitchClass(m[1]);
}

function liftIntoRange(midi: number, low: number, high: number): number {
  let p = midi;
  while (p < low) p += 12;
  while (p > high) p -= 12;
  return Math.max(low, Math.min(high, p));
}

/**
 * After motif / guide-tone / collapse passes, a bar can end with fewer than two attacks — pad with chord tones
 * (odd-meter safe; does not run before phrase packaging).
 */
function enforceMinimumZappaSoloNotesPerBar(params: {
  allNotes: SoloNote[];
  tb: number;
  chords: string[];
  low: number;
  high: number;
  seed: number;
  map: BarMeterMap | undefined;
}): void {
  const { allNotes, tb, chords, low, high, seed, map } = params;
  for (let b = 1; b <= tb; b++) {
    const inBar = allNotes.filter((n) => n.barIndex === b && !n.isRest);
    const count = inBar.length;
    if (count >= ZAPPA_SOLO_MIN_NOTES_PER_BAR) continue;
    const need = ZAPPA_SOLO_MIN_NOTES_PER_BAR - count;
    const chord = chords[b - 1] ?? 'C7alt';
    const t = chordTonesForChordSymbol(chord, { lockedHarmony: true });
    const pool: number[] = [t.root, t.third, t.fifth, t.seventh].filter((x) => typeof x === 'number' && Number.isFinite(x));
    if (pool.length < 2) {
      pool.push(t.root, (t.third ?? t.root + 4) as number);
    }
    const span = measureQuarterSpanForBar(b, map);
    for (let a = 0; a < need; a++) {
      const salt = a + count * 7;
      const midiRaw = pool[(seed + b * 131 + salt) % pool.length]!;
      const midi = Math.round(liftIntoRange(midiRaw, low, high));
      const t0 = ((seed + b * 17 + salt * 13) % 1000) / 1000;
      const startBeat = Math.min(span * 0.88, t0 * Math.max(0.12, span * 0.65) + a * 0.22);
      const dur = Math.min(0.45, Math.max(0.1, span * 0.2));
      allNotes.push({
        midi,
        startBeat,
        durationBeats: dur,
        barIndex: b,
        tupletRole: 'plain',
        marker: 'density_minimum_pad',
      });
    }
  }
  allNotes.sort((a, c) => (a.barIndex !== c.barIndex ? a.barIndex - c.barIndex : a.startBeat - c.startBeat));
}

/**
 * Each 4-bar phrase must include at least one bar with ≤2 attacks (breathing room vs continuous motion).
 * If every bar in the phrase has >2 notes, thin one bar (prefer dropping `density_minimum_pad`) to exactly 2.
 */
function breathSpacingMayRemoveZappaNote(n: SoloNote): boolean {
  if (n.isRest) return false;
  return !(
    n.marker === 'descending_minor_sixth' ||
    n.marker === 'tetrachord_0137' ||
    n.marker === 'factory_32nd_shift' ||
    (n.tupletRole !== undefined && n.tupletRole !== 'plain')
  );
}

const MIN_BREATH_REST_BEATS = 0.5;

function pitchedInBar(allNotes: SoloNote[], bar: number): SoloNote[] {
  return allNotes.filter((n) => n.barIndex === bar && !n.isRest);
}

function barHasExplicitBreathRest(allNotes: SoloNote[], bar: number): boolean {
  return allNotes.some(
    (n) =>
      n.barIndex === bar &&
      n.isRest &&
      n.durationBeats >= MIN_BREATH_REST_BEATS * 0.45 - 1e-4
  );
}

function phraseHasBreathSpace(allNotes: SoloNote[], lo: number, hi: number): boolean {
  for (let b = lo; b <= hi; b++) {
    if (pitchedInBar(allNotes, b).length <= 2 && barHasExplicitBreathRest(allNotes, b)) return true;
  }
  return false;
}

function stripBreathRestsInBar(allNotes: SoloNote[], bar: number): void {
  for (let i = allNotes.length - 1; i >= 0; i--) {
    const n = allNotes[i]!;
    if (n.barIndex === bar && n.isRest && n.marker === 'zappa_phrase_breath_rest') allNotes.splice(i, 1);
  }
}

/**
 * Each 4-bar phrase needs a breath bar: ≤2 pitched attacks **and** an explicit rest (audible silence).
 */
function enforceZappaPhraseBreathSpace(params: {
  allNotes: SoloNote[];
  tb: number;
  seed: number;
  map: BarMeterMap | undefined;
}): void {
  const { allNotes, tb, seed, map } = params;
  const totalPhrases = Math.max(1, Math.ceil(tb / 4));
  for (let pi = 0; pi < totalPhrases; pi++) {
    const lo = pi * 4 + 1;
    const hi = Math.min(tb, (pi + 1) * 4);
    if (phraseHasBreathSpace(allNotes, lo, hi)) continue;

    const bPick = lo + ((seed + pi * 97) % (hi - lo + 1));
    stripBreathRestsInBar(allNotes, bPick);

    let removable = allNotes
      .filter((n) => n.barIndex === bPick && breathSpacingMayRemoveZappaNote(n))
      .sort((a, b) => {
        const pa = a.marker === 'density_minimum_pad' ? 0 : 1;
        const pb = b.marker === 'density_minimum_pad' ? 0 : 1;
        if (pa !== pb) return pa - pb;
        return b.startBeat - a.startBeat;
      });
    let toRemove = Math.max(0, pitchedInBar(allNotes, bPick).length - 2);
    for (const n of removable) {
      if (toRemove <= 0) break;
      const j = allNotes.indexOf(n);
      if (j >= 0) {
        allNotes.splice(j, 1);
        toRemove--;
      }
    }

    const span = measureQuarterSpanForBar(bPick, map);
    let pitched = pitchedInBar(allNotes, bPick).sort((a, b) => a.startBeat - b.startBeat);
    while (pitched.length > 2) {
      const victim = pitched.pop();
      if (!victim || !breathSpacingMayRemoveZappaNote(victim)) break;
      const j = allNotes.indexOf(victim);
      if (j >= 0) allNotes.splice(j, 1);
    }
    pitched = pitchedInBar(allNotes, bPick).sort((a, b) => a.startBeat - b.startBeat);

    if (pitched.length === 0) {
      allNotes.push({
        isRest: true,
        midi: 0,
        startBeat: 0,
        durationBeats: Math.min(span, Math.max(MIN_BREATH_REST_BEATS, span * 0.35)),
        barIndex: bPick,
        tupletRole: 'plain',
        marker: 'zappa_phrase_breath_rest',
      });
      allNotes.sort((a, c) => (a.barIndex !== c.barIndex ? a.barIndex - c.barIndex : a.startBeat - c.startBeat));
      continue;
    }

    let last = pitched[pitched.length - 1]!;
    let endLast = last.startBeat + last.durationBeats;
    if (span - endLast < MIN_BREATH_REST_BEATS - 1e-4) {
      last.durationBeats = Math.max(0.06, span - MIN_BREATH_REST_BEATS - last.startBeat);
      endLast = last.startBeat + last.durationBeats;
    }
    if (span - endLast < MIN_BREATH_REST_BEATS * 0.45 && pitched.length > 1) {
      const drop = pitched[0]!;
      if (breathSpacingMayRemoveZappaNote(drop)) {
        const j = allNotes.indexOf(drop);
        if (j >= 0) allNotes.splice(j, 1);
      }
      pitched = pitchedInBar(allNotes, bPick).sort((a, b) => a.startBeat - b.startBeat);
      last = pitched[pitched.length - 1]!;
      endLast = last.startBeat + last.durationBeats;
      last.durationBeats = Math.max(0.06, Math.min(last.durationBeats, span - MIN_BREATH_REST_BEATS - last.startBeat));
      endLast = last.startBeat + last.durationBeats;
    }

    const restDur = Math.max(MIN_BREATH_REST_BEATS * 0.45, span - endLast);
    if (restDur >= MIN_BREATH_REST_BEATS * 0.35 - 1e-4) {
      allNotes.push({
        isRest: true,
        midi: 0,
        startBeat: endLast,
        durationBeats: Math.min(restDur, span - endLast),
        barIndex: bPick,
        tupletRole: 'plain',
        marker: 'zappa_phrase_breath_rest',
      });
    }

    allNotes.sort((a, c) => (a.barIndex !== c.barIndex ? a.barIndex - c.barIndex : a.startBeat - c.startBeat));
  }
}

/** Quarter-note span of one measure for the given bar. */
export function measureQuarterSpanForBar(bar1Based: number, map: BarMeterMap | undefined): number {
  const sig = resolveMeterForBar(bar1Based, map);
  return (sig.numerator * 4) / sig.denominator;
}

// ---- Musicality Phase 1 — 7/8 rhythmic cell lock (section A vs B, ≥60% phrases) ----

/**
 * Section A: product label `3+3+2` — canonical eighth-note groups for one 7/8 bar **sum to 7** (`3+2+2`).
 * Section B: product label `3+2+2+2` — canonical four-accent grouping **`2+2+2+1`** (sum 7).
 */
export const ZAPPA_78_RHYTHMIC_CELL_A: ZappaRhythmicCellDefinition = {
  formSection: 'A',
  spec: '3+3+2',
  eighthSpans: [3, 2, 2],
};

export const ZAPPA_78_RHYTHMIC_CELL_B: ZappaRhythmicCellDefinition = {
  formSection: 'B',
  spec: '3+2+2+2',
  eighthSpans: [2, 2, 2, 1],
};

/** Map form section label → A/B (bars outside any section → `A`). */
export function resolveZappaFormSectionForBar(bar1Based: number, form: FormMap | undefined): 'A' | 'B' {
  if (!form?.sections?.length) return 'A';
  for (const s of form.sections) {
    const end = s.startBar + s.length - 1;
    if (bar1Based >= s.startBar && bar1Based <= end) {
      const raw = s.label.trim();
      const up = raw.toUpperCase();
      if (up === 'B' || /^B[\s_-]/i.test(raw) || /\bSECTION\s*B\b/i.test(raw) || /\bBRIDGE\b/i.test(up)) {
        return 'B';
      }
      return 'A';
    }
  }
  return 'A';
}

export function zappaRhythmicCellForFormSection(section: 'A' | 'B'): ZappaRhythmicCellDefinition {
  return section === 'B' ? ZAPPA_78_RHYTHMIC_CELL_B : ZAPPA_78_RHYTHMIC_CELL_A;
}

const CELL_SNAP_EPS = 0.085;

/** Cumulative attack grid in quarter-beat space for one 7/8 bar (identical every bar in the section). */
export function zappa78CellBoundaryBeatsQuarters(
  eighthSpans: readonly number[],
  measureSpanQuarters: number
): number[] {
  const sumE = eighthSpans.reduce((a, b) => a + b, 0);
  if (sumE <= 0) return [0, measureSpanQuarters];
  const qPerEighth = measureSpanQuarters / sumE;
  const xs: number[] = [0];
  let acc = 0;
  for (const g of eighthSpans) {
    acc += g;
    xs.push(Math.min(measureSpanQuarters, acc * qPerEighth));
  }
  return [...new Set(xs)].sort((a, b) => a - b);
}

export function snapStartBeatToZappa78Cell(
  startBeat: number,
  eighthSpans: readonly number[],
  measureSpanQuarters: number
): number {
  const bounds = zappa78CellBoundaryBeatsQuarters(eighthSpans, measureSpanQuarters);
  let best = startBeat;
  let bestD = Infinity;
  for (const b of bounds) {
    const d = Math.abs(startBeat - b);
    if (d < bestD) {
      bestD = d;
      best = b;
    }
  }
  return Math.max(0, Math.min(best, measureSpanQuarters - 1e-4));
}

function zappaPhraseIndexForFourBarWindow(bar1Based: number): number {
  return Math.floor((bar1Based - 1) / 4);
}

/** First `ceil(n * 0.6)` four-bar phrase indices use the cell lock (deterministic, ≥60%). */
export function zappaRhythmicCellLockedPhraseCount(totalPhrases: number): number {
  if (totalPhrases <= 0) return 0;
  return Math.ceil(totalPhrases * 0.6);
}

function phraseIndexUsesRhythmicCellLock(phraseIndex: number, lockedTopCount: number): boolean {
  return phraseIndex < lockedTopCount;
}

function computeBoundaryAlignmentForPhrase(
  notes: SoloNote[],
  map: BarMeterMap | undefined,
  cell: ZappaRhythmicCellDefinition,
  barLo: number,
  barHi: number
): number {
  let onsets = 0;
  let hits = 0;
  for (const n of notes) {
    if (n.barIndex < barLo || n.barIndex > barHi) continue;
    const sig = resolveMeterForBar(n.barIndex, map);
    if (sig.numerator !== 7 || sig.denominator !== 8) continue;
    onsets++;
    const span = measureQuarterSpanForBar(n.barIndex, map);
    const bounds = zappa78CellBoundaryBeatsQuarters(cell.eighthSpans, span);
    if (bounds.some((b) => Math.abs(n.startBeat - b) < CELL_SNAP_EPS)) hits++;
  }
  return onsets === 0 ? 1 : hits / onsets;
}

function applyZappa78RhythmicCellLockToAllNotes(params: {
  allNotes: SoloNote[];
  tb: number;
  map: BarMeterMap | undefined;
  form: FormMap;
  lockedPhraseTopCount: number;
  /** Bars where cell snap is skipped (Musicality Phase 4 — one controlled disruption per section). */
  skipBars?: ReadonlySet<number>;
}): void {
  const { allNotes, tb, map, form, lockedPhraseTopCount, skipBars } = params;
  for (const n of allNotes) {
    if (n.isRest) continue;
    const b = n.barIndex;
    if (b < 1 || b > tb) continue;
    if (skipBars?.has(b)) continue;
    const sig = resolveMeterForBar(b, map);
    if (sig.numerator !== 7 || sig.denominator !== 8) continue;
    const pi = zappaPhraseIndexForFourBarWindow(b);
    if (!phraseIndexUsesRhythmicCellLock(pi, lockedPhraseTopCount)) continue;
    if (n.marker === 'descending_minor_sixth' || n.marker === 'tetrachord_0137') continue;
    /** Tuplets are Slonimsky PDF vocabulary — keep off the cell grid so receipts + tuplets stay stable. */
    if (n.tupletRole && n.tupletRole !== 'plain') continue;

    const section = resolveZappaFormSectionForBar(b, form);
    const cell = zappaRhythmicCellForFormSection(section);
    const span = measureQuarterSpanForBar(b, map);
    n.startBeat = snapStartBeatToZappa78Cell(n.startBeat, cell.eighthSpans, span);
    n.startBeat = Math.max(0, Math.min(n.startBeat, span - 0.04));
    if (n.startBeat + n.durationBeats > span + 1e-6) {
      n.durationBeats = Math.max(0.06, span - n.startBeat);
    }
  }
}

const NORM_EPS = 1e-4;

/** After cell snaps, repair monophonic coverage so MusicXML voice tick sums match each measure span. */
function normalizeSoloNoteRhythmsPerBarForExport(allNotes: SoloNote[], tb: number, map: BarMeterMap | undefined): void {
  for (let b = 1; b <= tb; b++) {
    const span = measureQuarterSpanForBar(b, map);
    const inBar = allNotes.filter((n) => n.barIndex === b).sort((a, c) => a.startBeat - c.startBeat);
    const pitched = inBar.filter((n) => !n.isRest);
    if (pitched.length === 0) continue;
    for (let i = 0; i < pitched.length - 1; i++) {
      const a = pitched[i]!;
      const nx = pitched[i + 1]!;
      const maxDur = nx.startBeat - a.startBeat - NORM_EPS;
      if (a.startBeat + a.durationBeats > nx.startBeat + NORM_EPS) {
        a.durationBeats = Math.max(0.06, maxDur);
      }
    }
    const last = pitched[pitched.length - 1]!;
    const restAfter = inBar.find((r) => r.isRest && r.startBeat >= last.startBeat - NORM_EPS);
    const tail = last.startBeat + last.durationBeats;
    if (restAfter) {
      last.durationBeats = Math.max(
        0.06,
        Math.min(last.durationBeats, restAfter.startBeat - last.startBeat - NORM_EPS)
      );
    } else if (tail < span - 1e-5) {
      last.durationBeats = Math.max(0.06, span - last.startBeat);
    }
  }
}

/**
 * Cell snapping can stack multiple pitches on one boundary; solo line is monophonic for export.
 * Keep one attack per snapped onset (longest duration wins) so MusicXML chord grouping + tick sums stay valid.
 */
function collapseDuplicateOnsetsPerBarMonophonic(allNotes: SoloNote[], tb: number): void {
  const roundK = (x: number) => Math.round(x * 1000) / 1000;
  const drop = new Set<SoloNote>();
  for (let b = 1; b <= tb; b++) {
    const inBar = allNotes.filter((n) => n.barIndex === b && !n.isRest);
    const byStart = new Map<number, SoloNote[]>();
    for (const n of inBar) {
      const k = roundK(n.startBeat);
      if (!byStart.has(k)) byStart.set(k, []);
      byStart.get(k)!.push(n);
    }
    for (const arr of byStart.values()) {
      if (arr.length <= 1) continue;
      arr.sort((a, c) => c.durationBeats - a.durationBeats || c.midi - a.midi);
      for (let i = 1; i < arr.length; i++) drop.add(arr[i]!);
    }
  }
  for (let i = allNotes.length - 1; i >= 0; i--) {
    if (drop.has(allNotes[i]!)) allNotes.splice(i, 1);
  }
}

// ---- Musicality Phase 2 — motif ownership (anchor per section, recurrence ≥0.7, transforms) ----

const MOTIF_RECURRENCE_THRESHOLD = 0.75;
/** Structural recall bars (1,5,9,13…) require at least this similarity vs the section anchor. */
const MOTIF_STRUCTURAL_BAR_THRESHOLD = 0.75;
/** Below this, strip and reinject the whole 4-bar phrase (not only the post-anchor development window). */
const MOTIF_FULL_PHRASE_REPLACE_THRESHOLD = 0.5;
/** First N bars of each form section used for anchor fingerprint (was 2). */
const MOTIF_ANCHOR_BAR_SPAN = 4;
const MOTIF_STICKY_MIN_NOTES = 3;
const MOTIF_STICKY_MAX_NOTES = 4;
/** Breathing bar after each structural motif statement: max attacks (non-structural notes thinned first). */
const MOTIF_BREATH_BAR_MAX_NOTES = 3;
const STRUCTURAL_MOTIF_RECALL_BARS = [1, 5, 9, 13] as const;
const BREATH_BARS_AFTER_STRUCTURAL = [2, 6, 10, 14] as const;
const IOI_SCALES = [0.25, 0.5, 1, 2, 4] as const;

function isZappaMotifStructuralNote(n: SoloNote): boolean {
  return (
    n.marker === 'descending_minor_sixth' ||
    n.marker === 'tetrachord_0137' ||
    (n.tupletRole !== undefined && n.tupletRole !== 'plain')
  );
}

type InternalMotifAnchor = {
  sectionLabel: string;
  anchorStartBar: number;
  anchorEndBar: number;
  sectionEndBar: number;
  intervals: number[];
  durationRatios: number[];
  ioiRatios: number[];
};

function normalizePositiveRatios(raw: number[]): number[] {
  const s = raw.reduce((a, b) => a + b, 0);
  if (s < 1e-9) return raw.map(() => 1 / Math.max(1, raw.length));
  return raw.map((x) => x / s);
}

function sortedMotifSliceNotes(allNotes: SoloNote[], barLo: number, barHi: number): SoloNote[] {
  return allNotes
    .filter((n) => n.barIndex >= barLo && n.barIndex <= barHi && !isZappaMotifStructuralNote(n) && !n.isRest)
    .sort((a, b) => a.barIndex - b.barIndex || a.startBeat - b.startBeat);
}

function buildInternalAnchorFromNotes(
  sectionLabel: string,
  anchorStartBar: number,
  anchorEndBar: number,
  sectionEndBar: number,
  map: BarMeterMap | undefined,
  notes: SoloNote[]
): InternalMotifAnchor | undefined {
  if (notes.length === 0) return undefined;
  const intervals: number[] = [];
  for (let i = 1; i < notes.length; i++) {
    intervals.push(notes[i]!.midi - notes[i - 1]!.midi);
  }
  const durs = notes.map((n) => Math.max(1e-4, n.durationBeats));
  const durationRatios = normalizePositiveRatios(durs);
  const iois = computeFragmentIoIs(notes, map);
  const ioiRatios = iois.length ? normalizePositiveRatios(iois) : [];
  return {
    sectionLabel,
    anchorStartBar,
    anchorEndBar,
    sectionEndBar,
    intervals,
    durationRatios,
    ioiRatios,
  };
}

/** Global onset in quarter-beats from score start (approximation for IOI; meter-aware span used where needed). */
function globalOnsetBeat(n: SoloNote, map: BarMeterMap | undefined): number {
  let g = 0;
  for (let b = 1; b < n.barIndex; b++) g += measureQuarterSpanForBar(b, map);
  return g + n.startBeat;
}

function fragmentSortedNotes(
  allNotes: SoloNote[],
  devLo: number,
  devHi: number
): SoloNote[] {
  return allNotes
    .filter((n) => n.barIndex >= devLo && n.barIndex <= devHi && !isZappaMotifStructuralNote(n) && !n.isRest)
    .sort((a, b) => a.barIndex - b.barIndex || a.startBeat - b.startBeat);
}

function intervalContourScore(a: readonly number[], b: readonly number[]): number {
  const m = Math.min(a.length, b.length);
  if (m === 0) return a.length === 0 && b.length === 0 ? 1 : 0;
  let s = 0;
  for (let i = 0; i < m; i++) {
    s += 1 - Math.min(1, Math.abs(a[i]! - b[i]!) / 12);
  }
  return s / m;
}

function ioiShapeScore(
  anchorIoi: readonly number[],
  fragIoi: readonly number[],
  scales: readonly number[]
): { score: number; bestScale: number } {
  if (anchorIoi.length === 0 && fragIoi.length === 0) return { score: 1, bestScale: 1 };
  if (anchorIoi.length === 0 || fragIoi.length === 0) return { score: 0, bestScale: 1 };
  const na = normalizePositiveRatios([...anchorIoi]);
  let best = 0;
  let bestS = 1;
  for (const sc of scales) {
    const scaled = fragIoi.map((x) => x * sc);
    const nf = normalizePositiveRatios(scaled);
    const m = Math.min(na.length, nf.length);
    let acc = 0;
    for (let i = 0; i < m; i++) acc += 1 - Math.min(1, Math.abs(na[i]! - nf[i]!));
    const val = acc / Math.max(m, 1);
    if (val > best) {
      best = val;
      bestS = sc;
    }
  }
  return { score: best, bestScale: bestS };
}

function computeFragmentIoIs(notes: SoloNote[], map: BarMeterMap | undefined): number[] {
  if (notes.length < 2) return [];
  const sorted = [...notes].sort((a, b) => globalOnsetBeat(a, map) - globalOnsetBeat(b, map));
  const iois: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const dt = globalOnsetBeat(sorted[i]!, map) - globalOnsetBeat(sorted[i - 1]!, map);
    iois.push(Math.max(1e-4, dt));
  }
  return iois;
}

function computeFragmentIntervals(notes: SoloNote[]): number[] {
  const sorted = [...notes].sort((a, b) => a.barIndex - b.barIndex || a.startBeat - b.startBeat);
  const out: number[] = [];
  for (let i = 1; i < sorted.length; i++) out.push(sorted[i]!.midi - sorted[i - 1]!.midi);
  return out;
}

/** Tritone or minor 6th as melodic interval class (|Δ| mod 12 ∈ {6,8}). */
function hasZappaSignatureLeap(intervals: readonly number[]): boolean {
  for (const iv of intervals) {
    const pc = Math.abs(iv) % 12;
    if (pc === 6 || pc === 8) return true;
  }
  return false;
}

const DUR_EPS = 1e-4;

function allDurationsEqual(durs: readonly number[]): boolean {
  if (durs.length <= 1) return true;
  const r0 = durs[0]!;
  return durs.every((d) => Math.abs(d - r0) < DUR_EPS);
}

function hasQuarterOrLong(durs: readonly number[]): boolean {
  return durs.some((d) => d >= 1 - DUR_EPS);
}

/** Strong metric anchors: beat 1 (~0) or beat 3 (~2 quarters) in common-time-like spans. */
function firstNoteStrongBeatRank(first: SoloNote, map: BarMeterMap | undefined): number {
  const span = measureQuarterSpanForBar(first.barIndex, map);
  const sb = first.startBeat;
  if (sb <= 0.12) return 2;
  if (span >= 2.25 && Math.abs(sb - 2) < 0.22) return 2;
  if (span >= 1.75 && span < 2.25 && Math.abs(sb - 1.5) < 0.18) return 1;
  return 0;
}

function stickyRhythmContrastScore(durs: readonly number[]): number {
  if (durs.length < 2) return 0;
  const mx = Math.max(...durs);
  const mn = Math.min(...durs);
  const ratio = mx / Math.max(mn, DUR_EPS);
  const mean = durs.reduce((s, x) => s + x, 0) / durs.length;
  const dev = durs.reduce((s, x) => s + Math.abs(x - mean), 0) / durs.length;
  return ratio * 1.12 + dev * 2.5;
}

/** Ensure anchor has mixed durations + ≥1 quarter-note attack (memorable hook). */
function enforceStickyAnchorRhythmShape(out: SoloNote[]): void {
  const durs = out.map((n) => n.durationBeats);
  if (!hasQuarterOrLong(durs) || allDurationsEqual(durs)) {
    const n0 = out[0]!;
    n0.startBeat = 0;
    n0.durationBeats = Math.max(1.02, n0.durationBeats);
    if (out.length > 1) {
      const n1 = out[1]!;
      n1.startBeat = n0.startBeat + n0.durationBeats + 0.04;
      n1.durationBeats = Math.min(0.44, Math.max(0.14, 0.22));
    }
    if (out.length > 2) {
      const n2 = out[2]!;
      const n1 = out[1]!;
      n2.startBeat = n1.startBeat + n1.durationBeats + 0.05;
      n2.durationBeats = Math.min(0.5, Math.max(0.12, 0.28));
    }
  }
}

function applyForcedZappaLeap(
  notes: SoloNote[],
  chordSymbol: string,
  low: number,
  high: number,
  seed: number,
  defaultBar: number
): SoloNote[] {
  if (notes.length < MOTIF_STICKY_MIN_NOTES) {
    const t = chordTonesForChordSymbol(chordSymbol);
    let p0 = liftIntoRange(t.third ?? t.root + 4, low, high);
    const leap = seededUnit(seed, 760) < 0.5 ? 6 : 8;
    const sign = seededUnit(seed, 761) < 0.5 ? 1 : -1;
    let p1 = liftIntoRange(p0 + sign * leap, low, high);
    let p2 = liftIntoRange(p1 + (seededUnit(seed, 762) < 0.5 ? 2 : -2), low, high);
    const q1 = 1.05;
    const q2 = 0.24;
    const q3 = 0.28;
    return [
      {
        midi: Math.round(p0),
        startBeat: 0,
        durationBeats: q1,
        barIndex: defaultBar,
        tupletRole: 'plain',
        marker: undefined,
      },
      {
        midi: Math.round(p1),
        startBeat: q1 + 0.04,
        durationBeats: q2,
        barIndex: defaultBar,
        tupletRole: 'plain',
        marker: undefined,
      },
      {
        midi: Math.round(p2),
        startBeat: q1 + 0.04 + q2 + 0.05,
        durationBeats: q3,
        barIndex: defaultBar,
        tupletRole: 'plain',
        marker: undefined,
      },
    ];
  }
  const out = notes.slice(0, MOTIF_STICKY_MAX_NOTES).map((n) => ({ ...n }));
  let ints = computeFragmentIntervals(out);
  if (hasZappaSignatureLeap(ints)) {
    enforceStickyAnchorRhythmShape(out);
    return out;
  }
  const leap = seededUnit(seed, 763) < 0.5 ? 6 : 8;
  const dir = seededUnit(seed, 764) < 0.5 ? 1 : -1;
  if (out.length >= 2) {
    out[1]!.midi = liftIntoRange(out[0]!.midi + dir * leap, low, high);
  }
  if (out.length >= 3) {
    const step = seededUnit(seed, 765) < 0.5 ? 2 : -2;
    out[2]!.midi = liftIntoRange(out[1]!.midi + step, low, high);
  }
  ints = computeFragmentIntervals(out);
  if (!hasZappaSignatureLeap(ints) && out.length >= 2) {
    out[1]!.midi = liftIntoRange(out[0]!.midi + (seededUnit(seed, 766) < 0.5 ? 6 : -6), low, high);
  }
  enforceStickyAnchorRhythmShape(out);
  return out;
}

function selectStickyMotifSlice(
  raw: SoloNote[],
  chordSymbol: string,
  low: number,
  high: number,
  seed: number,
  salt: number,
  defaultBar: number,
  map: BarMeterMap | undefined
): SoloNote[] {
  if (raw.length === 0) return raw;
  type Cand = { notes: SoloNote[]; len: number; start: number };
  const candidates: Cand[] = [];
  for (let len = Math.min(MOTIF_STICKY_MAX_NOTES, raw.length); len >= MOTIF_STICKY_MIN_NOTES; len--) {
    for (let start = 0; start + len <= raw.length; start++) {
      const window = raw.slice(start, start + len).map((n) => ({ ...n }));
      const ints = computeFragmentIntervals(window);
      if (!hasZappaSignatureLeap(ints)) continue;
      const durs = window.map((n) => n.durationBeats);
      if (allDurationsEqual(durs)) continue;
      if (!hasQuarterOrLong(durs)) continue;
      candidates.push({ notes: window, len, start });
    }
  }
  if (candidates.length) {
    candidates.sort((a, b) => {
      const fa = a.notes[0]!;
      const fb = b.notes[0]!;
      const sb = firstNoteStrongBeatRank(fa, map) - firstNoteStrongBeatRank(fb, map);
      if (sb !== 0) return sb > 0 ? -1 : 1;
      const da = a.notes.map((n) => n.durationBeats);
      const db = b.notes.map((n) => n.durationBeats);
      const ra = stickyRhythmContrastScore(da) - stickyRhythmContrastScore(db);
      if (Math.abs(ra) > 1e-6) return ra > 0 ? -1 : 1;
      if (b.len !== a.len) return b.len - a.len;
      if (a.start !== b.start) return a.start - b.start;
      return (
        seededUnit(seed, salt + a.start * 17 + a.len) - seededUnit(seed, salt + b.start * 17 + b.len)
      );
    });
    const win = candidates[0]!.notes.map((n) => ({ ...n }));
    enforceStickyAnchorRhythmShape(win);
    return win;
  }
  const take = Math.min(MOTIF_STICKY_MAX_NOTES, Math.max(MOTIF_STICKY_MIN_NOTES, raw.length));
  const base = raw.slice(0, take).map((n) => ({ ...n }));
  return applyForcedZappaLeap(base, chordSymbol, low, high, seed ^ salt, defaultBar);
}

function sectionLabelForBar(bar1Based: number, form: FormMap): string {
  for (const s of form.sections) {
    const end = s.startBar + s.length - 1;
    if (bar1Based >= s.startBar && bar1Based <= end) return s.label.trim();
  }
  return form.sections[0]?.label.trim() ?? 'A';
}

function injectMotifIntoSingleBar(
  allNotes: SoloNote[],
  bar: number,
  anchor: InternalMotifAnchor,
  chords: string[],
  low: number,
  high: number,
  map: BarMeterMap | undefined,
  seed: number,
  salt: number
): void {
  const N = anchor.intervals.length + 1;
  if (N <= 0) return;
  const span = measureQuarterSpanForBar(bar, map);
  const t = chordTonesForChordSymbol(chords[bar - 1] ?? 'C7alt');
  let pitch = liftIntoRange(t.third ?? t.root + 4, low, high);
  const ratios =
    anchor.durationRatios.length >= N
      ? anchor.durationRatios
      : normalizePositiveRatios(Array.from({ length: N }, () => 1));
  const gap = span / Math.max(N, 1);
  for (let i = 0; i < N; i++) {
    const dur = Math.max(0.1, Math.min(span * 0.42, (ratios[i] ?? 1 / N) * span * 0.92));
    const st = Math.min(span - dur, i * gap + seededUnit(seed, salt + i * 17) * Math.min(0.08, span * 0.03));
    allNotes.push({
      midi: Math.round(pitch),
      startBeat: st,
      durationBeats: dur,
      barIndex: bar,
      tupletRole: 'plain',
      marker: undefined,
    });
    if (i < anchor.intervals.length) pitch = liftIntoRange(pitch + anchor.intervals[i]!, low, high);
  }
  allNotes.sort((a, c) => (a.barIndex !== c.barIndex ? a.barIndex - c.barIndex : a.startBeat - c.startBeat));
}

function thinBarToMaxAttackCount(allNotes: SoloNote[], bar: number, maxNotes: number): void {
  const removableRank = (n: SoloNote): number => {
    if (!breathSpacingMayRemoveZappaNote(n)) return -1;
    return n.marker === 'density_minimum_pad' ? 0 : 1;
  };
  let guard = 0;
  while (guard++ < 512) {
    const count = allNotes.filter((n) => n.barIndex === bar && !n.isRest).length;
    if (count <= maxNotes) break;
    const removable = allNotes
      .filter((n) => n.barIndex === bar && removableRank(n) >= 0)
      .sort((a, b) => {
        const ra = removableRank(a);
        const rb = removableRank(b);
        if (ra !== rb) return ra - rb;
        return b.startBeat - a.startBeat;
      });
    const victim = removable[0];
    if (!victim) break;
    const j = allNotes.indexOf(victim);
    if (j >= 0) allNotes.splice(j, 1);
    else break;
  }
  allNotes.sort((a, c) => (a.barIndex !== c.barIndex ? a.barIndex - c.barIndex : a.startBeat - c.startBeat));
}

function classifyMotifTransform(bestScale: number, intScore: number): ZappaMotifPhraseReceipt['transform'] {
  if (bestScale >= 1.35) return 'augment';
  if (bestScale <= 0.72) return 'compress';
  if (intScore >= 0.82) return 'identity';
  return 'shift';
}

function combinedMotifSimilarity(
  anchor: InternalMotifAnchor,
  fragNotes: SoloNote[],
  map: BarMeterMap | undefined
): { score: number; transform: ZappaMotifPhraseReceipt['transform']; bestScale: number } {
  if (fragNotes.length === 0) return { score: 0, transform: 'shift', bestScale: 1 };
  const fi = computeFragmentIntervals(fragNotes);
  const fioi = computeFragmentIoIs(fragNotes, map);
  const intSc = intervalContourScore(anchor.intervals, fi);
  const { score: ioiSc, bestScale } = ioiShapeScore(anchor.ioiRatios.length ? anchor.ioiRatios : [1], fioi.length ? fioi : [1], IOI_SCALES);
  const durRatFrag = normalizePositiveRatios(fragNotes.map((n) => Math.max(1e-4, n.durationBeats)));
  const durSc =
    anchor.durationRatios.length === 0 || durRatFrag.length === 0
      ? 1
      : intervalContourScore(anchor.durationRatios, durRatFrag);
  const combined = 0.42 * intSc + 0.38 * ioiSc + 0.2 * durSc;
  return {
    score: Math.max(0, Math.min(1, combined)),
    transform: classifyMotifTransform(bestScale, intSc),
    bestScale,
  };
}

function dominantSectionLabelForPhrase(lo: number, hi: number, form: FormMap): { label: string; sectionIndex: number } {
  const counts = new Map<string, { c: number; idx: number }>();
  for (let b = lo; b <= hi; b++) {
    let hit = -1;
    for (let si = 0; si < form.sections.length; si++) {
      const s = form.sections[si]!;
      const end = s.startBar + s.length - 1;
      if (b >= s.startBar && b <= end) {
        hit = si;
        break;
      }
    }
    const lab = hit >= 0 ? form.sections[hit]!.label.trim() : 'default';
    const idx = hit >= 0 ? hit : 0;
    const prev = counts.get(lab);
    if (!prev) counts.set(lab, { c: 1, idx });
    else counts.set(lab, { c: prev.c + 1, idx: prev.idx });
  }
  let bestL = form.sections[0]?.label.trim() ?? 'A';
  let bestC = -1;
  for (const [lab, v] of counts) {
    if (v.c > bestC) {
      bestC = v.c;
      bestL = lab;
    }
  }
  const idx = form.sections.findIndex((s) => s.label.trim() === bestL);
  return { label: bestL, sectionIndex: idx >= 0 ? idx : 0 };
}

function findFormSection(form: FormMap, label: string) {
  return form.sections.find((s) => s.label.trim() === label.trim()) ?? form.sections[0];
}

function developmentBarRangeForPhraseInSection(
  phraseLo: number,
  phraseHi: number,
  anchor: InternalMotifAnchor
): { devLo: number; devHi: number } | undefined {
  const anchorEnd = anchor.anchorEndBar;
  let devLo = Math.max(phraseLo, anchorEnd + 1);
  const devHi = phraseHi;
  if (devLo > devHi) {
    /** Four-bar anchor can cover an entire first phrase — score development on the phrase tail vs anchor. */
    const phraseLen = phraseHi - phraseLo + 1;
    const tailBars = Math.min(2, Math.max(1, phraseLen - 1));
    devLo = Math.max(phraseLo, phraseHi - tailBars + 1);
    if (devLo > devHi) return undefined;
  }
  if (devLo > anchor.sectionEndBar) return undefined;
  return { devLo: Math.min(devLo, anchor.sectionEndBar), devHi: Math.min(devHi, anchor.sectionEndBar) };
}

function removeRepairableNotesInRange(allNotes: SoloNote[], devLo: number, devHi: number): void {
  for (let i = allNotes.length - 1; i >= 0; i--) {
    const n = allNotes[i]!;
    if (n.barIndex < devLo || n.barIndex > devHi) continue;
    if (n.isRest) continue;
    if (isZappaMotifStructuralNote(n)) continue;
    allNotes.splice(i, 1);
  }
}

/** Simpler injection: walk bars devLo..devHi placing one anchor note per slice, aligned to beat 0 offsets from ratios. */
function injectMotifFromAnchorSimple(
  allNotes: SoloNote[],
  devLo: number,
  devHi: number,
  anchor: InternalMotifAnchor,
  chords: string[],
  low: number,
  high: number,
  map: BarMeterMap | undefined,
  seed: number,
  salt: number,
  aggressive = false
): void {
  const N = anchor.intervals.length + 1;
  if (N <= 0) return;
  const t = chordTonesForChordSymbol(chords[devLo - 1] ?? 'C7alt');
  let pitch = liftIntoRange(t.third ?? t.root + 4, low, high);
  let noteIdx = 0;
  const durCap = aggressive ? 0.55 : 0.42;
  const onsetJitter = aggressive ? 0.04 : 0.08;
  for (let bar = devLo; bar <= devHi && noteIdx < N; bar++) {
    const span = measureQuarterSpanForBar(bar, map);
    const dur = Math.max(0.1, Math.min(span * durCap, (anchor.durationRatios[noteIdx] ?? 1 / N) * span));
    const st = Math.min(span - dur, seededUnit(seed, salt + bar * 31 + noteIdx) * onsetJitter);
    allNotes.push({
      midi: Math.round(pitch),
      startBeat: st,
      durationBeats: dur,
      barIndex: bar,
      tupletRole: 'plain',
      marker: undefined,
    });
    if (noteIdx < anchor.intervals.length) pitch = liftIntoRange(pitch + anchor.intervals[noteIdx]!, low, high);
    noteIdx++;
  }
}

function applyZappaMotifOwnershipPhase2(params: {
  allNotes: SoloNote[];
  tb: number;
  map: BarMeterMap | undefined;
  form: FormMap;
  chords: string[];
  low: number;
  high: number;
  seed: number;
  totalPhrases: number;
}): ZappaMotifOwnershipReceipt {
  const { allNotes, tb, map, form, chords, low, high, seed, totalPhrases } = params;

  if (!form.sections?.length) {
    return {
      recurrenceThreshold: MOTIF_RECURRENCE_THRESHOLD,
      anchors: [],
      phraseScores: [],
      sectionRecurrence: {},
      sectionsMeetingRecurrence: [],
      phrasesRejectedOrRepaired: 0,
    };
  }

  const anchorsInternal: InternalMotifAnchor[] = [];
  const anchorReceipts: ZappaMotifAnchorReceipt[] = [];

  for (const sec of form.sections) {
    const endBar = sec.startBar + sec.length - 1;
    const barHi = Math.min(sec.startBar + (MOTIF_ANCHOR_BAR_SPAN - 1), endBar);
    const chordSym = chords[sec.startBar - 1] ?? 'C7alt';
    let slice = sortedMotifSliceNotes(allNotes, sec.startBar, barHi);
    slice = selectStickyMotifSlice(slice, chordSym, low, high, seed, sec.startBar * 31 + sec.length, sec.startBar, map);
    const anchor = buildInternalAnchorFromNotes(sec.label.trim(), sec.startBar, barHi, endBar, map, slice);
    if (anchor) {
      anchorsInternal.push(anchor);
      const idig = anchor.intervals.map((x) => ((x % 12) + 12) % 12).join(',');
      const rdig = anchor.durationRatios.map((x) => x.toFixed(3)).join(',');
      anchorReceipts.push({
        sectionLabel: sec.label.trim(),
        anchorStartBar: sec.startBar,
        intervalsFingerprint: idig || '∅',
        rhythmFingerprint: rdig || '∅',
        noteCount: anchor.intervals.length + 1,
      });
    }
  }

  const anchorByLabel = new Map<string, InternalMotifAnchor>();
  for (const a of anchorsInternal) anchorByLabel.set(a.sectionLabel, a);

  const phraseScoresDraft: ZappaMotifPhraseReceipt[] = [];
  let repairedCount = 0;

  for (let pi = 0; pi < totalPhrases; pi++) {
    const lo = pi * 4 + 1;
    const hi = Math.min(tb, (pi + 1) * 4);
    const { label: domLabel } = dominantSectionLabelForPhrase(lo, hi, form);
    const sec = findFormSection(form, domLabel);
    const anchor = anchorByLabel.get(sec.label.trim());
    if (!anchor) {
      phraseScoresDraft.push({
        phraseIndex: pi,
        barRange: [lo, hi],
        sectionLabel: domLabel,
        similarity: 1,
        transform: 'identity',
        repaired: false,
      });
      continue;
    }

    const dev = developmentBarRangeForPhraseInSection(lo, hi, anchor);
    if (!dev) {
      phraseScoresDraft.push({
        phraseIndex: pi,
        barRange: [lo, hi],
        sectionLabel: anchor.sectionLabel,
        similarity: 1,
        transform: 'identity',
        repaired: false,
      });
      continue;
    }

    let frag = fragmentSortedNotes(allNotes, dev.devLo, dev.devHi);
    let { score, transform } = combinedMotifSimilarity(anchor, frag, map);
    let repaired = false;

    if (score < MOTIF_FULL_PHRASE_REPLACE_THRESHOLD) {
      removeRepairableNotesInRange(allNotes, lo, hi);
      injectMotifFromAnchorSimple(allNotes, lo, hi, anchor, chords, low, high, map, seed, 91800 + pi, true);
      repaired = true;
      repairedCount++;
      frag = fragmentSortedNotes(allNotes, dev.devLo, dev.devHi);
      const again = combinedMotifSimilarity(anchor, frag, map);
      score = again.score;
      transform = again.transform;
    } else if (score < MOTIF_RECURRENCE_THRESHOLD) {
      removeRepairableNotesInRange(allNotes, dev.devLo, dev.devHi);
      const aggressiveMid = score < 0.62;
      injectMotifFromAnchorSimple(
        allNotes,
        dev.devLo,
        dev.devHi,
        anchor,
        chords,
        low,
        high,
        map,
        seed,
        91800 + pi,
        aggressiveMid
      );
      repaired = true;
      repairedCount++;
      frag = fragmentSortedNotes(allNotes, dev.devLo, dev.devHi);
      const again = combinedMotifSimilarity(anchor, frag, map);
      score = again.score;
      transform = again.transform;
    }

    phraseScoresDraft.push({
      phraseIndex: pi,
      barRange: [lo, hi],
      sectionLabel: anchor.sectionLabel,
      similarity: score,
      transform,
      repaired,
    });
  }

  for (const sb of STRUCTURAL_MOTIF_RECALL_BARS) {
    if (sb > tb) continue;
    const lab = sectionLabelForBar(sb, form);
    const anchor = anchorByLabel.get(lab);
    if (!anchor) continue;
    const frag = fragmentSortedNotes(allNotes, sb, sb);
    const { score: stScore } = combinedMotifSimilarity(anchor, frag, map);
    if (stScore >= MOTIF_STRUCTURAL_BAR_THRESHOLD - 1e-9) continue;
    removeRepairableNotesInRange(allNotes, sb, sb);
    injectMotifIntoSingleBar(allNotes, sb, anchor, chords, low, high, map, seed, 92000 + sb);
    repairedCount++;
  }

  for (const bb of BREATH_BARS_AFTER_STRUCTURAL) {
    if (bb > tb) continue;
    thinBarToMaxAttackCount(allNotes, bb, MOTIF_BREATH_BAR_MAX_NOTES);
  }

  normalizeSoloNoteRhythmsPerBarForExport(allNotes, tb, map);
  collapseDuplicateOnsetsPerBarMonophonic(allNotes, tb);
  normalizeSoloNoteRhythmsPerBarForExport(allNotes, tb, map);

  const phraseScores: ZappaMotifPhraseReceipt[] = [];
  const sectionRecurrence: Record<string, number[]> = {};
  for (let pi = 0; pi < totalPhrases; pi++) {
    const lo = pi * 4 + 1;
    const hi = Math.min(tb, (pi + 1) * 4);
    const { label: domLabel } = dominantSectionLabelForPhrase(lo, hi, form);
    const anchor = anchorByLabel.get(findFormSection(form, domLabel).label.trim());
    if (!anchor) {
      phraseScores.push(phraseScoresDraft[pi]!);
      continue;
    }
    const dev = developmentBarRangeForPhraseInSection(lo, hi, anchor);
    if (!dev) {
      phraseScores.push(phraseScoresDraft[pi]!);
      continue;
    }
    const frag = fragmentSortedNotes(allNotes, dev.devLo, dev.devHi);
    const fin = combinedMotifSimilarity(anchor, frag, map);
    const prev = phraseScoresDraft[pi]!;
    phraseScores.push({
      ...prev,
      similarity: fin.score,
      transform: fin.transform,
    });
    const lab = anchor.sectionLabel;
    if (!sectionRecurrence[lab]) sectionRecurrence[lab] = [];
    sectionRecurrence[lab]!.push(fin.score);
  }

  const sectionRecurrenceMeans: Record<string, number> = {};
  const sectionsMeeting: string[] = [];
  for (const [lab, arr] of Object.entries(sectionRecurrence)) {
    const m = arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 1;
    sectionRecurrenceMeans[lab] = m;
    if (m >= MOTIF_RECURRENCE_THRESHOLD - 1e-6) sectionsMeeting.push(lab);
  }

  return {
    recurrenceThreshold: MOTIF_RECURRENCE_THRESHOLD,
    anchors: anchorReceipts,
    phraseScores,
    sectionRecurrence: sectionRecurrenceMeans,
    sectionsMeetingRecurrence: sectionsMeeting,
    phrasesRejectedOrRepaired: repairedCount,
  };
}

/** UI / request tiers → engine {@link ZappasoloOptions} (defaults: guitar E3–C6, medium density, moderate dissonance). */
export function zappaSoloOptionsFromTiers(tiers?: {
  midiLow?: number;
  midiHigh?: number;
  density?: 'low' | 'medium' | 'high';
  dissonance?: 'mild' | 'moderate' | 'extreme';
}): ZappasoloOptions {
  let midiLow = tiers?.midiLow ?? ZAPPA_SOLO_DEFAULT_MIDI_LOW;
  let midiHigh = tiers?.midiHigh ?? ZAPPA_SOLO_DEFAULT_MIDI_HIGH;
  if (midiLow > midiHigh) {
    const t = midiLow;
    midiLow = midiHigh;
    midiHigh = t;
  }
  const densityMap: Record<'low' | 'medium' | 'high', number> = {
    low: 0.28,
    medium: 0.72,
    high: 1.0,
  };
  const dissonanceMap: Record<'mild' | 'moderate' | 'extreme', number> = {
    mild: 0.33,
    moderate: 0.66,
    extreme: 1.0,
  };
  const densityTier = tiers?.density ?? 'medium';
  const dissonanceTier = tiers?.dissonance ?? 'moderate';
  return {
    midiLow,
    midiHigh,
    density: densityMap[densityTier],
    dissonanceLevel: dissonanceMap[dissonanceTier],
  };
}

function pickFrankZappaPhraseIntent(bar: number, seed: number): SlonimskyContext['phraseIntent'] {
  const w = SLONIMSKY_STYLE_PROFILE_MAP.FRANK_ZAPPA.intentWeights;
  const u = seededUnit(seed, bar * 17);
  const sum = w.build + w.float + w.release + w.shock;
  let t = u * sum;
  if (t < w.shock) return 'shock';
  t -= w.shock;
  if (t < w.build) return 'build';
  t -= w.build;
  if (t < w.float) return 'float';
  return 'release';
}

function buildZappaSlonimskyContext(params: {
  bar: number;
  seed: number;
  chord: string;
  maxBeats: number;
  options: ZappasoloOptions | undefined;
}): SlonimskyContext {
  const { bar, seed, chord, maxBeats, options } = params;
  const low = options?.midiLow ?? ZAPPA_SOLO_DEFAULT_MIDI_LOW;
  const high = options?.midiHigh ?? ZAPPA_SOLO_DEFAULT_MIDI_HIGH;
  const cat = inferSlonimskyChordTypeCategory(chord);
  const t = chordTonesForChordSymbol(chord);
  const base = liftIntoRange(t.third ?? t.root + 4, low, high);
  const outsideBase = options?.dissonanceLevel !== undefined ? Math.round(options.dissonanceLevel * 2) : 2;
  const allowedOutsideLevel = Math.min(2, Math.max(0, outsideBase)) as 0 | 1 | 2;
  const profileCap = resolveAllowedOutsideLevelForSlonimsky('frank_zappa');
  const allowed = Math.min(allowedOutsideLevel, profileCap) as 0 | 1 | 2;

  return {
    keyPc: t.root % 12,
    chordType: cat,
    functionalStrength: 'medium',
    allowedOutsideLevel: allowed,
    phraseIntent: pickFrankZappaPhraseIntent(bar, seed),
    basePitch: base,
    maxBeats: Math.max(0.25, maxBeats),
    styleProfile: SLONIMSKY_STYLE_PROFILE_MAP.FRANK_ZAPPA.defaultProfile,
    chordSymbol: chord,
    effectiveLow: low,
    effectiveHigh: high,
    transpositionInterval: SLONIMSKY_STYLE_PROFILE_MAP.FRANK_ZAPPA.transpositionInterval,
    maxInfraSteps: SLONIMSKY_STYLE_PROFILE_MAP.FRANK_ZAPPA.maxInfraSteps,
    maxUltraSteps: SLONIMSKY_STYLE_PROFILE_MAP.FRANK_ZAPPA.maxUltraSteps,
  };
}

function slonimskyNotesToSoloNotes(
  bar: number,
  sl: SlonimskyNote[],
  meterSpan: number,
  tupletRole: SoloNote['tupletRole'],
  marker: SoloNote['marker']
): SoloNote[] {
  const out: SoloNote[] = [];
  for (const n of sl) {
    const start = Math.min(meterSpan - 0.01, Math.max(0, n.beat));
    let dur = Math.max(0.05, n.durationBeats);
    if (start + dur > meterSpan + 1e-6) {
      dur = Math.max(0.05, meterSpan - start);
    }
    out.push({
      midi: n.midi,
      startBeat: start,
      durationBeats: dur,
      barIndex: bar,
      tupletRole,
      marker,
    });
  }
  return out;
}

/** Emit [0,1,3,7] semitone tetrachord above chord root (alt / Lydian colour — roadmap PDF vocabulary). */
function emit0137Tetrachord(bar: number, chord: string, low: number, high: number, seed: number): SoloNote[] {
  const rpc = harmonyRootPcFromSymbol(chord);
  if (rpc === undefined) return [];
  const cat = inferSlonimskyChordTypeCategory(chord);
  const altish =
    cat === 'dominant_alt' ||
    cat === 'dominant' ||
    chord.toLowerCase().includes('alt') ||
    chord.includes('#11');
  if (!altish) return [];
  const rootMidi = liftIntoRange(60 + rpc, low, high);
  const pcs = [0, 1, 3, 7];
  const span = 1.0;
  const step = span / 4;
  return pcs.map((pc, i) => ({
    midi: liftIntoRange(rootMidi + pc + (seed % 2 === 0 ? 0 : 12), low, high),
    startBeat: i * step,
    durationBeats: step * 0.95,
    barIndex: bar,
    tupletRole: 'plain' as const,
    marker: 'tetrachord_0137' as const,
  }));
}

/** Descending minor 6th (−8 semitones) pair at phrase boundary. */
function emitDescendingMinorSixth(bar: number, chord: string, low: number, high: number): SoloNote[] {
  const rpc = harmonyRootPcFromSymbol(chord);
  if (rpc === undefined) return [];
  const hi = liftIntoRange(72 + rpc, low, high);
  const lo = liftIntoRange(hi - 8, low, high);
  return [
    {
      midi: hi,
      startBeat: 0,
      durationBeats: 0.12,
      barIndex: bar,
      tupletRole: 'plain',
      marker: 'descending_minor_sixth',
    },
    {
      midi: lo,
      startBeat: 0.15,
      durationBeats: 0.25,
      barIndex: bar,
      tupletRole: 'plain',
      marker: 'descending_minor_sixth',
    },
  ];
}

function chordsForZappa(context: CompositionContext): string[] {
  const tb = context.form.totalBars;
  const eff = context.generationMetadata.frankZappaEffectiveHarmonyBars;
  if (eff && eff.length === tb) return [...eff];
  const out: string[] = [];
  for (let b = 1; b <= tb; b++) {
    out.push(getChordForBar(b, context));
  }
  return out;
}

function barMeterMapFromContext(context: CompositionContext): BarMeterMap | undefined {
  return context.generationMetadata.barMeterMap ?? context.barMeterMap;
}

function isZappaCrossBarTemplateNote(n: SoloNote): boolean {
  if (n.marker === 'descending_minor_sixth' || n.marker === 'tetrachord_0137') return false;
  if (n.tupletRole && n.tupletRole !== 'plain') return false;
  return true;
}

/** Musicality Phase 4 — one bar per form section skips 7/8 cell snap (controlled disruption). */
function computeZappaSectionDisruptionBars(
  form: FormMap | undefined,
  tb: number,
  map: BarMeterMap | undefined,
  seed: number
): { skipBars: Set<number>; sectionDisruptionBars: Record<string, number> } {
  const skipBars = new Set<number>();
  const sectionDisruptionBars: Record<string, number> = {};
  if (!form?.sections?.length) return { skipBars, sectionDisruptionBars };
  for (let si = 0; si < form.sections.length; si++) {
    const sec = form.sections[si]!;
    const lo = sec.startBar;
    const hi = Math.min(tb, sec.startBar + sec.length - 1);
    const cand: number[] = [];
    for (let b = lo; b <= hi; b++) {
      const sig = resolveMeterForBar(b, map);
      if (sig.numerator === 7 && sig.denominator === 8) cand.push(b);
    }
    const pool = cand.length > 0 ? cand : Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
    const idx = Math.floor(seededUnit(seed, 860 + si) * pool.length);
    const pick = pool[Math.min(pool.length - 1, Math.max(0, idx))]!;
    skipBars.add(pick);
    sectionDisruptionBars[sec.label.trim()] = pick;
  }
  return { skipBars, sectionDisruptionBars };
}

/**
 * Musicality Phase 4 — reuse bar 1 rhythm + contour (transposed) at bars 5, 9, 13, … (+4k).
 */
function applyZappaCrossBarCallbacks(params: {
  allNotes: SoloNote[];
  tb: number;
  map: BarMeterMap | undefined;
  chords: string[];
  low: number;
  high: number;
}): ZappaCrossBarCallbackReceipt | undefined {
  const { allNotes, tb, map, chords, low, high } = params;
  const template = allNotes
    .filter((n) => n.barIndex === 1 && isZappaCrossBarTemplateNote(n))
    .sort((a, b) => a.startBeat - b.startBeat);
  if (template.length === 0) return undefined;

  const callbackBars: number[] = [];
  for (let b = 5; b <= tb; b += 4) {
    callbackBars.push(b);
    for (let i = allNotes.length - 1; i >= 0; i--) {
      const n = allNotes[i]!;
      if (n.barIndex === b && isZappaCrossBarTemplateNote(n)) allNotes.splice(i, 1);
    }
    const chord = chords[b - 1] ?? 'C7alt';
    const t = chordTonesForChordSymbol(chord);
    const span = measureQuarterSpanForBar(b, map);
    let curMidi = liftIntoRange(t.third ?? t.root + 4, low, high);
    for (let ti = 0; ti < template.length; ti++) {
      const src = template[ti]!;
      if (ti > 0) {
        curMidi = liftIntoRange(curMidi + (template[ti]!.midi - template[ti - 1]!.midi), low, high);
      }
      if (src.startBeat >= span - 1e-4) continue;
      const dur = Math.min(src.durationBeats, span - src.startBeat);
      if (dur < 0.06) continue;
      allNotes.push({
        midi: Math.round(curMidi),
        startBeat: src.startBeat,
        durationBeats: dur,
        barIndex: b,
        tupletRole: 'plain',
      });
    }
  }

  const rhythmFingerprint = template.map((n) => `${n.startBeat.toFixed(3)}@${n.durationBeats.toFixed(3)}`).join('|');
  const intervalFingerprint = template.map((n, i) => (i === 0 ? 0 : n.midi - template[i - 1]!.midi)).join(',');

  return {
    anchorBar: 1,
    callbackBars,
    rhythmFingerprint,
    intervalFingerprint,
  };
}

/**
 * Slonimsky-driven Zappa solo line: odd-meter aware, PDF tuplet vocabulary, structural m6 + [0137] + factory shifts.
 */
export function generateZappaSolo(context: CompositionContext, options?: ZappasoloOptions): SoloLine {
  const seed = context.seed;
  const tb = context.form.totalBars;
  const chords = chordsForZappa(context);
  const map = barMeterMapFromContext(context);
  const low = options?.midiLow ?? ZAPPA_SOLO_DEFAULT_MIDI_LOW;
  const high = options?.midiHigh ?? ZAPPA_SOLO_DEFAULT_MIDI_HIGH;

  const allNotes: SoloNote[] = [];
  const density = options?.density ?? ZAPPA_SOLO_DEFAULT_DENSITY_NUMERIC;

  for (let b = 1; b <= tb; b++) {
    const chord = chords[b - 1] ?? 'C7alt';
    const meterSpan = measureQuarterSpanForBar(b, map);
    let reservedFront = 0;

    /** Phrase starts (bars 5, 9, …): descending minor 6th gesture (reserve front space). */
    if (b > 1 && (b - 1) % 4 === 0) {
      const m6 = emitDescendingMinorSixth(b, chord, low, high);
      allNotes.push(...m6);
      reservedFront = Math.max(reservedFront, 0.38);
    }

    /** [0137] tetrachord on structural bars (every 4 bars). */
    if (b % 4 === 0) {
      const t37 = emit0137Tetrachord(b, chord, low, high, seed + b);
      if (t37.length) {
        allNotes.push(...t37);
        reservedFront = Math.max(reservedFront, 1.02);
      }
    }

    const bodySpan = Math.max(0.125, meterSpan - reservedFront);
    const ctx = buildZappaSlonimskyContext({ bar: b, seed, chord, maxBeats: bodySpan, options });
    const pattern = selectSlonimskyPattern(ctx, seed + b * 10007);
    let tupletRole: SoloNote['tupletRole'] = 'plain';
    if (b === 3 || b === 7 || b === 11) tupletRole = 'septuplet';
    else if (b === 5 || b === 9) tupletRole = 'quintuplet';

    let barNotes: SoloNote[] = [];
    if (pattern && density > 0.05) {
      const sl = generateSlonimskyPattern(pattern, ctx, seed + b * 3331);
      const filtered =
        density < 0.45 ? sl.filter((_, idx) => idx % 2 === 0 || idx === sl.length - 1) : sl;
      barNotes = slonimskyNotesToSoloNotes(b, filtered.length ? filtered : sl, reservedFront + bodySpan, tupletRole, undefined).map(
        (n) => ({
          ...n,
          startBeat: n.startBeat + reservedFront,
        })
      );
    }
    if (barNotes.length === 0 && density > 0.05) {
      const t = chordTonesForChordSymbol(chord, { lockedHarmony: true });
      const m1 = liftIntoRange(t.third ?? t.root + 4, low, high);
      const m2 = liftIntoRange(t.seventh ?? t.root + 10, low, high);
      const d1 = Math.min(0.4, bodySpan * 0.32);
      const d2 = Math.min(0.38, bodySpan * 0.3);
      const s2 = reservedFront + Math.min(bodySpan - d2 - 0.06, bodySpan * 0.42);
      barNotes = [
        {
          midi: m1,
          startBeat: reservedFront,
          durationBeats: d1,
          barIndex: b,
          tupletRole,
          marker: undefined,
        },
        {
          midi: m2,
          startBeat: s2,
          durationBeats: d2,
          barIndex: b,
          tupletRole,
          marker: undefined,
        },
      ];
    }

    /** Factory-cycle 32nd displacement (d2 analogue): shift onsets by 1/8 quarter on structural returns. */
    if (b === 5 || b === 9) {
      barNotes = barNotes.map((n) => ({
        ...n,
        startBeat: Math.min(Math.max(reservedFront, meterSpan - n.durationBeats), n.startBeat + 0.125),
        marker: n.marker ?? 'factory_32nd_shift',
      }));
    }

    allNotes.push(...barNotes);
  }

  const crossBarReceipt = applyZappaCrossBarCallbacks({
    allNotes,
    tb,
    map,
    chords,
    low,
    high,
  });

  const { skipBars, sectionDisruptionBars } = computeZappaSectionDisruptionBars(context.form, tb, map, seed);

  const totalPhrases = Math.max(1, Math.ceil(tb / 4));
  const lockedTopCount = zappaRhythmicCellLockedPhraseCount(totalPhrases);
  applyZappa78RhythmicCellLockToAllNotes({
    allNotes,
    tb,
    map,
    form: context.form,
    lockedPhraseTopCount: lockedTopCount,
    skipBars,
  });
  normalizeSoloNoteRhythmsPerBarForExport(allNotes, tb, map);
  collapseDuplicateOnsetsPerBarMonophonic(allNotes, tb);
  normalizeSoloNoteRhythmsPerBarForExport(allNotes, tb, map);

  let zappaMotifReceipt = applyZappaMotifOwnershipPhase2({
    allNotes,
    tb,
    map,
    form: context.form,
    chords,
    low,
    high,
    seed,
    totalPhrases,
  });
  if (crossBarReceipt) {
    zappaMotifReceipt = { ...zappaMotifReceipt, crossBarCallbacks: crossBarReceipt };
  }

  let zappaGuideToneReceipt = buildZappaSmoothedGuideToneReceipt(chords, tb, low, high);
  applyZappaGuideTonePitchNudges(allNotes, tb, zappaGuideToneReceipt, low, high);
  const phraseTargets = applyZappaPhraseGoalTargeting(allNotes, tb, zappaGuideToneReceipt, seed, low, high);
  zappaGuideToneReceipt = { ...zappaGuideToneReceipt, phraseTargets };
  normalizeSoloNoteRhythmsPerBarForExport(allNotes, tb, map);
  collapseDuplicateOnsetsPerBarMonophonic(allNotes, tb);
  normalizeSoloNoteRhythmsPerBarForExport(allNotes, tb, map);

  enforceMinimumZappaSoloNotesPerBar({ allNotes, tb, chords, low, high, seed, map });
  enforceZappaPhraseBreathSpace({ allNotes, tb, seed, map });
  normalizeSoloNoteRhythmsPerBarForExport(allNotes, tb, map);
  collapseDuplicateOnsetsPerBarMonophonic(allNotes, tb);
  normalizeSoloNoteRhythmsPerBarForExport(allNotes, tb, map);

  const phrases: SoloPhrase[] = [];
  for (let pi = 0; pi < totalPhrases; pi++) {
    const lo = pi * 4 + 1;
    const hi = Math.min(tb, (pi + 1) * 4);
    const slice = allNotes.filter((n) => n.barIndex >= lo && n.barIndex <= hi);
    const section = resolveZappaFormSectionForBar(lo, context.form);
    const cell = zappaRhythmicCellForFormSection(section);
    let sevenEightBarCount = 0;
    for (let bb = lo; bb <= hi; bb++) {
      const sig = resolveMeterForBar(bb, map);
      if (sig.numerator === 7 && sig.denominator === 8) sevenEightBarCount++;
    }
    const cellLockSelected = phraseIndexUsesRhythmicCellLock(pi, lockedTopCount);
    const boundaryAlignment = computeBoundaryAlignmentForPhrase(slice, map, cell, lo, hi);
    phrases.push({
      barRange: [lo, hi],
      notes: slice,
      zappaRhythmicCell: {
        formSection: cell.formSection,
        spec: cell.spec,
        eighthSpans: [...cell.eighthSpans],
        cellLockSelected,
        sevenEightBarCount,
        boundaryAlignment,
      },
    });
  }

  const rhythmicCellLock = {
    threshold: 0.6,
    phraseCount: totalPhrases,
    phrasesCellLocked: lockedTopCount,
    policyMet: lockedTopCount / totalPhrases >= 0.6 - 1e-9,
    sectionDisruptionBars:
      Object.keys(sectionDisruptionBars).length > 0 ? sectionDisruptionBars : undefined,
  };

  const receipt: SoloLine['receipt'] = {
    hasSeptuplet: allNotes.some((n) => n.tupletRole === 'septuplet'),
    hasQuintuplet: allNotes.some((n) => n.tupletRole === 'quintuplet'),
    hasDescendingMinorSixth: allNotes.some((n) => n.marker === 'descending_minor_sixth'),
    hasTetrachord0137: allNotes.some((n) => n.marker === 'tetrachord_0137'),
  };

  const digest = [
    receipt.hasSeptuplet ? 'septuplet' : '',
    receipt.hasQuintuplet ? 'quintuplet' : '',
    receipt.hasDescendingMinorSixth ? 'desc_m6' : '',
    receipt.hasTetrachord0137 ? 't0137' : '',
  ]
    .filter(Boolean)
    .join(';');

  return {
    phrases,
    allNotes,
    receipt,
    digest,
    rhythmicCellLock,
    zappaMotifReceipt,
    zappaGuideToneReceipt,
  };
}

/** Convert {@link SoloLine} to a MusicXML-exportable part (treble lead). */
export function soloLineToPartModel(line: SoloLine, totalBars: number): PartModel {
  const byBar = new Map<number, SoloNote[]>();
  for (const n of line.allNotes) {
    if (!byBar.has(n.barIndex)) byBar.set(n.barIndex, []);
    byBar.get(n.barIndex)!.push(n);
  }

  const measures: MeasureModel[] = [];
  for (let b = 1; b <= totalBars; b++) {
    const notes = (byBar.get(b) ?? []).sort((a, c) => a.startBeat - c.startBeat);
    const events: ScoreEvent[] = [];
    for (const sn of notes) {
      if (sn.isRest) {
        events.push({ kind: 'rest', startBeat: sn.startBeat, duration: sn.durationBeats, voice: 1 });
        continue;
      }
      events.push({
        kind: 'note',
        pitch: zappaSoloExportWrittenMidi(sn.midi),
        startBeat: sn.startBeat,
        duration: sn.durationBeats,
        voice: 1,
        motifRef:
          [sn.tupletRole && sn.tupletRole !== 'plain' ? `zappa_tuplet:${sn.tupletRole}` : '', sn.marker ? `zappa:${sn.marker}` : '']
            .filter(Boolean)
            .join('|') || undefined,
      });
    }
    measures.push({ index: b, events });
  }

  return {
    id: 'zappa_solo',
    name: 'Elec. Gtr',
    scoreInstrumentName: 'Electric Guitar',
    instrumentIdentity: 'clean_electric_guitar',
    /** GM Electric Guitar (clean): MusicXML `<midi-program>` = **27** (`midiProgram` is 0-based here → **26**). */
    midiProgram: 26,
    clef: 'treble',
    measures,
  };
}

/** Copy solo output onto generation metadata (call after `generateZappaSolo`). */
export function applyZappaSoloToMetadata(metadata: GenerationMetadata, line: SoloLine): void {
  metadata.soloLine = line;
  if (line.digest) metadata.zappaSoloDigest = line.digest;
}

/** Append Zappa solo part to an existing score for export (separate MusicXML part). */
export function mergeZappaSoloPart(score: ScoreModel, line: SoloLine): ScoreModel {
  const tb = Math.max(
    score.parts.reduce((m, p) => Math.max(m, p.measures.length), 0),
    line.allNotes.reduce((m, n) => Math.max(m, n.barIndex), 0)
  );
  const soloPart = soloLineToPartModel(line, tb);
  return {
    ...score,
    parts: [...score.parts, soloPart],
  };
}
