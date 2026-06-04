/**
 * Routes Orbit BB arrangement helpers — V2 base vs 120-bar `orbit_28_v2` extension.
 */

import type { BigBandArrangementProfile } from './bigBandTypes';
import * as v2 from './orbitBbV2Arrangement';
import * as v28 from './orbitBbV28V2Arrangement';
import type { Orbit28V2GceFixState } from './orbitBbV28V2Arrangement';

export interface OrbitBbArrangementOps {
  dynamicsMarkings: () => Record<number, string>;
  windVelocity: (bar: number, slot: 0 | 1 | 2 | 3) => number;
  windDropout: (bar: number, slot: number) => boolean;
  brassTacet: (bar: number) => boolean;
  saxTacet: (bar: number) => boolean;
  pianoDropout: (bar: number) => boolean;
  bassAnchor: (bar: number, midi: number) => number;
  bloomAdjustPitch: (bar: number, slot: 2 | 3, pitch: number) => number;
  preferWholeBarSustain: (bar: number, slot: number) => boolean;
  mergeBrassBeats: (bar: number, prev: number[] | undefined) => number[];
  mergeShoutBeats: (bar: number, prev: number[] | undefined) => number[] | undefined;
  forceDrumTransition: (bar: number) => boolean;
  drumArticulation: (bar: number) => 'brushes' | 'sticks' | 'auto';
  drumIntensityOverride: (bar: number) => 'sparse' | 'standard' | 'driving' | undefined;
  saxSoliWindow: (bar: number) => boolean;
  tenorHarmonyMidi: (altoMidi: number) => number;
  shoutPitchOffset: (bar: number) => number;
  tromboneShoutCounter: (bar: number, trumpetMidi: number) => number;
  cupMuteVelocityReduction: (bar: number, slot: number) => number;
}

export function resolveOrbitBbArrangement(
  profile: BigBandArrangementProfile | undefined,
  gce?: Orbit28V2GceFixState
): OrbitBbArrangementOps | undefined {
  const isV28V2 = profile === 'orbit_28_v2';
  const isV2Family =
    profile === 'orbit_v2' ||
    profile === 'orbit_28_v1' ||
    profile === 'orbit_28_v2' ||
    profile === 'orbit_v3_melody_authority' ||
    profile === 'orbit_v4_64' ||
    profile === 'orbit_v5_64' ||
    profile === 'orbit_v6_64' ||
    profile === 'orbit_steely_v1_64' ||
    profile === 'orbit_steely_v1_1_64' ||
    profile === 'orbit_steely_v1_2_64' ||
    profile === 'orbit_steely_v1_3_64' ||
    profile === 'orbit_steely_v1_4_64' ||
    profile === 'orbit_steely_v1_5_64' ||
    profile === 'orbit_steely_v1_7_64';

  if (!isV2Family) return undefined;

  if (isV28V2) {
    return {
      dynamicsMarkings: () => v28.orbitBbV28V2DynamicsMarkings(gce),
      windVelocity: (bar, slot) => v28.orbitBbV28V2WindVelocity(bar, slot, gce),
      windDropout: (bar, slot) => v28.orbitBbV28V2WindDropout(bar, slot, gce),
      brassTacet: (bar) => v28.orbitBbV28V2BrassTacet(bar, gce),
      saxTacet: (bar) => v28.orbitBbV28V2SaxTacet(bar, gce),
      pianoDropout: (bar) => v28.orbitBbV28V2PianoDropout(bar, gce),
      bassAnchor: (bar, midi) => v28.orbitBbV28V2BassAnchor(bar, midi, gce),
      bloomAdjustPitch: (bar, slot, pitch) => v28.orbitBbV28V2BloomAdjustPitch(bar, slot, pitch, gce),
      preferWholeBarSustain: (bar, slot) => v28.orbitBbV28V2PreferWholeBarSustain(bar, slot, gce),
      mergeBrassBeats: (bar, prev) => v28.orbitBbV28V2MergeBrassBeats(bar, prev, gce),
      mergeShoutBeats: (bar, prev) => v28.orbitBbV28V2MergeShoutBeats(bar, prev, gce),
      forceDrumTransition: (bar) => v28.orbitBbV28V2ForceDrumTransition(bar, gce),
      drumArticulation: (bar) => v28.orbitBbV28V2DrumArticulation(bar),
      drumIntensityOverride: (bar) => v28.orbitBbV28V2DrumIntensity(bar),
      saxSoliWindow: (bar) => v28.orbit28V2SaxSoliWindow(bar),
      tenorHarmonyMidi: (alto) => v28.orbitBbV28V2TenorHarmonyMidi(alto),
      shoutPitchOffset: (bar) => v28.orbitBbV28V2ShoutPitchOffset(bar),
      tromboneShoutCounter: (bar, trp) => v28.orbitBbV28V2TromboneShoutCounter(bar, trp),
      cupMuteVelocityReduction: (bar, slot) => v28.orbitBbV28V2CupMuteVelocityReduction(bar, slot),
    };
  }

  return {
    dynamicsMarkings: () => v2.orbitBbV2DynamicsMarkings(),
    windVelocity: (bar, slot) => v2.orbitBbV2WindVelocity(bar, slot),
    windDropout: (bar, slot) => v2.orbitBbV2WindDropout(bar, slot),
    brassTacet: (bar) => v2.orbitBbV2BrassTacet(bar),
    saxTacet: (bar) => v2.orbitBbV2SaxTacet(bar),
    pianoDropout: (bar) => v2.orbitBbV2PianoDropout(bar),
    bassAnchor: (bar, midi) => v2.orbitBbV2BassAnchor(bar, midi),
    bloomAdjustPitch: (bar, slot, pitch) => v2.orbitBbV2BloomAdjustPitch(bar, slot, pitch),
    preferWholeBarSustain: (bar, slot) => v2.orbitBbV2PreferWholeBarSustain(bar, slot),
    mergeBrassBeats: (bar, prev) => v2.orbitBbV2MergeBrassBeats(bar, prev),
    mergeShoutBeats: (_bar, prev) => prev,
    forceDrumTransition: (bar) => v2.orbitBbV2ForceDrumTransition(bar),
    drumArticulation: () => 'auto' as const,
    drumIntensityOverride: () => undefined,
    saxSoliWindow: () => false,
    tenorHarmonyMidi: (alto) => alto - 4,
    shoutPitchOffset: () => 0,
    tromboneShoutCounter: (_bar, trp) => trp - 12,
    cupMuteVelocityReduction: () => 0,
  };
}
