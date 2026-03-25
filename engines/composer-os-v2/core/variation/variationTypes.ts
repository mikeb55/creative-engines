/**
 * User-facing variation id → deterministic engine seed (Prompt 2/2 UX layer).
 * Raw `seed` remains the internal primitive; UI may send `variationId` instead.
 */

/** Opaque string chosen by the user or preset (stable hash input). */
export type VariationId = string;

/** Optional namespace salt so two libraries can map the same label to different seeds. */
export const VARIATION_NAMESPACE_DEFAULT = 'composer_os_v2' as const;
