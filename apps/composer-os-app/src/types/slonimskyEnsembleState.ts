import type { GenerateRequest } from '@composer-os/app-api/appApiTypes';
import {
  mapSlonimskyMacroStateToGenerateRequest,
  type SlonimskyMacroState,
} from './slonimskyMacroState';

export type BigBandSlonimskySectionRole = 'lead' | 'support' | 'counter';
export type BigBandSlonimskyEnsemblePreset = 'orchestral' | 'funk' | 'bebop' | 'fusion';

export type BigBandSlonimskyMiddleState = {
  sectionRole: BigBandSlonimskySectionRole;
  cohesion: number;
  harmonicGrip: number;
  ensemblePreset: BigBandSlonimskyEnsemblePreset;
};

export const DEFAULT_BIG_BAND_SLONIMSKY_MIDDLE: BigBandSlonimskyMiddleState = {
  sectionRole: 'lead',
  cohesion: 0,
  harmonicGrip: 0,
  ensemblePreset: 'orchestral',
};

export type StringQuartetSlonimskyTextureRole = 'melody' | 'accompaniment' | 'counterpoint';
export type StringQuartetSlonimskyEnsemblePreset = 'romantic' | 'modern' | 'minimal' | 'baroque';

export type StringQuartetSlonimskyMiddleState = {
  textureRole: StringQuartetSlonimskyTextureRole;
  voiceIndependence: number;
  registerSpread: number;
  ensemblePreset: StringQuartetSlonimskyEnsemblePreset;
};

export const DEFAULT_STRING_QUARTET_SLONIMSKY_MIDDLE: StringQuartetSlonimskyMiddleState = {
  textureRole: 'melody',
  voiceIndependence: 0,
  registerSpread: 0,
  ensemblePreset: 'romantic',
};

/** BB / SQ — macro → existing {@link GenerateRequest} fields (middle layer is UI-only until engine contract). */
export function mapEnsembleSlonimskyToGenerateRequest(
  macro: SlonimskyMacroState
): Pick<GenerateRequest, 'chromaticStrength' | 'blendStrength' | 'duoIntent'> {
  return mapSlonimskyMacroStateToGenerateRequest(macro);
}
