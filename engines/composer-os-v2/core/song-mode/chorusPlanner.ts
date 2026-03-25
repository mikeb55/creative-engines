/**
 * Chorus as primary payoff section — planning metadata only.
 */

import type { SongSectionPlan } from './songModeTypes';
import type { SongwriterRuleId } from './songwritingResearchTypes';

export interface ChorusPlan {
  isPrimaryPayoffSection: true;
  relativeIntensityVsVerse: 'higher' | 'equal';
  harmonicStabilityBias: 'more_grounded' | 'neutral' | 'more_unstable';
  titleEmphasis: 'high' | 'medium' | 'low';
  /** Planned register lift for chorus payoff (semitones), capped by singer profile. */
  chorusLiftSemitones: number;
}

export function planChorusMetadata(sections: SongSectionPlan[], primaryStyle: SongwriterRuleId): ChorusPlan {
  const hasChorus = sections.some((s) => s.kind === 'chorus');
  if (!hasChorus) {
    return {
      isPrimaryPayoffSection: true,
      relativeIntensityVsVerse: 'equal',
      harmonicStabilityBias: 'neutral',
      titleEmphasis: 'medium',
      chorusLiftSemitones: 0,
    };
  }
  const titleEmphasis: ChorusPlan['titleEmphasis'] =
    primaryStyle === 'max_martin' || primaryStyle === 'carole_king' || primaryStyle === 'smokey_robinson'
      ? 'high'
      : primaryStyle === 'bob_dylan' || primaryStyle === 'joni_mitchell'
        ? 'low'
        : 'medium';
  const harmonicStabilityBias: ChorusPlan['harmonicStabilityBias'] =
    primaryStyle === 'donald_fagen' || primaryStyle === 'bacharach' ? 'more_unstable' : 'more_grounded';
  const chorusLiftSemitones =
    titleEmphasis === 'high' ? 3 : titleEmphasis === 'medium' ? 2 : 1;

  return {
    isPrimaryPayoffSection: true,
    relativeIntensityVsVerse: 'higher',
    harmonicStabilityBias,
    titleEmphasis,
    chorusLiftSemitones,
  };
}
