import {
  generateReharmCandidates,
  scoreReharmCandidate,
  type EmotionalDrift,
} from './reharmCandidateEngine';
import { getChordRangeForBars, type BarChordEntry } from './harmonyRangeResolver';
import { generateReharmSequence } from './reharmSequenceRanker';
import type {
  AlternativeProgression,
  ReharmResult,
  ReharmSequenceRequest,
} from './reharmSequenceTypes';

/** Matches {@link goldenPath/guitarBassDuoHarmony.seededUnit} — deterministic [0,1). */
function seededUnit(seed: number, bar: number, salt = 0): number {
  let s = (seed * 7919 + bar * 104729 + salt * 503) >>> 0;
  s = (s * 1103515245 + 12345) >>> 0;
  return s / 0xffffffff;
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
 * Placeholder GCE-style score: mean {@link scoreReharmCandidate} over scored bars, scaled ×10 into **[0, 10]**.
 * // TODO: wire gceAutoScorers (`engines/composer-os-v2/core/gce/gceAutoScorers.ts`) for real evaluation.
 */
function gceScorePlaceholderForProgression(
  prog: AlternativeProgression,
  entries: BarChordEntry[],
  request: ReharmSequenceRequest,
  drift: EmotionalDrift
): number {
  const nums: number[] = [];
  for (const bar of prog.bars) {
    if (bar.mappingNull || bar.strategy === 'passthrough') continue;
    const entry = entries.find((e) => e.barIndex === bar.barIndex);
    if (!entry || entry.mappingNull) continue;
    const melodyPc = melodyPcForBar(request, bar.barIndex);
    if (bar.strategy === 'identity') {
      nums.push(0.55);
      continue;
    }
    const cands = generateReharmCandidates(entry.vaultChordTypeId, entry.rootPc, melodyPc, drift);
    const match = cands.find(
      (c) => c.substituteChordTypeId === bar.substituteChordTypeId && c.strategy === bar.strategy
    );
    nums.push(match ? scoreReharmCandidate(match, drift, melodyPc) : 0.45);
  }
  const mean = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
  const scaled = mean * 10;
  return Math.min(10, Math.max(0, scaled));
}

function resolveSeed(requested: number | undefined): number {
  if (requested !== undefined && Number.isFinite(requested)) return Math.floor(requested);
  return (Math.floor(seededUnit(4242, 17, 90211) * 0xffffffff) >>> 0) % 2147483647;
}

/**
 * Runs sequence generation + placeholder per-progression scores for API surfaces.
 */
export function executeReharm(request: ReharmSequenceRequest): ReharmResult {
  const { startBar, endBar, lensIds } = request;
  const seed = resolveSeed(request.seed);
  const drift: EmotionalDrift = request.drift ?? 'neutral';

  const seqRequest: ReharmSequenceRequest = { ...request, seed };
  const alternatives = generateReharmSequence(seqRequest).map((p) => ({ ...p }));
  const entries = getChordRangeForBars(startBar, endBar, request.context);

  for (const alt of alternatives) {
    alt.gceScore = gceScorePlaceholderForProgression(alt, entries, seqRequest, drift);
  }

  return {
    alternatives,
    requestedLens: [...lensIds],
    startBar,
    endBar,
    seed,
  };
}
