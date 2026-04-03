/**
 * Long-form routing — opt-in 16/32-bar Duo vs default 8-bar (V4.0 Prompt 1/8).
 */

export type LongFormRouteKind = 'standard8' | 'duo16' | 'duo32';

export interface LongFormRouteResolution {
  kind: LongFormRouteKind;
  /** When duo16 / duo32, total bars for the long-form run. */
  totalBars?: number;
}

/** Request hints from API / runner (optional fields). */
export interface LongFormRequestHints {
  totalBars?: number;
  /** Explicit opt-in when totalBars is ambiguous. */
  longFormEnabled?: boolean;
}
