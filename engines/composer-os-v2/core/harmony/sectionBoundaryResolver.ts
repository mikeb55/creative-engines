/**
 * SQ→BB section seam — transition bars + max-2st voice-leading at joins.
 */

import type { FormSection } from '../form/formPlanner';
import { getVoiceRuleBundle } from '../composer/voiceRuleBundles';
import type { VoicingCandidate } from '../composer/voiceLeadingSolver';
import { solveVoiceLeading } from '../composer/voiceLeadingSolver';
import { noteNameToPitchClass, parseChordSymbol } from './chordSymbolAnalysis';
import { getSqVrbProfile } from '../counterpoint/vrbProfiles/sqVrbProfileRegistry';
import type { SqVrbRegisterPolicy } from '../counterpoint/vrbProfiles/sqVrbProfileTypes';
import type { VrbContextMap } from '../counterpoint/vrbProfiles/vrbContextMap';
export const MAX_SEMITONES_PER_BAR_AT_SEAM = 2;

/** Target soprano-centre MIDI per registerPolicy (contrapuntal line policy). */
const REGISTER_POLICY_TARGET_MIDI: Record<SqVrbRegisterPolicy, number> = {
  comfortable_with_climax_leaps: 70,
  wide_registral_contrast: 68,
  extreme_registers: 72,
  lyrical_arch: 70,
  heroic_arch_with_fanfare_leaps: 76,
  lyrical_soprano_arch_mid_centrist: 72,
  dramatically_volatile_wide_arc: 70,
  mid_register_additive_expansion: 66,
  dynamically_wide_arc_accumulative: 72,
  systematic_bass_to_soprano_expansion: 66,
  mid_register_chromatic_inner_compression: 62,
  low_biased_extreme_punctuation_spikes: 55,
  extreme_pointillist_leaps_all_registers: 72,
  open_string_low_pedal_lyrical_soprano_arch: 68,
  registral_expansion_contraction: 66,
  micropolyphonic_merged_texture: 64,
};

export interface SectionJoin {
  fromSectionId: string;
  toSectionId: string;
  /** first bar of toSection */
  joinBar: number;
  fromVrbId: string;
  toVrbId: string;
  lastVoicingOfFromSection: VoicingCandidate;
  transitionBars: number;
}

export interface VoiceState {
  voiceIndex: number;
  pitchMidi: number;
}

export interface PitchConstraint {
  voice: VoiceState;
  targetPitch: number;
  maxInterval: number;
}

function sigmaCeilingForVrb(vrbId: string): number {
  const profile = getSqVrbProfile(vrbId);
  if (profile?.gceScorerAdjustments.registerCohesionStdevCeilingSt) {
    return profile.gceScorerAdjustments.registerCohesionStdevCeilingSt;
  }
  const bundle = getVoiceRuleBundle(vrbId);
  return bundle?.melodicPolicy.maxLeapSemitones ?? 12;
}

/** σ-delta fallback when register target midpoint is unavailable. */
export function computeTransitionBarsFromSigma(fromVrbId: string, toVrbId: string): number {
  const fromSigma = sigmaCeilingForVrb(fromVrbId);
  const toSigma = sigmaCeilingForVrb(toVrbId);
  if (fromSigma === toSigma) return 1;
  const raw = Math.ceil(Math.abs(fromSigma - toSigma) / MAX_SEMITONES_PER_BAR_AT_SEAM);
  return Math.max(1, Math.min(4, raw));
}

function registerTargetMidpointMidi(toVrbId: string): number | null {
  const policy = getSqVrbProfile(toVrbId)?.contrapuntalLinePolicy?.registerPolicy;
  if (!policy) return null;
  return REGISTER_POLICY_TARGET_MIDI[policy] ?? null;
}

/** Transition bars from furthest voice in lastVoicing vs target register centre of toVrbId. */
export function computeTransitionBarsFromVoicing(
  lastVoicing: VoicingCandidate,
  toVrbId: string,
  fromVrbId?: string,
  maxSemitonesPerBar: number = MAX_SEMITONES_PER_BAR_AT_SEAM,
): number {
  const target = registerTargetMidpointMidi(toVrbId);
  if (target === null) {
    return fromVrbId ? computeTransitionBarsFromSigma(fromVrbId, toVrbId) : 1;
  }
  const pitches = lastVoicing.notes.filter((n) => Number.isFinite(n));
  if (pitches.length === 0) {
    return fromVrbId ? computeTransitionBarsFromSigma(fromVrbId, toVrbId) : 1;
  }
  const maxDistance = pitches.reduce((m, p) => Math.max(m, Math.abs(p - target)), 0);
  if (maxDistance <= maxSemitonesPerBar) return 1;
  const raw = Math.ceil(maxDistance / maxSemitonesPerBar);
  return Math.max(1, Math.min(4, raw));
}

function rootPcFromSymbol(symbol: string): number {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const m = hp.match(/^([A-G](?:#|b)?)/i);
  const name = m?.[1] ?? 'C';
  const key = name.charAt(0).toUpperCase() + name.slice(1);
  return noteNameToPitchClass(key) ?? 0;
}

function voicingCandidatesForChord(symbol: string): VoicingCandidate[] {
  const rpc = rootPcFromSymbol(symbol);
  const close = [rpc + 48, rpc + 52, rpc + 55, rpc + 43];
  const open = [rpc + 48, rpc + 55, rpc + 59, rpc + 43];
  return [
    { notes: close, cost: 0 },
    { notes: open, cost: 0 },
  ];
}

function nearestChordTone(pitch: number, chordPcs: number[]): number {
  let best = pitch;
  let bestDist = 99;
  for (const pc of chordPcs) {
    for (let octave = 2; octave <= 6; octave++) {
      const candidate = pc + octave * 12;
      const dist = Math.abs(candidate - pitch);
      if (dist < bestDist) {
        bestDist = dist;
        best = candidate;
      }
    }
  }
  return best;
}

export function joinConstraint(voice: VoiceState, targetChord: string): PitchConstraint {
  const root = rootPcFromSymbol(targetChord);
  const pcs = [root, (root + 4) % 12, (root + 7) % 12];
  const nearest = nearestChordTone(voice.pitchMidi, pcs);
  const dist = Math.abs(nearest - voice.pitchMidi);
  const targetPitch =
    dist <= MAX_SEMITONES_PER_BAR_AT_SEAM ? nearest : voice.pitchMidi;
  return { voice, targetPitch, maxInterval: MAX_SEMITONES_PER_BAR_AT_SEAM };
}

function clampVoicingToSeam(
  previous: VoicingCandidate,
  chosen: VoicingCandidate,
  targetChordSymbol: string,
): VoicingCandidate {
  const notes = chosen.notes.map((pitch, i) => {
    const prevPitch = previous.notes[i] ?? previous.notes[previous.notes.length - 1] ?? pitch;
    const delta = pitch - prevPitch;
    if (Math.abs(delta) <= MAX_SEMITONES_PER_BAR_AT_SEAM) return pitch;
    const step = prevPitch + Math.sign(delta) * MAX_SEMITONES_PER_BAR_AT_SEAM;
    const constrained = joinConstraint({ voiceIndex: i, pitchMidi: step }, targetChordSymbol).targetPitch;
    if (Math.abs(constrained - prevPitch) <= MAX_SEMITONES_PER_BAR_AT_SEAM) return constrained;
    return prevPitch;
  });
  return { notes, cost: chosen.cost };
}

function emergencyTonicVoicing(symbol: string): VoicingCandidate {
  const rpc = rootPcFromSymbol(symbol);
  return {
    notes: [rpc + 48, rpc + 52, rpc + 55, rpc + 43],
    cost: 0,
  };
}

export function resolveSectionBoundary(
  join: SectionJoin,
  _contextMap: VrbContextMap,
  _sections: FormSection[],
  targetChordSymbol: string,
): VoicingCandidate {
  const bundle = getVoiceRuleBundle(join.toVrbId);
  if (!bundle) {
    return emergencyTonicVoicing(targetChordSymbol);
  }
  const candidates = voicingCandidatesForChord(targetChordSymbol);
  const solved = solveVoiceLeading(candidates, join.lastVoicingOfFromSection, bundle);
  let out = solved.chosen;
  if (out.notes.length === 0) {
    return emergencyTonicVoicing(targetChordSymbol);
  }
  const maxMove = out.notes.reduce((m, p, i) => {
    const prev = join.lastVoicingOfFromSection.notes[i] ?? join.lastVoicingOfFromSection.notes[0] ?? p;
    return Math.max(m, Math.abs(p - prev));
  }, 0);
  if (maxMove > MAX_SEMITONES_PER_BAR_AT_SEAM) {
    out = clampVoicingToSeam(join.lastVoicingOfFromSection, out, targetChordSymbol);
  }
  return out;
}
