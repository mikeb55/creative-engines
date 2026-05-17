/**
 * SQ Harmonic Voice profile registry — Ravel, Herrmann film stub, future SQ picks.
 */

import { HERRMANN_SQ_VRB_PROFILE } from './herrmannFilmStubVrb';
import { MORRICONE_SQ_VRB_PROFILE } from './morriconeFilmStubVrb';
import { RAVEL_SQ_VRB_PROFILE } from './ravelSqVrb';
import { WILLIAMS_SQ_VRB_PROFILE } from './williamsFilmStubVrb';
import type { SqVrbGceScorerAdjustments, SqVrbProfile } from './sqVrbProfileTypes';

const SQ_VRB_PROFILE_BY_ID: Readonly<Record<string, SqVrbProfile>> = {
  ravel: RAVEL_SQ_VRB_PROFILE,
  herrmann: HERRMANN_SQ_VRB_PROFILE,
  morricone: MORRICONE_SQ_VRB_PROFILE,
  williams: WILLIAMS_SQ_VRB_PROFILE,
};

export function getSqVrbProfile(vrbId: string): SqVrbProfile | undefined {
  return SQ_VRB_PROFILE_BY_ID[vrbId.trim().toLowerCase()];
}

export function getSqVrbGceAdjustments(vrbId: string | undefined): SqVrbGceScorerAdjustments | undefined {
  if (!vrbId) return undefined;
  return getSqVrbProfile(vrbId)?.gceScorerAdjustments;
}
