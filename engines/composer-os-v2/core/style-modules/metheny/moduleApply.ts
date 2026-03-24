/**
 * Composer OS V2 — Metheny style module
 * Lyrical, intervallic, sustain, reduced attack density.
 */

import type { CompositionContext } from '../../compositionContext';
import type { StyleModule } from '../styleModuleTypes';
import { METHENY_MODULE_ID } from './moduleTypes';

export function applyMetheny(context: CompositionContext): CompositionContext {
  const overrides = (context as any).styleOverrides ?? {};
  return {
    ...context,
    styleOverrides: {
      ...overrides,
      metheny: {
        lyricalMotif: true,
        intervallicShapes: true,
        sustainTendency: 0.7,
        attackDensityReduced: true,
        phraseOverBarlines: true,
      },
    },
  } as CompositionContext;
}

export const methenyModule: StyleModule = {
  id: METHENY_MODULE_ID,
  modify: applyMetheny,
};
