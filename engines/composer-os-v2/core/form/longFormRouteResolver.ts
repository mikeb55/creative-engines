/**
 * Resolves whether to use the safe 8-bar golden path or the opt-in 32-bar Duo long-form route.
 */

import type { LongFormRouteResolution, LongFormRequestHints } from './longFormRouteTypes';

const LONG_FORM_DUO_BARS = 32;

/**
 * Long-form Duo is **opt-in only**:
 * - `presetId === 'guitar_bass_duo'` AND
 * - (`totalBars` ≥ 9, typically 32) OR `longFormEnabled === true` with `totalBars === 32`
 */
export function resolveLongFormRoute(
  presetId: string | undefined,
  hints?: LongFormRequestHints
): LongFormRouteResolution {
  if (presetId !== 'guitar_bass_duo') {
    return { kind: 'standard8' };
  }
  const tb = hints?.totalBars;
  const enabled = hints?.longFormEnabled === true;
  if (tb === LONG_FORM_DUO_BARS || (enabled && tb === LONG_FORM_DUO_BARS)) {
    return { kind: 'duo32', totalBars: LONG_FORM_DUO_BARS };
  }
  if (typeof tb === 'number' && Number.isFinite(tb) && tb > 8 && tb === LONG_FORM_DUO_BARS) {
    return { kind: 'duo32', totalBars: LONG_FORM_DUO_BARS };
  }
  return { kind: 'standard8' };
}

export { LONG_FORM_DUO_BARS };
