/**
 * Z5 / Z6 — Riff-path Frank Zappa solo adapter (read-only use of duo Slonimsky / 7/8 / guide-tone stack).
 */

import type { RiffSoloGeneratorProfile } from '../composer/riffProfileTypes';
import type { ZappaRiffSoloControls } from '../compositionContext';
import { chordTonesForChordSymbol } from '../harmony/chordSymbolAnalysis';
import { resolveZappaStyleMode } from '../song-mode/frankZappaSlice';
import { chromaticBudgetForSymmetry, mergeZappaControlsOntoSoloProfile } from './zappaRiffSoloParams';
import {
  generateSlonimskyPattern,
  getFrankZappaBluesrockFerociousProfile,
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

export type SoloEvent = RiffSoloNote & {
  feedbackProxy?: boolean;
  isRest?: boolean;
};

const MEASURE_SPAN_4_4 = 4;
const CELL_SNAP_EPS = 0.085;
const FEROCITY_CHROMATIC_BUDGET = 0.3;
const FEROCITY_DENSITY_CEILING = 24;

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

/** Z6 / 5b — merge ferocity stub, era cells, phrase length, symmetry budget, chain depth. */
export function resolveEffectiveZappaSoloProfile(
  profile: RiffSoloGeneratorProfile,
  controls?: ZappaRiffSoloControls
): RiffSoloGeneratorProfile {
  let merged = mergeZappaControlsOntoSoloProfile(profile, controls);
  if (resolveZappaStyleMode(merged) !== 'bluesrockFerocious') {
    return merged;
  }
  const fer = getFrankZappaBluesrockFerociousProfile();
  const pool: Record<string, number> = {};
  for (const mode of fer.modalBase) {
    pool[mode] = 0.55;
  }
  merged = {
    ...merged,
    styleMode: 'bluesrockFerocious',
    chromaticBudget: FEROCITY_CHROMATIC_BUDGET,
    scaleMinglingEnabled: fer.scaleMinglingEnabled,
    noteDensityRange: merged.noteDensityRange ?? fer.noteDensityRange,
    phraseEndingPolicy: merged.phraseEndingPolicy ?? fer.phraseEndingPolicy,
    scalePool: { ...pool, ...merged.scalePool },
    variationOperators: merged.variationOperators ?? [
      'rhythmicWarp',
      'registerShift',
      'chromaticAdd',
      'ornamentAdd',
    ],
  };
  if (controls?.zappaSymmetryBias) {
    merged.chromaticBudget = chromaticBudgetForSymmetry(
      controls.zappaSymmetryBias,
      merged.chromaticBudget
    );
    merged.zappaSymmetryBias = controls.zappaSymmetryBias;
  }
  return merged;
}

function pitchClass(midi: number): number {
  return ((midi % 12) + 12) % 12;
}

function isTritoneFromRoot(pitch: number, rootPc: number): boolean {
  return (pitchClass(pitch) + 12 - rootPc) % 12 === 6;
}

function applySymmetryTritonWeighting(
  events: SoloEvent[],
  chordSymbol: string,
  profile: RiffSoloGeneratorProfile,
  seed: number,
  barIndex: number
): void {
  const bias = profile.zappaSymmetryBias;
  if (!bias || events.length === 0) return;
  const rootPc = pitchClass(chordTonesForChordSymbol(chordSymbol).root);
  const low = profile.registerFloor;
  const high = profile.registerCeiling;
  const hasTritone = events.some((e) => isTritoneFromRoot(e.pitch, rootPc));

  if (bias === 'high' && !hasTritone) {
    const idx = events.length - 1;
    let targetPc = (rootPc + 6) % 12;
    let m = events[idx]!.pitch;
    while (pitchClass(m) !== targetPc) {
      m += m < events[idx]!.pitch ? 1 : -1;
    }
    while (m < low) m += 12;
    while (m > high) m -= 12;
    events[idx]!.pitch = Math.max(low, Math.min(high, m));
    return;
  }

  if (bias === 'low' && hasTritone && seededUnit(seed, barIndex * 41 + 9) < 0.85) {
    const t = chordTonesForChordSymbol(chordSymbol);
    const pcs = [t.root, t.third, t.fifth, t.seventh].map((x) => pitchClass(x));
    const idx = events.findIndex((e) => isTritoneFromRoot(e.pitch, rootPc));
    if (idx < 0) return;
    const pc = pcs[Math.floor(seededUnit(seed, barIndex + idx) * pcs.length)]!;
    let m = events[idx]!.pitch;
    while (pitchClass(m) !== pc) {
      m += m < events[idx]!.pitch ? 1 : -1;
    }
    while (m < low) m += 12;
    while (m > high) m -= 12;
    events[idx]!.pitch = Math.max(low, Math.min(high, m));
  }
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

function maxBeatsForBar(profile: RiffSoloGeneratorProfile): number {
  const phraseBars = Math.max(1, profile.phraseBars ?? 4);
  return Math.min(MEASURE_SPAN_4_4, Math.max(0.5, (phraseBars * MEASURE_SPAN_4_4) / phraseBars));
}

function formSectionForBar(barIndex: number, profile: RiffSoloGeneratorProfile, seed: number): 'A' | 'B' {
  const ops = profile.variationOperators ?? [];
  const phraseBars = Math.max(1, profile.phraseBars ?? 4);
  const phraseIdx = Math.floor(barIndex / phraseBars);
  const opLabels = ops as readonly string[];
  if (ops.includes('rhythmicWarp') || opLabels.includes('rhythmicDisplacement')) {
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

function applyScaleMinglingNudges(notes: SoloNote[], chordSymbol: string, profile: RiffSoloGeneratorProfile): void {
  if (!profile.scaleMinglingEnabled) return;
  const t = chordTonesForChordSymbol(chordSymbol);
  const low = profile.registerFloor;
  const high = profile.registerCeiling;
  const neighbourPcs = [
    ((t.root + 1) % 12) + 12,
    ((t.root + 2) % 12) + 12,
    ((t.fifth + 1) % 12) + 12,
  ];
  for (const n of notes) {
    const pc = ((n.midi % 12) + 12) % 12;
    if (neighbourPcs.includes(pc)) continue;
    const targetPc = neighbourPcs[Math.floor(seededUnit(n.midi, n.barIndex) * neighbourPcs.length)]! % 12;
    let m = n.midi;
    while (((m % 12) + 12) % 12 !== targetPc) {
      m += m < n.midi ? 1 : -1;
    }
    while (m < low) m += 12;
    while (m > high) m -= 12;
    n.midi = Math.max(low, Math.min(high, m));
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
  if (profile.scaleMinglingEnabled) {
    applyScaleMinglingNudges(notes, chordSymbol, profile);
  }
  for (const n of notes) {
    n.barIndex = barIndex1;
  }
}

function isBurstBar(barIndex: number, profile: RiffSoloGeneratorProfile, seed: number): boolean {
  const maxNotes = profile.noteDensityRange?.max ?? FEROCITY_DENSITY_CEILING;
  if (maxNotes < 12) return false;
  const phraseBars = Math.max(1, profile.phraseBars ?? 4);
  const phrasePos = barIndex % phraseBars;
  return phrasePos === phraseBars - 1 || seededUnit(seed, barIndex * 31 + 7) > 0.45;
}

function inflateBurstBarEvents(
  events: SoloEvent[],
  chordSymbol: string,
  profile: RiffSoloGeneratorProfile,
  seed: number,
  barIndex: number
): void {
  const target = Math.min(
    FEROCITY_DENSITY_CEILING,
    profile.noteDensityRange?.max ?? FEROCITY_DENSITY_CEILING
  );
  const minBurst = Math.max(12, profile.noteDensityRange?.min ?? 8);
  if (events.length >= minBurst) return;

  const t = chordTonesForChordSymbol(chordSymbol);
  const pcs = [t.root, t.third, t.fifth, t.seventh].map((m) => ((m % 12) + 12) % 12);
  const low = profile.registerFloor;
  const high = profile.registerCeiling;
  let beat = 0.125;
  let guard = 0;
  while (events.length < target && beat < MEASURE_SPAN_4_4 - 0.05 && guard < 48) {
    guard++;
    const pc = pcs[Math.floor(seededUnit(seed, barIndex * 100 + guard) * pcs.length)]!;
    let pitch = low + pc;
    while (pitch < low) pitch += 12;
    while (pitch > high) pitch -= 12;
    const dur = 0.08 + seededUnit(seed, guard * 13) * 0.12;
    events.push({
      pitch,
      startBeat: beat,
      duration: Math.min(dur, MEASURE_SPAN_4_4 - beat),
    });
    beat += dur * 0.85;
  }
}

function applyHardCutAtBarBoundary(events: SoloEvent[]): SoloEvent[] {
  const cut = MEASURE_SPAN_4_4 - 1e-4;
  return events
    .filter((e) => !e.isRest && e.startBeat < cut)
    .map((e) => {
      const end = e.startBeat + e.duration;
      if (end <= cut) return e;
      return { ...e, duration: Math.max(0.05, cut - e.startBeat) };
    });
}

function applyPhraseEndingPolicies(
  events: SoloEvent[],
  barIndex: number,
  profile: RiffSoloGeneratorProfile
): SoloEvent[] {
  const policy = profile.phraseEndingPolicy;
  let out = events;
  if (policy?.hardCut) {
    out = applyHardCutAtBarBoundary(out);
  }
  const phraseBars = Math.max(1, profile.phraseBars ?? 4);
  const isPhraseEnd = (barIndex + 1) % phraseBars === 0;
  if (isPhraseEnd && policy?.feedbackSustain && out.length > 0) {
    const sorted = [...out].sort((a, b) => a.startBeat - b.startBeat);
    const last = sorted[sorted.length - 1]!;
    for (const e of out) {
      e.feedbackProxy = e === last;
    }
  }
  return out.filter((e) => !e.isRest);
}

/**
 * One bar of Zappa-adapted solo using Slonimsky + 7/8 cell snap + guide-tone nudges.
 */
export function riffSoloFromZappaEngine(
  bar: number,
  chordSymbol: string,
  profile: RiffSoloGeneratorProfile,
  seed: number,
  controls?: ZappaRiffSoloControls
): SoloEvent[] {
  const effective = resolveEffectiveZappaSoloProfile(profile, controls);
  const ferocity = resolveZappaStyleMode(effective) === 'bluesrockFerocious';

  const ctx = buildSlonimskyContext(bar, chordSymbol, effective, seed);
  const pattern = selectZappaSlonimskyPattern(ctx, seed + bar * 7919);
  if (!pattern) return [];

  const sl = generateSlonimskyPattern(pattern, ctx, seed + bar * 9973);
  if (!sl.length) return [];

  const barIndex1 = bar + 1;
  const soloNotes = slonimskyToSoloNotes(barIndex1, sl);
  applyCellSnapToSoloNotes(soloNotes, effective, bar, seed);
  applyGuideToneNudgesForBar(soloNotes, barIndex1, chordSymbol, effective);

  let events = soloNotesToRiffEvents(soloNotes);

  const maxLeap = effective.maxLeapSemitones;
  for (let i = 1; i < events.length; i++) {
    const leap = Math.abs(events[i]!.pitch - events[i - 1]!.pitch);
    if (leap > maxLeap) {
      const step = events[i]!.pitch > events[i - 1]!.pitch ? -1 : 1;
      events[i]!.pitch = events[i - 1]!.pitch + step * Math.min(maxLeap, leap - maxLeap + 1);
    }
  }

  applySymmetryTritonWeighting(events, chordSymbol, effective, seed, bar);

  if (ferocity && isBurstBar(bar, effective, seed)) {
    inflateBurstBarEvents(events, chordSymbol, effective, seed, bar);
  }

  if (ferocity) {
    events = applyPhraseEndingPolicies(events, bar, effective);
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
