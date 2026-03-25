/**
 * Map a behaviour profile to mode-specific influence metadata (additive guidance only).
 */

import type { ReferenceBehaviourProfile } from './behaviourExtractionTypes';
import type { ReferenceInfluenceEnvelope, ReferenceInfluenceTarget } from './referenceReuseTypes';

export function applyReferenceInfluence(
  profile: ReferenceBehaviourProfile,
  target: ReferenceInfluenceTarget,
  mode: ReferenceInfluenceEnvelope['mode'] = 'hint_only',
  strength: ReferenceInfluenceEnvelope['strength'] = 'subtle'
): ReferenceInfluenceEnvelope {
  const hints: string[] = [
    `form arc: ${profile.formArc}`,
    `density bias: ${profile.densityBand}`,
    `register spread (MIDI semitones): ${Math.round(profile.registerSpreadMidi)}`,
  ];
  if (profile.harmonicRhythmBars > 0) {
    hints.push(`harmonic rhythm ~ ${profile.harmonicRhythmBars.toFixed(2)} bars/chord`);
  }
  if (profile.motifContourSample.length > 0) {
    hints.push(`contour sample length ${profile.motifContourSample.length} intervals`);
  }

  const metadata: Record<string, string> = {
    referenceFormArc: profile.formArc,
    referenceDensityBand: profile.densityBand,
    referenceInfluenceMode: mode,
    referenceInfluenceStrength: strength,
  };

  if (target === 'song_mode') {
    hints.push('Song Mode: bias section contrasts toward reference sectional shape');
  }
  if (target === 'ecm_chamber') {
    hints.push('ECM: favour narrative density curve similar to reference');
  }
  if (target === 'guitar_bass_duo') {
    hints.push('Duo: keep register spread in family of reference');
  }
  if (target === 'big_band') {
    hints.push('Big band planning: align shout / contrast bands with reference density');
  }
  if (target === 'string_quartet') {
    hints.push('Quartet planning: texture pacing informed by reference density');
  }

  return { target, mode, strength, hints, metadata };
}
