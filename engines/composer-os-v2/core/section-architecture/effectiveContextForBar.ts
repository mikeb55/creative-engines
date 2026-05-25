/**
 * V65 P1 — Per-bar effective context cache + Song→FormMap bridge + consumer helpers.
 */

import type { CompositionContext } from '../compositionContext';
import type { VoiceRuleBundle } from '../composer/voiceRuleBundle';
import type { RiffProfile } from '../composer/riffProfileTypes';
import { mergeRiffProfilePatch } from '../riff-generator/riffReceiptCompiler';
import { formMapFromSong } from './resolveGenerationBarMeterMap';
import {
  normalizeSectionInstrumentTarget,
  resolveEffectiveContext,
  resolveSectionForBar,
  validateSong,
} from './sectionArchitectureResolution';
import type {
  DensityLevel,
  EffectiveGenerationContext,
  InstrumentKind,
  InstrumentOverride,
  PitchProfile,
  RhythmProfile,
  SlonimskyCellSetId,
  Song,
  TuningProfile,
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

export function createSectionArchitectureRuntimeContext(
  song: Song | undefined,
  presetId: string,
  seed: number
): CompositionContext | undefined {
  if (!song) return undefined;
  const form = formMapFromSong(song);
  const context = {
    systemVersion: '2.0.0',
    presetId,
    seed,
    form,
    feel: {},
    harmony: { segments: [], totalBars: song.totalBars },
    motif: { activeMotifs: [], variants: {} },
    phrase: { segments: [], totalBars: song.totalBars },
    register: {},
    density: { segments: [], totalBars: song.totalBars },
    instrumentProfiles: [],
    chordSymbolPlan: { segments: [], totalBars: song.totalBars },
    rehearsalMarkPlan: { marks: [] },
    generationMetadata: { generatedAt: new Date().toISOString() },
    validation: { gates: [], passed: true },
    readiness: {
      release: { passed: true, overall: 1, categories: [] },
      mx: { passed: true, overall: 1, categories: [] },
    },
  } as unknown as CompositionContext;
  wireSongArchitectureAtPipelineEntry(context, song, (ctx, resolvedForm) => {
    ctx.form = resolvedForm;
  });
  return context;
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
  const withRegister = applyTransitionRegisterInterpolation(b, song, withDensity);
  cache.set(b, withRegister);
  return withRegister;
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

function resolveTransitionNeighbor(
  bar: number,
  song: Song,
  ctx: EffectiveGenerationContext,
  flag: 'interpolateDensity' | 'interpolateRegister'
): { neighbor: EffectiveGenerationContext; blend: number } | null {
  const transition = ctx.transition;
  if (!transition?.[flag]) return null;

  const section = resolveSectionForBar(bar, song.sections);
  if (!section) return null;

  let neighborSection = null as (typeof song.sections)[number] | null;
  let blend = 0;

  if (section.transitionOut?.[flag] && bar >= section.barRange.endBar - (section.transitionOut.bars ?? 0)) {
    const nextBar = section.barRange.endBar + 1;
    neighborSection = resolveSectionForBar(nextBar, song.sections);
    const window = Math.max(1, section.transitionOut.bars ?? 1);
    const start = section.barRange.endBar - window + 1;
    blend = (bar - start + 1) / window;
  } else if (section.transitionIn?.[flag] && bar <= section.barRange.startBar + (section.transitionIn.bars ?? 0) - 1) {
    const prevBar = section.barRange.startBar - 1;
    neighborSection = resolveSectionForBar(prevBar, song.sections);
    const window = Math.max(1, section.transitionIn.bars ?? 1);
    const start = section.barRange.startBar;
    blend = 1 - (bar - start + 1) / window;
  }

  if (!neighborSection) return null;
  return {
    neighbor: resolveEffectiveContext(neighborSection.barRange.startBar, song),
    blend: Math.min(1, Math.max(0, blend)),
  };
}

function blendNumber(a: number | undefined, b: number | undefined, blend: number): number | undefined {
  if (typeof a !== 'number') return b;
  if (typeof b !== 'number') return a;
  return a * (1 - blend) + b * blend;
}

function applyTransitionRegisterInterpolation(
  bar: number,
  song: Song,
  ctx: EffectiveGenerationContext
): EffectiveGenerationContext {
  const transition = resolveTransitionNeighbor(bar, song, ctx, 'interpolateRegister');
  if (!transition) return ctx;
  const floor = blendNumber(ctx.pitch.registerFloor, transition.neighbor.pitch.registerFloor, transition.blend);
  const ceiling = blendNumber(ctx.pitch.registerCeiling, transition.neighbor.pitch.registerCeiling, transition.blend);
  if (floor === ctx.pitch.registerFloor && ceiling === ctx.pitch.registerCeiling) return ctx;
  return {
    ...ctx,
    pitch: {
      ...ctx.pitch,
      ...(typeof floor === 'number' ? { registerFloor: Math.round(floor) } : {}),
      ...(typeof ceiling === 'number' ? { registerCeiling: Math.round(ceiling) } : {}),
    },
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
  instrument?: InstrumentKind | string
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
  instrument?: InstrumentKind | string
): 'sparse' | 'medium' | 'dense' | undefined {
  const scalar = getSectionArchitectureDensityScalar(bar, context, instrument);
  if (scalar === undefined) return undefined;
  return scalarToDensityHint(scalar);
}

export function instrumentOverrideForBar(
  bar: number,
  context: CompositionContext,
  instrument?: InstrumentKind | string
): InstrumentOverride | undefined {
  if (!hasSectionArchitecture(context)) return undefined;
  const song = context.song!;
  const section = resolveSectionForBar(Math.floor(bar), song.sections);
  if (!section?.instrumentOverrides?.length) return undefined;

  if (instrument) {
    const normalizedInstrument = normalizeSectionInstrumentTarget(instrument);
    const match = section.instrumentOverrides.find(
      (ov) => normalizeSectionInstrumentTarget(ov.tuningProfile?.instrumentType) === normalizedInstrument
    );
    if (match) return match;
    const untyped = section.instrumentOverrides.find((ov) => !ov.tuningProfile?.instrumentType);
    if (untyped) return untyped;
    return undefined;
  }

  return section.instrumentOverrides[0];
}

function tuningLookupKeys(instrument: InstrumentKind | string): string[] {
  const normalized = normalizeSectionInstrumentTarget(instrument);
  if (normalized === 'guitar') return ['guitar', 'guitarA'];
  if (normalized === 'guitar_2') return ['guitar_2', 'guitarB'];
  return normalized ? [normalized] : [instrument];
}

export function getEffectiveTuningProfileForBar(
  bar: number,
  context: CompositionContext,
  instrument: InstrumentKind | string
): TuningProfile | undefined {
  if (!hasSectionArchitecture(context)) return undefined;
  const eff = getEffectiveContextForBar(bar, context);
  if (!eff) return undefined;
  for (const key of tuningLookupKeys(instrument)) {
    const t = eff.tuningByInstrument[key as InstrumentKind];
    if (t) return t;
  }
  return undefined;
}

export function getEffectiveRegisterWindowForBar(
  bar: number,
  context: CompositionContext,
  instrument: InstrumentKind | string
): { floor: number; ceil: number } | undefined {
  if (!hasSectionArchitecture(context)) return undefined;
  const ov = instrumentOverrideForBar(bar, context, instrument);
  if (ov?.registerWindow) return { ...ov.registerWindow };
  const pitch = getEffectivePitchProfileForBar(bar, context);
  if (typeof pitch?.registerFloor === 'number' || typeof pitch?.registerCeiling === 'number') {
    return {
      floor: pitch.registerFloor ?? 0,
      ceil: pitch.registerCeiling ?? 127,
    };
  }
  return undefined;
}

export function getFollowRootProbabilityForBar(
  bar: number,
  context: CompositionContext,
  instrument: InstrumentKind | string = 'bass'
): number | undefined {
  const ov = instrumentOverrideForBar(bar, context, instrument);
  const raw = ov?.followRootProbability;
  return typeof raw === 'number' && Number.isFinite(raw) ? Math.min(1, Math.max(0, raw)) : undefined;
}

export function getSlonimskyCellSetsForBar(
  bar: number,
  context: CompositionContext
): readonly SlonimskyCellSetId[] | undefined {
  const cellSets = getEffectivePitchProfileForBar(bar, context)?.cellSets;
  return cellSets?.length ? cellSets : undefined;
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
  instrument?: InstrumentKind | string
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
