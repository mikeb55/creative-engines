/**
 * Shared production-world parameters — optional on style profiles and slice overrides.
 * Group defaults (`GroupParams`) require all fields; composers inherit via `resolveComposerParams`.
 */

export type CadentialResolution = 'suspended' | 'arrived';

export type EnsembleDensityCurve = 'slow_bloom' | 'tiered_lift';

export type SilenceWeighting = 'structural' | 'minimal';

export type MelodyFraming = 'integrated' | 'spotlighted' | 'floating';

export type SectionalContrastMode = 'gradual' | 'discrete';

/** Optional production parameters — slices and style profiles may override group defaults. */
export interface ComposerProductionParams {
  groovePersistence?: number;
  registralPorosity?: number;
  stringProminence?: number;
  cadentialResolution?: CadentialResolution;
  ensembleDensityCurve?: EnsembleDensityCurve;
  silenceWeighting?: SilenceWeighting;
  productionGloss?: number;
  melodyFraming?: MelodyFraming;
  soloistSpotlight?: number;
  sectionalContrastMode?: SectionalContrastMode;
}
