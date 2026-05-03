/**
 * Evaluation module — Basie style profile + feature extraction (smoke).
 */

import type { ExtractedStyleFeatures } from './evaluationTypes';
import type { ScoreModel } from '../score-model/scoreModelTypes';
import { basieStyleProfile } from './basieStyleProfile';
import { scoreModelFeatureExtractor } from './featureExtractor';

const emptyScoreStub = (): ScoreModel => ({ title: '', parts: [] });

function testBasieProfileStructure(): boolean {
  const okLoads = basieStyleProfile != null && typeof basieStyleProfile.id === 'string';
  const okDims = basieStyleProfile.dimensions.length === 4;
  const okWeights =
    Math.abs(basieStyleProfile.dimensions.reduce((acc, d) => acc + d.weight, 0) - 1.0) < 1e-9;
  const okThreshold = basieStyleProfile.threshold === 7.0;
  return okLoads && okDims && okWeights && okThreshold;
}

function testIdealBasieFeaturesScore(): boolean {
  const features: ExtractedStyleFeatures = {
    orchestration: { avgVoicingSize: 3, pianoDensity: 0.15 },
    formal: { riffRepetitionRatio: 0.72 },
    rhythmic: { swingGridAlignment: 0.82 },
  };
  const r = basieStyleProfile.score({
    output: {},
    features,
    profile: basieStyleProfile,
  });
  return r.finalStyleScore >= 8.5;
}

function testAntiBasieFeaturesScore(): boolean {
  const features: ExtractedStyleFeatures = {
    orchestration: { avgVoicingSize: 12, pianoDensity: 0.95 },
    formal: { riffRepetitionRatio: 0.05 },
    rhythmic: { swingGridAlignment: 0.15 },
  };
  const r = basieStyleProfile.score({
    output: {},
    features,
    profile: basieStyleProfile,
  });
  return r.finalStyleScore < 7.0;
}

function testNonScoreModelExtractorReturnsNulls(): boolean {
  const r = scoreModelFeatureExtractor.extract({
    output: emptyScoreStub(),
    sourceFormat: 'midi',
  });
  return (
    r.orchestration?.avgVoicingSize === null &&
    r.orchestration?.pianoDensity === null &&
    r.formal?.riffRepetitionRatio === null &&
    r.rhythmic?.swingGridAlignment === null
  );
}

export function runEvaluationSmokeTests(): { name: string; ok: boolean }[] {
  return [
    ['Evaluation: Basie profile structure', testBasieProfileStructure],
    ['Evaluation: ideal Basie features score >= 8.5', testIdealBasieFeaturesScore],
    ['Evaluation: anti-Basie features score < 7.0', testAntiBasieFeaturesScore],
    ['Evaluation: non-scoreModel extraction yields null metrics', testNonScoreModelExtractorReturnsNulls],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
