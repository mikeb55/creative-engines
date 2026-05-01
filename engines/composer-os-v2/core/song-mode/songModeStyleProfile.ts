/**
 * Song Mode — Style Engine profile ids (request + generation metadata).
 * Default when omitted on the wire: STYLE_ECM (applied in Song Mode handler / runGoldenPath).
 */
export type StyleProfile =
  | 'STYLE_ECM'
  | 'STYLE_SHORTER_POST_BOP'
  | 'STYLE_BEBOP_LITE'
  | 'STYLE_MODERN_JAZZ'
  | 'STYLE_BEBOP_POST_BOP'
  | 'STYLE_SOPHISTICATED_POP'
  | 'STYLE_GROOVE_SOUL'
  | 'STYLE_INDIE_ART_POP'
  | 'STYLE_FOLK_GUITAR_NARRATIVE'
  | 'STYLE_CLASSICAL_INFLUENCE'
  /** Alternate-tuning–friendly Song Mode surfaces (see `alternateGuitarTunings.ts`). */
  | 'STYLE_SONIC_YOUTH'
  | 'STYLE_JONI_MITCHELL'
  | 'STYLE_PAT_METHENY'
  | 'STYLE_ECM_CHAMBER';

const IDS: readonly StyleProfile[] = [
  'STYLE_ECM',
  'STYLE_SHORTER_POST_BOP',
  'STYLE_BEBOP_LITE',
  'STYLE_MODERN_JAZZ',
  'STYLE_BEBOP_POST_BOP',
  'STYLE_SOPHISTICATED_POP',
  'STYLE_GROOVE_SOUL',
  'STYLE_INDIE_ART_POP',
  'STYLE_FOLK_GUITAR_NARRATIVE',
  'STYLE_CLASSICAL_INFLUENCE',
  'STYLE_SONIC_YOUTH',
  'STYLE_JONI_MITCHELL',
  'STYLE_PAT_METHENY',
  'STYLE_ECM_CHAMBER',
];

export function isStyleProfile(v: unknown): v is StyleProfile {
  return typeof v === 'string' && (IDS as readonly string[]).includes(v);
}

/** Normalize wire/UI style profile id to a known StyleProfile, or undefined when absent/invalid. */
export function normalizeStyleProfileId(profile: unknown): StyleProfile | undefined {
  if (profile === undefined || profile === null) return undefined;
  return isStyleProfile(profile) ? profile : undefined;
}
