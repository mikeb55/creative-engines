/**
 * Ensemble layout heuristics (Big Band / String Quartet):
 * - Whole-note density penalty — `BarSlice[]` + `scoreWholeNoteDensity`
 * - Horn cloning penalty — `BarSlice[]` + `scoreHornCloning`
 *
 * Deterministic builders also use streak state + `mitigateBigBandHornMidis` for mitigations.
 */

/** Tune in one place; aligns with defaults in {@link WholeNoteDensityContext} / {@link HornCloningContext}. */
export const ENSEMBLE_LAYOUT_WEIGHTS = {
  wWholeBlock: 0.35,
  wCloneLine: 0.25,
  wOctaveDouble: 0.2,
} as const;

export type SectionTag = 'head' | 'bridge' | 'shout' | 'coda' | 'intro' | string;

/** @deprecated Prefer {@link SectionTag} */
export type EnsembleSectionTag = SectionTag;

export type ScoredNote = {
  partId: string;
  midi: number | null;
  durationBeats: number;
  isRest?: boolean;
};

export type BarSlice = {
  barIndex: number;
  sectionTag?: SectionTag;
  barBeats: number;
  notes: ScoredNote[];
};

export type WholeNoteDensityContext = {
  recentBars: BarSlice[];
  padSketch?: boolean;
  windowSize?: number;
  minConsecutiveBars?: number;
  ratioThreshold?: number;
  weight?: number;
};

export type HornCloningContext = {
  recentBars: BarSlice[];
  sectionTag?: SectionTag;
  minCloneStreak?: number;
  altoPartId?: string;
  tenorPartId?: string;
  trumpetPartId?: string;
  unisonWeight?: number;
  octaveWeight?: number;
};

const EPS = 1e-6;

export function isFullBarNonRest(note: ScoredNote, barBeats: number): boolean {
  return !note.isRest && note.midi !== null && Math.abs(note.durationBeats - barBeats) < EPS;
}

export function getLeadMidiForPart(bar: BarSlice, partId: string): number | null {
  const note = bar.notes.find((n) => n.partId === partId && !n.isRest && n.midi !== null);
  return note?.midi ?? null;
}

export function computeWholeRatio(bar: BarSlice): number {
  let nonRestCount = 0;
  let wholeCount = 0;

  for (const note of bar.notes) {
    if (note.isRest || note.midi === null) continue;
    nonRestCount += 1;
    if (isFullBarNonRest(note, bar.barBeats)) wholeCount += 1;
  }

  if (nonRestCount === 0) return 0;
  return wholeCount / nonRestCount;
}

/**
 * Count consecutive bars at the **end** of `bars` whose per-bar whole ratio exceeds `ratioThreshold`.
 */
export function countConsecutiveHighWholeBarsEnd(
  bars: BarSlice[],
  ratioThreshold: number = 0.8
): number {
  let streak = 0;
  for (let i = bars.length - 1; i >= 0; i -= 1) {
    const ratio = computeWholeRatio(bars[i]!);
    if (ratio > ratioThreshold) streak += 1;
    else break;
  }
  return streak;
}

export function scoreWholeNoteDensity(ctx: WholeNoteDensityContext): number {
  if (ctx.padSketch) return 0;

  const windowSize = ctx.windowSize ?? 4;
  const minConsecutiveBars = ctx.minConsecutiveBars ?? 4;
  const ratioThreshold = ctx.ratioThreshold ?? 0.8;
  const weight = ctx.weight ?? ENSEMBLE_LAYOUT_WEIGHTS.wWholeBlock;

  const bars = ctx.recentBars.slice(-Math.max(windowSize, minConsecutiveBars));
  if (bars.length < minConsecutiveBars) return 0;

  let streak = 0;
  for (let i = bars.length - 1; i >= 0; i -= 1) {
    const ratio = computeWholeRatio(bars[i]!);
    if (ratio > ratioThreshold) streak += 1;
    else break;
  }

  if (streak < minConsecutiveBars) return 0;

  const extraBars = streak - minConsecutiveBars;
  return -weight * (1 + 0.25 * extraBars);
}

export function scoreHornCloning(ctx: HornCloningContext): number {
  const minCloneStreak = ctx.minCloneStreak ?? 4;
  const altoPartId = ctx.altoPartId ?? 'bb_alto_sax';
  const tenorPartId = ctx.tenorPartId ?? 'bb_tenor_sax';
  const trumpetPartId = ctx.trumpetPartId ?? 'bb_trumpets';
  const unisonWeight = ctx.unisonWeight ?? ENSEMBLE_LAYOUT_WEIGHTS.wCloneLine;
  const octaveWeight = ctx.octaveWeight ?? ENSEMBLE_LAYOUT_WEIGHTS.wOctaveDouble;

  const bars = ctx.recentBars;
  if (bars.length < minCloneStreak) return 0;

  let altoTenorStreak = 0;
  for (let i = bars.length - 1; i >= 0; i -= 1) {
    const alto = getLeadMidiForPart(bars[i]!, altoPartId);
    const tenor = getLeadMidiForPart(bars[i]!, tenorPartId);
    if (alto !== null && tenor !== null && alto === tenor) altoTenorStreak += 1;
    else break;
  }

  let trumpetOctaveStreak = 0;
  for (let i = bars.length - 1; i >= 0; i -= 1) {
    const sectionTag = bars[i]!.sectionTag ?? ctx.sectionTag;
    const alto = getLeadMidiForPart(bars[i]!, altoPartId);
    const trumpet = getLeadMidiForPart(bars[i]!, trumpetPartId);
    if (sectionTag === 'shout') break;
    if (alto !== null && trumpet !== null && trumpet === alto + 12) trumpetOctaveStreak += 1;
    else break;
  }

  let penalty = 0;

  if (altoTenorStreak >= minCloneStreak) {
    penalty -= unisonWeight * altoTenorStreak;
  }

  if (trumpetOctaveStreak >= minCloneStreak) {
    penalty -= octaveWeight * trumpetOctaveStreak;
  }

  return penalty;
}

/** Optional chord-aware offsets (semitones) for breaking clones; not wired into mitigations yet beyond first value. */
export function getHarmonyOffsets(chordKind: string): number[] {
  switch (chordKind) {
    case 'dominant':
    case '7':
      return [-4, -9];
    case 'minor7':
      return [-3, -8];
    default:
      return [-3, -4, -7, -9];
  }
}

/** Mutable streak state for big-band mitigations (deterministic builder path). */
export interface HornCloneStreakState {
  altoTenorEqualRun: number;
  trumpetOctaveAboveAltoRun: number;
}

export function initialHornCloneStreakState(): HornCloneStreakState {
  return { altoTenorEqualRun: 0, trumpetOctaveAboveAltoRun: 0 };
}

export interface HornCloningBarInput {
  altoMidi: number;
  tenorMidi: number;
  trumpetMidi: number;
  sectionTag: SectionTag;
}

export function advanceHornCloneStreaks(prev: HornCloneStreakState, input: HornCloningBarInput): HornCloneStreakState {
  const altoTenorEqual = input.altoMidi === input.tenorMidi;
  const trumpetOctaveAboveAlto = input.trumpetMidi - input.altoMidi === 12;

  return {
    altoTenorEqualRun: altoTenorEqual ? prev.altoTenorEqualRun + 1 : 0,
    trumpetOctaveAboveAltoRun: trumpetOctaveAboveAlto ? prev.trumpetOctaveAboveAltoRun + 1 : 0,
  };
}

/**
 * Streak-based scorer (legacy helper for search loops that don't materialise `BarSlice[]` yet).
 */
export function scoreHornCloningFromStreaks(
  stateAfterAdvance: HornCloneStreakState,
  input: HornCloningBarInput,
  weights?: { wClone?: number; wOctave?: number }
): number {
  const wClone = weights?.wClone ?? ENSEMBLE_LAYOUT_WEIGHTS.wCloneLine;
  const wOct = weights?.wOctave ?? ENSEMBLE_LAYOUT_WEIGHTS.wOctaveDouble;
  let penalty = 0;
  if (stateAfterAdvance.altoTenorEqualRun >= 4) {
    penalty -= wClone * (stateAfterAdvance.altoTenorEqualRun - 3);
  }
  const allowOctave = input.sectionTag === 'shout';
  if (!allowOctave && stateAfterAdvance.trumpetOctaveAboveAltoRun >= 4) {
    penalty -= wOct * (stateAfterAdvance.trumpetOctaveAboveAltoRun - 3);
  }
  return penalty;
}

export function mitigateBigBandHornMidis(
  prevStreak: HornCloneStreakState,
  altoMidi: number,
  tenorMidi: number,
  trumpetMidi: number,
  sectionTag: SectionTag,
  snapSax: (midi: number) => number,
  snapTrumpet: (midi: number) => number,
  chordKind: string = 'default'
): { altoMidi: number; tenorMidi: number; trumpetMidi: number } {
  let t = tenorMidi;
  let tr = trumpetMidi;
  if (prevStreak.altoTenorEqualRun >= 3 && altoMidi === tenorMidi) {
    const offs = getHarmonyOffsets(chordKind);
    const off = offs[0] ?? -3;
    t = snapSax(altoMidi + off);
  }
  if (prevStreak.trumpetOctaveAboveAltoRun >= 3 && sectionTag !== 'shout' && trumpetMidi - altoMidi === 12) {
    tr = snapTrumpet(altoMidi + 7);
  }
  return { altoMidi, tenorMidi: t, trumpetMidi: tr };
}

export function evaluateHornCloningBar(
  prev: HornCloneStreakState,
  input: HornCloningBarInput,
  weights?: { wClone?: number; wOctave?: number }
): { next: HornCloneStreakState; penalty: number } {
  const next = advanceHornCloneStreaks(prev, input);
  return { next, penalty: scoreHornCloningFromStreaks(next, input, weights) };
}

/**
 * Rolling history of `BarSlice` for whole-note / layout scoring in builders or search.
 */
export class WholeNoteDensityTracker {
  private readonly recentBars: BarSlice[] = [];
  private readonly maxBars: number;

  constructor(opts?: { maxBars?: number }) {
    this.maxBars = opts?.maxBars ?? 64;
  }

  getBars(): readonly BarSlice[] {
    return this.recentBars;
  }

  /** Consecutive high whole-ratio bars ending the history (before this bar’s events, omit current push). */
  highWholeStreakAtEnd(ratioThreshold = 0.8): number {
    return countConsecutiveHighWholeBarsEnd(this.recentBars, ratioThreshold);
  }

  /** Append a bar; returns {@link scoreWholeNoteDensity} for search / diagnostics. */
  pushBarSlice(slice: BarSlice, padSketch?: boolean): number {
    this.recentBars.push(slice);
    if (this.recentBars.length > this.maxBars) this.recentBars.shift();
    return scoreWholeNoteDensity({
      recentBars: this.recentBars,
      padSketch,
    });
  }

}
