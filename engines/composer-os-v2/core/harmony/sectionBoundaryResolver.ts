/**
 * SQ→BB section seam — transition bars + max-2st voice-leading at joins.
 */

import type { FormSection } from '../form/formPlanner';
import { getVoiceRuleBundle } from '../composer/voiceRuleBundles';
import type { VoicingCandidate } from '../composer/voiceLeadingSolver';
import { solveVoiceLeading } from '../composer/voiceLeadingSolver';
import { noteNameToPitchClass, parseChordSymbol } from './chordSymbolAnalysis';
import { getSqVrbProfile } from '../counterpoint/vrbProfiles/sqVrbProfileRegistry';
import type { VrbContextMap } from '../counterpoint/vrbProfiles/vrbContextMap';
export const MAX_SEMITONES_PER_BAR_AT_SEAM = 2;

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

/** σ-delta approximation — actual voicing distance replaces this in a future pass (TODO). */
export function computeTransitionBars(fromVrbId: string, toVrbId: string): number {
  const fromSigma = sigmaCeilingForVrb(fromVrbId);
  const toSigma = sigmaCeilingForVrb(toVrbId);
  if (fromSigma === toSigma) return 1;
  const raw = Math.ceil(Math.abs(fromSigma - toSigma) / MAX_SEMITONES_PER_BAR_AT_SEAM);
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
