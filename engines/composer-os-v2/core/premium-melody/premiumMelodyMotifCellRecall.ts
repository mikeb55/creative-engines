/**
 * Melodic interval-cell recall - opt-in post-pass for premium melody pitches.
 * Seeds 4-note interval cells from early bars and reinjects near-matches into later bars
 * (GCE scoreMelodicIdentity motif-recurrence windows use +/-2 interval tolerance).
 */

import type { ImportMelodyNote } from '../import/mosaicImportTimeline';
import type {
  PremiumMelodyPitchProfile,
  PremiumMelodyPitchSlotContext,
  PremiumMelodyPitchSlotList,
} from './premiumMelodyPitchProfile';

/** One seed -> target reinjection pair. */
export interface PremiumMelodyMelodicIntervalCellSpec {
  /** Inclusive source bars for the seed cell (e.g. [1, 2]). */
  seedBars: readonly [number, number];
  /** Inclusive target bars for reinjection (e.g. [5, 6]). */
  targetBars: readonly [number, number];
}

export interface PremiumMelodyMelodicIntervalCellRecallConfig {
  enabled: true;
  /** Notes in each cell (GCE sliding window default = 4). */
  cellSize: number;
  /** Max abs delta per interval vs seed (GCE motif match tolerance). */
  intervalTolerance: number;
  /**
   * Primary cell (Cell A). Kept for backward-compatible single-cell configs.
   * When `cells` is set, that list is authoritative and these may be omitted.
   */
  seedBars?: readonly [number, number];
  targetBars?: readonly [number, number];
  /** Multi-cell list (Cell A, Cell B, ...). Distinct seeds allowed. */
  cells?: ReadonlyArray<PremiumMelodyMelodicIntervalCellSpec>;
}

type PitchPick = { chosenMidi: number; chosenRank: number; topScore: number; candidateCount: number };

function nonRestSlotsInBars(
  slots: PremiumMelodyPitchSlotList,
  barLo: number,
  barHi: number,
): PremiumMelodyPitchSlotContext[] {
  return slots.filter(
    (s) => s.bar >= barLo && s.bar <= barHi && s.noteRole !== 'rest_placeholder',
  );
}

function midisInRegister(midis: number[], minMidi: number, maxMidi: number): boolean {
  return midis.every((m) => m >= minMidi && m <= maxMidi);
}

function shiftIntoRegister(midis: number[], minMidi: number, maxMidi: number): number[] | null {
  let out = [...midis];
  for (let guard = 0; guard < 8; guard++) {
    if (midisInRegister(out, minMidi, maxMidi)) return out;
    const lo = Math.min(...out);
    const hi = Math.max(...out);
    if (hi - lo > maxMidi - minMidi) return null;
    if (lo < minMidi) out = out.map((m) => m + 12);
    else if (hi > maxMidi) out = out.map((m) => m - 12);
    else return null;
  }
  return midisInRegister(out, minMidi, maxMidi) ? out : null;
}

function intervalVector(midis: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < midis.length; i++) {
    out.push((((midis[i]! - midis[i - 1]!) % 12) + 12) % 12);
  }
  return out;
}

function intervalsWithinTolerance(a: number[], b: number[], tol: number): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (Math.abs(a[i]! - b[i]!) > tol) return false;
  }
  return true;
}

function countGuideHits(slots: PremiumMelodyPitchSlotContext[], midis: number[]): number {
  let hits = 0;
  for (let i = 0; i < slots.length; i++) {
    const gt = slots[i]!.guideTonePc;
    if (gt == null) continue;
    if ((((midis[i]! % 12) + 12) % 12) === (((gt % 12) + 12) % 12)) hits++;
  }
  return hits;
}

function resolveCellSpecs(
  cfg: PremiumMelodyMelodicIntervalCellRecallConfig,
): PremiumMelodyMelodicIntervalCellSpec[] {
  if (cfg.cells != null && cfg.cells.length > 0) {
    return [...cfg.cells];
  }
  if (cfg.seedBars != null && cfg.targetBars != null) {
    return [{ seedBars: cfg.seedBars, targetBars: cfg.targetBars }];
  }
  return [];
}

/** Bars covered by any reinjection target (for GT-repair skip after recall). */
export function melodicIntervalCellRecallTargetBars(
  pitchProfile: PremiumMelodyPitchProfile,
): Set<number> {
  const cfg = pitchProfile.melodicIntervalCellRecall;
  const out = new Set<number>();
  if (cfg?.enabled !== true) return out;
  for (const cell of resolveCellSpecs(cfg)) {
    const [lo, hi] = cell.targetBars;
    for (let b = lo; b <= hi; b++) out.add(b);
  }
  return out;
}

function reinjectOneCell(
  slots: PremiumMelodyPitchSlotList,
  picks: Array<PitchPick | undefined>,
  pitchProfile: PremiumMelodyPitchProfile,
  cell: PremiumMelodyMelodicIntervalCellSpec,
  cellSize: number,
  tol: number,
): void {
  const [seedLo, seedHi] = cell.seedBars;
  const [tgtLo, tgtHi] = cell.targetBars;

  const seedSlots = nonRestSlotsInBars(slots, seedLo, seedHi).slice(0, cellSize);
  const targetSlots = nonRestSlotsInBars(slots, tgtLo, tgtHi).slice(0, cellSize);
  if (seedSlots.length < cellSize || targetSlots.length < cellSize) return;

  const seedMidis: number[] = [];
  for (const s of seedSlots) {
    const pick = picks[s.slotIndex];
    if (pick == null) return;
    seedMidis.push(pick.chosenMidi);
  }

  const seedSteps: number[] = [];
  for (let i = 1; i < seedMidis.length; i++) {
    seedSteps.push(seedMidis[i]! - seedMidis[i - 1]!);
  }
  const seedIv = intervalVector(seedMidis);

  const minMidi = pitchProfile.phrasePlanner.registerMinMidi;
  const maxMidi = pitchProfile.phrasePlanner.registerMaxMidi;
  const currentTarget = targetSlots.map((s) => picks[s.slotIndex]?.chosenMidi ?? s.importMidiPitch);
  const anchor = currentTarget[0]!;

  type Candidate = { midis: number[]; guideHits: number; drift: number };
  let best: Candidate | null = null;

  const startCandidates = new Set<number>();
  startCandidates.add(anchor);
  for (const d of [-12, -7, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 7, 12]) {
    startCandidates.add(anchor + d);
  }
  const gt0 = targetSlots[0]!.guideTonePc;
  if (gt0 != null) {
    for (let oct = 0; oct < 8; oct++) {
      const m = gt0 + 12 * oct;
      if (m >= minMidi - 12 && m <= maxMidi + 12) startCandidates.add(m);
    }
  }

  for (const start of startCandidates) {
    const raw = [start];
    for (const step of seedSteps) raw.push(raw[raw.length - 1]! + step);
    const shifted = shiftIntoRegister(raw, minMidi, maxMidi);
    if (shifted == null) continue;
    if (!intervalsWithinTolerance(intervalVector(shifted), seedIv, tol)) continue;
    const guideHits = countGuideHits(targetSlots, shifted);
    let drift = 0;
    for (let i = 0; i < cellSize; i++) {
      drift += Math.abs(shifted[i]! - currentTarget[i]!);
    }
    if (
      best == null ||
      guideHits > best.guideHits ||
      (guideHits === best.guideHits && drift < best.drift)
    ) {
      best = { midis: shifted, guideHits, drift };
    }
  }

  if (best == null) return;

  for (let i = 0; i < cellSize; i++) {
    const slot = targetSlots[i]!;
    const prev = picks[slot.slotIndex];
    picks[slot.slotIndex] = {
      chosenMidi: best.midis[i]!,
      chosenRank: prev?.chosenRank ?? 0,
      topScore: prev?.topScore ?? 0,
      candidateCount: prev?.candidateCount ?? 0,
    };
  }
}

/**
 * Mutates picks in place when pitchProfile.melodicIntervalCellRecall is enabled.
 * Does not alter guide-tone track config - only pitch picks for target bars.
 */
export function applyMelodicIntervalCellRecall(
  _ordered: readonly ImportMelodyNote[],
  slots: PremiumMelodyPitchSlotList,
  picks: Array<PitchPick | undefined>,
  pitchProfile: PremiumMelodyPitchProfile,
): void {
  const cfg = pitchProfile.melodicIntervalCellRecall;
  if (cfg?.enabled !== true) return;

  const cellSize = cfg.cellSize > 0 ? cfg.cellSize : 4;
  const tol = cfg.intervalTolerance >= 0 ? cfg.intervalTolerance : 2;
  const specs = resolveCellSpecs(cfg);
  for (const cell of specs) {
    reinjectOneCell(slots, picks, pitchProfile, cell, cellSize, tol);
  }
}
