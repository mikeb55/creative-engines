/**
 * Shared production-world parameters — optional on style profiles and slice overrides.
 * Group defaults (`GroupParams`) require all fields; composers inherit via `resolveComposerParams`.
 */

/** ECM: endings hover unresolved. CTI: sections land decisively. Post-Bop: blues/modal functional logic. */
export type CadentialResolution = 'suspended' | 'arrived' | 'functional_modal';

/** ECM: slow bloom. CTI: tiered lift. Post-Bop: head → solo intensity → head out. */
export type EnsembleDensityCurve = 'slow_bloom' | 'tiered_lift' | 'blowing_arc';

/** ECM: structural silence. CTI: minimal gaps. Post-Bop: rhythmic breath and punctuation. */
export type SilenceWeighting = 'structural' | 'minimal' | 'rhythmic';

/** ECM: integrated texture. CTI: spotlighted tune. Post-Bop: head stated, dissolved, restated. */
export type MelodyFraming = 'integrated' | 'spotlighted' | 'floating' | 'head_based';

/** ECM: gradual melt. CTI: discrete blocks. Post-Bop: solo rotation and intensity build. */
export type SectionalContrastMode = 'gradual' | 'discrete' | 'blowing_sections';

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
