/**
 * Song Mode — first “non-placeholder” style surface: selected Style Engine profile nudges
 * concrete generationMetadata fields that downstream passes already consume.
 *
 * Scope (this pass): **STYLE_GROOVE_SOUL** only — additive biases after optional primary-songwriter resolution.
 */

import type { GenerationMetadata } from '../compositionContext';
import type { StyleProfile } from './songModeStyleProfile';

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/**
 * When the user picks **Groove / Soul**, bias syncopation + density upward so Phase **C1** rhythm overlay
 * (`songwriterSyncopationBias` → `selectOverlaysForPhrase`) and related intent differ measurably from defaults.
 * Velocity shaping for this profile remains in `songModeStyleEngine.ts` (Style Engine pass).
 */
export function applyGrooveSoulStyleSurface(metadata: GenerationMetadata, styleProfile: StyleProfile | undefined): void {
  if (metadata.songModeHookFirstIdentity !== true) return;
  if (styleProfile !== 'STYLE_GROOVE_SOUL') return;

  const sync = (metadata.songwriterSyncopationBias ?? 0.5) + 0.12;
  const dens = (metadata.songwriterDensityBias ?? 0.5) + 0.08;
  metadata.songwriterSyncopationBias = clamp01(sync);
  metadata.songwriterDensityBias = clamp01(dens);

  metadata.songModeStyleSurfaceNotes = [
    'STYLE_GROOVE_SOUL: raised syncopation and density biases for Song Mode rhythm overlay (Phase C1) and phrase intent.',
    'STYLE_GROOVE_SOUL: Style Engine pass applies profile-specific note velocities (not an imitation of any artist).',
  ];
}
