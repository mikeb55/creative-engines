/**
 * Optional additive pitch mechanisms (V89 Hendrix) - absent profile fields => no-op.
 */

import type { ImportMelodyNote } from '../import/mosaicImportTimeline';
import { mulberry32 } from './premiumMelodyPrng';
import type { PremiumMelodyPhraseRoles } from './premiumMelodyPhrase';
import type {
  PremiumMelodyCallResponseMutationKind,
  PremiumMelodyPitchProfile,
  PremiumMelodyPitchSlotContext,
  PremiumMelodySlotScorerConfig,
} from './premiumMelodyPitchProfile';

export type OptionalPitchPrePassOverlay = {
  callResponseRole?: 'call' | 'response' | 'none';
  callResponsePairIndex?: number;
  callResponseMutationKind?: PremiumMelodyCallResponseMutationKind;
  callResponseGroupIndex?: number;
  callResponseSimilarity?: number;
  phraseModeChordFit?: 'response' | 'turnaround';
  bar3IntensityLift?: boolean;
  phraseEndSustainTarget?: boolean;
  longTargetVibratoEligible?: boolean;
  riffCellIndex?: number;
  riffCellIntervals?: readonly number[];
};

function fnv1a32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function deriveOptionalPitchPrePassSeed(normalizedSeed: number, pitchSeedSalt: number): number {
  return (normalizedSeed ^ fnv1a32('premium_melody_optional_pitch_prepass') ^ pitchSeedSalt) >>> 0;
}

function barRhythmSignature(ordered: readonly ImportMelodyNote[], bar: number): number[] {
  return ordered
    .filter((n) => n.bar === bar)
    .sort((a, b) => a.onsetBeat - b.onsetBeat)
    .map((n) => Math.round(n.durationBeats * 100));
}

function barIntervalSignature(ordered: readonly ImportMelodyNote[], bar: number): number[] {
  const notes = ordered
    .filter((n) => n.bar === bar)
    .sort((a, b) => a.onsetBeat - b.onsetBeat);
  const out: number[] = [];
  for (let i = 1; i < notes.length; i++) {
    out.push(Math.abs(notes[i]!.midiPitch - notes[i - 1]!.midiPitch));
  }
  return out;
}

export function dnaSimilarity(
  aRhythm: number[],
  aIntervals: number[],
  bRhythm: number[],
  bIntervals: number[]
): number {
  const rhythmUnion = new Set([...aRhythm, ...bRhythm]);
  const rhythmHits = aRhythm.filter((v) => bRhythm.includes(v)).length;
  const rhythmScore = rhythmUnion.size > 0 ? rhythmHits / rhythmUnion.size : 0;
  const intervalUnion = new Set([...aIntervals, ...bIntervals]);
  const intervalHits = aIntervals.filter((v) => bIntervals.includes(v)).length;
  const intervalScore = intervalUnion.size > 0 ? intervalHits / intervalUnion.size : 0;
  return (rhythmScore + intervalScore) / 2;
}

const MUTATION_ORDER: readonly PremiumMelodyCallResponseMutationKind[] = [
  'truncate',
  'extend',
  'invert',
  'transpose',
  'chromatic_swap',
];
export function runOptionalPitchPrePass(
  ordered: readonly ImportMelodyNote[],
  roles: PremiumMelodyPhraseRoles,
  slots: readonly PremiumMelodyPitchSlotContext[],
  pitchProfile: PremiumMelodyPitchProfile,
  normalizedSeed: number
): OptionalPitchPrePassOverlay[] {
  const overlays: OptionalPitchPrePassOverlay[] = ordered.map(() => ({}));
  const cfg = pitchProfile.callResponsePhraseScore;
  const riffCfg = pitchProfile.riffCellRecall;
  if (cfg?.enabled !== true && riffCfg?.enabled !== true) return overlays;

  const rand = mulberry32(deriveOptionalPitchPrePassSeed(normalizedSeed, pitchProfile.pitchSeedSalt));
  const phraseStarts = [...roles.phraseStarts].sort((a, b) => a - b);

  for (let pi = 0; pi < phraseStarts.length; pi++) {
    const startIdx = phraseStarts[pi]!;
    const endIdx = pi + 1 < phraseStarts.length ? phraseStarts[pi + 1]! - 1 : ordered.length - 1;
    const startBar = ordered[startIdx]?.bar ?? 1;
    const endBar = ordered[endIdx]?.bar ?? startBar;
    const groupIndex = pi;

    let riffCellIndex = 0;
    let riffIntervals: readonly number[] = [0, 3, 5, 7];
    if (riffCfg?.enabled === true && riffCfg.cells.length > 0) {
      const totalWeight = riffCfg.cells.reduce((sum, c) => sum + c.weight, 0);
      let roll = rand() * totalWeight;
      for (let ci = 0; ci < riffCfg.cells.length; ci++) {
        roll -= riffCfg.cells[ci]!.weight;
        if (roll <= 0) {
          riffCellIndex = ci;
          riffIntervals = riffCfg.cells[ci]!.intervals;
          break;
        }
      }
    }

    for (let bar = startBar; bar <= endBar; bar++) {
      const rel = bar - startBar;
      const pairIndex = Math.floor(rel / 2);
      const isCallBar = rel % 2 === 0;
      const isResponseBar = rel % 2 === 1;
      const mutationKind = MUTATION_ORDER[Math.floor(rand() * MUTATION_ORDER.length)]!;
      const phraseMode = rel === 3 ? 'turnaround' : isResponseBar ? 'response' : undefined;

      let responseSimilarity: number | undefined;
      if (cfg?.enabled === true && isResponseBar) {
        const callBar = bar - 1;
        if (callBar >= startBar) {
          responseSimilarity = dnaSimilarity(
            barRhythmSignature(ordered, callBar),
            barIntervalSignature(ordered, callBar),
            barRhythmSignature(ordered, bar),
            barIntervalSignature(ordered, bar)
          );
        }
      }

      for (const slot of slots) {
        if (slot.bar !== bar) continue;
        const overlay = overlays[slot.slotIndex]!;
        if (riffCfg?.enabled === true) {
          overlay.riffCellIndex = riffCellIndex;
          overlay.riffCellIntervals = riffIntervals;
        }
        if (cfg?.enabled === true) {
          overlay.callResponseGroupIndex = groupIndex;
          overlay.callResponsePairIndex = pairIndex;
          overlay.callResponseMutationKind = mutationKind;
          overlay.callResponseRole = isCallBar ? 'call' : isResponseBar ? 'response' : 'none';
          if (phraseMode) overlay.phraseModeChordFit = phraseMode;
          if (rel === 2) overlay.bar3IntensityLift = true;
          if (roles.phraseEnds.has(slot.slotIndex)) overlay.phraseEndSustainTarget = true;
          if (slot.durationBeats >= 1.5) overlay.longTargetVibratoEligible = true;
          if (responseSimilarity != null) overlay.callResponseSimilarity = responseSimilarity;
        }
      }
    }
  }

  return overlays;
}
function isBluesInflectionPc(pc: number, rootPc: number): 'b3b5' | 'b7' | null {
  const rel = (pc - rootPc + 12) % 12;
  if (rel === 3 || rel === 6) return 'b3b5';
  if (rel === 10) return 'b7';
  return null;
}

export function optionalPitchScoreMultiplier(
  midi: number,
  prevMidi: number | null,
  slot: PremiumMelodyPitchSlotContext,
  pitchProfile: PremiumMelodyPitchProfile
): number {
  let mult = 1;
  const rootPc = slot.harmonyRootPc % 12;
  const pc = (midi % 12 + 12) % 12;

  const bluesCfg = pitchProfile.bluesInflection;
  if (bluesCfg?.enabled === true) {
    const kind = isBluesInflectionPc(pc, rootPc);
    if (kind === 'b3b5') mult *= bluesCfg.minorThirdFifthMultiplier;
    else if (kind === 'b7') mult *= bluesCfg.flatSeventhMultiplier;
    if (slot.metricalStrength === 'weak') mult *= bluesCfg.weakBeatMultiplier;
    mult *= bluesCfg.globalWeight;
  }

  const anchorCfg = pitchProfile.pentatonicAnchor;
  if (anchorCfg?.enabled === true) {
    const anchorSet =
      anchorCfg.anchorPitchClasses.length > 0 ? anchorCfg.anchorPitchClasses : [0, 3, 5, 7, 10];
    const rel = (pc - rootPc + 12) % 12;
    if (anchorSet.includes(rel)) {
      mult *= anchorCfg.baseWeight * anchorCfg.anchorHitBonus;
    } else {
      mult *= anchorCfg.baseWeight;
    }
  }

  const riffCfg = pitchProfile.riffCellRecall;
  if (riffCfg?.enabled === true && slot.riffCellIntervals && slot.riffCellIntervals.length > 0) {
    const rel = (pc - rootPc + 12) % 12;
    if (slot.riffCellIntervals.includes(rel)) {
      if (slot.bar3IntensityLift === true || slot.callResponsePairIndex === 1) {
        mult *= riffCfg.secondRecallMultiplier;
      } else {
        mult *= riffCfg.firstRecallMultiplier;
      }
    }
    if (prevMidi != null) {
      const step = Math.abs(midi - prevMidi);
      const importStep = Math.abs(midi - slot.importMidiPitch);
      if (step === importStep && step > 0 && step <= 12) {
        mult *= riffCfg.exactTranspositionMultiplier;
      }
    }
    if (pc === ((slot.importMidiPitch % 12) + 12) % 12 && prevMidi != null) {
      mult *= riffCfg.exactCopyPenalty;
    }
  }

  const crCfg = pitchProfile.callResponsePhraseScore;
  if (crCfg?.enabled === true) {
    if (slot.callResponseRole === 'response') {
      mult *= crCfg.responseMutationBonus;
      const sim = slot.callResponseSimilarity;
      if (sim != null && sim >= 0.85) {
        mult *= crCfg.exactPhraseRepeatPenalty;
      }
    }
    if (slot.bar3IntensityLift) {
      const mid = (slot.registerBandMinMidi + slot.registerBandMaxMidi) / 2;
      if (midi >= mid + 2 && midi <= mid + 5) mult *= crCfg.bar3IntensityLift;
    }
    if (slot.phraseEndSustainTarget && slot.durationBeats >= 1.0) {
      const landingPc = (rootPc + 10) % 12;
      if (pc === rootPc || pc === landingPc) mult *= crCfg.phraseEndSustainBonus;
    }
    if (slot.longTargetVibratoEligible && slot.durationBeats >= 1.5) {
      mult *= crCfg.longTargetVibratoBonus;
    }
  }

  return mult;
}

export function mergeOptionalPitchOverlays(
  slots: PremiumMelodyPitchSlotContext[],
  overlays: OptionalPitchPrePassOverlay[]
): void {
  for (let i = 0; i < slots.length; i++) {
    const o = overlays[i];
    if (!o) continue;
    const slot = slots[i]!;
    if (o.callResponseRole != null) slot.callResponseRole = o.callResponseRole;
    if (o.callResponsePairIndex != null) slot.callResponsePairIndex = o.callResponsePairIndex;
    if (o.callResponseMutationKind != null) slot.callResponseMutationKind = o.callResponseMutationKind;
    if (o.callResponseGroupIndex != null) slot.callResponseGroupIndex = o.callResponseGroupIndex;
    if (o.callResponseSimilarity != null) slot.callResponseSimilarity = o.callResponseSimilarity;
    if (o.phraseModeChordFit != null) slot.phraseModeChordFit = o.phraseModeChordFit;
    if (o.bar3IntensityLift != null) slot.bar3IntensityLift = o.bar3IntensityLift;
    if (o.phraseEndSustainTarget != null) slot.phraseEndSustainTarget = o.phraseEndSustainTarget;
    if (o.longTargetVibratoEligible != null) slot.longTargetVibratoEligible = o.longTargetVibratoEligible;
    if (o.riffCellIndex != null) slot.riffCellIndex = o.riffCellIndex;
    if (o.riffCellIntervals != null) slot.riffCellIntervals = o.riffCellIntervals;
  }
}

export function chordFitVectorForSlot(
  scorer: PremiumMelodySlotScorerConfig,
  phraseMode?: 'response' | 'turnaround'
): PremiumMelodySlotScorerConfig['chordFitVector'] {
  const base = scorer.chordFitVector;
  if (!phraseMode) return base;
  return {
    ...base,
    ninth: phraseMode === 'response' || phraseMode === 'turnaround' ? 1.12 : base.ninth,
    extension: phraseMode === 'response' || phraseMode === 'turnaround' ? 1.0 : base.extension,
  };
}