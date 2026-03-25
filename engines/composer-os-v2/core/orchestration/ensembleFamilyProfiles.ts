/**
 * Default tendencies per ensemble family — planning metadata only (Prompt 4/7).
 */

import type { EnsembleFamily } from './ensembleFamilyTypes';
import type { OrchestrationRoleLabel } from './orchestrationRoleTypes';
import type { DensityBand, RegisterBand } from './orchestrationTypes';

export interface EnsembleFamilyProfile {
  family: EnsembleFamily;
  /** Relative weight hints for role selection (not normalized probabilities). */
  defaultRoleTendencies: Partial<Record<OrchestrationRoleLabel, number>>;
  /** Typical density band per formal section archetype. */
  densityTendencies: Record<'opening' | 'development' | 'climax' | 'release', DensityBand>;
  /** Default register buckets by abstract part role (not instrument id). */
  registerDefaults: {
    melodicLead: RegisterBand;
    harmonicBass: RegisterBand;
    innerHarmony: RegisterBand;
    pad: RegisterBand;
  };
  textureConstraints: {
    maxForegroundLines: number;
    allowSilence: boolean;
  };
  compatiblePresetIds: readonly string[];
  allowedRoles: readonly OrchestrationRoleLabel[];
  requireBassAnchor: boolean;
}

const duo: EnsembleFamilyProfile = {
  family: 'duo',
  defaultRoleTendencies: {
    lead: 1,
    bass_anchor: 1,
    support: 0.4,
    silence: 0.05,
  },
  densityTendencies: {
    opening: 'moderate',
    development: 'moderate',
    climax: 'dense',
    release: 'sparse',
  },
  registerDefaults: {
    melodicLead: 'high',
    harmonicBass: 'bass',
    innerHarmony: 'middle',
    pad: 'low',
  },
  textureConstraints: { maxForegroundLines: 1, allowSilence: true },
  compatiblePresetIds: ['guitar_bass_duo'],
  allowedRoles: ['lead', 'support', 'pad', 'counterline', 'bass_anchor', 'inner_motion', 'silence'],
  requireBassAnchor: true,
};

const chamber: EnsembleFamilyProfile = {
  family: 'chamber',
  defaultRoleTendencies: {
    lead: 0.9,
    support: 0.7,
    pad: 0.5,
    counterline: 0.45,
    bass_anchor: 0.95,
    inner_motion: 0.6,
    silence: 0.1,
  },
  densityTendencies: {
    opening: 'sparse',
    development: 'moderate',
    climax: 'dense',
    release: 'sparse',
  },
  registerDefaults: {
    melodicLead: 'high',
    harmonicBass: 'bass',
    innerHarmony: 'middle',
    pad: 'middle',
  },
  textureConstraints: { maxForegroundLines: 2, allowSilence: true },
  compatiblePresetIds: ['ecm_chamber'],
  allowedRoles: ['lead', 'support', 'pad', 'counterline', 'bass_anchor', 'inner_motion', 'silence'],
  requireBassAnchor: true,
};

const bigBand: EnsembleFamilyProfile = {
  family: 'big_band',
  defaultRoleTendencies: {
    lead: 1,
    support: 0.85,
    pad: 0.7,
    counterline: 0.75,
    bass_anchor: 1,
    inner_motion: 0.8,
    silence: 0.15,
  },
  densityTendencies: {
    opening: 'moderate',
    development: 'dense',
    climax: 'dense',
    release: 'moderate',
  },
  registerDefaults: {
    melodicLead: 'high',
    harmonicBass: 'sub_bass',
    innerHarmony: 'middle',
    pad: 'middle',
  },
  textureConstraints: { maxForegroundLines: 3, allowSilence: true },
  compatiblePresetIds: ['big_band'],
  allowedRoles: ['lead', 'support', 'pad', 'counterline', 'bass_anchor', 'inner_motion', 'silence'],
  requireBassAnchor: true,
};

const stringQuartet: EnsembleFamilyProfile = {
  family: 'string_quartet',
  defaultRoleTendencies: {
    lead: 0.85,
    support: 0.75,
    pad: 0.5,
    counterline: 0.9,
    bass_anchor: 0.95,
    inner_motion: 0.85,
    silence: 0.05,
  },
  densityTendencies: {
    opening: 'sparse',
    development: 'moderate',
    climax: 'dense',
    release: 'sparse',
  },
  registerDefaults: {
    melodicLead: 'high',
    harmonicBass: 'bass',
    innerHarmony: 'middle',
    pad: 'middle',
  },
  textureConstraints: { maxForegroundLines: 2, allowSilence: true },
  compatiblePresetIds: ['string_quartet'],
  allowedRoles: ['lead', 'support', 'pad', 'counterline', 'bass_anchor', 'inner_motion', 'silence'],
  requireBassAnchor: true,
};

const songwritingLeadSheet: EnsembleFamilyProfile = {
  family: 'songwriting_lead_sheet',
  defaultRoleTendencies: {
    lead: 1,
    support: 0.5,
    pad: 0.35,
    bass_anchor: 0.9,
    silence: 0.2,
  },
  densityTendencies: {
    opening: 'moderate',
    development: 'moderate',
    climax: 'dense',
    release: 'sparse',
  },
  registerDefaults: {
    melodicLead: 'high',
    harmonicBass: 'bass',
    innerHarmony: 'middle',
    pad: 'low',
  },
  textureConstraints: { maxForegroundLines: 1, allowSilence: true },
  compatiblePresetIds: ['song_mode'],
  allowedRoles: ['lead', 'support', 'pad', 'counterline', 'bass_anchor', 'inner_motion', 'silence'],
  /** Vocal lead sheet may omit notated bass in some passes; anchor still recommended when harmony present. */
  requireBassAnchor: false,
};

const PROFILES: Record<EnsembleFamily, EnsembleFamilyProfile> = {
  duo,
  chamber,
  big_band: bigBand,
  string_quartet: stringQuartet,
  songwriting_lead_sheet: songwritingLeadSheet,
};

export function getEnsembleFamilyProfile(family: EnsembleFamily): EnsembleFamilyProfile {
  return PROFILES[family];
}

export function listEnsembleFamilies(): EnsembleFamily[] {
  return Object.keys(PROFILES) as EnsembleFamily[];
}
