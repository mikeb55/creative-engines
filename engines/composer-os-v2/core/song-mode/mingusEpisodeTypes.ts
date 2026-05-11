/**
 * Charles Mingus — episode / texture plan types (shared with `compositionContext` metadata).
 */

export type MingusTextureArchetype = 'dirge' | 'riff_layer' | 'collective_shout' | 'pedal_modal';

export type MingusTempoTier = 'slow' | 'medium' | 'fast';

export type MingusHarmonicPoolFamily = 'blues' | 'modal' | 'chromatic';

export type MingusImprovDensity = 'sparse' | 'medium' | 'dense';

export type MingusEpisodeImprovMode = 'scripted' | 'collective' | 'hybrid';

export interface MingusEpisodeSpec {
  index: number;
  startBar: number;
  endBar: number;
  tempoTier: MingusTempoTier;
  texture: MingusTextureArchetype;
  harmonicFamily: MingusHarmonicPoolFamily;
  improvDensity: MingusImprovDensity;
  improvMode: MingusEpisodeImprovMode;
}

export interface CharlesMingusEpisodePlan {
  episodes: readonly MingusEpisodeSpec[];
  /** Abrupt form/texture shift bar (1-based); set when `totalBars` is long enough. */
  shockCutBar?: number;
  /** Deterministic ostinato motif ids (1–3 per piece). */
  bassOstinatoIds: readonly string[];
}
