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
  /** Legacy alias kept for compatibility with older UI/API callers. */
  | 'STYLE_INDEPENDENT_ART_POP'
  | 'STYLE_FOLK_GUITAR_NARRATIVE'
  | 'STYLE_CLASSICAL_INFLUENCE';

const IDS: readonly StyleProfile[] = [
  'STYLE_ECM',
  'STYLE_SHORTER_POST_BOP',
  'STYLE_BEBOP_LITE',
  'STYLE_MODERN_JAZZ',
  'STYLE_BEBOP_POST_BOP',
  'STYLE_SOPHISTICATED_POP',
  'STYLE_GROOVE_SOUL',
  'STYLE_INDIE_ART_POP',
  'STYLE_INDEPENDENT_ART_POP',
  'STYLE_FOLK_GUITAR_NARRATIVE',
  'STYLE_CLASSICAL_INFLUENCE',
];

export function isStyleProfile(v: unknown): v is StyleProfile {
  return typeof v === 'string' && (IDS as readonly string[]).includes(v);
}

/** Canonicalize deprecated aliases at API boundaries before policy checks. */
export function normalizeStyleProfileId(v: string | undefined | null): StyleProfile | undefined {
  if (!v) return undefined;
  if (v === 'STYLE_INDEPENDENT_ART_POP') return 'STYLE_INDIE_ART_POP';
  return isStyleProfile(v) ? v : undefined;
}
