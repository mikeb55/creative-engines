/**
 * Composer OS V2 — Barry Harris style module
 * Movement over static chords, 6th↔dim passing (light), guide tones, stepwise connections.
 */

import type { CompositionContext } from '../../compositionContext';
import type { StyleModule } from '../styleModuleTypes';
import { BARRY_HARRIS_MODULE_ID } from './moduleTypes';

export function applyBarryHarris(context: CompositionContext): CompositionContext {
  const overrides = (context as any).styleOverrides ?? {};
  return {
    ...context,
    styleOverrides: {
      ...overrides,
      barryHarris: {
        passingMotion: true,
        guideToneEmphasis: true,
        stepwiseVoiceLeading: true,
        dominantGravity: true,
      },
    },
  } as CompositionContext;
}

export const barryHarrisModule: StyleModule = {
  id: BARRY_HARRIS_MODULE_ID,
  modify: applyBarryHarris,
};
