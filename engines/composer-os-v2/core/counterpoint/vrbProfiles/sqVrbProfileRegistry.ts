/**
 * SQ Harmonic Voice profile registry — Ravel, Herrmann film stub, future SQ picks.
 */

import { GLASS_SQ_VRB_PROFILE } from './glassFilmStubVrb';
import { GOLDSMITH_SQ_VRB_PROFILE } from './goldsmithFilmStubVrb';
import { HERRMANN_SQ_VRB_PROFILE } from './herrmannFilmStubVrb';
import { MORRICONE_SQ_VRB_PROFILE } from './morriconeFilmStubVrb';
import { RAVEL_SQ_VRB_PROFILE } from './ravelSqVrb';
import { ROTA_SQ_VRB_PROFILE } from './rotaFilmStubVrb';
import { WILLIAMS_SQ_VRB_PROFILE } from './williamsFilmStubVrb';
import { BADALAMENTI_SQ_VRB_PROFILE } from './badalamentiFilmStubVrb';
import { ZIMMER_SQ_VRB_PROFILE } from './zimmerFilmStubVrb';
import { SHOSTAKOVICH_SQ_VRB_PROFILE } from './shostakovichSqVrb';
import { WEBERN_SQ_VRB_PROFILE } from './webernSqVrb';
import { JONI_MITCHELL_SQ_VRB_PROFILE } from './joniMitchellSqVrb';
import { LIGETI_SQ_VRB_PROFILE } from './ligetiSqVrb';
import type { SqVrbGceScorerAdjustments, SqVrbProfile } from './sqVrbProfileTypes';

const SQ_VRB_PROFILE_BY_ID: Readonly<Record<string, SqVrbProfile>> = {
  ravel: RAVEL_SQ_VRB_PROFILE,
  herrmann: HERRMANN_SQ_VRB_PROFILE,
  morricone: MORRICONE_SQ_VRB_PROFILE,
  williams: WILLIAMS_SQ_VRB_PROFILE,
  rota: ROTA_SQ_VRB_PROFILE,
  goldsmith: GOLDSMITH_SQ_VRB_PROFILE,
  glass: GLASS_SQ_VRB_PROFILE,
  zimmer: ZIMMER_SQ_VRB_PROFILE,
  badalamenti: BADALAMENTI_SQ_VRB_PROFILE,
  shostakovich: SHOSTAKOVICH_SQ_VRB_PROFILE,
  webern: WEBERN_SQ_VRB_PROFILE,
  joni_mitchell: JONI_MITCHELL_SQ_VRB_PROFILE,
  ligeti: LIGETI_SQ_VRB_PROFILE,
};

export function getSqVrbProfile(vrbId: string): SqVrbProfile | undefined {
  return SQ_VRB_PROFILE_BY_ID[vrbId.trim().toLowerCase()];
}

export function getSqVrbGceAdjustments(vrbId: string | undefined): SqVrbGceScorerAdjustments | undefined {
  if (!vrbId) return undefined;
  return getSqVrbProfile(vrbId)?.gceScorerAdjustments;
}
