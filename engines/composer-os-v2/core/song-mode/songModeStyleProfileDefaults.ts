/**
 * When Song Mode omits an explicit `styleProfile`, derive the engine {@link StyleProfile}
 * from the primary songwriter id (modal colour / duo defaults).
 * Mirrors the idea of arranger→composer mapping for Big Band, but for Song Mode surfaces only.
 */

import type { StyleProfile } from './songModeStyleProfile';

/** Maps canonical primary songwriter id → default StyleProfile when the request does not set one. */
export function defaultStyleProfileForPrimarySongwriter(
  primary: string | null | undefined
): StyleProfile | undefined {
  if (primary == null || typeof primary !== 'string') return undefined;
  const raw = primary.trim().toLowerCase();
  switch (raw) {
    case 'wayne_shorter':
      return 'STYLE_SHORTER_POST_BOP';
    case 'pat_metheny':
      return 'STYLE_PAT_METHENY';
    case 'ecm_chamber':
      return 'STYLE_ECM_CHAMBER';
    case 'bacharach':
      return 'STYLE_SOPHISTICATED_POP';
    case 'cole_porter':
      return 'STYLE_SOPHISTICATED_POP';
    case 'count_basie':
      return 'STYLE_BEBOP_LITE';
    case 'barry_harris':
      return 'STYLE_BEBOP_LITE';
    case 'donald_fagen':
      return 'STYLE_MODERN_JAZZ';
    default:
      return undefined;
  }
}
