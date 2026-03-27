/**
 * Jazz duo behaviour rules — layered: hard gates + exported metrics for tests.
 */

import type { ScoreModel, PartModel, MeasureModel } from '../score-model/scoreModelTypes';
import { chordTonesForGoldenChord } from '../goldenPath/guitarBassDuoHarmony';
import { activityScoreForBar, HIGH_ACTIVITY } from '../goldenPath/activityScore';
import { expressiveFeelSoftScore } from '../goldenPath/expressiveDuoFeel';

export interface JazzDuoBehaviourResult {
  valid: boolean;
  errors: string[];
}

function chordForBar(barIndex: number): string {
  if (barIndex <= 2) return 'Dmin9';
  if (barIndex <= 4) return 'G13';
  if (barIndex <= 6) return 'Cmaj9';
  return 'A7alt';
}

/** Bar has clear phrase boundary: long note, long rest, or terminal sustain. */
export function barHasPhraseBoundary(m: {
  events: Array<{ kind: string; startBeat?: number; duration?: number }>;
}): boolean {
  let hasLongRest = false;
  let hasLongNote = false;
  for (const e of m.events) {
    if (e.kind === 'rest') {
      const d = (e as { duration: number }).duration;
      if (d >= 1 - 1e-4) hasLongRest = true;
    }
    if (e.kind === 'note') {
      const n = e as { startBeat: number; duration: number };
      if (n.duration >= 1.5 - 1e-4) hasLongNote = true;
      if (n.startBeat + n.duration >= 4 - 1e-4 && n.duration >= 1 - 1e-4) hasLongNote = true;
    }
  }
  return hasLongRest || hasLongNote;
}

/** Phrase ending is “authoritative” when the bar has a clear boundary (long note or rest). */
export function isAuthoritativeEnding(m: MeasureModel): boolean {
  return barHasPhraseBoundary(m);
}

/** At least one phrase boundary in [startBar, endBar] across guitar or bass. */
export function hasPhraseEndWithin(score: ScoreModel, window: number, startBar = 1): boolean {
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const b = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  for (let bar = startBar; bar < startBar + window && bar <= 8; bar++) {
    const gm = g?.measures.find((m) => m.index === bar);
    const bm = b?.measures.find((m) => m.index === bar);
    if (gm && barHasPhraseBoundary(gm)) return true;
    if (bm && barHasPhraseBoundary(bm)) return true;
  }
  return false;
}

/** Max consecutive bars (guitar) without phrase boundary — anti-stream. */
function maxGuitarStreamWithoutBoundary(score: ScoreModel): number {
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!g) return 0;
  let run = 0;
  let maxRun = 0;
  for (let bar = 1; bar <= 8; bar++) {
    const m = g.measures.find((x) => x.index === bar);
    if (m && barHasPhraseBoundary(m)) {
      run = 0;
    } else {
      run++;
      maxRun = Math.max(maxRun, run);
    }
  }
  return maxRun;
}

/** Non-climax bars where both parts are in high activity simultaneously. */
export function violatesOverlap(score: ScoreModel): boolean {
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const b = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (!g || !b) return false;
  const climax = new Set([4, 8]);
  for (let bar = 1; bar <= 8; bar++) {
    if (climax.has(bar)) continue;
    const ga = activityScoreForBar(g, bar);
    const ba = activityScoreForBar(b, bar);
    if (ga >= HIGH_ACTIVITY && ba >= HIGH_ACTIVITY) return true;
  }
  return false;
}

function lastNoteEndBeat(m: { events: Array<{ kind: string; startBeat?: number; duration?: number }> } | undefined): number | undefined {
  if (!m) return undefined;
  let best = -1;
  for (const e of m.events) {
    if (e.kind !== 'note') continue;
    const n = e as { startBeat: number; duration: number };
    best = Math.max(best, n.startBeat + n.duration);
  }
  return best < 0 ? undefined : best;
}

/**
 * Light call/response: staggered entries and/or cross-bar answer after a late guitar phrase end.
 */
export function hasCallResponseInWindow(score: ScoreModel, window: number, startBar: number): boolean {
  const gPart = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const bPart = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (!gPart || !bPart) return false;
  const endBar = startBar + window - 1;
  let staggeredPairs = 0;
  for (let bar = startBar; bar <= endBar; bar++) {
    const gm = gPart.measures.find((m) => m.index === bar);
    const bm = bPart.measures.find((m) => m.index === bar);
    const g1 = gm?.events.find((e) => e.kind === 'note') as { startBeat: number } | undefined;
    const b1 = bm?.events.find((e) => e.kind === 'note') as { startBeat: number } | undefined;
    if (g1 && b1 && Math.abs(g1.startBeat - b1.startBeat) >= 0.5) staggeredPairs++;
  }
  let handoff = false;
  for (let bar = startBar; bar < endBar; bar++) {
    const gm = gPart.measures.find((m) => m.index === bar);
    const bm = bPart.measures.find((m) => m.index === bar);
    const bmNext = bPart.measures.find((m) => m.index === bar + 1);
    const gmNext = gPart.measures.find((m) => m.index === bar + 1);
    const gLast = lastNoteEndBeat(gm);
    const bLast = lastNoteEndBeat(bm);
    const bNextFirst = bmNext?.events.find((e) => e.kind === 'note') as { startBeat: number } | undefined;
    const gNextFirst = gmNext?.events.find((e) => e.kind === 'note') as { startBeat: number } | undefined;
    if (gLast !== undefined && gLast >= 2.5 && bNextFirst && bNextFirst.startBeat <= 1.25) handoff = true;
    if (bLast !== undefined && bLast >= 2.5 && gNextFirst && gNextFirst.startBeat <= 1.25) handoff = true;
  }
  return staggeredPairs >= 1 || handoff;
}

/** V3.1 — Count staggered onsets + cross-bar handoffs (full 8-bar form). */
export function countCallResponseEvents(score: ScoreModel): number {
  const gPart = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const bPart = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (!gPart || !bPart) return 0;
  let n = 0;
  for (let bar = 1; bar <= 8; bar++) {
    const gm = gPart.measures.find((m) => m.index === bar);
    const bm = bPart.measures.find((m) => m.index === bar);
    const g1 = gm?.events.find((e) => e.kind === 'note') as { startBeat: number } | undefined;
    const b1 = bm?.events.find((e) => e.kind === 'note') as { startBeat: number } | undefined;
    if (g1 && b1 && Math.abs(g1.startBeat - b1.startBeat) >= 0.5) n++;
  }
  for (let bar = 1; bar < 8; bar++) {
    const gm = gPart.measures.find((m) => m.index === bar);
    const bm = bPart.measures.find((m) => m.index === bar);
    const bmNext = bPart.measures.find((m) => m.index === bar + 1);
    const gmNext = gPart.measures.find((m) => m.index === bar + 1);
    const gLast = lastNoteEndBeat(gm);
    const bLast = lastNoteEndBeat(bm);
    const bNextFirst = bmNext?.events.find((e) => e.kind === 'note') as { startBeat: number } | undefined;
    const gNextFirst = gmNext?.events.find((e) => e.kind === 'note') as { startBeat: number } | undefined;
    if (gLast !== undefined && gLast >= 2.5 && bNextFirst && bNextFirst.startBeat <= 1.25) n++;
    if (bLast !== undefined && bLast >= 2.5 && gNextFirst && gNextFirst.startBeat <= 1.25) n++;
  }
  return n;
}

export function rootRatioStrongBeats(part: PartModel): number {
  const bass = part;
  let strongRoot = 0;
  let strongTotal = 0;
  for (const m of bass.measures) {
    const chord = chordForBar(m.index);
    const rootPc = chordTonesForGoldenChord(chord).root % 12;
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      const n = e as { pitch: number; startBeat: number };
      const sb = n.startBeat;
      const onStrong = Math.abs(sb) < 0.1 || Math.abs(sb - 2) < 0.1;
      if (!onStrong) continue;
      strongTotal++;
      if (n.pitch % 12 === rootPc) strongRoot++;
    }
  }
  return strongTotal > 0 ? strongRoot / strongTotal : 0;
}

export function guideToneCoverage(part: PartModel): number {
  let covered = 0;
  let total = 0;
  for (const m of part.measures) {
    total++;
    const chord = chordForBar(m.index);
    const t = chordTonesForGoldenChord(chord);
    const thirdPc = t.third % 12;
    const seventhPc = t.seventh % 12;
    let ok = false;
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      const n = e as { pitch: number; startBeat: number };
      const onStrong = Math.abs(n.startBeat) < 0.1 || Math.abs(n.startBeat - 2) < 0.1;
      if (!onStrong) continue;
      const pc = n.pitch % 12;
      if (pc === thirdPc || pc === seventhPc) ok = true;
    }
    if (ok) covered++;
  }
  return total > 0 ? covered / total : 0;
}

/** Contour: max consecutive steps in same direction (adjacent note attacks in order). */
/** Penalize in soft score: rest → long note (≥1.5 beats) → short note (≤0.75 beats). */
export function bassBarHasRestLongShortPattern(m: MeasureModel): boolean {
  const ev = [...m.events]
    .filter((e) => e.kind === 'note' || e.kind === 'rest')
    .sort((a, b) => a.startBeat - b.startBeat);
  for (let i = 0; i + 2 < ev.length; i++) {
    const a = ev[i];
    const b = ev[i + 1];
    const c = ev[i + 2];
    if (a.kind !== 'rest' || b.kind !== 'note' || c.kind !== 'note') continue;
    const rd = (a as { duration: number }).duration;
    const d1 = (b as { duration: number }).duration;
    const d2 = (c as { duration: number }).duration;
    if (rd >= 0.5 - 1e-4 && d1 >= 1.5 - 1e-4 && d2 <= 0.75 + 1e-4) return true;
  }
  return false;
}

/** Long note sustaining through both beat 2 and beat 3 (not an on-the-grid pick-up only). */
export function bassBarLongSustainAcrossBeatsTwoThree(m: MeasureModel): boolean {
  for (const e of m.events) {
    if (e.kind !== 'note') continue;
    const n = e as { startBeat: number; duration: number };
    const end = n.startBeat + n.duration;
    if (n.duration < 1.5 - 1e-4) continue;
    if (n.startBeat < 2 - 1e-4 && end > 3 + 1e-4) return true;
  }
  return false;
}

/** Count bars matching awkward phrasing heuristics (for QA / manifests; not used in lock soft score). */
export function bassRhythmPhrasingPenaltyUnits(part: PartModel): {
  restLongShortBars: number;
  longSustainBeatsTwoThreeBars: number;
} {
  let restLongShortBars = 0;
  let longSustainBeatsTwoThreeBars = 0;
  for (const m of part.measures) {
    if (bassBarHasRestLongShortPattern(m)) restLongShortBars++;
    if (bassBarLongSustainAcrossBeatsTwoThree(m)) longSustainBeatsTwoThreeBars++;
  }
  return { restLongShortBars, longSustainBeatsTwoThreeBars };
}

export function maxSameDirectionSteps(part: PartModel): number {
  const pitches: number[] = [];
  for (const m of part.measures) {
    for (const e of m.events) {
      if (e.kind === 'note') pitches.push((e as { pitch: number }).pitch);
    }
  }
  if (pitches.length < 2) return 0;
  let maxRun = 1;
  let run = 1;
  let dir = Math.sign(pitches[1] - pitches[0]);
  for (let i = 2; i < pitches.length; i++) {
    const d = Math.sign(pitches[i] - pitches[i - 1]);
    if (d === 0) continue;
    if (d === dir) {
      run++;
      maxRun = Math.max(maxRun, run);
    } else {
      run = 1;
      dir = d;
    }
  }
  return maxRun;
}

/** Soft ranking for lock method (higher = stronger duo behaviour). */
export function scoreJazzDuoBehaviourSoft(score: ScoreModel): number {
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const b = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (!g || !b) return 0;
  const gc = guideToneCoverage(b);
  const rr = rootRatioStrongBeats(b);
  const meanA =
    ([1, 2, 3, 4].reduce((s, bar) => s + activityScoreForBar(g, bar), 0) +
      [1, 2, 3, 4].reduce((s, bar) => s + activityScoreForBar(b, bar), 0)) /
    8;
  const meanB =
    ([5, 6, 7, 8].reduce((s, bar) => s + activityScoreForBar(g, bar), 0) +
      [5, 6, 7, 8].reduce((s, bar) => s + activityScoreForBar(b, bar), 0)) /
    8;
  const sectionSpread = Math.abs(meanA - meanB);
  const contourPenalty = Math.max(0, maxSameDirectionSteps(b) - 4) * 2;
  /** Heuristic: `bassBarHasRestLongShortPattern` / `bassBarLongSustainAcrossBeatsTwoThree` (exported) — not folded into soft score to keep lock ordering stable. */
  const feel = expressiveFeelSoftScore(score);
  return gc * 10 + (0.5 - rr) * 5 + sectionSpread * 3 - contourPenalty + feel;
}

export function validateJazzDuoBehaviourRules(score: ScoreModel): JazzDuoBehaviourResult {
  const errors: string[] = [];

  if (!hasPhraseEndWithin(score, 4, 1)) {
    errors.push('Jazz duo: no phrase boundary in bars 1–4');
  }
  if (!hasPhraseEndWithin(score, 4, 5)) {
    errors.push('Jazz duo: no phrase boundary in bars 5–8');
  }

  if (maxGuitarStreamWithoutBoundary(score) > 5) {
    errors.push('Jazz duo: guitar streams without phrase boundary for more than 5 bars');
  }

  if (violatesOverlap(score)) {
    errors.push('Jazz duo: excessive simultaneous high activity (guitar and bass both hot)');
  }

  if (!hasCallResponseInWindow(score, 4, 1)) {
    errors.push('Jazz duo: insufficient call/response character in section A (bars 1–4)');
  }
  if (!hasCallResponseInWindow(score, 4, 5)) {
    errors.push('Jazz duo: insufficient call/response character in section B (bars 5–8)');
  }

  return { valid: errors.length === 0, errors };
}

/** Alias — hard gates only (section contrast is scored softly in lock). */
export function validateJazzDuoBehaviourHardGates(score: ScoreModel): JazzDuoBehaviourResult {
  return validateJazzDuoBehaviourRules(score);
}
