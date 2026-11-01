import { buildReharmLensConfig, type ReharmLensConfig } from './reharmLensConfig';
import {
  REHARM_APPROACHES,
  chordHarmonicDistance,
  generateApproachReharmCandidates,
  generateReharmCandidates,
  scoreApproachReharmCandidate,
  scoreReharmCandidate,
  type EmotionalDrift,
  type ReharmApproach,
  type ReharmCandidate,
} from './reharmCandidateEngine';
import { getChordRangeForBars, type BarChordEntry } from './harmonyRangeResolver';
import { progressionPassesSustainedLockedBass } from './reharmLockedBassCompat';
import type {
  AlternativeBar,
  AlternativeProgression,
  ReharmSequenceRequest,
} from './reharmSequenceTypes';

const SCORE_EPS = 1e-9;

/**
 * Approach-path near-best band: keep candidates within this absolute gap of the top
 * effective score (and within {@link NEAR_BEST_RELATIVE} of the top). Seeded pick
 * among that band only — never drops to distant/poor scores for novelty.
 */
const NEAR_BEST_ABS = 0.045;
/** Relative slack vs top effective score for approach-path near-best eligibility. */
const NEAR_BEST_RELATIVE = 0.07;

/** Minimum mean chordHarmonicDistance vs source for a progression to count as contrasting. */
const MIN_SOURCE_DISTANCE = 0.28;
/** Minimum mean pairwise distance between selected contrasting progressions. */
const MIN_PAIRWISE_DISTANCE = 0.22;

/** Matches {@link goldenPath/guitarBassDuoHarmony.seededUnit} — deterministic [0,1). */
function seededUnit(seed: number, bar: number, salt = 0): number {
  let s = (seed * 7919 + bar * 104729 + salt * 503) >>> 0;
  s = (s * 1103515245 + 12345) >>> 0;
  return s / 0xffffffff;
}

function normalizePc(pc: number): number {
  return ((pc % 12) + 12) % 12;
}

function circularPcDistance(a: number, b: number): number {
  const x = Math.abs(normalizePc(a) - normalizePc(b));
  return Math.min(x, 12 - x);
}

/** Penalty added to denominator when minimal root motion exceeds a tritone (6 semitones). */
function transitionDenominatorPenalty(prevRootPc: number, currRootPc: number): number {
  const d = circularPcDistance(prevRootPc, currRootPc);
  if (d <= 6) return 0;
  return 0.15 * d;
}

function chromaticMediantMotion(prevPc: number | null, currPc: number): boolean {
  if (prevPc === null) return false;
  const d = circularPcDistance(prevPc, currPc);
  return d === 3 || d === 4 || d === 8 || d === 9;
}

function lensMultiplier(
  substituteChordTypeId: string,
  lens: ReharmLensConfig,
  prevSubstituteRootPc: number | null,
  candidateRootPc: number
): number {
  const lower = substituteChordTypeId.toLowerCase();
  const sus = lower.includes('sus');
  const tri =
    /(b5|#11|dim|ø|o7|o\b|13b9|7#9|7alt|min7b5|tritone)/i.test(lower) || lower.includes('#11#9');
  const chrom = chromaticMediantMotion(prevSubstituteRootPc, candidateRootPc);
  let m = 1;
  m *= 1 + (lens.susBias - 0.35) * (sus ? 0.5 : -0.1);
  m *= 1 + (lens.tritoneRate - 0.35) * (tri ? 0.45 : -0.08);
  m *= 1 + (lens.chromaticMediantBias - 0.35) * (chrom ? 0.5 : -0.05);
  return Math.max(0.08, m);
}

function candidateTieSalt(c: ReharmCandidate): number {
  let h = 0;
  for (let i = 0; i < c.substituteChordTypeId.length; i++) {
    h = (h * 31 + c.substituteChordTypeId.charCodeAt(i)!) >>> 0;
  }
  h = (h * 31 + c.strategy.length) >>> 0;
  h = (h * 31 + c.substituteRootPc) >>> 0;
  if (c.approach) {
    for (let i = 0; i < c.approach.length; i++) {
      h = (h * 31 + c.approach.charCodeAt(i)!) >>> 0;
    }
  }
  return h & 0xffff;
}

function compareScoredCandidates(
  a: { c: ReharmCandidate; effective: number; idx: number },
  b: { c: ReharmCandidate; effective: number; idx: number },
  seed: number,
  barIndex: number
): number {
  if (Math.abs(b.effective - a.effective) > SCORE_EPS) return b.effective - a.effective;
  const ua = seededUnit(seed, barIndex, a.idx + candidateTieSalt(a.c));
  const ub = seededUnit(seed, barIndex, b.idx + candidateTieSalt(b.c));
  return ua - ub;
}

/**
 * Score-sorted pick. Lens path: strict top score (seeded tie-break only).
 * Approach path (contrasting): seeded choice among near-best eligible scores so
 * regeneration can vary without picking musically poor substitutes.
 */
function pickBestCandidate(
  candidates: ReharmCandidate[],
  drift: EmotionalDrift,
  melodyPc: number | null,
  lens: ReharmLensConfig,
  prevChosenRootPc: number | null,
  barIndex: number,
  seed: number,
  sourceRootPc?: number
): ReharmCandidate | null {
  if (candidates.length === 0) return null;

  const scored = candidates.map((c, idx) => {
    const base =
      sourceRootPc !== undefined && c.approach
        ? scoreApproachReharmCandidate(c, sourceRootPc, drift, melodyPc)
        : scoreReharmCandidate(c, drift, melodyPc);
    const lensMul = lensMultiplier(c.substituteChordTypeId, lens, prevChosenRootPc, c.substituteRootPc);
    const transPen =
      prevChosenRootPc !== null
        ? transitionDenominatorPenalty(prevChosenRootPc, c.substituteRootPc)
        : 0;
    // Approach pool needs root motion; soften transition penalty so tritone/mediants remain viable.
    const penScale = c.approach ? 0.35 : 1;
    const effective = (base * lensMul) / (1 + transPen * penScale);
    return { c, effective, idx };
  });

  scored.sort((a, b) => compareScoredCandidates(a, b, seed, barIndex));

  const useNearBest = sourceRootPc !== undefined;
  if (!useNearBest) return scored[0]!.c;

  const top = scored[0]!.effective;
  const floor = Math.max(top - NEAR_BEST_ABS, top * (1 - NEAR_BEST_RELATIVE));
  const near = scored.filter((s) => s.effective + SCORE_EPS >= floor);
  if (near.length <= 1) return scored[0]!.c;

  // Deterministic index into the near-best band (already score-ordered).
  const u = seededUnit(seed, barIndex, 0x9e3779b9);
  const pickIdx = Math.floor(u * near.length) % near.length;
  return near[pickIdx]!.c;
}

function melodyPcForBar(request: ReharmSequenceRequest, barIndex: number): number | null {
  const { startBar, melodyPcs } = request;
  if (!melodyPcs) return null;
  const i = barIndex - startBar;
  if (i < 0 || i >= melodyPcs.length) return null;
  const v = melodyPcs[i];
  return v === undefined ? null : v;
}

function buildBarsForEntries(
  entries: BarChordEntry[],
  request: ReharmSequenceRequest,
  drift: EmotionalDrift,
  lens: ReharmLensConfig,
  seed: number,
  approach?: ReharmApproach
): AlternativeBar[] {
  const bars: AlternativeBar[] = [];
  let prevChosenRootPc: number | null = null;

  for (const e of entries) {
    if (e.mappingNull) {
      bars.push({
        barIndex: e.barIndex,
        originalSymbol: e.chordSymbol,
        substituteChordTypeId: '',
        substituteRootPc: 0,
        strategy: 'passthrough',
        mappingNull: true,
      });
      prevChosenRootPc = null;
      continue;
    }

    const melodyPc = melodyPcForBar(request, e.barIndex);
    const cands = approach
      ? generateApproachReharmCandidates(e.vaultChordTypeId, e.rootPc, melodyPc, drift, approach)
      : generateReharmCandidates(e.vaultChordTypeId, e.rootPc, melodyPc, drift);
    const best = pickBestCandidate(
      cands,
      drift,
      melodyPc,
      lens,
      prevChosenRootPc,
      e.barIndex,
      seed,
      approach ? e.rootPc : undefined
    );

    if (!best) {
      bars.push({
        barIndex: e.barIndex,
        originalSymbol: e.chordSymbol,
        substituteChordTypeId: e.vaultChordTypeId,
        substituteRootPc: e.rootPc,
        strategy: 'identity',
        mappingNull: false,
      });
      prevChosenRootPc = e.rootPc;
      continue;
    }

    bars.push({
      barIndex: e.barIndex,
      originalSymbol: e.chordSymbol,
      substituteChordTypeId: best.substituteChordTypeId,
      substituteRootPc: best.substituteRootPc,
      strategy: best.strategy,
      mappingNull: false,
    });
    prevChosenRootPc = best.substituteRootPc;
  }

  return bars;
}

/** Mean harmonic distance of substitute bars vs source vault mapping. */
export function progressionSourceDistance(
  prog: AlternativeProgression,
  entries: BarChordEntry[]
): number {
  const nums: number[] = [];
  for (const bar of prog.bars) {
    if (bar.mappingNull || bar.strategy === 'passthrough' || bar.strategy === 'identity') continue;
    const entry = entries.find((e) => e.barIndex === bar.barIndex);
    if (!entry || entry.mappingNull) continue;
    nums.push(
      chordHarmonicDistance(
        entry.vaultChordTypeId,
        entry.rootPc,
        bar.substituteChordTypeId,
        bar.substituteRootPc
      )
    );
  }
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/** Mean pairwise bar distance between two progressions (aligned by barIndex). */
export function progressionPairwiseDistance(a: AlternativeProgression, b: AlternativeProgression): number {
  const byBar = new Map(b.bars.map((row) => [row.barIndex, row]));
  const nums: number[] = [];
  for (const bar of a.bars) {
    if (bar.mappingNull || bar.strategy === 'passthrough') continue;
    const other = byBar.get(bar.barIndex);
    if (!other || other.mappingNull || other.strategy === 'passthrough') continue;
    if (bar.strategy === 'identity' && other.strategy === 'identity') continue;
    nums.push(
      chordHarmonicDistance(
        bar.substituteChordTypeId,
        bar.substituteRootPc,
        other.substituteChordTypeId,
        other.substituteRootPc
      )
    );
  }
  if (!nums.length) return 0;
  return nums.reduce((x, y) => x + y, 0) / nums.length;
}

/**
 * Composer-aware single progression per lens id: greedily picks best substitute per bar using lens-weighted
 * scores and cross-bar root motion penalty.
 */
export function generateReharmSequence(request: ReharmSequenceRequest): AlternativeProgression[] {
  const {
    context,
    startBar,
    endBar,
    lensIds,
    drift: driftOpt,
    seed: seedOpt,
  } = request;
  const drift: EmotionalDrift = driftOpt ?? 'neutral';
  const seed = seedOpt ?? 0;

  if (!lensIds.length || lensIds.length > 3) {
    throw new Error(`generateReharmSequence: lensIds must have 1–3 entries (got ${lensIds.length})`);
  }

  const entries = getChordRangeForBars(startBar, endBar, context);
  const out: AlternativeProgression[] = [];

  for (const lensId of lensIds) {
    const lens = buildReharmLensConfig(lensId);
    const bars = buildBarsForEntries(entries, request, drift, lens, seed);
    out.push({ lensId, bars });
  }

  return out;
}

export type ContrastingReharmSequenceResult = {
  alternatives: AlternativeProgression[];
  shortfall?: string;
};

/**
 * Up to three approach-tagged progressions with substantial source and pairwise harmonic distance.
 * Uses first lens id for ranking weights. Soft first-note-per-bar melodyPcs only.
 * When `lockedEvents` is present, rejects progressions whose substitute excludes a
 * bass pitch class sustained for a full chord span (see {@link progressionPassesSustainedLockedBass}).
 */
export function generateContrastingReharmSequences(
  request: ReharmSequenceRequest
): ContrastingReharmSequenceResult {
  const {
    context,
    startBar,
    endBar,
    lensIds,
    drift: driftOpt,
    seed: seedOpt,
    lockedEvents,
  } = request;
  const drift: EmotionalDrift = driftOpt ?? 'neutral';
  const seed = seedOpt ?? 0;
  const lensId = lensIds[0] ?? 'bill_evans';
  const lens = buildReharmLensConfig(lensId);
  const entries = getChordRangeForBars(startBar, endBar, context);

  const pool: AlternativeProgression[] = [];
  const bassRejectReasons: string[] = [];
  for (const approach of REHARM_APPROACHES) {
    const bars = buildBarsForEntries(entries, request, drift, lens, seed + approach.length * 17, approach);
    const prog: AlternativeProgression = {
      lensId: `${lensId}:${approach}`,
      approach,
      bars,
    };
    const bass = progressionPassesSustainedLockedBass(prog, lockedEvents, startBar, endBar);
    if (!bass.ok) {
      bassRejectReasons.push(`${approach}: ${bass.reason}`);
      continue;
    }
    const srcDist = progressionSourceDistance(prog, entries);
    if (srcDist < MIN_SOURCE_DISTANCE) continue;
    pool.push(prog);
  }

  const selected: AlternativeProgression[] = [];
  // Prefer one of each approach in declaration order when pairwise distance holds.
  for (const cand of pool) {
    if (selected.length >= 3) break;
    const okPair = selected.every(
      (s) => progressionPairwiseDistance(cand, s) >= MIN_PAIRWISE_DISTANCE
    );
    if (!okPair) continue;
    selected.push(cand);
  }

  // If approach order left gaps, try remaining pool greedily by source distance.
  if (selected.length < 3) {
    const rest = pool
      .filter((p) => !selected.includes(p))
      .sort(
        (a, b) =>
          progressionSourceDistance(b, entries) - progressionSourceDistance(a, entries)
      );
    for (const cand of rest) {
      if (selected.length >= 3) break;
      const okPair = selected.every(
        (s) => progressionPairwiseDistance(cand, s) >= MIN_PAIRWISE_DISTANCE
      );
      if (!okPair) continue;
      selected.push(cand);
    }
  }

  if (selected.length >= 3) {
    return { alternatives: selected.slice(0, 3) };
  }

  const bassNote =
    bassRejectReasons.length > 0
      ? ` Sustained-bass reject: ${bassRejectReasons.join('; ')}.`
      : '';
  return {
    alternatives: selected,
    shortfall: `Only ${selected.length} contrasting reharm alternative(s) passed source/pairwise distance gates (need 3).${bassNote}`,
  };
}
