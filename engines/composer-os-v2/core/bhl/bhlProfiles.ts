/**
 * BHL Batch B — compositional approach profiles.
 * These are measurable generation settings. They do not imitate a named artist.
 */

import type { BhlContinuationStrategy, BhlDensity, BhlDialogue, BhlPhrasePlan, BhlPitchTransform } from './bhlPhrase';
import type { BhlPhraseArc, BhlRhythmMode } from './bhlPhraseShape';

export interface BhlStyleProfile {
  id: string;
  name: string;
  description: string;
  density: BhlDensity;
  dialogue: BhlDialogue;
  rhythm: BhlRhythmMode;
  phraseArc: BhlPhraseArc;
  continuation: BhlContinuationStrategy;
  registerLow: number;
  registerHigh: number;
  /** Development pitch behaviour. Statement keeps the motif. */
  developmentPitch: BhlPitchTransform;
  quartal: boolean;
}

export const BHL_STYLE_PROFILES: readonly BhlStyleProfile[] = [
  {
    id: 'chamber-lyricism',
    name: 'Chamber lyricism',
    description: 'Sparse single line, sustained register, room after the bass.',
    density: 'single',
    dialogue: 'leave-space',
    rhythm: 'sparse',
    phraseArc: 'derived',
    continuation: 'extend',
    registerLow: 64,
    registerHigh: 76,
    developmentPitch: 'retain-and-admit-bass',
    quartal: false,
  },
  {
    id: 'angular-modern',
    name: 'Angular modern jazz',
    description: 'Fragmented development, inverted contour, shifting accents.',
    density: 'alternate',
    dialogue: 'answer-after-bass',
    rhythm: 'syncopate',
    phraseArc: 'invert',
    continuation: 'fragment',
    registerLow: 60,
    registerHigh: 79,
    developmentPitch: 'invert-into-field',
    quartal: false,
  },
  {
    id: 'colour-field',
    name: 'Colour-field composition',
    description: 'Dyads, common-tone return, quartal colour when the field allows it.',
    density: 'dyad',
    dialogue: 'answer-after-bass',
    rhythm: 'derived',
    phraseArc: 'recall',
    continuation: 'sequence',
    registerLow: 62,
    registerHigh: 74,
    developmentPitch: 'reproject-neighbor',
    quartal: true,
  },
  {
    id: 'rhythmic-counterpoint',
    name: 'Rhythmic counterpoint',
    description: 'A second guitar voice against the bass, displaced from the statement.',
    density: 'counterline',
    dialogue: 'counter-motion',
    rhythm: 'displace',
    phraseArc: 'derived',
    continuation: 'converse',
    registerLow: 59,
    registerHigh: 76,
    developmentPitch: 'reproject-neighbor',
    quartal: false,
  },
  {
    id: 'spacious-abstraction',
    name: 'Spacious abstraction',
    description: 'High register, silence, and a short fragmented answer.',
    density: 'single',
    dialogue: 'leave-space',
    rhythm: 'sparse',
    phraseArc: 'invert',
    continuation: 'fragment',
    registerLow: 67,
    registerHigh: 84,
    developmentPitch: 'invert-into-field',
    quartal: false,
  },
];

export function bhlProfileById(id: string): BhlStyleProfile | undefined {
  return BHL_STYLE_PROFILES.find((profile) => profile.id === id);
}

/** Fills region settings from the profile. Later region controls replace individual fields. */
export function applyBhlProfile(plan: BhlPhrasePlan, profileId: string): BhlPhrasePlan {
  const profile = bhlProfileById(profileId);
  if (!profile) throw new Error(`style profile ${profileId} is not available`);
  const next = structuredClone(plan);
  for (const region of next.regions) {
    region.density = profile.density;
    region.dialogue = profile.dialogue;
    region.registerLow = profile.registerLow;
    region.registerHigh = profile.registerHigh;
    if (region.role === 'development' || region.role === 'transformation') {
      region.pitchTransform = profile.developmentPitch;
    }
  }
  return next;
}
