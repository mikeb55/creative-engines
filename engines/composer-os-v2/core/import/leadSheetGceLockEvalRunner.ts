/**
 * Leadsheet quintet GCE v2.0 + LOCK eval - thin runner + feature adapter only.
 * Calls existing evaluation stack; does not modify formulas, weights, or gates.
 */

import type { ScoreModel } from '../score-model/scoreModelTypes';
import type { ExtractedStyleFeatures, GceCategory, LockGateResult } from '../evaluation/evaluationTypes';
import { evaluateGce, GCE_CATEGORY_ORDER, defaultGceWeights } from '../evaluation/gceEvaluator';
import { evaluateLock } from '../evaluation/lockGates';
import { extractScoreModelFeatures } from '../evaluation/featureExtractor';
import { buildFallbackChordsAndSectionsFromScore } from '../gce/gceGate';
import {
  scoreCadentialClarity,
  scoreMelodicIdentity,
  scoreRhythmicIdentity,
  scoreStructureAndForm,
} from '../gce/gceAutoScorers';
import { scoreModelToMelodicLine } from '../gce/scoreModelToMelodicLine';
import { resolveMelodicPartId } from '../gce/resolveMelodicPartId';

export const GCE_PASS_THRESHOLD = 9.0;

export interface LeadSheetGceHardGate {
  id: string;
  detail: string;
}

export interface LeadSheetGceLockEvalResult {
  composerId: string;
  seed?: number;
  sourceFile?: string;
  scoringMode: 'feature-linked' | 'placeholder';
  gce: {
    categories: Record<GceCategory, number>;
    finalScore: number;
    weakestCategory: GceCategory;
    pass: boolean;
    threshold: number;
  };
  gceHardGates: LeadSheetGceHardGate[];
  gceHardGatePass: boolean;
  lock: {
    pass: boolean;
    gates: LockGateResult[];
    failedGates: LockGateResult[];
  };
  overallPass: boolean;
  featuresUsed: ExtractedStyleFeatures;
}

function maxMeasureIndexAcrossParts(score: ScoreModel): number {
  let max = 0;
  for (const p of score.parts) {
    for (const m of p.measures) {
      if (m.index > max) max = m.index;
    }
  }
  return max;
}

function scoreHasChordTimeline(score: ScoreModel): boolean {
  for (const p of score.parts) {
    for (const m of p.measures) {
      if (m.chord?.trim()) return true;
    }
  }
  return false;
}

/** Enrich extractor output with LOCK gate fields not set by scoreModelFeatureExtractor. */
export function adaptLeadSheetFeaturesForLock(
  score: ScoreModel,
  base: ExtractedStyleFeatures,
): ExtractedStyleFeatures {
  const barCount = Math.max(1, maxMeasureIndexAcrossParts(score));
  const hasChords = scoreHasChordTimeline(score);
  return {
    ...base,
    formal: {
      ...base.formal,
      barCount,
    },
    harmonic: hasChords
      ? {
          ...(base.harmonic ?? {}),
          chordTimelinePresent: true,
          barCount,
        }
      : base.harmonic,
  };
}

function detectGceHardGates(score: ScoreModel, composerId: string): LeadSheetGceHardGate[] {
  const { chords, sections } = buildFallbackChordsAndSectionsFromScore(score);
  const melody = scoreModelToMelodicLine(score, resolveMelodicPartId(score));
  const hardGates: LeadSheetGceHardGate[] = [];

  const melodic = scoreMelodicIdentity(melody, composerId);
  if (melodic.score <= 6 || melodic.justification.includes('[HARD FAIL]')) {
    hardGates.push({
      id: 'melodicIdentity',
      detail: `${melodic.score} - ${melodic.justification}`,
    });
  }

  const structure = scoreStructureAndForm(score, chords, sections);
  if (structure.justification.includes('[HARD FAIL')) {
    hardGates.push({
      id: 'structureAndForm',
      detail: structure.justification,
    });
  }

  const cadence = scoreCadentialClarity(melody, chords, sections);
  if (cadence.score <= 4) {
    hardGates.push({
      id: 'cadentialClarity',
      detail: `${cadence.score} - ${cadence.justification}`,
    });
  }

  const rhythm = scoreRhythmicIdentity(melody);
  if (rhythm.justification.includes('[HARD FAIL]')) {
    hardGates.push({
      id: 'rhythmicIdentity',
      detail: rhythm.justification,
    });
  }

  return hardGates;
}

function inferScoringMode(gceCategories: Record<GceCategory, number>): 'feature-linked' | 'placeholder' {
  const values = GCE_CATEGORY_ORDER.map((c) => gceCategories[c]);
  const allFive = values.every((v) => Math.abs(v - 5.0) < 1e-9);
  return allFive ? 'placeholder' : 'feature-linked';
}

export function runLeadSheetGceLockEval(input: {
  score: ScoreModel;
  composerId: string;
  seed?: number;
  sourceFile?: string;
}): LeadSheetGceLockEvalResult {
  const extracted = extractScoreModelFeatures(input.score);
  const features = adaptLeadSheetFeaturesForLock(input.score, extracted);

  const gceResult = evaluateGce({
    output: input.score,
    features,
    weights: defaultGceWeights,
    metadata: { songwriterStyleId: input.composerId },
  });

  const categories = {} as Record<GceCategory, number>;
  for (const cat of GCE_CATEGORY_ORDER) {
    categories[cat] = gceResult.categories[cat].score;
  }

  const scoringMode = inferScoringMode(categories);
  const gceHardGates = detectGceHardGates(input.score, input.composerId);
  const gceHardGatePass = gceHardGates.length === 0;

  const lock = evaluateLock(input.score, features);
  const overallPass = gceResult.pass && lock.pass && gceHardGatePass;

  return {
    composerId: input.composerId,
    seed: input.seed,
    sourceFile: input.sourceFile,
    scoringMode,
    gce: {
      categories,
      finalScore: gceResult.finalScore,
      weakestCategory: gceResult.weakestCategory,
      pass: gceResult.pass,
      threshold: gceResult.threshold,
    },
    gceHardGates,
    gceHardGatePass,
    lock: {
      pass: lock.pass,
      gates: lock.gates,
      failedGates: lock.failedGates,
    },
    overallPass,
    featuresUsed: features,
  };
}

export function formatLeadSheetGceLockReport(result: LeadSheetGceLockEvalResult): string {
  const lines: string[] = [];
  const src = result.sourceFile ? ` (${result.sourceFile})` : '';
  lines.push(`\n=== GCE + LOCK - ${result.composerId}${src} ===`);
  lines.push(`Scoring mode: ${result.scoringMode}`);
  lines.push('GCE categories (evaluateGce / gceAutoScorers):');
  for (const cat of GCE_CATEGORY_ORDER) {
    lines.push(`  ${cat}: ${result.gce.categories[cat].toFixed(1)}`);
  }
  lines.push(
    `GCE finalScore: ${result.gce.finalScore}/10 (target ${result.gce.threshold}: ${result.gce.pass ? 'PASS' : 'FAIL'})`,
  );
  lines.push(`Weakest category: ${result.gce.weakestCategory}`);
  if (result.gceHardGates.length) {
    lines.push('GCE hard gates FAILED:');
    for (const h of result.gceHardGates) lines.push(`  - ${h.id}: ${h.detail}`);
  } else {
    lines.push('GCE hard gates: none tripped');
  }
  lines.push('LOCK gates (evaluateLock):');
  for (const g of result.lock.gates) {
    const reason = g.reason ? ` - ${g.reason}` : '';
    lines.push(`  ${g.gateId} [${g.severity}]: ${g.status}${reason}`);
  }
  lines.push(`LOCK overall: ${result.lock.pass ? 'PASS' : 'FAIL'}`);
  lines.push(
    `Overall PASS (GCE ${result.gce.threshold} + LOCK + hard gates): ${result.overallPass ? 'PASS' : 'FAIL'}`,
  );
  return lines.join('\n');
}

export function serializeLeadSheetGceLockEval(result: LeadSheetGceLockEvalResult): Record<string, unknown> {
  return {
    composerId: result.composerId,
    seed: result.seed,
    sourceFile: result.sourceFile,
    scoringMode: result.scoringMode,
    gce: result.gce,
    gceHardGates: result.gceHardGates,
    gceHardGatePass: result.gceHardGatePass,
    lock: {
      pass: result.lock.pass,
      gates: result.lock.gates,
      failedGates: result.lock.failedGates,
    },
    overallPass: result.overallPass,
    featuresUsed: result.featuresUsed,
  };
}
