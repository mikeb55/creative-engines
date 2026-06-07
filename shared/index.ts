/**
 * Shared notation timing core — single source of truth for all engines.
 */

export * from './notationTimingConstants';
export * from './notationTimingEngine';
export * from './musicxmlMeasurePacker';
export {
  validateMeasureDurations,
  validateVoiceAlignment,
  type ValidationReport as MusicXmlValidationReport,
} from './musicxmlTimingValidation';
export * from './scoreModel';
export {
  validateMeasure,
  validateScore,
  composeVoice,
  composeMeasure,
} from './barComposer';
export * from './scoreToTimedEvents';
export {
  validateAcceptanceScore,
  validateEllingtonAcceptance,
  type ValidationReport as NotationValidationReport,
} from './notationValidation';
export * from './barFirstMusicXMLWriter';
