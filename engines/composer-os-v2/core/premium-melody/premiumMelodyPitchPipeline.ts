/**
 * Premium-melody pitch pipeline (V87).
 */

import type { ImportMelodyNote } from '../import/mosaicImportTimeline';
import {
  chordTonesForChordSymbol,
  noteNameToPitchClass,
  parseChordSymbol,
} from '../harmony/chordSymbolAnalysis';
import type { PremiumMelodyProfile } from './premiumMelodyProfile';
import { mulberry32 } from './premiumMelodyPrng';
import { BEATS_PER_BAR } from './premiumMelodyCellLibrary';
import {
  detectPhraseRoles,
  indexInPhrase,
  isOffbeatOnset,
  isPremiumMelodyStrongBeat,
  isStructuralLandingIndex,
  phraseLengthAt,
  type PremiumMelodyPhraseRoles,
} from './premiumMelodyPhrase';
import type { PremiumMelodyExpressiveNote } from './enrichMelodyExpression';
import {
  chordFitVectorForSlot,
  mergeOptionalPitchOverlays,
  optionalPitchScoreMultiplier,
  runOptionalPitchPrePass,
} from './premiumMelodyOptionalPitchMechanisms';
import {
  assertValidPremiumMelodyPitchProfile,
  PREMIUM_MELODY_SURFACE_ORNAMENT_ORDER,
  type PremiumMelodyChordFitVector,
  type PremiumMelodyContourArc,
  type PremiumMelodyDurationBucket,
  type PremiumMelodyMetricalStrength,
  type PremiumMelodyNoteRoleKind,
  type PremiumMelodyPhrasePlannerConfig,
  type PremiumMelodyPhrasePositionKind,
  type PremiumMelodyPitchOrnamentAnnotations,
  type PremiumMelodyPitchProfile,
  type PremiumMelodyPitchSlotContext,
  type PremiumMelodyPitchSlotId,
  type PremiumMelodyPitchSlotList,
  type PremiumMelodyPitchTraceEvent,
  type PremiumMelodySignatureRuleId,
  type PremiumMelodySlotAccentKind,
  type PremiumMelodySlotScorerConfig,
  type PremiumMelodySurfaceOrnamentKind,
  type PremiumMelodySurfaceRulesConfig,
  type PremiumMelodyTieState,
  type PremiumMelodyTonalCenterMode,
} from './premiumMelodyPitchProfile';

function fnv1a32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function derivePremiumMelodyPitchSlotSeed(
  masterSeed: number,
  slotId: string,
  pitchSeedSalt: number
): number {
  return ((masterSeed ^ fnv1a32(slotId) ^ pitchSeedSalt) >>> 0);
}

export function derivePremiumMelodyPhrasePlanSeed(masterSeed: number, pitchSeedSalt: number): number {
  return ((masterSeed ^ fnv1a32('premium_melody_phrase_plan') ^ pitchSeedSalt) >>> 0);
}

export function derivePremiumMelodySurfaceOrnamentSeed(
  masterSeed: number,
  slotId: string,
  ornamentIndex: number,
  pitchSeedSalt: number
): number {
  return ((masterSeed ^ fnv1a32(`${slotId}:${ornamentIndex}`) ^ pitchSeedSalt) >>> 0);
}

function canonicalMelodySort(notes: readonly ImportMelodyNote[]): ImportMelodyNote[] {
  return [...notes].sort(
    (a, b) => a.bar - b.bar || a.onsetBeat - b.onsetBeat || a.midiPitch - b.midiPitch
  );
}

function buildSlotId(
  bar: number,
  onsetBeat: number,
  durationBeats: number,
  slotIndex: number
): PremiumMelodyPitchSlotId {
  return `${bar}:${onsetBeat.toFixed(4)}:${durationBeats.toFixed(4)}:${slotIndex}` as PremiumMelodyPitchSlotId;
}

function durationBucket(durationBeats: number): PremiumMelodyDurationBucket {
  if (durationBeats <= 0.25) return 'staccato';
  if (durationBeats <= 0.6) return 'eighth';
  if (durationBeats <= 1.1) return 'quarter';
  if (durationBeats <= 2.1) return 'half';
  if (durationBeats <= 3.5) return 'long';
  return 'rest_gap';
}

function metricalStrength(onsetBeat: number): PremiumMelodyMetricalStrength {
  if (isPremiumMelodyStrongBeat(onsetBeat)) return 'strong';
  if (isOffbeatOnset(onsetBeat)) return 'weak';
  return 'medium';
}

function harmonyRootPc(chordSymbol: string): number {
  const parsed = parseChordSymbol(chordSymbol);
  const rm = parsed.harmonyPart.match(/^([A-G](?:#|b)?)/i);
  if (!rm) return 0;
  return noteNameToPitchClass(rm[1]!) ?? 0;
}

function chordThirdPc(chordSymbol: string): number {
  const tones = chordTonesForChordSymbol(chordSymbol, { lockedHarmony: true });
  return ((tones.third % 12) + 12) % 12;
}

function tonalCenterPcForMode(
  mode: PremiumMelodyTonalCenterMode,
  chordSymbol: string,
  cadenceResolutionPc: number
): number {
  switch (mode) {
    case 'chord_root':
      return harmonyRootPc(chordSymbol);
    case 'chord_third':
      return chordThirdPc(chordSymbol);
    case 'mode_tonic':
      return harmonyRootPc(chordSymbol);
    case 'pedal_pc':
      return ((cadenceResolutionPc % 12) + 12) % 12;
    default: {
      const _exhaustive: never = mode;
      return harmonyRootPc(chordSymbol);
    }
  }
}

function phrasePositionKind(
  index: number,
  roles: PremiumMelodyPhraseRoles,
  ordered: readonly ImportMelodyNote[]
): PremiumMelodyPhrasePositionKind {
  if (roles.phraseStarts.has(index)) return 'phrase_start';
  if (roles.phraseEnds.has(index)) return 'phrase_cadence';
  const phraseIdx = indexInPhrase(ordered, index, roles);
  const phraseLen = phraseLengthAt(index, roles, ordered.length);
  if (phraseLen > 2 && phraseIdx === Math.floor(phraseLen * 0.55)) return 'phrase_peak';
  const prev = ordered[index - 1];
  const curr = ordered[index]!;
  if (prev && curr.bar > prev.bar + 1) return 'phrase_rest';
  const gap =
    curr.bar * BEATS_PER_BAR + curr.onsetBeat -
    (prev.bar * BEATS_PER_BAR + prev.onsetBeat + prev.durationBeats);
  if (gap >= 1.75) return 'phrase_rest';
  return 'phrase_interior';
}

function slotAccent(
  index: number,
  roles: PremiumMelodyPhraseRoles,
  onsetBeat: number
): PremiumMelodySlotAccentKind {
  if (isStructuralLandingIndex(index, roles)) return 'structural';
  if (roles.phraseEnds.has(index)) return 'cadential';
  if (isOffbeatOnset(onsetBeat)) return 'syncopated';
  return 'none';
}

function tieState(index: number, ordered: readonly ImportMelodyNote[]): PremiumMelodyTieState {
  const curr = ordered[index]!;
  const prev = ordered[index - 1];
  const next = ordered[index + 1];
  if (!prev || prev.midiPitch !== curr.midiPitch) return 'none';
  const prevEnd = prev.bar * BEATS_PER_BAR + prev.onsetBeat + prev.durationBeats;
  const currStart = curr.bar * BEATS_PER_BAR + curr.onsetBeat;
  if (currStart > prevEnd + 0.05) return 'none';
  const continues =
    next != null &&
    next.midiPitch === curr.midiPitch &&
    next.bar * BEATS_PER_BAR + next.onsetBeat <= currStart + curr.durationBeats + 0.05;
  if (continues && index > 0 && ordered[index - 1]!.midiPitch === curr.midiPitch) {
    return 'tie_continue';
  }
  if (continues) return 'tie_start';
  if (prev.midiPitch === curr.midiPitch) return 'tie_end';
  return 'none';
}

function noteRole(
  phrasePosition: PremiumMelodyPhrasePositionKind,
  bucket: PremiumMelodyDurationBucket
): PremiumMelodyNoteRoleKind {
  if (phrasePosition === 'phrase_rest' || bucket === 'rest_gap') return 'rest_placeholder';
  if (phrasePosition === 'phrase_start' || phrasePosition === 'phrase_cadence') return 'anchor';
  if (phrasePosition === 'phrase_peak') return 'appoggiatura_target';
  return 'passing';
}

type ChordFitRole =
  | 'root'
  | 'third'
  | 'fifth'
  | 'sixth'
  | 'seventh'
  | 'ninth'
  | 'eleventh'
  | 'thirteenth'
  | 'extension'
  | 'avoid';

function chordSixthPc(chordSymbol: string): number {
  const tones = chordTonesForChordSymbol(chordSymbol, { lockedHarmony: true });
  return (tones.root + 9) % 12;
}

function chordFitRole(midi: number, chordSymbol: string): ChordFitRole {
  const tones = chordTonesForChordSymbol(chordSymbol, { lockedHarmony: true });
  const pc = ((midi % 12) + 12) % 12;
  if (pc === tones.root % 12) return 'root';
  if (pc === tones.third % 12) return 'third';
  if (pc === tones.fifth % 12) return 'fifth';
  if (pc === chordSixthPc(chordSymbol)) return 'sixth';
  if (pc === tones.seventh % 12) return 'seventh';
  const ninth = (tones.root + 2) % 12;
  const eleventh = (tones.third + 2) % 12;
  const thirteenth = (tones.fifth + 2) % 12;
  if (pc === ninth) return 'ninth';
  if (pc === eleventh) return 'eleventh';
  if (pc === thirteenth) return 'thirteenth';
  if (pc === (tones.root + 1) % 12) return 'avoid';
  return 'extension';
}

function chordToneRank(midi: number, chordSymbol: string): number {
  const role = chordFitRole(midi, chordSymbol);
  switch (role) {
    case 'root':
      return 0;
    case 'third':
    case 'seventh':
      return 1;
    case 'fifth':
    case 'sixth':
    case 'ninth':
      return 2;
    case 'eleventh':
    case 'thirteenth':
    case 'extension':
      return 3;
    case 'avoid':
      return 4;
    default: {
      const _exhaustive: never = role;
      return 4;
    }
  }
}

function chordFitMultiplier(role: ChordFitRole, vector: PremiumMelodyChordFitVector): number {
  switch (role) {
    case 'root':
      return vector.root;
    case 'third':
      return vector.third;
    case 'fifth':
      return vector.fifth;
    case 'sixth':
      return vector.sixth ?? vector.extension;
    case 'seventh':
      return vector.seventh;
    case 'ninth':
      return vector.ninth;
    case 'eleventh':
      return vector.eleventh;
    case 'thirteenth':
      return vector.thirteenth;
    case 'extension':
      return vector.extension;
    case 'avoid':
      return vector.avoid;
    default: {
      const _exhaustive: never = role;
      return 1;
    }
  }
}

function isTonicMajorChordHeuristic(chordSymbol: string): boolean {
  const s = chordSymbol.replace(/\s/g, '');
  if (/maj6|maj69|maj7|maj9|maj11|MAJ7|MAJ9|Maj7|Maj9|\^|Δ/i.test(s)) return true;
  if (/^[A-G][#b]?6$/.test(s)) return true;
  if (/^[A-G][#b]?$/.test(s)) return true;
  if (/^[A-G][#b]?M(?!7|-)/.test(s)) return true;
  return false;
}

function isFunctionalChordHeuristic(chordSymbol: string): boolean {
  return !isTonicMajorChordHeuristic(chordSymbol);
}

function resolveActiveChordFitVector(
  scorer: PremiumMelodySlotScorerConfig,
  chordSymbol: string
): PremiumMelodyChordFitVector {
  if (scorer.chordFitVectorFunctional != null && scorer.chordFitVectorTonicMajor != null) {
    return isFunctionalChordHeuristic(chordSymbol)
      ? scorer.chordFitVectorFunctional
      : scorer.chordFitVectorTonicMajor;
  }
  return scorer.chordFitVector;
}

function pcCircleDistance(a: number, b: number): number {
  const d = Math.abs(((a % 12) + 12) % 12 - ((b % 12) + 12) % 12);
  return Math.min(d, 12 - d);
}

function nearestMidiToGuidePc(
  midi: number,
  guidePc: number,
  minMidi: number,
  maxMidi: number
): number {
  const octave = Math.floor(midi / 12);
  let best = midi;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let o = octave - 2; o <= octave + 2; o++) {
    const candidate = o * 12 + guidePc;
    if (candidate < minMidi || candidate > maxMidi) continue;
    const dist = Math.abs(candidate - midi);
    if (dist < bestDist) {
      bestDist = dist;
      best = candidate;
    }
  }
  return best;
}

function pitchV2AnyEnabled(pitchProfile: PremiumMelodyPitchProfile): boolean {
  return (
    pitchProfile.guideTone?.enabled === true ||
    pitchProfile.climaxArc?.enabled === true ||
    pitchProfile.approachPattern?.enabled === true
  );
}

function derivePitchV2PrePassSeed(normalizedSeed: number, pitchSeedSalt: number): number {
  return (normalizedSeed ^ fnv1a32('premium_melody_pitch_v2_prepass') ^ pitchSeedSalt) >>> 0;
}

function primaryGuideCandidates(chordSymbol: string): [number, number] {
  const thirdPc = chordThirdPc(chordSymbol);
  const seventhPc =
    ((chordTonesForChordSymbol(chordSymbol, { lockedHarmony: true }).seventh % 12) + 12) % 12;
  return [thirdPc, seventhPc];
}

function secondaryGuidePc(chordSymbol: string, primaryPc: number): number {
  const tones = chordTonesForChordSymbol(chordSymbol, { lockedHarmony: true });
  const root = tones.root % 12;
  const candidates = [chordSixthPc(chordSymbol), (root + 2) % 12, (tones.fifth + 2) % 12];
  let best = candidates[0]!;
  let bestDist = pcCircleDistance(primaryPc, best);
  for (let i = 1; i < candidates.length; i++) {
    const d = pcCircleDistance(primaryPc, candidates[i]!);
    if (d > bestDist) {
      bestDist = d;
      best = candidates[i]!;
    }
  }
  return best;
}

function optimizeGuideTonePrimaryLine(
  chordSymbols: readonly string[],
  startHintPc: number | null
): number[] {
  if (chordSymbols.length === 0) return [];
  const choices = chordSymbols.map((sym) => primaryGuideCandidates(sym));
  const dp: number[][] = [];
  for (let i = 0; i < choices.length; i++) {
    dp[i] = [0, 0];
    for (let j = 0; j < 2; j++) {
      const pc = choices[i]![j]!;
      if (i === 0) {
        dp[i]![j] = startHintPc != null ? pcCircleDistance(pc, startHintPc) : 0;
        continue;
      }
      let best = Number.POSITIVE_INFINITY;
      for (let k = 0; k < 2; k++) {
        const prevPc = choices[i - 1]![k]!;
        const leap = pcCircleDistance(prevPc, pc);
        const cost = leap + (leap > 4 ? 0.5 : 0);
        best = Math.min(best, dp[i - 1]![k]! + cost);
      }
      dp[i]![j] = best;
    }
  }
  const out: number[] = new Array(chordSymbols.length);
  let pick = dp[choices.length - 1]![0]! <= dp[choices.length - 1]![1]! ? 0 : 1;
  for (let i = choices.length - 1; i >= 0; i--) {
    out[i] = choices[i]![pick]!;
    if (i > 0) {
      let bestK = 0;
      let bestCost = Number.POSITIVE_INFINITY;
      for (let k = 0; k < 2; k++) {
        const prevPc = choices[i - 1]![k]!;
        const leap = pcCircleDistance(prevPc, out[i]!);
        const cost = dp[i - 1]![k]! + leap + (leap > 4 ? 0.5 : 0);
        if (cost < bestCost) {
          bestCost = cost;
          bestK = k;
        }
      }
      pick = bestK;
    }
  }
  return out;
}

type PitchV2SlotOverlay = {
  guideTonePc?: number;
  secondaryGuideTonePc?: number;
  idealPitchMidi?: number;
  climaxSlotIndex?: number;
  isApproachTarget?: boolean;
  approachWindowRole?: 'none' | 'intermediate' | 'target';
  approachTargetSlotIndex?: number;
  approachPatternOffsetSemitones?: number;
  isChordBoundary?: boolean;
};

type ApproachPatternKind =
  | 'half_step_below_short'
  | 'half_step_below_long'
  | 'enclosure_below_above_short'
  | 'enclosure_below_above_long'
  | 'enclosure_above_below'
  | 'diatonic_run';

function pickApproachPattern(rand: () => number, length: number): { offsets: number[] } {
  const lenRoll = rand();
  const L = lenRoll < 0.2 ? 2 : lenRoll < 0.7 ? 3 : 4;
  const useLen = Math.min(L, length);
  const kindRoll = rand();
  let kind: ApproachPatternKind;
  if (kindRoll < 0.4) {
    kind = rand() < 0.5 ? 'half_step_below_short' : 'half_step_below_long';
  } else if (kindRoll < 0.7) {
    kind = rand() < 0.5 ? 'enclosure_below_above_short' : 'enclosure_below_above_long';
  } else if (kindRoll < 0.9) {
    kind = 'enclosure_above_below';
  } else {
    kind = 'diatonic_run';
  }
  const patternMap: Record<ApproachPatternKind, number[]> = {
    half_step_below_short: [-1],
    half_step_below_long: [-3, -1],
    enclosure_below_above_short: [-1, 1],
    enclosure_below_above_long: [-1, -2],
    enclosure_above_below: [1, -1],
    diatonic_run: [-3, -2, -1],
  };
  let offsets = [...patternMap[kind]];
  if (offsets.length > useLen - 1) {
    offsets = offsets.slice(offsets.length - (useLen - 1));
  }
  while (offsets.length < useLen - 1) {
    offsets.unshift(offsets[0]! - 1);
  }
  return { offsets };
}

function runPitchV2PhrasePrePass(
  ordered: readonly ImportMelodyNote[],
  roles: PremiumMelodyPhraseRoles,
  slots: PremiumMelodyPitchSlotContext[],
  pitchProfile: PremiumMelodyPitchProfile,
  normalizedSeed: number,
  options?: PremiumMelodyPitchPipelineOptions
): PitchV2SlotOverlay[] {
  const overlays: PitchV2SlotOverlay[] = ordered.map(() => ({}));
  if (!pitchV2AnyEnabled(pitchProfile)) return overlays;

  const rand = mulberry32(derivePitchV2PrePassSeed(normalizedSeed, pitchProfile.pitchSeedSalt));
  const phraseStarts = [...roles.phraseStarts].sort((a, b) => a - b);

  for (let pi = 0; pi < phraseStarts.length; pi++) {
    const start = phraseStarts[pi]!;
    const end = pi + 1 < phraseStarts.length ? phraseStarts[pi + 1]! - 1 : ordered.length - 1;
    const phraseIndices: number[] = [];
    for (let i = start; i <= end; i++) phraseIndices.push(i);
    const N = phraseIndices.length;
    if (N === 0) continue;

    if (pitchProfile.guideTone?.enabled === true) {
      const frozenByBar = pitchProfile.guideTone.barPrimaryGuideTonePc;
      if (frozenByBar != null && Object.keys(frozenByBar).length > 0) {
        for (const idx of phraseIndices) {
          const bar = ordered[idx]!.bar;
          const primaryPc = frozenByBar[bar];
          if (primaryPc == null) continue;
          const sym = resolveHarmonySymbol(bar, options?.harmonyByBar);
          overlays[idx]!.guideTonePc = primaryPc;
          overlays[idx]!.secondaryGuideTonePc = secondaryGuidePc(sym, primaryPc);
        }
      } else {
      const chordSymbols: string[] = [];
      const chordStartIdx: number[] = [];
      for (const idx of phraseIndices) {
        const sym = resolveHarmonySymbol(ordered[idx]!.bar, options?.harmonyByBar);
        if (chordSymbols.length === 0 || chordSymbols[chordSymbols.length - 1] !== sym) {
          chordSymbols.push(sym);
          chordStartIdx.push(idx);
        }
      }
      const startHint =
        start > 0 ? ordered[start - 1]!.midiPitch % 12 : ordered[start]!.midiPitch % 12;
      const primaryLine = optimizeGuideTonePrimaryLine(chordSymbols, startHint);
      for (let ci = 0; ci < chordSymbols.length; ci++) {
        const sym = chordSymbols[ci]!;
        const primaryPc = primaryLine[ci]!;
        const secondaryPc = secondaryGuidePc(sym, primaryPc);
        const from = chordStartIdx[ci]!;
        const to = ci + 1 < chordStartIdx.length ? chordStartIdx[ci + 1]! - 1 : end;
        for (let idx = from; idx <= to; idx++) {
          overlays[idx]!.guideTonePc = primaryPc;
          overlays[idx]!.secondaryGuideTonePc = secondaryPc;
        }
      }
      }
    }

    if (pitchProfile.climaxArc?.enabled === true) {
      const jitter = rand() * 0.1 - 0.05;
      const cLocal = Math.max(0, Math.min(N - 1, Math.round((0.65 + jitter) * N)));
      const climaxGlobalIdx = phraseIndices[cLocal]!;
      const planner = pitchProfile.phrasePlanner;
      const R = (planner.registerMinMidi + planner.registerMaxMidi) / 2;
      const H = (planner.registerMaxMidi - planner.registerMinMidi) / 2;
      let phraseMin = Number.POSITIVE_INFINITY;
      for (const idx of phraseIndices) {
        phraseMin = Math.min(phraseMin, slots[idx]!.registerBandMinMidi);
      }
      for (let li = 0; li < phraseIndices.length; li++) {
        const idx = phraseIndices[li]!;
        const denom = Math.max(1, cLocal);
        const arc =
          cLocal === 0 ? R : R + H * (1 - Math.pow((li - cLocal) / denom, 2));
        let ideal = Math.round(
          Math.max(planner.registerMinMidi, Math.min(planner.registerMaxMidi, arc))
        );
        if (li === cLocal) {
          ideal = Math.max(ideal, Math.round(R + 6), Math.round(phraseMin + 9));
        }
        overlays[idx]!.idealPitchMidi = ideal;
        overlays[idx]!.climaxSlotIndex = climaxGlobalIdx;
      }
    }
  }

  for (let i = 0; i < ordered.length; i++) {
    const sym = resolveHarmonySymbol(ordered[i]!.bar, options?.harmonyByBar);
    const prevSym = i > 0 ? resolveHarmonySymbol(ordered[i - 1]!.bar, options?.harmonyByBar) : null;
    if (i === 0 || sym !== prevSym) {
      overlays[i]!.isChordBoundary = true;
    }
  }

  if (pitchProfile.approachPattern?.enabled === true) {
    const rate = pitchProfile.slotScorer.approachPatternRate ?? 0.6;
    for (let i = 0; i < ordered.length; i++) {
      if (!overlays[i]!.isChordBoundary) continue;
      if (slots[i]!.noteRole === 'rest_placeholder') continue;
      if (rand() >= rate) continue;
      const lenRoll = rand();
      const L = lenRoll < 0.2 ? 2 : lenRoll < 0.7 ? 3 : 4;
      const firstIntermediate = i - (L - 1);
      if (firstIntermediate < 0) continue;
      let valid = true;
      for (let j = firstIntermediate; j < i; j++) {
        if (slots[j]!.noteRole === 'rest_placeholder') {
          valid = false;
          break;
        }
      }
      if (!valid) continue;
      const { offsets } = pickApproachPattern(rand, L);
      for (let k = 0; k < offsets.length; k++) {
        const idx = i - offsets.length + k;
        if (overlays[idx]!.approachWindowRole === 'target') {
          valid = false;
          break;
        }
      }
      if (!valid) continue;
      overlays[i]!.approachWindowRole = 'target';
      overlays[i]!.isApproachTarget = true;
      overlays[i]!.approachTargetSlotIndex = i;
      for (let k = 0; k < offsets.length; k++) {
        const idx = i - offsets.length + k;
        overlays[idx]!.approachWindowRole = 'intermediate';
        overlays[idx]!.approachTargetSlotIndex = i;
        overlays[idx]!.approachPatternOffsetSemitones = offsets[k]!;
      }
    }
  }

  return overlays;
}

function intervalSemitones(a: number, b: number): number {
  return Math.abs(b - a);
}

function intervalWeight(
  semitones: number,
  table: PremiumMelodySlotScorerConfig['intervalPreference']
): number {
  const clamped = Math.min(12, Math.max(1, semitones));
  const key = clamped as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  return table[key] ?? (semitones >= 8 ? 0.4 : 1);
}

function contourTargetDeltaForArc(arc: PremiumMelodyContourArc, progress: number): number {
  const p = Math.max(0, Math.min(1, progress));
  switch (arc) {
    case 'arch':
      return Math.round(6 * Math.sin(p * Math.PI) - 3);
    case 'ascending':
      return Math.round(p * 5);
    case 'wave':
      return Math.round(3 * Math.sin(p * Math.PI * 2));
    case 'modal_float':
      return Math.round(2 * Math.sin(p * Math.PI * 0.75));
    case 'angular':
      return p > 0.45 && p < 0.55 ? 7 : Math.round(2 * Math.sin(p * Math.PI));
    case 'call_response_variation': {
      const segment = Math.min(3, Math.floor(p * 4));
      if (segment === 3) return 5;
      if (segment === 2) return 3;
      return segment % 2 === 0 ? -2 : 3;
    }
    default: {
      const _exhaustive: never = arc;
      return 0;
    }
  }
}

export interface PremiumMelodyPitchPipelineOptions {
  harmonyByBar?: Readonly<Record<number, string>>;
}

export interface PremiumMelodyPitchPipelineResult {
  pitchMelody: ImportMelodyNote[];
  slotList: PremiumMelodyPitchSlotList;
  pitchTrace: PremiumMelodyPitchTraceEvent[];
}

function resolveHarmonySymbol(bar: number, harmonyByBar?: Readonly<Record<number, string>>): string {
  return harmonyByBar?.[bar] ?? harmonyByBar?.[bar - 1] ?? 'Cmaj9';
}

interface PhrasePlanSlice {
  tonalCenterPc: number;
  registerBandMinMidi: number;
  registerBandMaxMidi: number;
  contourTargetDelta: number;
  cadenceTargetPc: number | null;
}

function planPremiumMelodyPhraseTargets(
  ordered: readonly ImportMelodyNote[],
  roles: PremiumMelodyPhraseRoles,
  planner: PremiumMelodyPhrasePlannerConfig,
  normalizedSeed: number,
  pitchSeedSalt: number,
  options?: PremiumMelodyPitchPipelineOptions
): PhrasePlanSlice[] {
  const rand = mulberry32(derivePremiumMelodyPhrasePlanSeed(normalizedSeed, pitchSeedSalt));
  const out: PhrasePlanSlice[] = [];

  for (let index = 0; index < ordered.length; index++) {
    const note = ordered[index]!;
    const chordSymbol = resolveHarmonySymbol(note.bar, options?.harmonyByBar);
    const phraseIdx = indexInPhrase(ordered, index, roles);
    const phraseLen = phraseLengthAt(index, roles, ordered.length);
    const progress = phraseLen > 1 ? phraseIdx / (phraseLen - 1) : 0;
    const tonalCenterPc = tonalCenterPcForMode(
      planner.tonalCenterMode,
      chordSymbol,
      planner.cadenceResolutionPc
    );

    let cadenceTargetPc: number | null = null;
    if (roles.phraseEnds.has(index)) {
      const thirdPc = chordThirdPc(chordSymbol);
      const seventhPc =
        ((chordTonesForChordSymbol(chordSymbol, { lockedHarmony: true }).seventh % 12) + 12) % 12;
      const prevPitch = index > 0 ? ordered[index - 1]!.midiPitch : note.midiPitch;
      cadenceTargetPc =
        Math.abs((prevPitch % 12) - thirdPc) <= Math.abs((prevPitch % 12) - seventhPc)
          ? thirdPc
          : seventhPc;
    }

    const registerJitter = Math.floor(rand() * 3) - 1;
    out.push({
      tonalCenterPc,
      registerBandMinMidi: Math.max(0, planner.registerMinMidi + registerJitter),
      registerBandMaxMidi: Math.min(127, planner.registerMaxMidi + registerJitter),
      contourTargetDelta: contourTargetDeltaForArc(planner.contourArc, progress),
      cadenceTargetPc,
    });
  }
  return out;
}

export function buildPremiumMelodyPitchSlotList(
  rhythmMelody: readonly ImportMelodyNote[],
  pitchProfile: PremiumMelodyPitchProfile,
  profile: PremiumMelodyProfile,
  normalizedSeed: number,
  options?: PremiumMelodyPitchPipelineOptions
): PremiumMelodyPitchSlotList {
  const ordered = canonicalMelodySort(rhythmMelody);
  const roles = detectPhraseRoles(ordered, {
    restPhraseBreakBeats: profile.restPhraseBreakBeats,
    longNotePhraseBreakBeats: profile.longNotePhraseBreakBeats,
  });
  const planned = planPremiumMelodyPhraseTargets(
    ordered,
    roles,
    pitchProfile.phrasePlanner,
    normalizedSeed,
    pitchProfile.pitchSeedSalt,
    options
  );

  const slots: PremiumMelodyPitchSlotContext[] = [];
  for (let slotIndex = 0; slotIndex < ordered.length; slotIndex++) {
    const note = ordered[slotIndex]!;
    const chordSymbol = resolveHarmonySymbol(note.bar, options?.harmonyByBar);
    const durBucket = durationBucket(note.durationBeats);
    const phrasePos = phrasePositionKind(slotIndex, roles, ordered);
    const plan = planned[slotIndex]!;

    slots.push({
      slotId: buildSlotId(note.bar, note.onsetBeat, note.durationBeats, slotIndex),
      slotIndex,
      bar: note.bar,
      onsetBeat: note.onsetBeat,
      durationBeats: note.durationBeats,
      metricalStrength: metricalStrength(note.onsetBeat),
      durationBucket: durBucket,
      accent: slotAccent(slotIndex, roles, note.onsetBeat),
      phrasePosition: phrasePos,
      tieState: tieState(slotIndex, ordered),
      noteRole: noteRole(phrasePos, durBucket),
      harmonyChordSymbol: chordSymbol,
      harmonyRootPc: harmonyRootPc(chordSymbol),
      tonalCenterPc: plan.tonalCenterPc,
      registerBandMinMidi: plan.registerBandMinMidi,
      registerBandMaxMidi: plan.registerBandMaxMidi,
      contourTargetDelta: plan.contourTargetDelta,
      cadenceTargetPc: plan.cadenceTargetPc,
      importMidiPitch: note.midiPitch,
    });
  }

  const v2Overlays = runPitchV2PhrasePrePass(
    ordered,
    roles,
    slots,
    pitchProfile,
    normalizedSeed,
    options
  );
  for (let slotIndex = 0; slotIndex < slots.length; slotIndex++) {
    const overlay = v2Overlays[slotIndex]!;
    const slot = slots[slotIndex]!;
    if (overlay.guideTonePc != null) slot.guideTonePc = overlay.guideTonePc;
    if (overlay.secondaryGuideTonePc != null) slot.secondaryGuideTonePc = overlay.secondaryGuideTonePc;
    if (overlay.idealPitchMidi != null) slot.idealPitchMidi = overlay.idealPitchMidi;
    if (overlay.climaxSlotIndex != null) slot.climaxSlotIndex = overlay.climaxSlotIndex;
    if (overlay.isApproachTarget != null) slot.isApproachTarget = overlay.isApproachTarget;
    if (overlay.approachWindowRole != null) slot.approachWindowRole = overlay.approachWindowRole;
    if (overlay.approachTargetSlotIndex != null) {
      slot.approachTargetSlotIndex = overlay.approachTargetSlotIndex;
    }
    if (overlay.approachPatternOffsetSemitones != null) {
      slot.approachPatternOffsetSemitones = overlay.approachPatternOffsetSemitones;
    }
    if (overlay.isChordBoundary != null) slot.isChordBoundary = overlay.isChordBoundary;
  }

  const optionalOverlays = runOptionalPitchPrePass(
    ordered,
    roles,
    slots,
    pitchProfile,
    normalizedSeed
  );
  mergeOptionalPitchOverlays(slots, optionalOverlays);

  return slots;
}

function passesHardFilters(
  midi: number,
  prevMidi: number | null,
  slot: PremiumMelodyPitchSlotContext,
  scorer: PremiumMelodySlotScorerConfig,
  pitchProfile?: PremiumMelodyPitchProfile
): boolean {
  if (midi < slot.registerBandMinMidi || midi > slot.registerBandMaxMidi) return false;
  let maxLeap = scorer.maxLeapSemitones;
  if (
    pitchProfile?.climaxArc?.enabled === true &&
    slot.climaxSlotIndex != null &&
    slot.slotIndex <= slot.climaxSlotIndex &&
    slot.climaxSlotIndex - slot.slotIndex <= 1
  ) {
    maxLeap = Math.min(maxLeap, pitchProfile.climaxArc.climaxMaxLeapSemitones ?? 5);
  }
  if (prevMidi != null && intervalSemitones(prevMidi, midi) > maxLeap) return false;
  if (chordFitRole(midi, slot.harmonyChordSymbol) === 'avoid') return false;
  if (slot.approachWindowRole === 'intermediate' && slot.guideTonePc != null) {
    const guideMidi = nearestMidiToGuidePc(
      midi,
      slot.guideTonePc,
      slot.registerBandMinMidi,
      slot.registerBandMaxMidi
    );
    if (Math.abs(midi - guideMidi) > 7) return false;
  }
  return true;
}

function enumerateCandidates(
  slot: PremiumMelodyPitchSlotContext,
  scorer: PremiumMelodySlotScorerConfig,
  prevMidi: number | null,
  globalMin: number,
  globalMax: number,
  pitchProfile?: PremiumMelodyPitchProfile
): { midi: number; chordToneRank: number }[] {
  const candidateMinMidi = Math.max(slot.registerBandMinMidi, globalMin);
  const candidateMaxMidi = Math.min(slot.registerBandMaxMidi, globalMax);
  const raw: { midi: number; chordToneRank: number }[] = [];

  for (let midi = candidateMinMidi; midi <= candidateMaxMidi; midi++) {
    if (!passesHardFilters(midi, prevMidi, slot, scorer, pitchProfile)) continue;
    const rank = chordToneRank(midi, slot.harmonyChordSymbol);
    if (rank === 4) continue;
    raw.push({ midi, chordToneRank: rank });
  }

  if (!raw.some((c) => c.chordToneRank <= 3)) {
    for (let midi = candidateMinMidi; midi <= candidateMaxMidi; midi++) {
      if (!passesHardFilters(midi, prevMidi, slot, scorer, pitchProfile)) continue;
      raw.push({ midi, chordToneRank: chordToneRank(midi, slot.harmonyChordSymbol) });
    }
  }

  raw.sort((a, b) => a.chordToneRank - b.chordToneRank || a.midi - b.midi);
  return raw;
}

function composerRuleMultiplier(
  midi: number,
  prevMidi: number | null,
  slot: PremiumMelodyPitchSlotContext,
  signatureRules: PremiumMelodySignatureRuleId[]
): number {
  if (prevMidi == null) return 1;
  let mult = 1;
  const interval = intervalSemitones(prevMidi, midi);
  const currPc = midi % 12;

  if (signatureRules.includes('be_voice_leading' as PremiumMelodySignatureRuleId)) {
    if (interval === 5 || interval === 7) mult *= 0.2;
    const thirdPc = chordThirdPc(slot.harmonyChordSymbol);
    const seventhPc =
      ((chordTonesForChordSymbol(slot.harmonyChordSymbol, { lockedHarmony: true }).seventh % 12) + 12) %
      12;
    if (interval <= 2 && (currPc === thirdPc || currPc === seventhPc)) mult *= 1.35;
  }

  if (signatureRules.includes('ws_modal_pivot' as PremiumMelodySignatureRuleId)) {
    if (slot.metricalStrength === 'weak' && interval >= 6) {
      const modePcs = [
        (slot.tonalCenterPc + 3) % 12,
        (slot.tonalCenterPc + 4) % 12,
        (slot.tonalCenterPc + 8) % 12,
      ];
      if (modePcs.includes(currPc)) mult *= 1.45;
    }
    if (slot.metricalStrength === 'strong' && interval <= 2) mult *= 0.85;
  }

  return mult;
}

function scoreCandidate(
  midi: number,
  prevMidi: number | null,
  slot: PremiumMelodyPitchSlotContext,
  scorer: PremiumMelodySlotScorerConfig,
  signatureRules: PremiumMelodySignatureRuleId[],
  leapRecoveryActive: boolean,
  options?: { approachIdealMidi?: number; pitchProfile?: PremiumMelodyPitchProfile }
): number {
  const interval = prevMidi != null ? intervalSemitones(prevMidi, midi) : 1;
  const intervalFactor = intervalWeight(interval, scorer.intervalPreference);

  let prevIntervalFactor = 1;
  if (prevMidi != null && leapRecoveryActive && interval <= 2) prevIntervalFactor = 1.3;

  const role = chordFitRole(midi, slot.harmonyChordSymbol);
  const activeChordFit =
    slot.phraseModeChordFit != null
      ? chordFitVectorForSlot(scorer, slot.phraseModeChordFit)
      : resolveActiveChordFitVector(scorer, slot.harmonyChordSymbol);
  const chordFit = chordFitMultiplier(role, activeChordFit);

  let metric = 1;
  if (slot.metricalStrength === 'strong' && interval <= 2) metric *= 1.2;
  if (slot.metricalStrength === 'weak' && (role === 'third' || role === 'seventh')) metric *= 1.15;

  const midRegister = (slot.registerBandMinMidi + slot.registerBandMaxMidi) / 2;
  const rangeDist =
    Math.abs(midi - midRegister) / Math.max(1, slot.registerBandMaxMidi - slot.registerBandMinMidi);
  const range = 1.1 - rangeDist * 0.3;

  let contour = 1;
  if (prevMidi != null) {
    const delta = midi - prevMidi;
    if (Math.abs(delta - slot.contourTargetDelta) <= 1) contour *= 1.25;
    if (slot.cadenceTargetPc != null) {
      const pc = midi % 12;
      const cadenceDist = Math.min(
        Math.abs(pc - slot.cadenceTargetPc),
        12 - Math.abs(pc - slot.cadenceTargetPc)
      );
      if (cadenceDist <= 2) contour *= 1.5;
    }
  }

  const composerRules = composerRuleMultiplier(midi, prevMidi, slot, signatureRules);
  const contourWeight = scorer.localContourWeight ?? scorer.weightContour;

  const guideToneCfg = options?.pitchProfile?.guideTone;
  const sigma = guideToneCfg?.proximitySigma ?? 2;
  const hitPrimary = guideToneCfg?.hitBonusPrimary ?? 1.5;
  const hitSecondary = guideToneCfg?.hitBonusSecondary ?? 1.3;

  let guideToneProximity = 1;
  if (scorer.weightGuideToneProximity != null && slot.guideTonePc != null) {
    const guideMidi = nearestMidiToGuidePc(
      midi,
      slot.guideTonePc,
      slot.registerBandMinMidi,
      slot.registerBandMaxMidi
    );
    guideToneProximity = Math.exp(-Math.pow(midi - guideMidi, 2) / (2 * sigma * sigma));
  }

  let guideToneHit = 1;
  if (slot.guideTonePc != null && scorer.weightGuideToneProximity != null) {
    const pc = ((midi % 12) + 12) % 12;
    if (pc === slot.guideTonePc) guideToneHit = hitPrimary;
    else if (slot.secondaryGuideTonePc != null && pc === slot.secondaryGuideTonePc) guideToneHit = hitSecondary;
  }

  let climaxColorTone = 1;
  const climaxCfg = options?.pitchProfile?.climaxArc;
  if (
    climaxCfg?.colorToneBiasEnabled === true &&
    slot.climaxSlotIndex != null &&
    slot.slotIndex === slot.climaxSlotIndex &&
    slot.guideTonePc != null &&
    (role === 'ninth' || role === 'thirteenth')
  ) {
    const guideMidi = nearestMidiToGuidePc(
      midi,
      slot.guideTonePc,
      slot.registerBandMinMidi,
      slot.registerBandMaxMidi
    );
    const window = climaxCfg.colorToneProximitySemitones ?? 2;
    if (Math.abs(midi - guideMidi) <= window) climaxColorTone = 1.35;
  }

  let targetChordTone = 1;
  if (slot.isApproachTarget === true) {
    if (role === 'third' || role === 'seventh' || role === 'ninth' || role === 'thirteenth') {
      targetChordTone = 1.4;
    } else if (role === 'root' || role === 'fifth') {
      targetChordTone = 1.1;
    }
  }

  let phraseArc = 1;
  if (scorer.weightPhraseArc != null && slot.idealPitchMidi != null) {
    phraseArc = Math.exp(-Math.pow(midi - slot.idealPitchMidi, 2) / (2 * 3 * 3));
    if (
      slot.climaxSlotIndex != null &&
      slot.slotIndex > slot.climaxSlotIndex &&
      midi > slot.idealPitchMidi
    ) {
      phraseArc *= 0.85;
    }
  }

  if (options?.approachIdealMidi != null) {
    const dist = Math.abs(midi - options.approachIdealMidi);
    phraseArc *= Math.exp(-(dist * dist) / (2 * 1.5 * 1.5));
  }

  let product =
    Math.pow(intervalFactor, scorer.weightInterval) *
    Math.pow(prevIntervalFactor, scorer.weightPrevInterval) *
    Math.pow(chordFit, scorer.weightChordFit) *
    Math.pow(metric, scorer.weightMetric) *
    Math.pow(range, scorer.weightRange) *
    Math.pow(contour, contourWeight) *
    Math.pow(composerRules, scorer.weightComposerRules);

  if (scorer.weightGuideToneProximity != null) {
    product *= Math.pow(guideToneProximity, scorer.weightGuideToneProximity) * guideToneHit * climaxColorTone;
  }
  if (slot.isApproachTarget === true && scorer.approachPatternRate != null) {
    product *= targetChordTone;
  }
  if (scorer.weightPhraseArc != null) {
    product *= Math.pow(phraseArc, scorer.weightPhraseArc);
  }

  const pitchProfile = options?.pitchProfile;
  if (pitchProfile != null) {
    product *= optionalPitchScoreMultiplier(midi, prevMidi, slot, pitchProfile);
  }

  return product;
}

function weightedPickMidi(
  candidates: readonly { midi: number; score: number }[],
  temperature: number,
  rand: () => number
): { midi: number; rank: number; topScore: number } {
  const scored = [...candidates].sort((a, b) => b.score - a.score);
  const topScore = scored[0]!.score;
  const invTemp = 1 / Math.max(0.01, temperature);
  let total = 0;
  const weights = scored.map((c) => {
    const w = Math.pow(Math.max(c.score, 1e-6), invTemp);
    total += w;
    return w;
  });
  let r = rand() * total;
  for (let i = 0; i < scored.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return { midi: scored[i]!.midi, rank: i, topScore };
  }
  return { midi: scored[scored.length - 1]!.midi, rank: scored.length - 1, topScore };
}

function fallbackMidi(
  slot: PremiumMelodyPitchSlotContext,
  scorer: PremiumMelodySlotScorerConfig,
  pitchProfile?: PremiumMelodyPitchProfile
): number {
  const candidates = enumerateCandidates(
    slot,
    scorer,
    null,
    slot.registerBandMinMidi,
    slot.registerBandMaxMidi,
    pitchProfile
  );
  const rank0 = candidates.find((c) => c.chordToneRank === 0);
  if (rank0) return rank0.midi;
  const tonalMidi = Math.max(
    slot.registerBandMinMidi,
    Math.min(slot.registerBandMaxMidi, slot.registerBandMinMidi + slot.tonalCenterPc)
  );
  return candidates.length > 0 ? candidates[0]!.midi : tonalMidi;
}

function pickSlotMidi(
  note: ImportMelodyNote,
  slot: PremiumMelodyPitchSlotContext,
  prevMidi: number | null,
  leapRecoverySlots: number,
  pitchProfile: PremiumMelodyPitchProfile,
  normalizedSeed: number,
  constraints?: {
    approachIdealMidi?: number;
    minMidi?: number;
    maxMidi?: number;
    barGuideState?: { exactHits: number; noteCount: number };
  }
): {
  chosenMidi: number;
  chosenRank: number;
  topScore: number;
  candidateCount: number;
} {
  const scorer = pitchProfile.slotScorer;
  const globalMin = pitchProfile.phrasePlanner.registerMinMidi;
  const globalMax = pitchProfile.phrasePlanner.registerMaxMidi;

  if (slot.noteRole === 'rest_placeholder') {
    return {
      chosenMidi: note.midiPitch,
      chosenRank: 0,
      topScore: 0,
      candidateCount: 0,
    };
  }

  const leapRecoveryActive = leapRecoverySlots > 0;
  let candidates = enumerateCandidates(
    slot,
    scorer,
    prevMidi,
    globalMin,
    globalMax,
    pitchProfile
  );
  if (constraints?.minMidi != null) {
    candidates = candidates.filter((c) => c.midi >= constraints.minMidi!);
  }
  if (constraints?.maxMidi != null) {
    candidates = candidates.filter((c) => c.midi <= constraints.maxMidi!);
  }
  const maxGuideRate = pitchProfile.guideTone?.maxExactHitRatePerBar;
  if (maxGuideRate != null && slot.guideTonePc != null && slot.noteRole !== 'rest_placeholder') {
    const barState = constraints?.barGuideState;
    const barNotes = barState?.noteCount ?? 0;
    const barHits = barState?.exactHits ?? 0;
    candidates = candidates.filter((c) => {
      const pc = ((c.midi % 12) + 12) % 12;
      if (pc !== slot.guideTonePc) return true;
      return (barHits + 1) / (barNotes + 1) <= maxGuideRate + 1e-9;
    });
  }
  const minGuideRate = pitchProfile.guideTone?.minExactHitRatePerBar;
  if (minGuideRate != null && slot.guideTonePc != null && slot.noteRole !== 'rest_placeholder') {
    const barState = constraints?.barGuideState;
    const barNotes = barState?.noteCount ?? 0;
    const barHits = barState?.exactHits ?? 0;
    const projectedNotes = barNotes + 1;
    const minHitsNeeded = Math.ceil(minGuideRate * projectedNotes - 1e-9);
    candidates = candidates.filter((c) => {
      const pc = ((c.midi % 12) + 12) % 12;
      const projectedHits = barHits + (pc === slot.guideTonePc ? 1 : 0);
      if (projectedHits >= minHitsNeeded) return true;
      return pc === slot.guideTonePc;
    });
  }
  const candidateCount = candidates.length;

  if (candidateCount === 0) {
    return {
      chosenMidi: fallbackMidi(slot, scorer, pitchProfile),
      chosenRank: 0,
      topScore: 0,
      candidateCount: 0,
    };
  }

  const rand = mulberry32(
    derivePremiumMelodyPitchSlotSeed(normalizedSeed, slot.slotId, pitchProfile.pitchSeedSalt)
  );
  const scored = candidates.map((c) => ({
    midi: c.midi,
    score: scoreCandidate(
      c.midi,
      prevMidi,
      slot,
      scorer,
      pitchProfile.signatureRules,
      leapRecoveryActive,
      {
        ...(constraints?.approachIdealMidi != null ? { approachIdealMidi: constraints.approachIdealMidi } : {}),
        pitchProfile,
      }
    ),
  }));
  const pick = weightedPickMidi(scored, scorer.temperature, rand);
  return {
    chosenMidi: pick.midi,
    chosenRank: pick.rank,
    topScore: pick.topScore,
    candidateCount,
  };
}

function isPrimaryGuideToneHit(slot: PremiumMelodyPitchSlotContext, midi: number): boolean {
  if (slot.guideTonePc == null) return false;
  return ((midi % 12) + 12) % 12 === slot.guideTonePc;
}

function forceGuideTonePick(
  ordered: readonly ImportMelodyNote[],
  slot: PremiumMelodyPitchSlotContext,
  slots: PremiumMelodyPitchSlotList,
  picks: Array<ReturnType<typeof pickSlotMidi> | undefined>,
  slotIndex: number,
  pitchProfile: PremiumMelodyPitchProfile,
  normalizedSeed: number,
  extra?: { minMidi?: number; maxMidi?: number; ignoreLeap?: boolean }
): ReturnType<typeof pickSlotMidi> | null {
  let chainPrev: number | null = null;
  for (let j = slotIndex - 1; j >= 0; j--) {
    if (picks[j] != null) {
      chainPrev = picks[j]!.chosenMidi;
      break;
    }
  }
  const prevForFilter = extra?.ignoreLeap === true ? null : chainPrev;
  const scorer = pitchProfile.slotScorer;
  let candidates = enumerateCandidates(
    slot,
    scorer,
    prevForFilter,
    pitchProfile.phrasePlanner.registerMinMidi,
    pitchProfile.phrasePlanner.registerMaxMidi,
    pitchProfile
  ).filter((c) => isPrimaryGuideToneHit(slot, c.midi));
  if (extra?.minMidi != null) candidates = candidates.filter((c) => c.midi >= extra.minMidi!);
  if (extra?.maxMidi != null) candidates = candidates.filter((c) => c.midi <= extra.maxMidi!);
  const refMidi =
    chainPrev ??
    slot.idealPitchMidi ??
    ordered[slotIndex]?.midiPitch ??
    Math.round((slot.registerBandMinMidi + slot.registerBandMaxMidi) / 2);
  if (candidates.length === 0 && slot.guideTonePc != null) {
    const pc = slot.guideTonePc;
    const minM = Math.max(
      slot.registerBandMinMidi,
      pitchProfile.phrasePlanner.registerMinMidi,
      extra?.minMidi ?? Number.NEGATIVE_INFINITY
    );
    const maxM = Math.min(
      slot.registerBandMaxMidi,
      pitchProfile.phrasePlanner.registerMaxMidi,
      extra?.maxMidi ?? Number.POSITIVE_INFINITY
    );
    let fallback: number | null = null;
    let fallbackDist = Number.POSITIVE_INFINITY;
    for (let midi = minM; midi <= maxM; midi++) {
      if (((midi % 12) + 12) % 12 !== pc) continue;
      const dist = Math.abs(midi - refMidi);
      if (dist < fallbackDist) {
        fallbackDist = dist;
        fallback = midi;
      }
    }
    if (fallback != null) {
      return {
        chosenMidi: fallback,
        chosenRank: 0,
        topScore: 0,
        candidateCount: 1,
      };
    }
    return null;
  }
  if (candidates.length === 0) return null;

  let chosen = candidates[0]!.midi;
  let bestDist = Math.abs(chosen - refMidi);
  for (const c of candidates) {
    const dist = Math.abs(c.midi - refMidi);
    if (dist < bestDist) {
      bestDist = dist;
      chosen = c.midi;
    }
  }
  return {
    chosenMidi: chosen,
    chosenRank: 0,
    topScore: 0,
    candidateCount: candidates.length,
  };
}

function countPrimaryGuideToneHits(
  slots: PremiumMelodyPitchSlotList,
  picks: Array<ReturnType<typeof pickSlotMidi> | undefined>
): number {
  let hits = 0;
  for (const slot of slots) {
    if (slot.guideTonePc == null || slot.noteRole === 'rest_placeholder') continue;
    const pick = picks[slot.slotIndex];
    if (pick != null && isPrimaryGuideToneHit(slot, pick.chosenMidi)) hits++;
  }
  return hits;
}

function repairGuideToneHitBand(
  ordered: readonly ImportMelodyNote[],
  slots: PremiumMelodyPitchSlotList,
  picks: Array<ReturnType<typeof pickSlotMidi> | undefined>,
  pitchProfile: PremiumMelodyPitchProfile,
  normalizedSeed: number
): void {
  const guideCfg = pitchProfile.guideTone;
  if (guideCfg?.enabled !== true) return;

  const eligible = slots.filter(
    (s) => s.guideTonePc != null && s.noteRole !== 'rest_placeholder'
  );
  const total = eligible.length;
  if (total === 0) return;

  const globalMin = guideCfg.targetGlobalExactHitRateMin ?? guideCfg.minExactHitRatePerBar ?? 0.6;
  const globalMax = guideCfg.targetGlobalExactHitRateMax ?? guideCfg.maxExactHitRatePerBar ?? 0.7;
  const minHits = Math.ceil(globalMin * total - 1e-9);
  const maxHits = Math.floor(globalMax * total + 1e-9);

  const byBar = new Map<number, PremiumMelodyPitchSlotContext[]>();
  for (const slot of eligible) {
    const list = byBar.get(slot.bar) ?? [];
    list.push(slot);
    byBar.set(slot.bar, list);
  }

  for (const barSlots of byBar.values()) {
    const barHits = barSlots.filter(
      (s) => picks[s.slotIndex] != null && isPrimaryGuideToneHit(s, picks[s.slotIndex]!.chosenMidi)
    ).length;
    if (barHits > 0) continue;
    for (const target of [...barSlots].reverse().filter((s) => s.climaxSlotIndex !== s.slotIndex)) {
      const forced = forceGuideTonePick(
        ordered,
        target,
        slots,
        picks,
        target.slotIndex,
        pitchProfile,
        normalizedSeed,
        { ignoreLeap: true }
      );
      if (forced != null) {
        picks[target.slotIndex] = forced;
        break;
      }
    }
    if (
      barSlots.filter(
        (s) => picks[s.slotIndex] != null && isPrimaryGuideToneHit(s, picks[s.slotIndex]!.chosenMidi)
      ).length === 0
    ) {
      for (const target of [...barSlots].reverse()) {
        const forced = forceGuideTonePick(
          ordered,
          target,
          slots,
          picks,
          target.slotIndex,
          pitchProfile,
          normalizedSeed,
          { ignoreLeap: true }
        );
        if (forced != null) {
          picks[target.slotIndex] = forced;
          break;
        }
      }
    }
  }

  const nonClimaxMisses = () =>
    eligible.filter((s) => {
      if (s.climaxSlotIndex === s.slotIndex) return false;
      const pick = picks[s.slotIndex];
      return pick == null || !isPrimaryGuideToneHit(s, pick.chosenMidi);
    });

  for (let hits = countPrimaryGuideToneHits(slots, picks); hits < minHits; ) {
    const misses = nonClimaxMisses();
    if (misses.length === 0) break;
    const target = misses[misses.length - 1]!;
    const forced = forceGuideTonePick(
      ordered,
      target,
      slots,
      picks,
      target.slotIndex,
      pitchProfile,
      normalizedSeed,
      { ignoreLeap: true }
    );
    if (forced == null) break;
    picks[target.slotIndex] = forced;
    const nextHits = countPrimaryGuideToneHits(slots, picks);
    if (nextHits === hits) break;
    hits = nextHits;
  }

  const nonClimaxHits = () =>
    eligible.filter((s) => {
      if (s.climaxSlotIndex === s.slotIndex) return false;
      const pick = picks[s.slotIndex];
      return pick != null && isPrimaryGuideToneHit(s, pick.chosenMidi);
    });

  while (countPrimaryGuideToneHits(slots, picks) > maxHits) {
    const hits = nonClimaxHits();
    if (hits.length === 0) break;
    const barCounts = new Map<number, number>();
    for (const s of hits) barCounts.set(s.bar, (barCounts.get(s.bar) ?? 0) + 1);
    const target =
      hits.find((s) => (barCounts.get(s.bar) ?? 0) > 1) ?? hits[hits.length - 1]!;
    const pick = pickSlotMidi(
      ordered[target.slotIndex]!,
      target,
      null,
      0,
      pitchProfile,
      normalizedSeed,
      { barGuideState: { exactHits: 0, noteCount: 0 } }
    );
    if (isPrimaryGuideToneHit(target, pick.chosenMidi)) break;
    picks[target.slotIndex] = pick;
  }
}

function repairClimaxSlotPicks(
  ordered: readonly ImportMelodyNote[],
  slots: PremiumMelodyPitchSlotList,
  picks: Array<ReturnType<typeof pickSlotMidi> | undefined>,
  pitchProfile: PremiumMelodyPitchProfile,
  normalizedSeed: number
): void {
  if (pitchProfile.climaxArc?.enabled !== true) return;

  const climaxIndices = [
    ...new Set(
      slots
        .filter((s) => s.climaxSlotIndex != null && s.slotIndex === s.climaxSlotIndex)
        .map((s) => s.slotIndex)
    ),
  ];

  for (const climaxIdx of climaxIndices) {
    const phraseSlots = slots.filter((s) => s.climaxSlotIndex === climaxIdx);
    const otherMidis: number[] = [];
    for (const s of phraseSlots) {
      if (s.slotIndex === climaxIdx || s.noteRole === 'rest_placeholder') continue;
      const p = picks[s.slotIndex];
      if (p != null) otherMidis.push(p.chosenMidi);
      else if (s.idealPitchMidi != null) otherMidis.push(s.idealPitchMidi);
    }
    if (otherMidis.length === 0) continue;

    const phraseMean = otherMidis.reduce((a, b) => a + b, 0) / otherMidis.length;
    const phraseMin = Math.min(...otherMidis);
    const floorMidi = Math.max(Math.ceil(phraseMean + 6), Math.ceil(phraseMin + 9));

    const climaxSlot = slots[climaxIdx]!;
    let chainPrev: number | null = null;
    for (let j = climaxIdx - 1; j >= 0; j--) {
      if (picks[j] != null) {
        chainPrev = picks[j]!.chosenMidi;
        break;
      }
    }

    let climaxPick = pickSlotMidi(
      ordered[climaxIdx]!,
      climaxSlot,
      chainPrev,
      0,
      pitchProfile,
      normalizedSeed,
      { minMidi: floorMidi }
    );
    if (climaxPick.chosenMidi < floorMidi) {
      const forced = forceGuideTonePick(
        ordered,
        climaxSlot,
        slots,
        picks,
        climaxIdx,
        pitchProfile,
        normalizedSeed,
        { minMidi: floorMidi }
      );
      if (forced != null) climaxPick = forced;
      else {
        const scorer = pitchProfile.slotScorer;
        let candidates = enumerateCandidates(
          climaxSlot,
          scorer,
          chainPrev,
          pitchProfile.phrasePlanner.registerMinMidi,
          pitchProfile.phrasePlanner.registerMaxMidi,
          pitchProfile
        ).filter((c) => c.midi >= floorMidi);
        if (candidates.length > 0) {
          climaxPick = {
            chosenMidi: candidates[candidates.length - 1]!.midi,
            chosenRank: 0,
            topScore: 0,
            candidateCount: candidates.length,
          };
        }
      }
    }
    picks[climaxIdx] = climaxPick;
    const climaxMidi = climaxPick.chosenMidi;

    for (const neighborOffset of [-1, 1] as const) {
      const ni = climaxIdx + neighborOffset;
      if (ni < 0 || ni >= slots.length) continue;
      const nSlot = slots[ni]!;
      if (nSlot.climaxSlotIndex !== climaxIdx) continue;
      if (nSlot.approachWindowRole === 'intermediate') continue;
      const nPick = picks[ni];
      if (nPick == null || nPick.chosenMidi <= climaxMidi - 2) continue;

      let nPrev: number | null = null;
      for (let j = ni - 1; j >= 0; j--) {
        if (picks[j] != null && j !== climaxIdx) {
          nPrev = picks[j]!.chosenMidi;
          break;
        }
      }
      picks[ni] = pickSlotMidi(
        ordered[ni]!,
        nSlot,
        nPrev,
        0,
        pitchProfile,
        normalizedSeed,
        { maxMidi: climaxMidi - 2 }
      );
    }
  }
}

function scoreAndAssignPremiumMelodyPitches(
  ordered: readonly ImportMelodyNote[],
  slots: PremiumMelodyPitchSlotList,
  pitchProfile: PremiumMelodyPitchProfile,
  normalizedSeed: number
): { melody: ImportMelodyNote[]; trace: PremiumMelodyPitchTraceEvent[] } {
  const scorer = pitchProfile.slotScorer;
  const picks: ReturnType<typeof pickSlotMidi>[] = new Array(ordered.length);
  let prevMidi: number | null = null;
  let leapRecoverySlots = 0;
  const barGuideExactHits = new Map<number, number>();
  const barGuideNoteCounts = new Map<number, number>();

  function barGuideStateFor(slot: PremiumMelodyPitchSlotContext) {
    return {
      exactHits: barGuideExactHits.get(slot.bar) ?? 0,
      noteCount: barGuideNoteCounts.get(slot.bar) ?? 0,
    };
  }

  function recordGuidePick(slot: PremiumMelodyPitchSlotContext, midi: number): void {
    if (slot.noteRole === 'rest_placeholder' || slot.guideTonePc == null) return;
    const bar = slot.bar;
    barGuideNoteCounts.set(bar, (barGuideNoteCounts.get(bar) ?? 0) + 1);
    const pc = ((midi % 12) + 12) % 12;
    if (pc === slot.guideTonePc) {
      barGuideExactHits.set(bar, (barGuideExactHits.get(bar) ?? 0) + 1);
    }
  }

  for (let i = 0; i < ordered.length; i++) {
    const slot = slots[i]!;
    if (slot.approachWindowRole === 'intermediate') continue;

    const note = ordered[i]!;
    const pick = pickSlotMidi(note, slot, prevMidi, leapRecoverySlots, pitchProfile, normalizedSeed, {
      barGuideState: barGuideStateFor(slot),
    });
    picks[i] = pick;
    recordGuidePick(slot, pick.chosenMidi);

    if (slot.noteRole !== 'rest_placeholder') {
      if (prevMidi != null && intervalSemitones(prevMidi, pick.chosenMidi) > 5) {
        leapRecoverySlots = scorer.leapRecoveryBars;
      } else if (leapRecoverySlots > 0) {
        leapRecoverySlots--;
      }
      prevMidi = pick.chosenMidi;
    } else {
      prevMidi = pick.chosenMidi;
    }
  }

  for (let i = 0; i < ordered.length; i++) {
    const slot = slots[i]!;
    if (slot.approachWindowRole !== 'intermediate') continue;

    const note = ordered[i]!;
    const targetIdx = slot.approachTargetSlotIndex!;
    if (picks[targetIdx] == null) {
      const targetSlot = slots[targetIdx]!;
      let targetPrev: number | null = null;
      for (let j = targetIdx - 1; j >= 0; j--) {
        if (picks[j] != null) {
          targetPrev = picks[j]!.chosenMidi;
          break;
        }
      }
      picks[targetIdx] = pickSlotMidi(
        ordered[targetIdx]!,
        targetSlot,
        targetPrev,
        0,
        pitchProfile,
        normalizedSeed
      );
    }
    const targetMidi = picks[targetIdx]!.chosenMidi;
    const idealMidi = targetMidi + (slot.approachPatternOffsetSemitones ?? 0);
    let chainPrev: number | null = null;
    for (let j = i - 1; j >= 0; j--) {
      if (picks[j] != null) {
        chainPrev = picks[j]!.chosenMidi;
        break;
      }
    }
    if (chainPrev == null) chainPrev = targetMidi;

    picks[i] = pickSlotMidi(note, slot, chainPrev, 0, pitchProfile, normalizedSeed, {
      approachIdealMidi: idealMidi,
    });
  }

  repairGuideToneHitBand(ordered, slots, picks, pitchProfile, normalizedSeed);
  repairClimaxSlotPicks(ordered, slots, picks, pitchProfile, normalizedSeed);

  const out: ImportMelodyNote[] = [];
  const trace: PremiumMelodyPitchTraceEvent[] = [];
  for (let i = 0; i < ordered.length; i++) {
    const note = ordered[i]!;
    const slot = slots[i]!;
    const pick = picks[i] ?? {
      chosenMidi: note.midiPitch,
      chosenRank: 0,
      topScore: 0,
      candidateCount: 0,
    };
    out.push({ ...note, midiPitch: pick.chosenMidi });

    const phraseRef =
      slot.approachWindowRole === 'intermediate'
        ? `${pitchProfile.phrasePlanner.contourArc}:approach:${slot.slotIndex}`
        : slot.noteRole === 'rest_placeholder'
          ? `${pitchProfile.phrasePlanner.contourArc}:skip_rest`
          : `${pitchProfile.phrasePlanner.contourArc}:${slot.slotIndex}`;

    trace.push({
      slotId: slot.slotId,
      slotIndex: slot.slotIndex,
      chosenMidiPitch: pick.chosenMidi,
      candidateCount: pick.candidateCount,
      topScore: pick.topScore,
      chosenRank: pick.chosenRank,
      phrasePlanRef: phraseRef,
    });
  }

  return { melody: out, trace };
}

export function runPremiumMelodyPitchPipeline(
  rhythmMelody: readonly ImportMelodyNote[],
  profile: PremiumMelodyProfile,
  pitchProfile: PremiumMelodyPitchProfile,
  normalizedSeed: number,
  options?: PremiumMelodyPitchPipelineOptions
): PremiumMelodyPitchPipelineResult {
  assertValidPremiumMelodyPitchProfile(pitchProfile);
  const ordered = canonicalMelodySort(rhythmMelody);
  const slotList = buildPremiumMelodyPitchSlotList(
    rhythmMelody,
    pitchProfile,
    profile,
    normalizedSeed,
    options
  );
  const { melody, trace } = scoreAndAssignPremiumMelodyPitches(
    ordered,
    slotList,
    pitchProfile,
    normalizedSeed
  );
  return { pitchMelody: melody, slotList, pitchTrace: trace };
}

function surfaceOrnamentApplicable(
  kind: PremiumMelodySurfaceOrnamentKind,
  rules: PremiumMelodySurfaceRulesConfig
): boolean {
  switch (kind) {
    case 'approach':
      return rules.approachSemitones.length > 0;
    case 'enclosure':
      return rules.enclosureEnabled;
    case 'blues':
      return rules.bluesInflectionRate > 0;
    case 'grace':
      return rules.graceNoteRate > 0;
    case 'bend':
      return rules.bendTagRate > 0;
    default: {
      const _exhaustive: never = kind;
      return false;
    }
  }
}

function applySurfaceOrnamentKind(
  kind: PremiumMelodySurfaceOrnamentKind,
  annotations: PremiumMelodyPitchOrnamentAnnotations,
  rules: PremiumMelodySurfaceRulesConfig,
  rand: () => number
): void {
  switch (kind) {
    case 'approach':
      if (rand() < 0.65) {
        const idx = Math.floor(rand() * rules.approachSemitones.length);
        annotations.approachSemitones = rules.approachSemitones[idx]!;
      }
      break;
    case 'enclosure':
      annotations.enclosure = true;
      break;
    case 'blues':
      if (rand() < rules.bluesInflectionRate) annotations.bluesInflection = true;
      break;
    case 'grace':
      if (rand() < rules.graceNoteRate) annotations.graceNote = true;
      break;
    case 'bend':
      if (rand() < rules.bendTagRate) annotations.bendTag = true;
      break;
    default: {
      const _exhaustive: never = kind;
    }
  }
}

export function applyPremiumMelodySurfaceOrnaments(
  expressiveMelody: readonly PremiumMelodyExpressiveNote[],
  slotList: PremiumMelodyPitchSlotList,
  pitchProfile: PremiumMelodyPitchProfile,
  normalizedSeed: number
): PremiumMelodyExpressiveNote[] {
  const rules = pitchProfile.surfaceRules;
  if (!rules) return [...expressiveMelody];

  const ordered = canonicalMelodySort(expressiveMelody);
  const out: PremiumMelodyExpressiveNote[] = [];

  for (let i = 0; i < ordered.length; i++) {
    const note = ordered[i]!;
    const slot = slotList[i];
    if (!slot || slot.noteRole === 'rest_placeholder') {
      out.push({ ...note });
      continue;
    }

    const expressive = note as PremiumMelodyExpressiveNote;
    const annotations: PremiumMelodyPitchOrnamentAnnotations = {
      ...(expressive.pitchOrnamentAnnotations ?? {}),
    };

    for (let oi = 0; oi < PREMIUM_MELODY_SURFACE_ORNAMENT_ORDER.length; oi++) {
      const kind = PREMIUM_MELODY_SURFACE_ORNAMENT_ORDER[oi]!;
      if (!surfaceOrnamentApplicable(kind, rules)) continue;
      const rand = mulberry32(
        derivePremiumMelodySurfaceOrnamentSeed(
          normalizedSeed,
          slot.slotId,
          oi,
          pitchProfile.pitchSeedSalt
        )
      );
      applySurfaceOrnamentKind(kind, annotations, rules, rand);
    }

    const hasAnnotations =
      annotations.approachSemitones != null ||
      annotations.enclosure ||
      annotations.bluesInflection ||
      annotations.graceNote ||
      annotations.bendTag;

    out.push(hasAnnotations ? { ...note, pitchOrnamentAnnotations: annotations } : { ...note });
  }

  return out;
}
