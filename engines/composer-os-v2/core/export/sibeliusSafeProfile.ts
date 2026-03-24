/**
 * Composer OS V2 — Sibelius-safe export profile shell
 */

import type { SibeliusSafeStatus } from './exportTypes';

/** Stub: check Sibelius-safe compliance. */
export function checkSibeliusSafe(xml: string): SibeliusSafeStatus {
  const issues: string[] = [];

  if (!xml.includes('<score-partwise')) {
    issues.push('Missing score-partwise root');
  }

  return {
    safe: issues.length === 0,
    issues,
  };
}
