/**
 * Mosaic Mode Step 7 — section-scoped style/GCE evaluation (one profile per section).
 */

import type { CompositionContext } from '../compositionContext';
import type { SectionLockEntry } from './precomputeMosaicEffectiveHarmonyBars';
import { songModeEvalProfileForSongwriter } from '../evaluation/songModeEvaluationProfiles';
import type { ExtractedStyleFeatures, StyleDimensionDefinition, StyleDimensionScore, StyleProfile, StyleProfileEvaluationInput, StyleProfileEvaluationResult } from '../evaluation/evaluationTypes';
import { extractScoreModelFeatures } from '../evaluation/featureExtractor';
import type { MeasureModel, PartModel, ScoreModel } from '../score-model/scoreModelTypes';

/** Section-scoped Verlaine profile — no Towner/Weber discrimination import (ts-node safe). */
const DUO_VERLAINE_SECTION_DIMENSIONS: StyleDimensionDefinition[] = [
  { id: 'modalFieldPersistence', label: 'Modal Field Persistence', weight: 0.22 },
  { id: 'extensionRetentionRate', label: 'Extension Retention', weight: 0.18 },
  { id: 'chordSurfaceBias', label: 'Suspended Chord Surface', weight: 0.2 },
  { id: 'bassDisplacementRate', label: 'Bass Displacement', weight: 0.2 },
  { id: 'progressionAvoidance', label: 'Progression Avoidance', weight: 0.2 },
];

function featureNum(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function scoreDuoVerlaineSection(input: StyleProfileEvaluationInput): StyleProfileEvaluationResult {
  const h = input.features.harmonic ?? {};
  const formal = input.features.formal ?? {};
  const chordChange = featureNum(h.chordChangeRate);
  const phraseHold = featureNum(formal.phraseHoldRate);
  const byId: Record<string, number> = {
    modalFieldPersistence:
      (chordChange == null || chordChange <= 0.28) && (phraseHold == null || phraseHold >= 0.62)
        ? 10
        : chordChange != null && chordChange <= 0.38
          ? 4
          : 7,
    extensionRetentionRate: (featureNum(h.commonToneRate) ?? featureNum(h.add9Maj9Rate) ?? 0) >= 0.58 ? 10 : 7,
    chordSurfaceBias: (featureNum(h.susAddRate) ?? featureNum(h.add9Maj9Rate) ?? 0) >= 0.45 ? 7 : 4,
    bassDisplacementRate: (featureNum(h.slashChordRate) ?? 0) >= 0.32 ? 7 : 4,
    progressionAvoidance: (featureNum(h.functionalCadenceRate) ?? featureNum(h.twoFiveOneRate) ?? 0) <= 0.15 ? 7 : 4,
  };
  const dimensions: StyleDimensionScore[] = input.profile.dimensions.map((d) => {
    const s = byId[d.id] ?? 1;
    return { id: d.id, label: d.label, score: s, weight: d.weight, weightedScore: s * d.weight };
  });
  const finalStyleScore = dimensions.reduce((acc, d) => acc + d.weightedScore, 0);
  const failures: string[] = [];
  if ((featureNum(h.susAddRate) ?? 0) < 0.42) {
    failures.push('chordSurfaceBias below 0.78 — insufficient sus/add/slash surface.');
  }
  const pass = finalStyleScore >= input.profile.threshold && failures.length === 0;
  return {
    styleId: input.profile.id,
    styleName: input.profile.name,
    dimensions,
    finalStyleScore,
    weakestDimensionId: dimensions[0]?.id ?? '',
    strongestDimensionId: dimensions[0]?.id ?? '',
    pass,
    threshold: input.profile.threshold,
    notes: failures.length ? failures : undefined,
  };
}

const duoVerlaineSectionStyleProfile: StyleProfile = {
  id: 'verlaine',
  name: 'Tom Verlaine (duo section)',
  family: 'songwriter',
  threshold: 7.0,
  dimensions: DUO_VERLAINE_SECTION_DIMENSIONS,
  score: scoreDuoVerlaineSection,
};

/** Slice composers with evaluation profiles wired in Step 7 (until on SONG_MODE_COMPOSER_EVAL_PROFILES). */
function duoSliceEvalProfile(composerId: string): StyleProfile | undefined {
  switch (composerId) {
    case 'verlaine':
      return duoVerlaineSectionStyleProfile;
    case 'marr':
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require('../evaluation/marrStyleProfile').marrStyleProfile as StyleProfile;
    default:
      return undefined;
  }
}

export interface DuoSectionEvalResult {
  sectionLabel: string;
  startBar: number;
  endBar: number;
  composerId: string;
  passed: boolean;
  scores: Record<string, number>;
  failures: string[];
}

function styleProfileForSection(composerId: string): StyleProfile | undefined {
  return songModeEvalProfileForSongwriter(composerId) ?? duoSliceEvalProfile(composerId);
}

function cloneMeasure(m: MeasureModel): MeasureModel {
  return {
    ...m,
    events: m.events.map((ev) => ({ ...ev })),
  };
}

function clonePartMeasures(part: PartModel, startBar: number, endBar: number): PartModel {
  return {
    ...part,
    measures: part.measures
      .filter((m) => m.index >= startBar && m.index <= endBar)
      .map(cloneMeasure),
  };
}

function sliceScoreForBarRange(score: ScoreModel, startBar: number, endBar: number): ScoreModel {
  return {
    ...score,
    parts: score.parts.map((part) => clonePartMeasures(part, startBar, endBar)),
  };
}

function chordSymbolsForSection(score: ScoreModel, startBar: number, endBar: number): string[] {
  const guitar = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!guitar) return [];
  const out: string[] = [];
  for (let bar = startBar; bar <= endBar; bar++) {
    const chord = guitar.measures.find((m) => m.index === bar)?.chord ?? '';
    out.push(chord);
  }
  return out;
}

function normalizeChordRoot(symbol: string): string {
  return symbol.trim().split('/')[0]?.trim().toLowerCase() ?? '';
}

function harmonicFeaturesFromChordBars(bars: readonly string[]): NonNullable<ExtractedStyleFeatures['harmonic']> {
  const n = bars.length;
  if (n === 0) return {};

  let slash = 0;
  let susAdd = 0;
  let add9Maj9 = 0;
  let altered = 0;
  let triadLike = 0;
  let changes = 0;
  let functionalCadence = 0;
  let twoFiveOne = 0;

  for (let i = 0; i < n; i++) {
    const sym = bars[i] ?? '';
    const lower = sym.toLowerCase();
    if (sym.includes('/')) slash++;
    if (lower.includes('sus') || lower.includes('add')) susAdd++;
    if (lower.includes('maj9') || lower.includes('add9') || /[^a-z]9/.test(lower)) add9Maj9++;
    if (lower.includes('alt') || lower.includes('7alt') || lower.includes('b9') || lower.includes('#9')) {
      altered++;
    }
    if (/^([a-g][#b]?)(maj7?|m(?!aj)|min|dim|aug)?$/i.test(sym.split('/')[0]?.trim() ?? '')) {
      triadLike++;
    }
    if (i > 0 && normalizeChordRoot(bars[i - 1] ?? '') !== normalizeChordRoot(sym)) {
      changes++;
    }
    if (lower.includes('7') && !lower.includes('maj7') && !lower.includes('m7')) {
      functionalCadence++;
    }
    if (i >= 2) {
      const a = bars[i - 2]?.toLowerCase() ?? '';
      const b = bars[i - 1]?.toLowerCase() ?? '';
      const c = lower;
      if (a.includes('m7') && b.includes('7') && (c.includes('maj') || c.endsWith('7'))) {
        twoFiveOne++;
      }
    }
  }

  const denom = Math.max(1, n);
  const changeDenom = Math.max(1, n - 1);

  return {
    chordChangeRate: changes / changeDenom,
    slashChordRate: slash / denom,
    susAddRate: susAdd / denom,
    add9Maj9Rate: add9Maj9 / denom,
    alteredDominantRate: altered / denom,
    triadRate: triadLike / denom,
    functionalCadenceRate: functionalCadence / denom,
    twoFiveOneRate: twoFiveOne / denom,
    pedalRate: 0,
    commonToneRate: 1 - changes / changeDenom,
    modalMixRate: susAdd / denom,
    extensionDensity: add9Maj9 / denom,
  };
}

function asNumber(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function mergeSectionFeatures(
  scoreSlice: ScoreModel,
  expectedHarmonyBars: readonly string[]
): ExtractedStyleFeatures {
  const base = extractScoreModelFeatures(scoreSlice);
  const fromChords = harmonicFeaturesFromChordBars(
    expectedHarmonyBars.length > 0 ? expectedHarmonyBars : chordSymbolsForSection(
      scoreSlice,
      scoreSlice.parts[0]?.measures[0]?.index ?? 1,
      scoreSlice.parts[0]?.measures[scoreSlice.parts[0]?.measures.length - 1]?.index ?? 1
    )
  );
  const avgVoicing = asNumber(base.orchestration?.avgVoicingSize);
  const swingGrid = asNumber(base.rhythmic?.swingGridAlignment);
  return {
    ...base,
    harmonic: { ...(base.harmonic ?? {}), ...fromChords },
    formal: {
      ...(base.formal ?? {}),
      phraseHoldRate: 1 - (asNumber(fromChords.chordChangeRate) ?? 0),
    },
    melodic: {
      ...(base.melodic ?? {}),
      contourClarity: avgVoicing != null ? Math.min(1, avgVoicing / 5) : null,
      attackDensity: swingGrid,
      bassIndependenceRate: fromChords.slashChordRate ?? null,
    },
    rhythmic: {
      ...(base.rhythmic ?? {}),
      syncopationRate: swingGrid != null ? 1 - swingGrid : null,
      subdivisionDensity: swingGrid,
    },
  };
}

function buildEvalResult(entry: SectionLockEntry, styleResult: StyleProfileEvaluationResult): DuoSectionEvalResult {
  const scores: Record<string, number> = {
    overall: styleResult.finalStyleScore,
  };
  for (const dim of styleResult.dimensions) {
    scores[dim.id] = dim.score;
  }

  const failures: string[] = [];
  if (styleResult.notes?.length) {
    failures.push(...styleResult.notes.map(String));
  }
  if (!styleResult.pass && failures.length === 0) {
    failures.push(
      `section style score ${styleResult.finalStyleScore.toFixed(2)} below threshold ${styleResult.threshold.toFixed(1)}`
    );
  }

  return {
    sectionLabel: entry.sectionLabel,
    startBar: entry.startBar,
    endBar: entry.endBar,
    composerId: entry.composerId,
    passed: styleResult.pass,
    scores,
    failures,
  };
}

function evaluateSectionEntry(score: ScoreModel, entry: SectionLockEntry): DuoSectionEvalResult | undefined {
  const profile = styleProfileForSection(entry.composerId);
  if (!profile) {
    console.warn(
      `[duo-section-eval] no style profile for composer "${entry.composerId}" — section "${entry.sectionLabel}" skipped`
    );
    return undefined;
  }

  try {
    const sectionScore = sliceScoreForBarRange(score, entry.startBar, entry.endBar);
    const features = mergeSectionFeatures(sectionScore, entry.expectedHarmonyBars);

    const styleResult = profile.score({
      output: sectionScore,
      features,
      profile,
    });

    return buildEvalResult(entry, styleResult);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(
      `[duo-section-eval] section "${entry.sectionLabel}" (${entry.composerId}) eval error: ${message}`
    );
    return {
      sectionLabel: entry.sectionLabel,
      startBar: entry.startBar,
      endBar: entry.endBar,
      composerId: entry.composerId,
      passed: false,
      scores: {},
      failures: [message],
    };
  }
}

/**
 * Evaluate each duo section against its composer style profile (order-independent, pure).
 */
export function evaluateMosaicSections(
  score: ScoreModel,
  context: CompositionContext
): DuoSectionEvalResult[] {
  const registry = context.generationMetadata?.mosaicLockRegistry;
  if (!registry || registry.length === 0) return [];

  const results: DuoSectionEvalResult[] = [];
  for (const entry of registry) {
    const result = evaluateSectionEntry(score, entry);
    if (result) results.push(result);
  }
  return results;
}
