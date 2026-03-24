/**
 * Composer OS V2 — Triad Pairs module
 * Bergonzi structure, Klemons guitar-aware execution.
 */

import type { CompositionContext } from '../../compositionContext';
import type { StyleModule } from '../styleModuleTypes';
import { TRIAD_PAIRS_MODULE_ID } from './moduleTypes';

export function applyTriadPairs(context: CompositionContext): CompositionContext {
  const overrides = (context as any).styleOverrides ?? {};
  return {
    ...context,
    styleOverrides: {
      ...overrides,
      triadPairs: {
        pairedTriads: true,
        stableVsColourAlternation: true,
        dyadExtraction: true,
        syncopatedPlacement: true,
      },
    },
  } as CompositionContext;
}

export const triadPairsModule: StyleModule = {
  id: TRIAD_PAIRS_MODULE_ID,
  modify: applyTriadPairs,
};
