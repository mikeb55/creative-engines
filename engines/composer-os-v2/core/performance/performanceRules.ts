/**
 * Central rules for performance pass until export correctness is fully proven.
 */

/**
 * When false, performance logic must not change note startBeat, duration, or measure layout.
 * (Alias for receipt/docs: duration-safe performance pass.)
 */
export const PERFORMANCE_PASS_ALLOWS_DURATION_OR_BAR_CHANGES = false;
