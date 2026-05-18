/**
 * SQ VRB 2–3 way blend — typed static policy composition + union-weighted pools in _blendMeta.
 */

import { getVoiceRuleBundle } from '../../composer/voiceRuleBundles';
import { rhythmExpectationForVrb } from '../../gce/gceAutoScorers';
import type { SqVrbPhraseArticulation } from './sqVrbProfileTypes';
import type {
  SqVrbGceScorerAdjustments,
  SqVrbProfile,
} from './sqVrbProfileTypes';
import type { BlendPart, FieldSpec, VrbBlendMeta, WeightedToken } from './vrbBlendTypes';

const BLENDED_PROFILE_CACHE = new Map<string, SqVrbProfile>();

/** Partial perceptual axis for phraseArticulation (unmapped values → dominant). */
const PHRASE_ARTICULATION_AXIS: Partial<Record<SqVrbPhraseArticulation, number>> = {
  non_resolving: 0.0,
  aphoristic_cell_silence_bounded: 0.1,
  asymmetric_cell_non_resolving: 0.15,
  looping_cell_no_cadence: 0.2,
  micropolyphonic_stasis: 0.25,
  arch: 0.4,
  folk_modal_suspended: 0.45,
  through_composed_arch_no_cadence: 0.5,
  doubly_open_cell_development: 0.55,
  ostinato_cell_based: 0.6,
  repeating_ostinato_no_cadence: 0.65,
  ground_iterations_progressive_entry: 0.7,
  continuous_motor_rhythm: 0.75,
  periodic_cadential: 0.85,
  romantic_periodic_cadential: 0.9,
  strict_periodic_tonal_cadence: 1.0,
};

const HARD_SWITCH_SPECS: ReadonlyArray<{ field: string; activateAt: number; read: (id: string) => boolean }> =
  [
    {
      field: 'tintinnabuliEnabled',
      activateAt: 0.65,
      read: (id) => getVoiceRuleBundle(id).tintinnabuliEnabled === true,
    },
    {
      field: 'suppressFunctionalResolution',
      activateAt: 0.6,
      read: (id) => getVoiceRuleBundle(id).suppressFunctionalResolution === true,
    },
    {
      field: 'silenceAsStructureEnabled',
      activateAt: 0.55,
      read: (id) => {
        const b = getVoiceRuleBundle(id);
        return b.silenceAsStructureEnabled === true || b.silenceAsStructure === true;
      },
    },
  ];

export function resolveBlendedRegimeBooleans(parts: BlendPart[]): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const spec of HARD_SWITCH_SPECS) {
    const enabledWeight = parts
      .filter((p) => spec.read(p.id))
      .reduce((acc, p) => acc + p.weight, 0);
    out[spec.field] = resolveHardSwitch(enabledWeight, spec.activateAt);
  }
  const modalWeight = parts
    .filter((p) => p.profile.gceScorerAdjustments.modalEndingsValid === true)
    .reduce((acc, p) => acc + p.weight, 0);
  out.modalEndingsValid = resolveHardSwitch(modalWeight, 0.55);
  return out;
}

export function normaliseWeights(weights: number[]): number[] {
  const sum = weights.reduce((a, w) => a + w, 0);
  if (sum <= 0) return weights.map(() => 0);
  return weights.map((w) => w / sum);
}

export function resolveHardSwitch(enabledWeight: number, threshold: number): boolean {
  return enabledWeight >= threshold;
}

export function resolveSoftBoolean(
  parts: { value: boolean; weight: number }[],
  threshold = 0.5,
): boolean {
  const enabled = parts.filter((p) => p.value).reduce((a, p) => a + p.weight, 0);
  return enabled >= threshold;
}

export function resolveSigma(parts: BlendPart[], openness = 0.55): number {
  const weights = normaliseWeights(parts.map((p) => p.weight));
  const sigmas = parts.map((p) => p.profile.gceScorerAdjustments.registerCohesionStdevCeilingSt);
  const sigmaMean = sigmas.reduce((acc, s, i) => acc + s * weights[i]!, 0);
  const sigmaMin = Math.min(...sigmas);
  const sigmaMax = Math.max(...sigmas);
  const sigmaCap = sigmaMin + openness * (sigmaMax - sigmaMin);
  return Math.round(Math.min(sigmaMean, sigmaCap));
}

function weightedMean(values: number[], weights: number[]): number {
  const w = normaliseWeights(weights);
  return values.reduce((acc, v, i) => acc + v * w[i]!, 0);
}

function buildBlendedVrbId(ids: readonly string[]): string {
  return `blended:${[...ids].map((id) => id.trim().toLowerCase()).sort().join('+')}`;
}

export function parseBlendedVrbComponentIds(vrbId: string): string[] | null {
  const trimmed = vrbId.trim().toLowerCase();
  if (!trimmed.startsWith('blended:')) return null;
  const body = trimmed.slice('blended:'.length);
  if (!body) return null;
  return body.split('+').filter(Boolean);
}

export function registerBlendedSqVrbProfile(profile: SqVrbProfile): void {
  BLENDED_PROFILE_CACHE.set(profile.vrbId.trim().toLowerCase(), profile);
}

export function getCachedBlendedSqVrbProfile(vrbId: string): SqVrbProfile | undefined {
  return BLENDED_PROFILE_CACHE.get(vrbId.trim().toLowerCase());
}

function dominantByWeight<T>(parts: BlendPart[], pick: (p: BlendPart) => T): T {
  let best = parts[0]!;
  for (let i = 1; i < parts.length; i++) {
    if (parts[i]!.weight > best.weight) best = parts[i]!;
  }
  return pick(best);
}

function mergeWeightedVocabularyFromParts(
  parts: BlendPart[],
  field: 'chordVocabulary' | 'preferredIntervals',
): WeightedToken<string>[] | WeightedToken<number>[] {
  const pool = new Map<string | number, WeightedToken<string | number>>();
  for (const part of parts) {
    const tokens =
      field === 'chordVocabulary'
        ? part.profile.chordVocabulary.map(String)
        : (part.profile.contrapuntalLinePolicy.preferredIntervals ?? []).map(Number);
    for (const value of tokens) {
      const key = value;
      const existing = pool.get(key);
      if (existing) {
        existing.support += part.weight;
        existing.sources[part.id] = (existing.sources[part.id] ?? 0) + part.weight;
      } else {
        pool.set(key, { value: key, support: part.weight, sources: { [part.id]: part.weight } });
      }
    }
  }
  return [...pool.values()].sort((a, b) => b.support - a.support) as
    | WeightedToken<string>[]
    | WeightedToken<number>[];
}

export function mergeWeightedVocabulary<T extends string | number>(
  parts: BlendPart[],
  field: 'chordVocabulary' | 'preferredIntervals',
): WeightedToken<T>[] {
  if (field === 'chordVocabulary') {
    return mergeWeightedVocabularyFromParts(parts, 'chordVocabulary') as WeightedToken<T>[];
  }
  if (field === 'preferredIntervals') {
    return mergeWeightedVocabularyFromParts(parts, 'preferredIntervals') as WeightedToken<T>[];
  }
  return [];
}

function resolvePhraseArticulation(parts: BlendPart[]): SqVrbPhraseArticulation {
  let axisBlend = 0;
  let axisWeight = 0;
  let unmapped = false;
  for (const part of parts) {
    const v = part.profile.contrapuntalLinePolicy.phraseArticulation;
    const axis = PHRASE_ARTICULATION_AXIS[v];
    if (axis === undefined) {
      unmapped = true;
      break;
    }
    axisBlend += axis * part.weight;
    axisWeight += part.weight;
  }
  if (unmapped || axisWeight <= 0) {
    return dominantByWeight(parts, (p) => p.profile.contrapuntalLinePolicy.phraseArticulation);
  }
  const target = axisBlend / axisWeight;
  let bestKey: SqVrbPhraseArticulation = 'non_resolving';
  let bestDist = Infinity;
  for (const [key, score] of Object.entries(PHRASE_ARTICULATION_AXIS) as [SqVrbPhraseArticulation, number][]) {
    const dist = Math.abs(score - target);
    if (dist < bestDist) {
      bestDist = dist;
      bestKey = key;
    }
  }
  return bestKey;
}

function resolvePlacementMode(parts: BlendPart[]): string {
  // TODO: live resolver when BlendContext available at call sites
  return dominantByWeight(parts, (p) => rhythmExpectationForVrb(p.id)?.placementMode ?? 'grid');
}

function mergeGceAdjustments(parts: BlendPart[], sigma: number, openness: number): SqVrbGceScorerAdjustments {
  const weights = parts.map((p) => p.weight);
  const base = { ...dominantByWeight(parts, (p) => ({ ...p.profile.gceScorerAdjustments })) };
  const numericKeys: (keyof SqVrbGceScorerAdjustments)[] = [
    'motifRecurrenceWeight',
    'intervalEconomyWeight',
    'registerCohesionWeight',
    'phraseCellBarsMin',
    'phraseCellBarsMax',
    'phrasePeriodBars',
    'cyclicMotifReturnBoost',
    'motifRecurrenceHardFailMin',
    'herrmannSignatureIntervalBlend',
    'ostinatoPhraseEndingCredit',
    'inconclusiveEndingCredit',
    'modalCadenceCredit',
    'dominantResolutionPenalty',
    'authenticCadencePenalty',
    'silenceBoundaryCredit',
    'bassPedalCredit',
    'parallelPlaningCredit',
    'wholeTonesCredit',
    'addedNinthCredit',
    'coloristicHarmonyCredit',
    'folkModalCredit',
    'tritoneCredit',
    'dissonanceToleranceCredit',
    'asymmetricRhythmCredit',
    'glassSignatureIntervalBlend',
  ];
  for (const key of numericKeys) {
    const vals = parts.map((p) => p.profile.gceScorerAdjustments[key]).filter((v): v is number => typeof v === 'number');
    if (vals.length === parts.length) {
      (base as Record<keyof SqVrbGceScorerAdjustments, number | undefined>)[key] = weightedMean(
        vals,
        weights,
      );
    }
  }
  base.registerCohesionStdevCeilingSt = sigma;
  const softCeilings = parts
    .map((p) => p.profile.gceScorerAdjustments.registerCohesionSoftCeilingSt)
    .filter((v): v is number => typeof v === 'number');
  if (softCeilings.length === parts.length) {
    base.registerCohesionSoftCeilingSt = Math.round(weightedMean(softCeilings, weights));
  }
  base.modalEndingsValid = resolveHardSwitch(
    parts
      .filter((p) => p.profile.gceScorerAdjustments.modalEndingsValid === true)
      .reduce((a, p) => a + p.weight, 0),
    0.55,
  );
  void openness;
  return base;
}

function validateBlendInputs(profiles: SqVrbProfile[], weights: number[]): void {
  if (profiles.length < 2) throw new Error('blendedVrb: requires at least 2 profiles');
  if (profiles.length > 3) throw new Error('blendedVrb: at most 3 profiles');
  if (profiles.length !== weights.length) {
    throw new Error('blendedVrb: profiles and weights length mismatch');
  }
  if (weights.some((w) => w <= 0)) throw new Error('blendedVrb: all weights must be > 0');
}

export function blendedVrb(
  profiles: SqVrbProfile[],
  weights: number[],
  opts?: { openness?: number },
): SqVrbProfile {
  validateBlendInputs(profiles, weights);
  const openness = opts?.openness ?? 0.55;
  const w = normaliseWeights(weights);
  const parts: BlendPart[] = profiles.map((profile, i) => ({
    id: profile.vrbId,
    weight: w[i]!,
    profile,
  }));
  const vrbId = buildBlendedVrbId(parts.map((p) => p.id));
  const sigma = resolveSigma(parts, openness);
  const mergedChordVocabulary = mergeWeightedVocabularyFromParts(parts, 'chordVocabulary') as WeightedToken<string>[];
  const mergedPreferredIntervals = mergeWeightedVocabularyFromParts(
    parts,
    'preferredIntervals',
  ) as WeightedToken<number>[];
  const placementMode = resolvePlacementMode(parts);
  const dominant = dominantByWeight(parts, (p) => p.profile);
  const phraseArticulation = resolvePhraseArticulation(parts);
  const gceScorerAdjustments = mergeGceAdjustments(parts, sigma, openness);
  const fieldSpecs: VrbBlendMeta['fieldSpecs'] = {
    sigma: { mode: 'blend-capped', field: 'sigma' },
    phraseArticulation: { mode: 'dominant-custom', field: 'phraseArticulation' },
    chordVocabulary: { mode: 'union-weighted', field: 'chordVocabulary' },
    preferredIntervals: { mode: 'union-weighted', field: 'preferredIntervals' },
    bestBbStyle: { mode: 'dominant', field: 'bestBbStyle' },
    placementMode: { mode: 'resolver', field: 'placementMode' },
  };
  const regimeBooleans = resolveBlendedRegimeBooleans(parts);
  const _blendMeta: VrbBlendMeta = {
    parts,
    mergedChordVocabulary,
    mergedPreferredIntervals,
    openness,
    fieldSpecs,
    resolvedPlacementMode: placementMode,
    regimeBooleans,
  };
  const chordUnion = mergedChordVocabulary.map((t) => t.value) as SqVrbProfile['chordVocabulary'][number][];
  const preferredIntervals = mergedPreferredIntervals.map((t) => t.value);
  const result: SqVrbProfile = {
    vrbId,
    contrapuntalLinePolicy: {
      ...dominant.contrapuntalLinePolicy,
      vrbId,
      phraseArticulation,
      preferredIntervals,
      imitationStyle: dominant.contrapuntalLinePolicy.imitationStyle,
      registerPolicy: dominant.contrapuntalLinePolicy.registerPolicy,
      parallelMotionPolicy: dominantByWeight(
        parts,
        (p) => p.profile.contrapuntalLinePolicy.parallelMotionPolicy ?? 'allow',
      ),
      independenceLevel: dominantByWeight(
        parts,
        (p) => p.profile.contrapuntalLinePolicy.independenceLevel,
      ),
    },
    chordVocabulary: chordUnion,
    bestBbStyle: dominant.bestBbStyle,
    secondaryBbStyle: dominant.secondaryBbStyle,
    cautionBbStyle: dominant.cautionBbStyle,
    gceScorerAdjustments,
    _blendMeta,
  };
  registerBlendedSqVrbProfile(result);
  return result;
}

/** Rhythm numeric blend for GCE (anticipation, groove, offbeat window). */
export function blendRhythmExpectationForBlendedVrbId(vrbId: string): ReturnType<typeof rhythmExpectationForVrb> {
  const ids = parseBlendedVrbComponentIds(vrbId);
  if (!ids || ids.length < 2) return undefined;
  const expectations: NonNullable<ReturnType<typeof rhythmExpectationForVrb>>[] = [];
  for (const id of ids) {
    const e = rhythmExpectationForVrb(id);
    if (!e) return undefined;
    expectations.push(e);
  }
  const weights = normaliseWeights(ids.map(() => 1));
  const placementCounts = new Map<string, number>();
  for (let i = 0; i < expectations.length; i++) {
    const mode = expectations[i]!.placementMode;
    placementCounts.set(mode, (placementCounts.get(mode) ?? 0) + weights[i]!);
  }
  let placementMode: 'grid' | 'swing' | 'anti_metric' = 'grid';
  let bestPl = 0;
  for (const [mode, w] of placementCounts) {
    if (w > bestPl) {
      bestPl = w;
      placementMode = mode as 'grid' | 'swing' | 'anti_metric';
    }
  }
  const antMaxVals = expectations.map((e) => e.anticipationRateMax ?? 0.15);
  const grooveVals = expectations.map((e) => e.grooveStabilityTolerance ?? 0.9);
  const offLow = expectations.map((e) => e.targetOffbeatWindow?.[0] ?? 0.48);
  const offHigh = expectations.map((e) => e.targetOffbeatWindow?.[1] ?? 0.52);
  return {
    placementMode,
    anticipationRateMax: weightedMean(antMaxVals, weights),
    grooveStabilityTolerance: weightedMean(grooveVals, weights),
    targetOffbeatWindow: [weightedMean(offLow, weights), weightedMean(offHigh, weights)],
  };
}
