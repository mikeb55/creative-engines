import type { GenerateRequest } from '@composer-os/app-api/appApiTypes';

/** Song Mode Slonimsky proving writers (Z9 engine allowlist). */
export const SLONIMSKY_SONG_MODE_WRITERS = [
  'pat_metheny',
  'frank_zappa',
  'sonic_youth',
  'joni_mitchell',
  'radiohead',
] as const;

export type SlonimskySongModeWriterId = (typeof SLONIMSKY_SONG_MODE_WRITERS)[number];

export type SlonimskySourcePreset = 'lyrical' | 'angular' | 'symmetric' | 'chromatic' | 'riff';

export type SlonimskyMacroState = {
  sourcePreset: SlonimskySourcePreset;
  /** -1 … +1 */
  motion: number;
  /** -1 … +1 */
  tension: number;
  /** -1 … +1 */
  variation: number;
};

export const DEFAULT_SLONIMSKY_MACRO_STATE: SlonimskyMacroState = {
  sourcePreset: 'lyrical',
  motion: 0,
  tension: 0,
  variation: 0,
};

/** Song Mode only — BB/SQ use {@link SlonimskyEnsemblePanel}. */
export const SLONIMSKY_UNIVERSAL_PANEL_PRESET_IDS = ['song_mode'] as const;

const SOURCE_PRESET_TENSION_BIAS: Record<SlonimskySourcePreset, number> = {
  lyrical: -0.35,
  angular: 0.45,
  symmetric: 0,
  chromatic: 0.55,
  riff: 0.4,
};

function clampUnit(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(-1, Math.min(1, n));
}

function axisToChromaticStrength(axis: number): GenerateRequest['chromaticStrength'] {
  if (axis < -0.34) return 'off';
  if (axis < 0.34) return 'subtle';
  return 'prominent';
}

function axisToBlendStrength(axis: number): GenerateRequest['blendStrength'] {
  if (axis < -0.34) return 'light';
  if (axis < 0.34) return 'medium';
  return 'strong';
}

function axisToDuoIntent(axis: number): GenerateRequest['duoIntent'] {
  return axis < 0 ? 'supportive' : 'conversational';
}

/**
 * Maps universal Slonimsky macro UI → existing {@link GenerateRequest} fields only
 * (`chromaticStrength`, `blendStrength`, `duoIntent`). Flavor preset biases tension axis.
 */
export function mapSlonimskyMacroStateToGenerateRequest(
  state: SlonimskyMacroState
): Pick<GenerateRequest, 'chromaticStrength' | 'blendStrength' | 'duoIntent'> {
  const motion = clampUnit(state.motion);
  const tension = clampUnit(state.tension);
  const variation = clampUnit(state.variation);
  const tensionAxis = clampUnit(tension + SOURCE_PRESET_TENSION_BIAS[state.sourcePreset]);
  return {
    chromaticStrength: axisToChromaticStrength(tensionAxis),
    blendStrength: axisToBlendStrength(motion),
    duoIntent: axisToDuoIntent(variation),
  };
}
