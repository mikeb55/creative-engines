/**
 * Song Mode — Style Engine profile ids (request + generation metadata).
 * Default when omitted on the wire: STYLE_ECM (applied in Song Mode handler / runGoldenPath).
 */

export type StyleProfile = 'STYLE_ECM' | 'STYLE_SHORTER_POST_BOP' | 'STYLE_BEBOP_LITE';

const IDS: readonly StyleProfile[] = ['STYLE_ECM', 'STYLE_SHORTER_POST_BOP', 'STYLE_BEBOP_LITE'];

export function isStyleProfile(v: unknown): v is StyleProfile {
  return typeof v === 'string' && (IDS as readonly string[]).includes(v);
}
