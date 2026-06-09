/**
 * V80k — Barry Harris ladder voicing engine (voice-led scale-of-chords realizations).
 */

import type { ImportMelodyNote } from '../import/mosaicImportTimeline';
import type { ScoreModel } from '../score-model/scoreModelTypes';
import { closeBlockVoicingBelowMelody, drop2VoicingBelowMelody } from './blockVoicings';
import { dim7ChordTones, sixthChordTones } from './chordTones';
import { chordTonePcsForResolved } from './identities';
import {
  assessGuitarFeasibility,
  isDrop2InnerSpacing,
} from './guitarVoicingFeasibility';
import {
  buildLadder,
  familyKey,
  findRungForMelodyPc,
  nearestRung,
} from './ladderBuilder';
import { realizeRungAtMelody, singleNoteVoicing } from './ladderRealizer';
import { pitchClassToSharpName, sixthDimPartnerSymbol } from './scaleOfChords';
import type {
  BhFamily,
  LadderRung,
  LadderSource,
  PhrasingRole,
  RealizedVoicing,
  ResolvedChordMelodyNote,
  VoicingShapeType,
  VoicingVariant,
} from './types';

export { isDrop2InnerSpacing };

export type VoicingSpacingPreference = 'close' | 'drop2' | 'all';
export type VoicingEngineOptions = {
  spacingPreference?: VoicingSpacingPreference;
};

function mod12(pc: number): number {
  return ((pc % 12) + 12) % 12;
}

function isStrongBeat(onsetBeat: number): boolean {
  const beat = ((onsetBeat % 4) + 4) % 4;
  return Math.abs(beat) < 0.05 || Math.abs(beat - 2) < 0.05;
}

function findMelodyNote(
  melody: readonly ImportMelodyNote[],
  bar: number,
  onsetBeat: number
): ImportMelodyNote | undefined {
  return melody.find((n) => n.bar === bar && Math.abs(n.onsetBeat - onsetBeat) < 0.02);
}

function variantFromShape(shapeType: VoicingShapeType, borrowed: boolean): VoicingVariant {
  if (shapeType === 'single') return 'single';
  if (shapeType === 'dyad') return 'dyad';
  if (borrowed) return 'borrowed-replacement';
  return 'sixth-block';
}

function ladderSymbolForSource(family: BhFamily, source: LadderSource): string {
  const { sixthSymbol, dim7Symbol } = sixthDimPartnerSymbol(family.sixthRootPc, family.sixthQuality);
  return source === 'dim' ? dim7Symbol : sixthSymbol;
}

export function harmonySymbolForResolved(resolved: ResolvedChordMelodyNote): string {
  if (resolved.voicingChordColour === 'dim7') {
    return `${pitchClassToSharpName(resolved.anchor.dim7RootPc)}dim7`;
  }
  if (resolved.voicingChordColour === 'sixth') {
    const root = pitchClassToSharpName(resolved.anchor.sixthRootPc);
    return resolved.anchor.sixthQuality === 'm6' ? `${root}m6` : `${root}6`;
  }
  if (resolved.kind === 'dim7') return resolved.chordSymbol;
  return resolved.exportSymbol;
}

function tonesForSource(family: BhFamily, source: LadderSource): number[] {
  return source === 'dim'
    ? dim7ChordTones(family.dim7RootPc)
    : sixthChordTones(family.sixthRootPc, family.sixthQuality);
}

function dedupeInnerVoices(inner: readonly number[]): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const m of [...inner].sort((a, b) => a - b)) {
    const pc = mod12(m);
    if (seen.has(pc)) continue;
    seen.add(pc);
    out.push(m);
  }
  return out;
}

function stackIsValidSubset(
  stack: readonly number[],
  melodyMidi: number,
  tonePcs: readonly number[]
): boolean {
  if (stack.length === 0) return false;
  if (Math.max(...stack) !== melodyMidi) return false;
  const allowed = new Set(tonePcs.map(mod12));
  for (const m of stack) {
    if (!allowed.has(mod12(m))) return false;
  }
  return true;
}

function rebuildStackIfNeeded(
  realization: RealizedVoicing,
  melodyMidi: number,
  family: BhFamily,
  prevInner?: readonly number[] | null
): { inner: number[]; stack: number[] } {
  const tonePcs = tonesForSource(family, realization.source);
  let inner = dedupeInnerVoices(realization.innerVoicingMidis);
  let stack = [...inner, melodyMidi].sort((a, b) => a - b);

  if (stackIsValidSubset(stack, melodyMidi, tonePcs)) {
    return { inner, stack };
  }

  inner = innerBelowMelodyMinDisplacement(melodyMidi, tonePcs, prevInner ?? null);
  inner = dedupeInnerVoices(inner);
  stack = [...inner, melodyMidi].sort((a, b) => a - b);
  return { inner, stack };
}

function maxInnerDisplacement(prevInner: readonly number[], currInner: readonly number[]): number {
  const prev = [...prevInner].sort((a, b) => a - b);
  const curr = [...currInner].sort((a, b) => a - b);
  const used = new Set<number>();
  let max = 0;
  for (const a of prev) {
    let bestIdx = -1;
    let bestDist = Infinity;
    for (let j = 0; j < curr.length; j++) {
      if (used.has(j)) continue;
      const dist = Math.abs(curr[j]! - a);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = j;
      }
    }
    if (bestIdx < 0) continue;
    used.add(bestIdx);
    max = Math.max(max, bestDist);
  }
  return max;
}

function innerDisplacement(prevInner: readonly number[], currInner: readonly number[]): number {
  const prev = [...prevInner].sort((a, b) => a - b);
  const curr = [...currInner].sort((a, b) => a - b);
  const used = new Set<number>();
  let total = 0;
  let count = 0;
  for (const a of prev) {
    let bestIdx = -1;
    let bestDist = Infinity;
    for (let j = 0; j < curr.length; j++) {
      if (used.has(j)) continue;
      const dist = Math.abs(curr[j]! - a);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = j;
      }
    }
    if (bestIdx < 0) continue;
    used.add(bestIdx);
    total += bestDist;
    count++;
  }
  return count > 0 ? total / count : maxInnerDisplacement(prevInner, currInner);
}

function maxInnerLeap(prevInner: readonly number[], currInner: readonly number[]): number {
  return maxInnerDisplacement(prevInner, currInner);
}

function innerBelowMelodyMinDisplacement(
  melodyMidi: number,
  tonePcs: readonly number[],
  prevInner: readonly number[] | null
): number[] {
  const melodyPc = mod12(melodyMidi);
  const base = closeBlockVoicingBelowMelody(melodyMidi, tonePcs, melodyPc);
  if (!prevInner || prevInner.length === 0) return base;
  let best = base;
  let bestDisp = maxInnerDisplacement(prevInner, base);
  for (const shift of [-24, -12, 0, 12]) {
    const shifted = base.map((m) => m + shift).sort((a, b) => a - b);
    if (shifted.some((m) => m >= melodyMidi)) continue;
    if (shifted.length !== base.length) continue;
    const disp = maxInnerDisplacement(prevInner, shifted);
    if (disp < bestDisp) {
      bestDisp = disp;
      best = shifted;
    }
  }
  return best;
}

function alignInnerToPrevious(
  inner: readonly number[],
  prevInner: readonly number[] | null,
  melodyMidi: number,
  tonePcs: readonly number[]
): number[] {
  if (!prevInner || prevInner.length === 0) return [...inner];
  return innerBelowMelodyMinDisplacement(melodyMidi, tonePcs, prevInner);
}

function applyBorrowedReplacement(
  inner: readonly number[],
  borrowedTonePc: number,
  melodyMidi: number
): number[] {
  const out = [...inner];
  const replaceIdx = out.reduce(
    (bestIdx, m, idx, arr) => {
      const d = Math.min(
        (mod12(m) - borrowedTonePc + 12) % 12,
        (borrowedTonePc - mod12(m) + 12) % 12
      );
      const bestD =
        bestIdx < 0
          ? 13
          : Math.min(
              (mod12(arr[bestIdx]!) - borrowedTonePc + 12) % 12,
              (borrowedTonePc - mod12(arr[bestIdx]!) + 12) % 12
            );
      return d < bestD ? idx : bestIdx;
    },
    -1
  );
  if (replaceIdx < 0) return out;
  let replacement = out[replaceIdx]!;
  while (mod12(replacement) !== borrowedTonePc) replacement += 1;
  while (replacement >= melodyMidi) replacement -= 12;
  out[replaceIdx] = replacement;
  return out.sort((a, b) => a - b);
}

function finalizeInner(
  inner: readonly number[],
  resolved: ResolvedChordMelodyNote,
  melodyMidi: number,
  source: LadderSource,
  family: BhFamily
): number[] {
  let out = dedupeInnerVoices(inner);
  if (resolved.kind === 'borrowed') {
    out = applyBorrowedReplacement(out, resolved.borrowedTonePc, melodyMidi);
  }
  const tonePcs = tonesForSource(family, source);
  out = out.filter((m) => mod12(m) !== mod12(melodyMidi) && tonePcs.includes(mod12(m)));
  if (out.length === 0 && resolved.phrasingRole !== 'single') {
    out = closeBlockVoicingBelowMelody(melodyMidi, tonePcs, mod12(melodyMidi));
  }
  return dedupeInnerVoices(out);
}

function refineRealizationInner(
  realization: RealizedVoicing,
  resolved: ResolvedChordMelodyNote,
  melodyMidi: number,
  prevInner: readonly number[] | null
): RealizedVoicing {
  const family = resolved.anchor;
  const tonePcs = tonesForSource(family, realization.source);
  let inner = finalizeInner(realization.innerVoicingMidis, resolved, melodyMidi, realization.source, family);
  inner = alignInnerToPrevious(inner, prevInner, melodyMidi, tonePcs);
  const stack = [...inner, melodyMidi].sort((a, b) => a - b);
  const feasibility = assessGuitarFeasibility(stack, { allowStretch: true });
  return {
    ...realization,
    innerVoicingMidis: inner,
    pitches: stack,
    guitarFeasible: feasibility.feasible,
    guitarFretSpan: feasibility.fretSpan,
  };
}

function chromaticApproach(
  ladder: readonly LadderRung[],
  melodyPc: number,
  onsetBeat: number
): LadderRung | undefined {
  if (!isStrongBeat(onsetBeat)) return undefined;
  const exact = findRungForMelodyPc(ladder, melodyPc);
  if (exact) return undefined;
  return nearestRung(ladder, melodyPc);
}

function collectCandidates(
  resolved: ResolvedChordMelodyNote,
  melodyMidi: number,
  ladder: readonly LadderRung[],
  exactRung: LadderRung | null,
  spacingPreference: VoicingSpacingPreference,
  onsetBeat: number,
  prevInner: readonly number[] | null
): RealizedVoicing[] {
  const melodyPc = mod12(melodyMidi);
  const rung = exactRung ?? chromaticApproach(ladder, melodyPc, onsetBeat) ?? nearestRung(ladder, melodyPc);
  const pref = spacingPreference === 'all' ? 'all' : spacingPreference;
  let candidates = realizeRungAtMelody(rung, melodyMidi, {
    spacingPreference: pref,
    allowStretch: true,
  });

  if (resolved.phrasingRole === 'dyad') {
    candidates = candidates.filter((c) => c.shapeType === 'dyad' || c.shapeType === 'shell');
  } else if (resolved.phrasingRole === 'full') {
    candidates = candidates.filter((c) => c.shapeType !== 'single' && c.innerVoicingMidis.length <= 3);
  }

  const out: RealizedVoicing[] = [];
  for (const c of candidates) {
    out.push(refineRealizationInner(c, resolved, melodyMidi, prevInner));
  }
  return out;
}

function capInnerForPhrasing(
  inner: readonly number[],
  phrasingRole: PhrasingRole,
  prevInner?: readonly number[] | null
): number[] {
  const deduped = dedupeInnerVoices(inner);
  if (phrasingRole === 'single') return deduped;
  if (phrasingRole === 'dyad') {
    if (deduped.length <= 1) return deduped;
    if (prevInner && prevInner.length > 0) {
      let best = deduped[deduped.length - 1]!;
      let bestDisp = Infinity;
      for (const m of deduped) {
        const d = Math.min(...prevInner.map((p) => Math.abs(m - p)));
        if (d < bestDisp) {
          bestDisp = d;
          best = m;
        }
      }
      return [best];
    }
    return deduped.slice(-1);
  }
  if (phrasingRole === 'full') {
    if (deduped.length <= 3) return deduped;
    if (prevInner && prevInner.length > 0) {
      return deduped
        .map((m) => ({ m, d: Math.min(...prevInner.map((p) => Math.abs(m - p))) }))
        .sort((a, b) => a.d - b.d || a.m - b.m)
        .slice(0, 3)
        .map((x) => x.m)
        .sort((a, b) => a - b);
    }
    return deduped.slice(-3);
  }
  return deduped;
}

function pickFamilyEntryRung(
  ladder: readonly LadderRung[],
  melodyMidi: number,
  spacingPreference: VoicingSpacingPreference,
  prevInner: readonly number[] | null
): RealizedVoicing | null {
  let best: RealizedVoicing | null = null;
  let bestDisp = Infinity;
  for (const rung of ladder) {
    const pref = spacingPreference === 'all' ? 'all' : spacingPreference;
    for (const c of realizeRungAtMelody(rung, melodyMidi, { spacingPreference: pref, allowStretch: true })) {
      const stackFeasibility = assessGuitarFeasibility([...c.innerVoicingMidis, melodyMidi], {
        allowStretch: true,
      });
      if (!stackFeasibility.feasible || c.innerVoicingMidis.length > 3) continue;
      const disp =
        prevInner && prevInner.length > 0
          ? maxInnerDisplacement(prevInner, c.innerVoicingMidis)
          : c.innerVoicingMidis.reduce((s, m) => s + Math.abs(m - (melodyMidi - 12)), 0);
      if (disp < bestDisp) {
        bestDisp = disp;
        best = c;
      }
    }
  }
  return best;
}

function innerVoiceCost(prevInner: readonly number[], currInner: readonly number[]): number {
  return innerDisplacement(prevInner, currInner);
}

function laneContinuityCost(prevLane: string | null, lane: string): number {
  if (!prevLane) return 0;
  return prevLane === lane ? 0 : 2;
}

function fingerprintRepeatPenalty(fp: string, recentFingerprints: readonly string[]): number {
  if (recentFingerprints.length === 0) return 0;
  const last = recentFingerprints[recentFingerprints.length - 1]!;
  if (fp !== last) return 0;
  const prev = recentFingerprints.length >= 2 ? recentFingerprints[recentFingerprints.length - 2]! : null;
  if (prev === fp) return 100;
  return 8;
}

function pickRealization(
  candidates: readonly RealizedVoicing[],
  prevInner: readonly number[] | null,
  prevLane: string | null,
  recentFingerprints: readonly string[],
  familyChanged: boolean,
  melodyMidi: number,
  spacingPreference: VoicingSpacingPreference = 'close',
  sameRungBannedFp?: string | null
): RealizedVoicing | null {
  if (candidates.length === 0) return null;

  let pool = alternateSameRungRealization(candidates, recentFingerprints, sameRungBannedFp);
  const feasiblePool = pool.filter((c) => {
    const stackFeasibility = assessGuitarFeasibility([...c.innerVoicingMidis, melodyMidi], {
      allowStretch: true,
    });
    return stackFeasibility.feasible;
  });
  if (feasiblePool.length > 0) pool = feasiblePool;

  let best: RealizedVoicing | null = null;
  let bestScore = Infinity;

  for (const c of pool) {
    const stackFeasibility = assessGuitarFeasibility([...c.innerVoicingMidis, melodyMidi], {
      allowStretch: true,
    });
    if (!stackFeasibility.feasible) continue;

    const vl = prevInner ? innerVoiceCost(prevInner, c.innerVoicingMidis) : 0;
    const lane = laneContinuityCost(prevLane, c.laneSignature);
    let repeatPenalty = fingerprintRepeatPenalty(c.voicingFingerprint, recentFingerprints);
    if (sameRungBannedFp && c.voicingFingerprint === sameRungBannedFp) {
      repeatPenalty += 120;
    }
    const disp = prevInner ? maxInnerLeap(prevInner, c.innerVoicingMidis) : 0;
    const score = familyChanged ? disp * 1.5 + repeatPenalty : vl * 5 + lane + repeatPenalty;

    if (score < bestScore) {
      bestScore = score;
      best = c;
    }
  }

  return best ?? pool[0] ?? null;
}

function alternateSameRungRealization(
  candidates: readonly RealizedVoicing[],
  recentFingerprints: readonly string[],
  sameRungBannedFp?: string | null
): RealizedVoicing[] {
  if (candidates.length <= 1) return [...candidates];
  const banned = sameRungBannedFp ?? null;
  const last = recentFingerprints[recentFingerprints.length - 1] ?? null;
  const targetBan = banned ?? last;
  if (!targetBan) return [...candidates];
  const alt = candidates.filter((c) => c.voicingFingerprint !== targetBan);
  return alt.length > 0 ? alt : [...candidates];
}

function finalizeExportStack(
  resolved: ResolvedChordMelodyNote,
  innerIn: readonly number[],
  melodyMidi: number,
  prevInner: readonly number[] | null,
  tonePcs: readonly number[]
): { inner: number[]; stack: number[]; feasibility: ReturnType<typeof assessGuitarFeasibility> } {
  let inner = dedupeInnerVoices(innerIn);
  if (prevInner && prevInner.length > 0) {
    inner = alignInnerToPrevious(inner, prevInner, melodyMidi, tonePcs);
  }
  inner = capInnerForPhrasing(inner, resolved.phrasingRole, prevInner);
  let stack = [...inner, melodyMidi].sort((a, b) => a - b);
  let feasibility = assessGuitarFeasibility(stack, { allowStretch: true });
  while (!feasibility.feasible && inner.length > 1) {
    inner = inner.slice(1);
    stack = [...inner, melodyMidi].sort((a, b) => a - b);
    feasibility = assessGuitarFeasibility(stack, { allowStretch: true });
  }
  if (!feasibility.feasible) {
    inner = innerBelowMelodyMinDisplacement(melodyMidi, tonePcs, prevInner);
    inner = capInnerForPhrasing(inner, resolved.phrasingRole, prevInner);
    stack = [...inner, melodyMidi].sort((a, b) => a - b);
    feasibility = assessGuitarFeasibility(stack, { allowStretch: true });
    while (!feasibility.feasible && inner.length > 1) {
      inner = inner.slice(1);
      stack = [...inner, melodyMidi].sort((a, b) => a - b);
      feasibility = assessGuitarFeasibility(stack, { allowStretch: true });
    }
  }
  if (!feasibility.feasible) {
    const melodyPc = mod12(melodyMidi);
    const anchorPc = tonePcs.find((t) => t !== melodyPc) ?? tonePcs[0] ?? melodyPc;
    let bass = melodyMidi - 1;
    while (mod12(bass) !== anchorPc) bass -= 1;
    while (bass >= melodyMidi) bass -= 12;
    inner = [bass];
    stack = [...inner, melodyMidi].sort((a, b) => a - b);
    feasibility = assessGuitarFeasibility(stack, { allowStretch: true });
  }
  return { inner, stack, feasibility };
}

function mapFromBaseVoicing(
  resolved: ResolvedChordMelodyNote,
  voicing: Pick<
    ResolvedChordMelodyNote,
    | 'exportStackMidis'
    | 'innerVoicingMidis'
    | 'voicingVariant'
    | 'borrowedReplacementPc'
    | 'voicingFingerprint'
  >,
  melodyMidi: number,
  prevInner: readonly number[] | null
): ResolvedChordMelodyNote {
  const source: LadderSource = resolved.kind === 'dim7' ? 'dim' : 'sixth';
  const tonePcs = tonesForSource(resolved.anchor, source);
  let inner = finalizeInner(
    voicing.innerVoicingMidis,
    resolved,
    melodyMidi,
    source,
    resolved.anchor
  );
  const { inner: innerOut, stack, feasibility } = finalizeExportStack(
    resolved,
    inner,
    melodyMidi,
    prevInner,
    tonePcs
  );
  const vlCost = prevInner ? innerVoiceCost(prevInner, innerOut) : null;
  return {
    ...resolved,
    exportStackMidis: stack,
    innerVoicingMidis: innerOut,
    voicingVariant: voicing.voicingVariant,
    borrowedReplacementPc: voicing.borrowedReplacementPc,
    voicingFingerprint: voicing.voicingFingerprint,
    voicingChordColour: resolved.kind === 'dim7' ? 'dim7' : 'sixth',
    ladderRungIndex: null,
    ladderHit: false,
    voiceLeadingCost: vlCost,
    guitarFretSpan: feasibility.fretSpan,
    guitarFeasible: feasibility.feasible,
    blockVoicingMidis: innerOut,
  };
}

function mapToResolved(
  resolved: ResolvedChordMelodyNote,
  realization: RealizedVoicing,
  melodyMidi: number,
  ladderHit: boolean,
  voiceLeadingCost: number,
  prevInner: readonly number[] | null
): ResolvedChordMelodyNote {
  const ladderSymbol = ladderSymbolForSource(resolved.anchor, realization.source);
  const colour: 'sixth' | 'dim7' = realization.source === 'dim' ? 'dim7' : 'sixth';

  const tonePcs = tonesForSource(resolved.anchor, realization.source);
  let { inner } = rebuildStackIfNeeded(realization, melodyMidi, resolved.anchor, prevInner);
  inner = finalizeInner(inner, resolved, melodyMidi, realization.source, resolved.anchor);
  const { inner: innerOut, stack, feasibility } = finalizeExportStack(
    resolved,
    inner,
    melodyMidi,
    prevInner,
    tonePcs
  );
  inner = innerOut;

  const borrowed = resolved.kind === 'borrowed';
  return {
    ...resolved,
    exportSymbol: ladderSymbol,
    voicingChordColour: colour,
    ladderRungIndex: realization.rungIndex,
    ladderHit,
    exportStackMidis: stack,
    innerVoicingMidis: inner,
    voicingVariant: variantFromShape(realization.shapeType, borrowed),
    voicingFingerprint: realization.voicingFingerprint,
    borrowedReplacementPc: borrowed ? resolved.borrowedTonePc : undefined,
    voiceLeadingCost,
    guitarFretSpan: feasibility.fretSpan,
    guitarFeasible: feasibility.feasible,
    blockVoicingMidis: inner,
  };
}

function buildVoicingFromRungResolved(
  resolved: ResolvedChordMelodyNote,
  rung: LadderRung,
  melodyMidi: number,
  realization: RealizedVoicing,
  ladderHit: boolean,
  voiceLeadingCost: number,
  prevInner: readonly number[] | null
): ResolvedChordMelodyNote {
  return mapToResolved(resolved, realization, melodyMidi, ladderHit, voiceLeadingCost, prevInner);
}

export function buildBaseVoicing(
  resolved: ResolvedChordMelodyNote,
  melodyMidi: number,
  phrasingRole: PhrasingRole
): Pick<
  ResolvedChordMelodyNote,
  | 'exportStackMidis'
  | 'innerVoicingMidis'
  | 'voicingVariant'
  | 'borrowedReplacementPc'
  | 'voicingFingerprint'
> {
  const melodyPc = mod12(melodyMidi);
  const tones = chordTonePcsForResolved(resolved);

  if (phrasingRole === 'single') {
    const stack = [melodyMidi];
    return {
      exportStackMidis: stack,
      innerVoicingMidis: [],
      voicingVariant: 'single',
      voicingFingerprint: `single:${melodyMidi}`,
    };
  }

  if (phrasingRole === 'dyad') {
    const anchorPc = tones.find((t) => t !== melodyPc) ?? tones[0] ?? melodyPc;
    let bass = melodyMidi - 1;
    while (mod12(bass) !== anchorPc) bass -= 1;
    while (bass >= melodyMidi) bass -= 12;
    const stack = [bass, melodyMidi].sort((a, b) => a - b);
    return {
      exportStackMidis: stack,
      innerVoicingMidis: [bass],
      voicingVariant: 'dyad',
      voicingFingerprint: `dyad:${stack.join(',')}`,
    };
  }

  const inner = closeBlockVoicingBelowMelody(melodyMidi, tones, undefined);
  let variant: VoicingVariant = 'sixth-block';
  let innerOut = [...inner];
  let borrowedReplacementPc: number | undefined;

  if (resolved.kind === 'borrowed') {
    variant = 'borrowed-replacement';
    borrowedReplacementPc = resolved.borrowedTonePc;
    innerOut = applyBorrowedReplacement(innerOut, resolved.borrowedTonePc, melodyMidi);
  }

  const stack = [...innerOut, melodyMidi].sort((a, b) => a - b);
  const colour = resolved.kind === 'dim7' ? 'dim' : '6';
  return {
    exportStackMidis: stack,
    innerVoicingMidis: innerOut,
    voicingVariant: variant,
    borrowedReplacementPc,
    voicingFingerprint: `${colour}:close:${stack.join(',')}`,
  };
}

export function harmonizePhrase(
  resolvedNotes: readonly ResolvedChordMelodyNote[],
  melody: readonly ImportMelodyNote[],
  options: VoicingEngineOptions = {}
): ResolvedChordMelodyNote[] {
  const spacingPreference = options.spacingPreference ?? 'all';
  const ordered = [...resolvedNotes].sort((a, b) => a.bar - b.bar || a.onsetBeat - b.onsetBeat);
  const ladderCache = new Map<string, LadderRung[]>();
  const lastFpByRungMelody = new Map<string, string>();

  let prevInner: number[] | null = null;
  let prevLane: string | null = null;
  let prevFamilyKey: string | null = null;
  const recentFingerprints: string[] = [];
  const out: ResolvedChordMelodyNote[] = [];

  for (const resolved of ordered) {
    const mel = findMelodyNote(melody, resolved.bar, resolved.onsetBeat);
    if (!mel) {
      out.push({
        ...resolved,
        exportStackMidis: [],
        innerVoicingMidis: [],
        voicingVariant: 'single',
        voicingFingerprint: 'missing-melody',
        voiceLeadingCost: null,
        guitarFretSpan: null,
        guitarFeasible: null,
        ladderRungIndex: null,
        ladderHit: false,
      });
      continue;
    }

    const fk = familyKey(resolved.anchor);
    let ladder = ladderCache.get(fk);
    if (!ladder) {
      ladder = buildLadder(resolved.anchor);
      ladderCache.set(fk, ladder);
    }

    const familyChanged = prevFamilyKey !== null && prevFamilyKey !== fk;
    const vlPrevInner = familyChanged ? null : prevInner;

    if (resolved.phrasingRole === 'single') {
      const melodyPc = mod12(mel.midiPitch);
      const rung = findRungForMelodyPc(ladder, melodyPc) ?? nearestRung(ladder, melodyPc);
      const realization = singleNoteVoicing(rung, mel.midiPitch);
      const mapped = mapToResolved(resolved, realization, mel.midiPitch, rung.melodyPc === melodyPc, 0, vlPrevInner);
      out.push(mapped);
      prevInner = mapped.innerVoicingMidis;
      prevLane = realization.laneSignature;
      prevFamilyKey = fk;
      recentFingerprints.push(mapped.voicingFingerprint);
      if (recentFingerprints.length > 4) recentFingerprints.shift();
      continue;
    }

    const melodyPc = mod12(mel.midiPitch);
    const exactRung = findRungForMelodyPc(ladder, melodyPc);
    const ladderHit = exactRung !== undefined;

    let candidates = collectCandidates(
      resolved,
      mel.midiPitch,
      ladder,
      exactRung ?? null,
      spacingPreference,
      resolved.onsetBeat,
      vlPrevInner
    );

    if (candidates.length === 0) {
      const fallback = buildBaseVoicing(resolved, mel.midiPitch, resolved.phrasingRole);
      const mappedFallback = mapFromBaseVoicing(resolved, fallback, mel.midiPitch, vlPrevInner);
      out.push(mappedFallback);
      prevInner = mappedFallback.innerVoicingMidis;
      prevFamilyKey = fk;
      continue;
    }

    let picked: RealizedVoicing | null = null;
    if (familyChanged) {
      picked = pickFamilyEntryRung(ladder, mel.midiPitch, spacingPreference, prevInner);
      if (!picked) {
        picked = pickRealization(
          candidates,
          null,
          null,
          recentFingerprints,
          true,
          mel.midiPitch,
          spacingPreference
        );
      }
    } else {
      const rungKey = `${(exactRung ?? nearestRung(ladder, melodyPc)).index}:${melodyPc}`;
      const sameRungBannedFp = lastFpByRungMelody.get(rungKey) ?? null;
      picked = pickRealization(
        candidates,
        vlPrevInner,
        prevLane,
        recentFingerprints,
        false,
        mel.midiPitch,
        spacingPreference,
        sameRungBannedFp
      );
    }

    if (!picked) {
      const fallback = buildBaseVoicing(resolved, mel.midiPitch, resolved.phrasingRole);
      const mappedFallback = mapFromBaseVoicing(resolved, fallback, mel.midiPitch, vlPrevInner);
      out.push(mappedFallback);
      prevInner = mappedFallback.innerVoicingMidis;
      prevFamilyKey = fk;
      continue;
    }

    const vlCost = vlPrevInner ? innerVoiceCost(vlPrevInner, picked.innerVoicingMidis) : 0;
    const mapped = buildVoicingFromRungResolved(
      resolved,
      exactRung ?? nearestRung(ladder, melodyPc),
      mel.midiPitch,
      picked,
      ladderHit,
      vlCost,
      vlPrevInner
    );
    out.push(mapped);

    const rungKey = `${(exactRung ?? nearestRung(ladder, melodyPc)).index}:${melodyPc}`;
    lastFpByRungMelody.set(rungKey, mapped.voicingFingerprint);

    prevInner = mapped.innerVoicingMidis;
    prevLane = picked.laneSignature;
    prevFamilyKey = fk;
    recentFingerprints.push(mapped.voicingFingerprint);
    if (recentFingerprints.length > 4) recentFingerprints.shift();
  }

  return out;
}

export function applyVoicingEngineToResolved(
  resolvedNotes: readonly ResolvedChordMelodyNote[],
  melody: readonly ImportMelodyNote[],
  options: VoicingEngineOptions = {}
): ResolvedChordMelodyNote[] {
  return harmonizePhrase(resolvedNotes, melody, options);
}

function targetPartsForPreset(score: ScoreModel, presetId: string) {
  if (presetId === 'big_band') {
    return score.parts.filter(
      (p) => p.id === 'style_transfer_bb_comp' || p.instrumentIdentity === 'piano'
    );
  }
  if (presetId === 'string_quartet') {
    return score.parts.filter((p) => /violin|viola|cello|sq_/i.test(p.id));
  }
  return score.parts.filter((p) => p.instrumentIdentity === 'clean_electric_guitar');
}

export function applyChordMelodyToScore(
  score: ScoreModel,
  resolvedNotes: readonly ResolvedChordMelodyNote[],
  melody: readonly ImportMelodyNote[],
  presetId: string
): ScoreModel {
  const out = structuredClone(score) as ScoreModel;
  const parts = targetPartsForPreset(out, presetId);
  if (parts.length === 0) return out;

  const byBar = new Map<number, ResolvedChordMelodyNote[]>();
  for (const r of resolvedNotes) {
    const list = byBar.get(r.bar) ?? [];
    list.push(r);
    byBar.set(r.bar, list);
  }

  for (const [bar, notes] of byBar) {
    const strong = notes.filter((n) => isStrongBeat(n.onsetBeat));
    const barPick = strong[0] ?? notes[0];
    const barSymbol = barPick ? harmonySymbolForResolved(barPick) : undefined;
    for (const part of parts) {
      let measure = part.measures.find((m) => m.index === bar);
      if (!measure) {
        measure = { index: bar, events: [] };
        part.measures.push(measure);
      }
      if (barSymbol) {
        measure.chord = barSymbol;
        measure.chordSymbol = barSymbol;
      }
    }
  }

  const resolvedByOnset = new Map<string, ResolvedChordMelodyNote>();
  for (const r of resolvedNotes) {
    resolvedByOnset.set(`${r.bar}:${r.onsetBeat.toFixed(4)}`, r);
  }

  for (const mel of melody) {
    const resolved =
      resolvedByOnset.get(`${mel.bar}:${mel.onsetBeat.toFixed(4)}`) ??
      resolvedNotes.find((r) => r.bar === mel.bar && Math.abs(r.onsetBeat - mel.onsetBeat) < 0.02);
    if (!resolved) continue;

    let stack =
      resolved.exportStackMidis.length > 0 ? [...resolved.exportStackMidis] : [mel.midiPitch];
    if (!stack.includes(mel.midiPitch)) stack.push(mel.midiPitch);
    stack.sort((a, b) => a - b);
    resolved.blockVoicingMidis = resolved.innerVoicingMidis;

    for (const part of parts) {
      let measure = part.measures.find((m) => m.index === mel.bar);
      if (!measure) {
        measure = { index: mel.bar, events: [] };
        part.measures.push(measure);
      }

      measure.events = measure.events.filter(
        (e) =>
          !(
            (e.kind === 'note' || e.kind === 'chord') &&
            Math.abs(e.startBeat - mel.onsetBeat) < 0.02
          )
      );

      const symbol = harmonySymbolForResolved(resolved);
      if (stack.length === 1) {
        measure.events.push({
          kind: 'note',
          pitch: mel.midiPitch,
          startBeat: mel.onsetBeat,
          duration: mel.durationBeats,
          voice: 1,
        });
      } else {
        measure.events.push({
          kind: 'chord',
          pitches: stack,
          startBeat: mel.onsetBeat,
          duration: mel.durationBeats,
          voice: 1,
          chordSymbol: symbol,
        });
      }

      measure.events.sort((a, b) => a.startBeat - b.startBeat);
    }
  }

  for (const part of parts) {
    part.measures.sort((a, b) => a.index - b.index);
  }
  return out;
}

export function assertMelodyIsTopOfStack(resolved: ResolvedChordMelodyNote, melodyMidi: number): boolean {
  if (resolved.exportStackMidis.length === 0) return false;
  return Math.max(...resolved.exportStackMidis) === melodyMidi;
}

export function isDrop2Voicing(resolved: ResolvedChordMelodyNote, melodyMidi: number): boolean {
  const inner = resolved.innerVoicingMidis;
  if (inner.length < 2) return false;
  if (resolved.voicingFingerprint.includes(':drop2:')) return true;
  return isDrop2InnerSpacing(melodyMidi, [...inner].sort((a, b) => a - b));
}

export function ladderRungHitRate(resolvedNotes: readonly ResolvedChordMelodyNote[]): number {
  const voiced = resolvedNotes.filter((r) => r.phrasingRole !== 'single' && r.exportStackMidis.length > 0);
  if (voiced.length === 0) return 0;
  const hits = voiced.filter((r) => r.ladderHit === true).length;
  return hits / voiced.length;
}

export function dim7ParticipationRate(resolvedNotes: readonly ResolvedChordMelodyNote[]): number {
  const voiced = resolvedNotes.filter((r) => r.exportStackMidis.length > 0);
  if (voiced.length === 0) return 0;
  const dim = voiced.filter((r) => r.voicingChordColour === 'dim7').length;
  return dim / voiced.length;
}

export function maxConsecutiveIdenticalFingerprints(resolvedNotes: readonly ResolvedChordMelodyNote[]): number {
  const ordered = [...resolvedNotes].sort((a, b) => a.bar - b.bar || a.onsetBeat - b.onsetBeat);
  let max = 0;
  let run = 0;
  let prev: string | null = null;
  for (const r of ordered) {
    const fp = r.voicingFingerprint;
    if (fp === prev) {
      run++;
    } else {
      run = 1;
      prev = fp;
    }
    max = Math.max(max, run);
  }
  return max;
}

export function chordMelodyVoiceLeadingScore(resolvedNotes: readonly ResolvedChordMelodyNote[]): number {
  const ordered = [...resolvedNotes].sort((a, b) => a.bar - b.bar || a.onsetBeat - b.onsetBeat);
  if (ordered.length < 2) return 10;

  let totalCost = 0;
  let transitions = 0;
  for (let i = 1; i < ordered.length; i++) {
    const prev = ordered[i - 1]!;
    const curr = ordered[i]!;
    if (prev.phrasingRole === 'single' || curr.phrasingRole === 'single') continue;
    const cost = curr.voiceLeadingCost;
    if (cost != null) {
      totalCost += cost;
      transitions++;
      continue;
    }
    const prevInner = prev.innerVoicingMidis;
    const currInner = curr.innerVoicingMidis;
    if (prevInner.length === 0 || currInner.length === 0) continue;
    totalCost += innerVoiceCost(prevInner, currInner);
    transitions++;
  }

  if (transitions === 0) return 10;
  const avg = totalCost / transitions;
  return Math.max(0, Math.min(10, 10 - avg));
}
