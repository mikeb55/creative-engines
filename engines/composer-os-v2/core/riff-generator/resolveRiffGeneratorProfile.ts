/**

 * Resolve {@link RiffProfile} for riff generator from VRB registry + UI density/meter overlays.

 */



import { getVoiceRuleBundle } from '../composer/voiceRuleBundles';

import type { RiffProfile } from '../composer/riffProfileTypes';

import { applyRiffDensityToSilenceStyleClass } from './riffDensityPolicy';

import { riffProfileSliceFromOddMeter } from '../rhythm/oddMeterEngine';

import type { OddMeterPolicyStyle } from '../rhythm/oddMeterEngine';

import {

  defaultRiffProfileForGenerator,

  type RiffMusicalityFamily,

} from './riffMusicalityGate';

import type { RiffDensity, RiffGridMode, RiffStyleId } from './riffTypes';

import {

  isNeutralRiffGeneratorFallback,

  resolveRiffFamilyTag,

  riffFamilyAllowsOddMeterOverlay,

  riffProfileIsComplete,

} from './riffVrbRegistry';

import { compileReceiptsToRiffProfilePatch, mergeRiffProfilePatch } from './riffReceiptCompiler';



export function riffMusicalityFamilyFromBundleFamily(family: string | undefined): RiffMusicalityFamily {

  if (family === 'funk') return 'funk';

  if (family === 'rock') return 'rock';

  if (family === 'fusion') return 'fusion';

  if (family === 'art_rock') return 'art_rock';

  return 'neutral';

}



export function riffStyleIdForFamily(family: string | undefined): RiffStyleId {

  if (family === 'funk') return 'funk';

  if (family === 'fusion') return 'metheny';

  if (family === 'art_rock') return 'scofield';

  return 'neutral';

}



export type ResolveRiffGeneratorProfileMeta = {

  profile: RiffProfile;

  source: 'vrb' | 'neutral_fallback';

  familyTag: ReturnType<typeof resolveRiffFamilyTag>;

  oddMeterOverlayApplied: boolean;

  /** External chord symbols forwarded for per-bar pitch-field / harmony (when provided). */

  chordProgression?: string[];

};



export function resolveRiffGeneratorProfileWithMeta(input: {

  vrbId?: string;

  style: RiffStyleId;

  grid: RiffGridMode;

  density: RiffDensity;

  oddMeterPreset?: OddMeterPolicyStyle;

  /** User / locked chord symbols — one per bar slot after loop expansion. */

  chordProgression?: string[];

}): ResolveRiffGeneratorProfileMeta {

  const bundle = input.vrbId ? getVoiceRuleBundle(input.vrbId) : undefined;

  const familyTag = input.vrbId ? resolveRiffFamilyTag(input.vrbId) : null;

  let profile: RiffProfile;

  let source: 'vrb' | 'neutral_fallback' = 'neutral_fallback';



  if (bundle?.riffProfile && riffProfileIsComplete(bundle.riffProfile)) {

    profile = structuredClone(bundle.riffProfile) as RiffProfile;

    source = 'vrb';

  } else {

    profile = defaultRiffProfileForGenerator(input.style, input.grid);

  }



  let oddMeterOverlayApplied = false;

  const allowOddMeter = riffFamilyAllowsOddMeterOverlay(familyTag);

  if (input.oddMeterPreset && allowOddMeter) {

    const slice = riffProfileSliceFromOddMeter(input.oddMeterPreset);

    profile = {

      ...profile,

      ...slice,

      silencePolicy: {

        ...profile.silencePolicy,

        ...slice.silencePolicy,

        oddMeterPreset: input.oddMeterPreset,

      },

    };

    oddMeterOverlayApplied = true;

  }



  const baseClass = profile.silencePolicy.styleClass ?? 'riff_vrb';

  profile.silencePolicy = {

    ...profile.silencePolicy,

    styleClass: applyRiffDensityToSilenceStyleClass(baseClass, input.density),

  };

  if (input.vrbId) {
    const receiptPatch = compileReceiptsToRiffProfilePatch(input.vrbId);
    profile = mergeRiffProfilePatch(profile, receiptPatch);
  }

  return {

    profile,

    source,

    familyTag,

    oddMeterOverlayApplied,

    chordProgression: input.chordProgression?.length ? [...input.chordProgression] : undefined,

  };

}



export function resolveRiffGeneratorProfile(input: {

  vrbId?: string;

  style: RiffStyleId;

  grid: RiffGridMode;

  density: RiffDensity;

  oddMeterPreset?: OddMeterPolicyStyle;

  chordProgression?: string[];

}): RiffProfile {

  return resolveRiffGeneratorProfileWithMeta(input).profile;

}



export { isNeutralRiffGeneratorFallback };


