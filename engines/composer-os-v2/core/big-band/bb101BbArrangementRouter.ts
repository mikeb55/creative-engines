/**
 * BB101 arrangement ops for score builder.
 */

import type { BigBandArrangementProfile } from './bigBandTypes';
import type { OrbitBbArrangementOps } from './orbitBbArrangementRouter';
import * as bb from './bb101BbArrangement';
import type { Bb101GceFixState } from './bb101BbArrangement';

export function resolveBb101BbArrangement(
  profile: BigBandArrangementProfile | undefined,
  gce?: Bb101GceFixState
): OrbitBbArrangementOps | undefined {
  if (profile !== 'bb101_v1') return undefined;
  return {
    dynamicsMarkings: () => bb.bb101DynamicsMarkings(gce),
    windVelocity: (bar, slot) => bb.bb101WindVelocity(bar, slot, gce),
    windDropout: (bar, slot) => bb.bb101WindDropout(bar, slot, gce),
    brassTacet: (bar) => bb.bb101BrassTacet(bar, gce),
    saxTacet: (bar) => bb.bb101SaxTacet(bar, gce),
    pianoDropout: (bar) => bb.bb101PianoDropout(bar, gce),
    bassAnchor: (bar, midi) => bb.bb101BassAnchor(bar, midi, gce),
    bloomAdjustPitch: (bar, slot, pitch) => bb.bb101BloomAdjustPitch(bar, slot, pitch, gce),
    preferWholeBarSustain: (bar, slot) => bb.bb101PreferWholeBarSustain(bar, slot, gce),
    mergeBrassBeats: (bar, prev) => bb.bb101MergeBrassBeats(bar, prev, gce),
    mergeShoutBeats: (bar, prev) => bb.bb101MergeShoutBeats(bar, prev, gce),
    forceDrumTransition: (bar) => bb.bb101ForceDrumTransition(bar, gce),
    drumArticulation: (bar) => bb.bb101DrumArticulation(bar),
    drumIntensityOverride: (bar) => bb.bb101DrumIntensity(bar),
    saxSoliWindow: (bar) => bb.bb101SaxSoliWindow(bar, gce),
    tenorHarmonyMidi: (alto) => bb.bb101TenorHarmonyMidi(alto),
    shoutPitchOffset: (bar) => bb.bb101ShoutPitchOffset(bar),
    tromboneShoutCounter: (bar, trp) => bb.bb101TromboneShoutCounter(bar, trp),
    cupMuteVelocityReduction: (bar, slot) => bb.bb101CupMuteVelocityReduction(bar, slot),
  };
}
