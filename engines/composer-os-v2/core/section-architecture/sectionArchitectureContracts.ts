/**
 * V64 P5 — Section architecture behavioural API (signatures only; implementations in P6).
 */

import type {
  EffectiveGenerationContext,
  InstrumentOverride,
  SectionPreset,
  Song,
  ValidationResult,
} from './sectionArchitectureTypes';

/**
 * Resolve all generation fields for one bar after full precedence merge.
 * @see docs/COMPOSER_OS_SECTION_ARCHITECTURE.md
 */
export declare function resolveEffectiveContext(
  bar: number,
  song: Song
): EffectiveGenerationContext;

/** Structural + semantic validation for a {@link Song} document. */
export declare function validateSong(song: Song): ValidationResult;

/** Return the section preset owning `bar`, or null if out of range / gap. */
export declare function resolveSectionForBar(
  bar: number,
  sections: readonly SectionPreset[]
): SectionPreset | null;

/** Apply instrument-scoped override onto a resolved bar context (P6). */
export declare function mergeInstrumentOverride(
  base: EffectiveGenerationContext,
  override: InstrumentOverride
): EffectiveGenerationContext;
