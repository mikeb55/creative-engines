/** Section architecture — domain (P4) + types (P5) + resolution (P6/P7). */
export * from './sectionArchitectureDomain';
export * from './sectionArchitectureTypes';
export * from './barMeterResolution';
export * from './sectionArchitectureResolution';
export * from './resolveGenerationBarMeterMap';
export {
  resolveEffectiveContext,
  validateSong,
  resolveSectionForBar,
  mergeInstrumentOverride,
} from './sectionArchitectureResolution';
export * from './effectiveContextForBar';
