/**
 * V65 P1 — Per-bar effective context cache + Song→FormMap bridge + consumer helpers.
 */

import type { CompositionContext } from '../compositionContext';
import type { VoiceRuleBundle } from '../composer/voiceRuleBundle';
import type { RiffProfile } from '../composer/riffProfileTypes';
import { mergeRiffProfilePatch } from '../riff-generator/riffReceiptCompiler';
import { formMapFromSong } from './resolveGenerationBarMeterMap';
import { resolveEffectiveContext, resolveSectionForBar, validateSong } from './sectionArchitectureResolution';
import type {
  DensityLevel,
  EffectiveGenerationContext,
  InstrumentKind,
  InstrumentOverride,
  PitchProfile,
  RhythmProfile,
  Song,
  VoicingProfile,
} from './sectionArchitectureTypes';
import type { FormMap } from '../compositionContext';

const effectiveContextCaches = new WeakMap<CompositionContext, Map<number, EffectiveGenerationContext>>();

export function clearEffectiveContextCache(context: CompositionContext): void {
  effectiveContextCaches.delete(context);
}

/** Validate Song, bridge sections → FormMap, attach song to context. */
export function wireSongArchitectureAtPipelineEntry(
  context: CompositionContext,
  song: Song | undefined,
  applyForm: (ctx: CompositionContext, form: FormMap) => void
): void {
  if (!song) return;

  const validation = validateSong(song);
  if (!validation.ok) {
    const errors = validation.issues
      .filter((i) => i.severity === 'error')
      .map((i) => `${i.code}: ${i.message}`);
    throw new Error(`Song validation failed — ${errors.join('; ')}`);
  }

  context.song = song;
  clearEffectiveContextCache(context);

  const form = formMapFromSong(song);
  applyForm(context, form);

  if (context.form.totalBars !== song.totalBars) {
    context.form = { ...context.form, totalBars: song.totalBars };
    if (context.phrase) {
      context.phrase = { ...context.phrase, totalBars: song.totalBars };
    }
  }

  context.generationMetadata = {
    ...context.generationMetadata,
    sectionArchitectureWired: true,
    songSchemaVersion: song.schemaVersion,
    songId: song.id,
  };
}

export function hasSectionArchitecture(context: CompositionContext): boolean {
  return context.song != null && context.song.schemaVersion >= 1;
}

export function getEffectiveContextForBar(
  bar: number,
  context: CompositionContext
): EffectiveGenerationContext | undefined {
  const song = context.song;
  if (!song) return undefined;

  let cache = effectiveContextCaches.get(context);
  if (!cache) {
    cache = new Map();
    effectiveContextCaches.set(context, cache);
  }

  const b = Math.floor(bar);
  const cached = cache.get(b);
  if (cached) return cached;

  const resolved = resolveEffectiveContext(b, song);
  const withDensity = applyTransitionDensityInterpolation(b, song, resolved);
  cache.set(b, withDensity);
  return withDensity;
}

function densityLevelToScalar(d: DensityLevel | undefined): number {
  if (d === undefined) return 0.5;
  if (typeof d === 'number') return Math.min(1, Math.max(0, d));
  if (d === 'sparse') return 0.2;
  if (d === 'dense') return 0.85;
  return 0.5;
}

function scalarToDensityHint(s: number): 'sparse' | 'medium' | 'dense' {
  if (s <= 0.35) return 'sparse';
  if (s >= 0.65) return 'dense';
  return 'medium';
}

function applyTransitionDensityInterpolation(
  bar: number,
  song: Song,
  ctx: EffectiveGenerationContext
): EffectiveGenerationContext {
  const transition = ctx.transition;
  if (!transition?.interpolateDensity) return ctx;

  const section = resolveSectionForBar(bar, song.sections);
  if (!section) return ctx;

  let neighborSection = null as (typeof song.sections)[number] | null;
  let blend = 0;

  if (
    section.transitionOut?.interpolateDensity &&
    bar >= section.barRange.endBar - (section.transitionOut.bars ?? 0)
  ) {
    const nextBar = section.barRange.endBar + 1;
    neighborSection = resolveSectionForBar(nextBar, song.sections);
    const window = Math.max(1, section.transitionOut.bars ?? 1);
    const start = section.barRange.endBar - window + 1;
    blend = (bar - start + 1) / window;
  } else if (
    section.transitionIn?.interpolateDensity &&
    bar <= section.barRange.startBar + (section.transitionIn.bars ?? 0) - 1
  ) {
    const prevBar = section.barRange.startBar - 1;
    neighborSection = resolveSectionForBar(prevBar, song.sections);
    const window = Math.max(1, section.transitionIn.bars ?? 1);
    const start = section.barRange.startBar;
    blend = 1 - (bar - start + 1) / window;
  }

  if (!neighborSection) return ctx;

  const selfScalar = densityScalarFromContext(ctx);
  const neighborCtx = resolveEffectiveContext(
    neighborSection.barRange.startBar,
    song
  );
  const neighborScalar = densityScalarFromContext(neighborCtx);
  const blended = selfScalar * (1 - blend) + neighborScalar * blend;

  return {
    ...ctx,
    density: blended,
    energy: blended,
  };
}

function densityScalarFromContext(ctx: EffectiveGenerationContext): number {
  if (typeof ctx.energy === 'number') {
    return Math.min(1, Math.max(0, ctx.energy));
  }
  return densityLevelToScalar(ctx.density);
}

/** Scalar 0–1 density for bar (energy arc + section density + instrument override). */
export function getSectionArchitectureDensityScalar(
  bar: number,
  context: CompositionContext,
  instrument?: InstrumentKind
): number | undefined {
  if (!hasSectionArchitecture(context)) return undefined;
  const eff = getEffectiveContextForBar(bar, context);
  if (!eff) return undefined;

  let scalar = densityScalarFromContext(eff);
  const ov = instrumentOverrideForBar(bar, context, instrument);
  if (ov?.density !== undefined) {
    scalar = densityLevelToScalar(ov.density);
  }
  return scalar;
}

export function getSectionArchitectureDensityHint(
  bar: number,
  context: CompositionContext,
  instrument?: InstrumentKind
): 'sparse' | 'medium' | 'dense' | undefined {
  const scalar = getSectionArchitectureDensityScalar(bar, context, instrument);
  if (scalar === undefined) return undefined;
  return scalarToDensityHint(scalar);
}

export function instrumentOverrideForBar(
  bar: number,
  context: CompositionContext,
  instrument?: InstrumentKind
): InstrumentOverride | undefined {
  if (!hasSectionArchitecture(context)) return undefined;
  const song = context.song!;
  const section = resolveSectionForBar(Math.floor(bar), song.sections);
  if (!section?.instrumentOverrides?.length) return undefined;

  if (instrument) {
    const match = section.instrumentOverrides.find(
      (ov) => ov.tuningProfile?.instrumentType === instrument
    );
    if (match) return match;
    const untyped = section.instrumentOverrides.find((ov) => !ov.tuningProfile?.instrumentType);
    if (untyped) return untyped;
    return undefined;
  }

  return section.instrumentOverrides[0];
}

export function getEffectivePitchProfileForBar(
  bar: number,
  context: CompositionContext
): PitchProfile | undefined {
  return getEffectiveContextForBar(bar, context)?.pitch;
}

export function getEffectiveRhythmProfileForBar(
  bar: number,
  context: CompositionContext
): RhythmProfile | undefined {
  return getEffectiveContextForBar(bar, context)?.rhythm;
}

export function getEffectiveVoicingProfileForBar(
  bar: number,
  context: CompositionContext
): VoicingProfile | undefined {
  return getEffectiveContextForBar(bar, context)?.voicing;
}

const RIFF_MODE_PATCHES: Record<string, Partial<RiffProfile>> = {
  noise_drone: {
    chromaticBudget: 0.82,
    metricDisplacement: 0.15,
  },
  motorik: {
    chromaticBudget: 0.25,
    metricDisplacement: 0.08,
    repetitionPolicy: {
      exactLoopAllowed: true,
      pedalToneAllowed: true,
      barIdentityPersistence: 0.9,
      minExactRepetitions: 3,
    },
  },
  wall_of_sound: {
    chromaticBudget: 0.55,
    metricDisplacement: 0.35,
  },
  slonimsky_cells: {
    chromaticBudget: 0.88,
    metricDisplacement: 0.72,
  },
  sparse_drone: {
    chromaticBudget: 0.18,
    metricDisplacement: 0.05,
  },
  groove_dense: {
    chromaticBudget: 0.4,
    metricDisplacement: 0.2,
  },
  groove_sparse: {
    chromaticBudget: 0.3,
    metricDisplacement: 0.12,
  },
};

export function applyPitchProfileToRiffProfile(
  profile: RiffProfile,
  pitch?: PitchProfile
): RiffProfile {
  if (!pitch) return profile;
  let out = { ...profile };
  if (typeof pitch.chromaticBudget === 'number') {
    out = { ...out, chromaticBudget: pitch.chromaticBudget };
  }
  if (pitch.allowedOutsideLevel !== undefined) {
    void pitch.allowedOutsideLevel;
  }
  if (typeof pitch.registerFloor === 'number') {
    out = { ...out, riffRegisterFloor: pitch.registerFloor };
  }
  if (typeof pitch.registerCeiling === 'number') {
    out = { ...out, riffRegisterCeiling: pitch.registerCeiling };
  }
  return out;
}

export function applyRhythmProfileToRiffProfile(
  profile: RiffProfile,
  rhythm?: RhythmProfile
): RiffProfile {
  if (!rhythm) return profile;
  let out = { ...profile };
  if (typeof rhythm.metricDisplacement === 'number') {
    out = { ...out, metricDisplacement: rhythm.metricDisplacement };
  }
  if (rhythm.antiMetric === true) {
    out = { ...out, metricDisplacement: Math.max(out.metricDisplacement ?? 0, 0.65) };
  }
  return out;
}

export function applySectionArchitectureToRiffProfile(
  profile: RiffProfile,
  context: CompositionContext,
  bar: number,
  instrument?: InstrumentKind
): RiffProfile {
  if (!hasSectionArchitecture(context)) return profile;

  const eff = getEffectiveContextForBar(bar, context);
  let out = applyPitchProfileToRiffProfile(profile, eff?.pitch);
  out = applyRhythmProfileToRiffProfile(out, eff?.rhythm);

  const ov = instrumentOverrideForBar(bar, context, instrument);
  if (ov?.riffMode && RIFF_MODE_PATCHES[ov.riffMode]) {
    out = mergeRiffProfilePatch(out, RIFF_MODE_PATCHES[ov.riffMode]!);
  }

  return out;
}

export function overlayVoiceBundleRhythmProfile(
  bundle: VoiceRuleBundle,
  rhythm?: RhythmProfile
): VoiceRuleBundle {
  if (!rhythm) return bundle;
  return {
    ...bundle,
    rhythmPolicy: {
      ...bundle.rhythmPolicy,
      ...(rhythm.antiMetric !== undefined ? { antiMetric: rhythm.antiMetric } : {}),
    },
  };
}

export function overlayVoiceBundleVoicingProfile(
  bundle: VoiceRuleBundle,
  voicing?: VoicingProfile
): VoiceRuleBundle {
  if (!voicing) return bundle;
  return {
    ...bundle,
    voicingPolicy: {
      ...bundle.voicingPolicy,
      ...(typeof voicing.minSpreadSemitones === 'number'
        ? { minSpreadSemitones: voicing.minSpreadSemitones }
        : {}),
      ...(typeof voicing.maxSpreadSemitones === 'number'
        ? { maxSpreadSemitones: voicing.maxSpreadSemitones }
        : {}),
    },
    harmonicRhythm: {
      ...bundle.harmonicRhythm,
      ...(typeof voicing.minChordDurationBars === 'number'
        ? { minChordDurationBars: voicing.minChordDurationBars }
        : {}),
      ...(typeof voicing.maxChordDurationBars === 'number'
        ? { maxChordDurationBars: voicing.maxChordDurationBars }
        : {}),
    },
  };
}

export function resolveVoiceBundleForBarWithSectionArchitecture(
  bar: number,
  context: CompositionContext,
  base: VoiceRuleBundle | undefined
): VoiceRuleBundle | undefined {
  if (!base || !hasSectionArchitecture(context)) return base;
  const eff = getEffectiveContextForBar(bar, context);
  if (!eff) return base;
  let out = overlayVoiceBundleRhythmProfile(base, eff.rhythm);
  out = overlayVoiceBundleVoicingProfile(out, eff.voicing);
  return out;
}
