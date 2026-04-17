/**
 * Ensemble-neutral Wyble voice layout (3 roles).
 * Maps abstract contrapuntal roles to concrete score parts; string quartet and big-band score builds apply their static maps in narrow ways (see quartet / big-band Wyble helpers).
 */

export type WybleVoiceRole = 'lead_line' | 'inner_counter' | 'bass_anchor';

export type EnsembleWybleRoleTarget = {
  partId: string;
  /** Score-model voice when the role shares a part with another role (e.g. guitar V1 vs V2). */
  voice?: number;
};

export type EnsembleWybleRoleMap = Record<WybleVoiceRole, EnsembleWybleRoleTarget>;

/** Canonical role order for iteration / tests. */
export const WYBLE_VOICE_ROLES: readonly WybleVoiceRole[] = [
  'lead_line',
  'inner_counter',
  'bass_anchor',
] as const;
