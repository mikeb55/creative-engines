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

export type EnsembleSlonimskyMacroExtras = Pick<
  GenerateRequest,
  'chromaticStrength' | 'blendStrength' | 'duoIntent'
>;

export type BigBandSlonimskyMiddleExtras = Pick<
  GenerateRequest,
  'figureResponse' | 'chromaticStrength' | 'styleGenerationContextKeys'
>;

function clampUnit(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(-1, Math.min(1, n));
}

function axisToChromaticStrength(axis: number): GenerateRequest['chromaticStrength'] {
  if (axis < -0.34) return 'off';
  if (axis < 0.34) return 'subtle';
  return 'prominent';
}

function cohesionToFigureResponse(cohesion: number): GenerateRequest['figureResponse'] {
  const c = clampUnit(cohesion);
  if (c < -0.34) return 'low';
  if (c < 0.34) return 'medium';
  return 'high';
}

/** +1 grip = chord-tone focus (less outside); −1 = more chromatic freedom. */
function harmonicGripToChromaticStrength(grip: number): GenerateRequest['chromaticStrength'] {
  return axisToChromaticStrength(-clampUnit(grip));
}

const BB_SECTION_ROLE_KEY: Record<BigBandSlonimskySectionRole, string> = {
  lead: 'slonimsky:bb:section_role=lead',
  support: 'slonimsky:bb:section_role=support',
  counter: 'slonimsky:bb:section_role=counter',
};

const BB_ENSEMBLE_PRESET_KEY: Record<BigBandSlonimskyEnsemblePreset, string> = {
  orchestral: 'slonimsky:bb:ensemble=orchestral',
  funk: 'slonimsky:bb:ensemble=funk',
  bebop: 'slonimsky:bb:ensemble=bebop',
  fusion: 'slonimsky:bb:ensemble=fusion',
};

/** BB middle layer → {@link GenerateRequest.figureResponse}, {@link GenerateRequest.chromaticStrength}, context keys. */
export function mapBigBandSlonimskyMiddleToGenerateRequest(
  state: BigBandSlonimskyMiddleState
): BigBandSlonimskyMiddleExtras {
  return {
    figureResponse: cohesionToFigureResponse(state.cohesion),
    chromaticStrength: harmonicGripToChromaticStrength(state.harmonicGrip),
    styleGenerationContextKeys: [
      BB_SECTION_ROLE_KEY[state.sectionRole],
      BB_ENSEMBLE_PRESET_KEY[state.ensemblePreset],
    ],
  };
}

/** SQ / non-BB ensemble — macro only. */
export function mapEnsembleSlonimskyToGenerateRequest(
  macro: SlonimskyMacroState
): EnsembleSlonimskyMacroExtras {
  return mapSlonimskyMacroStateToGenerateRequest(macro);
}

/** BB — macro (blend/duoIntent) + middle (cohesion → figureResponse, harmonic grip → chromaticStrength). */
export function mapBigBandEnsembleSlonimskyToGenerateRequest(
  macro: SlonimskyMacroState,
  middle: BigBandSlonimskyMiddleState
): EnsembleSlonimskyMacroExtras & BigBandSlonimskyMiddleExtras {
  const macroFields = mapSlonimskyMacroStateToGenerateRequest(macro);
  const middleFields = mapBigBandSlonimskyMiddleToGenerateRequest(middle);
  return {
    ...macroFields,
    ...middleFields,
  };
}
