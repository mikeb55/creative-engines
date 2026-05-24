/**
 * V64 P5/P6 — Section architecture behavioural API.
 * Implementations in {@link ./sectionArchitectureResolution.ts}.
 */

export type {
  EffectiveGenerationContext,
  InstrumentOverride,
  SectionPreset,
  Song,
  ValidationResult,
} from './sectionArchitectureTypes';

export {
  resolveEffectiveContext,
  validateSong,
  resolveSectionForBar,
  mergeInstrumentOverride,
} from './sectionArchitectureResolution';
