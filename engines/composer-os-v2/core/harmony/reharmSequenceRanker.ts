import { buildReharmLensConfig, type ReharmLensConfig } from './reharmLensConfig';
import {
  generateReharmCandidates,
  scoreReharmCandidate,
  type EmotionalDrift,
  type ReharmCandidate,
} from './reharmCandidateEngine';
import { getChordRangeForBars } from './harmonyRangeResolver';
import type {
  AlternativeBar,
  AlternativeProgression,
  ReharmSequenceRequest,
} from './reharmSequenceTypes';

const SCORE_EPS = 1e-9;

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
  return h & 0xffff;
}

function pickBestCandidate(
  candidates: ReharmCandidate[],
  drift: EmotionalDrift,
  melodyPc: number | null,
  lens: ReharmLensConfig,
  prevChosenRootPc: number | null,
  barIndex: number,
  seed: number
): ReharmCandidate | null {
  if (candidates.length === 0) return null;

  const scored = candidates.map((c, idx) => {
    const base = scoreReharmCandidate(c, drift, melodyPc);
    const lensMul = lensMultiplier(c.substituteChordTypeId, lens, prevChosenRootPc, c.substituteRootPc);
    const transPen =
      prevChosenRootPc !== null
        ? transitionDenominatorPenalty(prevChosenRootPc, c.substituteRootPc)
        : 0;
    const effective = (base * lensMul) / (1 + transPen);
    return { c, effective, idx };
  });

  scored.sort((a, b) => {
    if (Math.abs(b.effective - a.effective) > SCORE_EPS) return b.effective - a.effective;
    const ua = seededUnit(seed, barIndex, a.idx + candidateTieSalt(a.c));
    const ub = seededUnit(seed, barIndex, b.idx + candidateTieSalt(b.c));
    return ua - ub;
  });

  return scored[0]!.c;
}

function melodyPcForBar(request: ReharmSequenceRequest, barIndex: number): number | null {
  const { startBar, melodyPcs } = request;
  if (!melodyPcs) return null;
  const i = barIndex - startBar;
  if (i < 0 || i >= melodyPcs.length) return null;
  const v = melodyPcs[i];
  return v === undefined ? null : v;
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
      const cands = generateReharmCandidates(e.vaultChordTypeId, e.rootPc, melodyPc, drift);
      const best = pickBestCandidate(cands, drift, melodyPc, lens, prevChosenRootPc, e.barIndex, seed);

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

    out.push({ lensId, bars });
  }

  return out;
}
