/** Section architecture — domain (P4) + types (P5) + contract signatures (P5). */
export * from './sectionArchitectureDomain';
export * from './sectionArchitectureTypes';
export type {
  resolveEffectiveContext,
  validateSong,
  resolveSectionForBar,
  mergeInstrumentOverride,
} from './sectionArchitectureContracts';
