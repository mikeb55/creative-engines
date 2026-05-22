/**
 * Z5 — Riff-path Frank Zappa solo adapter (read-only use of duo Slonimsky / 7/8 / guide-tone stack).
 */

import type { RiffSoloGeneratorProfile } from '../composer/riffProfileTypes';
import { chordTonesForChordSymbol } from '../harmony/chordSymbolAnalysis';
import {
  generateSlonimskyPattern,
  inferSlonimskyChordTypeCategory,
  resolveAllowedOutsideLevelForSlonimsky,
  selectSlonimskyPattern,
  SLONIMSKY_STYLE_PROFILE_MAP,
  type IntervalPattern,
  type SlonimskyContext,
  type SlonimskyNote,
} from '../slonimsky/slonimskyEngine';
import {
  applyZappaGuideTonePitchNudges,
  buildZappaSmoothedGuideToneReceipt,
} from '../solo/zappaVoiceLeading';
import type { SoloNote } from '../solo/soloTypes';
import {
  snapStartBeatToZappa78Cell,
  zappaRhythmicCellForFormSection,
} from '../solo/zappasoloEngine';
import type { RiffSoloNote } from './riffSoloBuilder';

export type SoloEvent = RiffSoloNote;

const MEASURE_SPAN_4_4 = 4;
const CELL_SNAP_EPS = 0.085;

function seededUnit(seed: number, salt: number): number {
  let s = ((seed ^ salt * 1103515245) >>> 0) as number;
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 0xffffffff;
}

function dissonanceLevelFromChromaticBudget(budget: number): number {
  if (budget < 0.38) return 0.33;
  if (budget < 0.55) return 0.66;
  return 1;
}

/** chromaticBudget → Slonimsky outside allowance (never 0 on Zappa riff path — level 0 skips pattern pick). */
function allowedOutsideFromProfile(profile: RiffSoloGeneratorProfile): 0 | 1 | 2 {
  const tier = profile.chromaticBudget < 0.4 ? 1 : profile.chromaticBudget < 0.7 ? 1 : 2;
  const cap = resolveAllowedOutsideLevelForSlonimsky('frank_zappa');
  return Math.min(Math.max(1, tier), cap) as 0 | 1 | 2;
}

function phraseIntentFromOperators(
  profile: RiffSoloGeneratorProfile,
  barIndex: number,
  seed: number
): SlonimskyContext['phraseIntent'] {
  const ops = profile.variationOperators ?? [];
  const u = seededUnit(seed, barIndex * 17 + 3);
  const w = SLONIMSKY_STYLE_PROFILE_MAP.FRANK_ZAPPA.intentWeights;
  let shock = w.shock;
  let build = w.build;
  if (ops.includes('chromaticAdd') || ops.includes('ornamentAdd')) shock += 0.12;
  if (ops.includes('rhythmicWarp') || ops.includes('registerShift')) build += 0.1;
  const sum = shock + build + w.float + w.release;
  let t = u * sum;
  if (t < shock) return 'shock';
  t -= shock;
  if (t < build) return 'build';
  t -= build;
  if (t < w.float) return 'float';
  return 'release';
}

/** Map phraseBars → one-bar Slonimsky span (section length in beats). */
function maxBeatsForBar(profile: RiffSoloGeneratorProfile): number {
  const phraseBars = Math.max(1, profile.phraseBars ?? 4);
  return Math.min(MEASURE_SPAN_4_4, Math.max(0.5, (phraseBars * MEASURE_SPAN_4_4) / phraseBars));
}

function formSectionForBar(barIndex: number, profile: RiffSoloGeneratorProfile, seed: number): 'A' | 'B' {
  const ops = profile.variationOperators ?? [];
  const phraseBars = Math.max(1, profile.phraseBars ?? 4);
  const phraseIdx = Math.floor(barIndex / phraseBars);
  if (ops.includes('rhythmicWarp') || ops.includes('rhythmicDisplacement')) {
    return phraseIdx % 2 === 1 ? 'B' : 'A';
  }
  return barIndex % 2 === 0 ? 'A' : 'B';
}

function eighthSpansForCell(profile: RiffSoloGeneratorProfile, section: 'A' | 'B'): readonly number[] {
  const cell = zappaRhythmicCellForFormSection(section);
  if (profile.rhythmicCellEighths?.length) {
    return profile.rhythmicCellEighths;
  }
  return cell.eighthSpans;
}

function selectZappaSlonimskyPattern(ctx: SlonimskyContext, seed: number): IntervalPattern | null {
  const intents: SlonimskyContext['phraseIntent'][] = [
    ctx.phraseIntent,
    'shock',
    'build',
    'float',
    'release',
  ];
  const tried = new Set<string>();
  for (const intent of intents) {
    if (tried.has(intent)) continue;
    tried.add(intent);
    const pat = selectSlonimskyPattern({ ...ctx, phraseIntent: intent }, seed);
    if (pat) return pat;
  }
  return null;
}

function buildSlonimskyContext(
  barIndex: number,
  chordSymbol: string,
  profile: RiffSoloGeneratorProfile,
  seed: number
): SlonimskyContext {
  const low = profile.registerFloor;
  const high = profile.registerCeiling;
  const t = chordTonesForChordSymbol(chordSymbol);
  const base = t.third ?? t.root + 4;
  let p = base;
  while (p < low) p += 12;
  while (p > high) p -= 12;

  return {
    keyPc: ((t.root % 12) + 12) % 12,
    chordType: inferSlonimskyChordTypeCategory(chordSymbol),
    functionalStrength: 'medium',
    allowedOutsideLevel: allowedOutsideFromProfile(profile),
    phraseIntent: phraseIntentFromOperators(profile, barIndex, seed),
    basePitch: p,
    maxBeats: maxBeatsForBar(profile),
    styleProfile: SLONIMSKY_STYLE_PROFILE_MAP.FRANK_ZAPPA.defaultProfile,
    chordSymbol,
    effectiveLow: low,
    effectiveHigh: high,
    transpositionInterval: SLONIMSKY_STYLE_PROFILE_MAP.FRANK_ZAPPA.transpositionInterval,
    maxInfraSteps: SLONIMSKY_STYLE_PROFILE_MAP.FRANK_ZAPPA.maxInfraSteps,
    maxUltraSteps: SLONIMSKY_STYLE_PROFILE_MAP.FRANK_ZAPPA.maxUltraSteps,
    dissonanceLevel: dissonanceLevelFromChromaticBudget(profile.chromaticBudget),
  };
}

function slonimskyToSoloNotes(barIndex1: number, sl: SlonimskyNote[]): SoloNote[] {
  return sl.map((n) => ({
    midi: n.midi,
    startBeat: n.beat,
    durationBeats: n.durationBeats,
    barIndex: barIndex1,
  }));
}

function soloNotesToRiffEvents(notes: SoloNote[]): SoloEvent[] {
  const out: SoloEvent[] = [];
  for (const n of notes) {
    let start = n.startBeat;
    let dur = n.durationBeats;
    if (start + dur > MEASURE_SPAN_4_4 + 1e-6) {
      dur = Math.max(0.05, MEASURE_SPAN_4_4 - start);
    }
    out.push({
      pitch: n.midi,
      startBeat: Math.max(0, Math.min(start, MEASURE_SPAN_4_4 - 0.04)),
      duration: Math.max(0.05, dur),
    });
  }
  return out;
}

function applyCellSnapToSoloNotes(
  notes: SoloNote[],
  profile: RiffSoloGeneratorProfile,
  barIndex: number,
  seed: number
): void {
  const section = formSectionForBar(barIndex, profile, seed);
  const spans = eighthSpansForCell(profile, section);
  for (const n of notes) {
    if (n.isRest) continue;
    n.startBeat = snapStartBeatToZappa78Cell(n.startBeat, spans, MEASURE_SPAN_4_4);
    n.startBeat = Math.max(0, Math.min(n.startBeat, MEASURE_SPAN_4_4 - 0.04));
    if (n.startBeat + n.durationBeats > MEASURE_SPAN_4_4 + 1e-6) {
      n.durationBeats = Math.max(0.05, MEASURE_SPAN_4_4 - n.startBeat);
    }
  }
}

function applyGuideToneNudgesForBar(
  notes: SoloNote[],
  barIndex1: number,
  chordSymbol: string,
  profile: RiffSoloGeneratorProfile
): void {
  if (notes.length === 0) return;
  const receipt = buildZappaSmoothedGuideToneReceipt(
    [chordSymbol],
    1,
    profile.registerFloor,
    profile.registerCeiling
  );
  applyZappaGuideTonePitchNudges(notes, 1, receipt, profile.registerFloor, profile.registerCeiling);
  for (const n of notes) {
    n.barIndex = barIndex1;
  }
}

/**
 * One bar of Zappa-adapted solo using Slonimsky + 7/8 cell snap + guide-tone nudges.
 */
export function riffSoloFromZappaEngine(
  bar: number,
  chordSymbol: string,
  profile: RiffSoloGeneratorProfile,
  seed: number
): SoloEvent[] {
  const ctx = buildSlonimskyContext(bar, chordSymbol, profile, seed);
  const pattern = selectZappaSlonimskyPattern(ctx, seed + bar * 7919);
  if (!pattern) return [];

  const sl = generateSlonimskyPattern(pattern, ctx, seed + bar * 9973);
  if (!sl.length) return [];

  const barIndex1 = bar + 1;
  const soloNotes = slonimskyToSoloNotes(barIndex1, sl);
  applyCellSnapToSoloNotes(soloNotes, profile, bar, seed);
  applyGuideToneNudgesForBar(soloNotes, barIndex1, chordSymbol, profile);

  const events = soloNotesToRiffEvents(soloNotes);
  if (events.length === 0) return [];

  const maxLeap = profile.maxLeapSemitones;
  for (let i = 1; i < events.length; i++) {
    const leap = Math.abs(events[i]!.pitch - events[i - 1]!.pitch);
    if (leap > maxLeap) {
      const step = events[i]!.pitch > events[i - 1]!.pitch ? -1 : 1;
      events[i]!.pitch = events[i - 1]!.pitch + step * Math.min(maxLeap, leap - maxLeap + 1);
    }
  }
  return events;
}

/** Cell boundary beats in 4/4 for a profile (exported for tests). */
export function zappa78CellBoundariesIn4_4(profile: RiffSoloGeneratorProfile, barIndex: number, seed: number): number[] {
  const section = formSectionForBar(barIndex, profile, seed);
  const spans = eighthSpansForCell(profile, section);
  const xs: number[] = [0];
  const sumE = spans.reduce((a, b) => a + b, 0) || 7;
  const qPerE = MEASURE_SPAN_4_4 / sumE;
  let acc = 0;
  for (const g of spans) {
    acc += g;
    xs.push(Math.min(MEASURE_SPAN_4_4, acc * qPerE));
  }
  return [...new Set(xs)].sort((a, b) => a - b);
}

export function isOnZappaCellBoundary(startBeat: number, boundaries: number[]): boolean {
  return boundaries.some((b) => Math.abs(startBeat - b) < CELL_SNAP_EPS);
}

export function pitchUsesSlonimskyOutsideChordTones(chordSymbol: string, pitch: number): boolean {
  const t = chordTonesForChordSymbol(chordSymbol);
  const pcs = new Set(
    [t.root, t.third, t.fifth, t.seventh].map((m) => ((m % 12) + 12) % 12)
  );
  return !pcs.has(((pitch % 12) + 12) % 12);
}
