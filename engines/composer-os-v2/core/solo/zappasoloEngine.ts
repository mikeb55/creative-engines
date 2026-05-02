/**
 * Frank Zappa Phase B — solo / melodic generator (Slonimsky backbone + Zappa PDF vocabulary).
 * Phase 1: 7/8 rhythmic cell lock. Phase 2: section anchor motif + ≥0.7 development similarity (shift / augment / compress).
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
import type { MeasureModel, NoteEvent, PartModel, ScoreModel } from '../score-model/scoreModelTypes';
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

/** Default Zappa solo generation range (E3–C6). Written pitch uses +24 semitones in {@link soloLineToPartModel}. */
const ZAPPA_SOLO_DEFAULT_MIDI_LOW = 52;
const ZAPPA_SOLO_DEFAULT_MIDI_HIGH = 84;
const ZAPPA_SOLO_EXPORT_MIDI_SHIFT = 24;
const ZAPPA_SOLO_EXPORT_MIDI_MAX = 108;

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

/** Quarter-note span of one measure for the given bar. */
export function measureQuarterSpanForBar(bar1Based: number, map: BarMeterMap | undefined): number {
  const sig = resolveMeterForBar(bar1Based, map);
  return (sig.numerator * 4) / sig.denominator;
}

// ---- Musicality Phase 1 — 7/8 rhythmic cell lock (section A vs B, ≥50% phrases) ----

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

/** First `ceil(n * 0.5)` four-bar phrase indices use the cell lock (deterministic, ≥50%). */
export function zappaRhythmicCellLockedPhraseCount(totalPhrases: number): number {
  if (totalPhrases <= 0) return 0;
  return Math.ceil(totalPhrases * 0.5);
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
    if (inBar.length === 0) continue;
    for (let i = 0; i < inBar.length - 1; i++) {
      const a = inBar[i]!;
      const nx = inBar[i + 1]!;
      const maxDur = nx.startBeat - a.startBeat - NORM_EPS;
      if (a.startBeat + a.durationBeats > nx.startBeat + NORM_EPS) {
        a.durationBeats = Math.max(0.06, maxDur);
      }
    }
    const last = inBar[inBar.length - 1]!;
    const tail = last.startBeat + last.durationBeats;
    if (tail < span - 1e-5) {
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
    const inBar = allNotes.filter((n) => n.barIndex === b);
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

const MOTIF_RECURRENCE_THRESHOLD = 0.7;
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
    .filter((n) => n.barIndex >= barLo && n.barIndex <= barHi && !isZappaMotifStructuralNote(n))
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
    .filter((n) => n.barIndex >= devLo && n.barIndex <= devHi && !isZappaMotifStructuralNote(n))
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
  const devLo = Math.max(phraseLo, anchorEnd + 1);
  const devHi = phraseHi;
  if (devLo > devHi) return undefined;
  if (devLo > anchor.sectionEndBar) return undefined;
  return { devLo: Math.min(devLo, anchor.sectionEndBar), devHi: Math.min(devHi, anchor.sectionEndBar) };
}

function removeRepairableNotesInRange(allNotes: SoloNote[], devLo: number, devHi: number): void {
  for (let i = allNotes.length - 1; i >= 0; i--) {
    const n = allNotes[i]!;
    if (n.barIndex < devLo || n.barIndex > devHi) continue;
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
  salt: number
): void {
  const N = anchor.intervals.length + 1;
  if (N <= 0) return;
  const t = chordTonesForChordSymbol(chords[devLo - 1] ?? 'C7alt');
  let pitch = liftIntoRange(t.third ?? t.root + 4, low, high);
  let noteIdx = 0;
  for (let bar = devLo; bar <= devHi && noteIdx < N; bar++) {
    const span = measureQuarterSpanForBar(bar, map);
    const dur = Math.max(0.1, Math.min(span * 0.42, (anchor.durationRatios[noteIdx] ?? 1 / N) * span));
    const st = Math.min(span - dur, seededUnit(seed, salt + bar * 31 + noteIdx) * 0.08);
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
    const barHi = Math.min(sec.startBar + 1, endBar);
    const slice = sortedMotifSliceNotes(allNotes, sec.startBar, barHi);
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

    if (score === 0 || score < MOTIF_RECURRENCE_THRESHOLD) {
      removeRepairableNotesInRange(allNotes, dev.devLo, dev.devHi);
      injectMotifFromAnchorSimple(allNotes, dev.devLo, dev.devHi, anchor, chords, low, high, map, seed, 91800 + pi);
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
  const density = options?.density ?? 1;

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
      const t = chordTonesForChordSymbol(chord);
      const m = liftIntoRange((t.third ?? t.root + 4), low, high);
      barNotes = [
        {
          midi: m,
          startBeat: reservedFront,
          durationBeats: Math.min(0.45, bodySpan * 0.35),
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
    threshold: 0.5,
    phraseCount: totalPhrases,
    phrasesCellLocked: lockedTopCount,
    policyMet: lockedTopCount / totalPhrases >= 0.5 - 1e-9,
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
    const events: NoteEvent[] = notes.map((sn) => ({
      kind: 'note',
      pitch: Math.min(ZAPPA_SOLO_EXPORT_MIDI_MAX, sn.midi + ZAPPA_SOLO_EXPORT_MIDI_SHIFT),
      startBeat: sn.startBeat,
      duration: sn.durationBeats,
      voice: 1,
      motifRef:
        [sn.tupletRole && sn.tupletRole !== 'plain' ? `zappa_tuplet:${sn.tupletRole}` : '', sn.marker ? `zappa:${sn.marker}` : '']
          .filter(Boolean)
          .join('|') || undefined,
    }));
    measures.push({ index: b, events });
  }

  return {
    id: 'zappa_solo',
    name: 'Zappa Solo (Gtr)',
    instrumentIdentity: 'trumpet',
    midiProgram: 56,
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
