import type { GenerateRequest } from '@composer-os/app-api/appApiTypes';

export type SqBbEnsembleRelationship = 'conversation' | 'contrast' | 'unison' | 'call_and_response';
export type SqBbForegroundOwner = 'sq' | 'bb' | 'alternating';

export type SlonimskySqBbHybridState = {
  ensembleRelationship: SqBbEnsembleRelationship;
  foregroundOwner: SqBbForegroundOwner;
  /** −1 = SQ dominant … +1 = BB dominant */
  densitySplit: number;
  /** −1 = SQ high / BB low … +1 = SQ low / BB high */
  registerCarve: number;
};

export const DEFAULT_SLONIMSKY_SQ_BB_HYBRID_STATE: SlonimskySqBbHybridState = {
  ensembleRelationship: 'conversation',
  foregroundOwner: 'alternating',
  densitySplit: 0,
  registerCarve: 0,
};

export type SqBbHybridGenerateExtras = Pick<
  GenerateRequest,
  'chromaticStrength' | 'blendStrength' | 'duoIntent' | 'styleGenerationContextKeys' | 'bbLightTouch'
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

function axisToBlendStrength(axis: number): GenerateRequest['blendStrength'] {
  if (axis < -0.34) return 'light';
  if (axis < 0.34) return 'medium';
  return 'strong';
}

const FOREGROUND_DUO_INTENT: Record<SqBbForegroundOwner, GenerateRequest['duoIntent']> = {
  sq: 'supportive',
  bb: 'conversational',
  alternating: 'conversational',
};

const RELATIONSHIP_CONTEXT_KEY: Record<SqBbEnsembleRelationship, string> = {
  conversation: 'slonimsky:sq_bb:relationship=conversation',
  contrast: 'slonimsky:sq_bb:relationship=contrast',
  unison: 'slonimsky:sq_bb:relationship=unison',
  call_and_response: 'slonimsky:sq_bb:relationship=call_and_response',
};

/** SQ+BB hybrid UI → existing {@link GenerateRequest} fields + style context keys. */
export function mapSqBbHybridToGenerateRequest(state: SlonimskySqBbHybridState): SqBbHybridGenerateExtras {
  const density = clampUnit(state.densitySplit);
  const register = clampUnit(state.registerCarve);
  const keys = [
    RELATIONSHIP_CONTEXT_KEY[state.ensembleRelationship],
    `slonimsky:sq_bb:foreground=${state.foregroundOwner}`,
  ];
  return {
    chromaticStrength: axisToChromaticStrength(register),
    blendStrength: axisToBlendStrength(density),
    duoIntent: FOREGROUND_DUO_INTENT[state.foregroundOwner],
    styleGenerationContextKeys: keys,
    ...(density < -0.34 || state.foregroundOwner === 'sq' ? { bbLightTouch: true } : {}),
  };
}
