/**
 * Evaluation module — Basie style profile + feature extraction + GCE + LOCK (smoke).
 */

import type { ExtractedStyleFeatures } from './evaluationTypes';
import type { ScoreModel } from '../score-model/scoreModelTypes';
import { basieStyleProfile } from './basieStyleProfile';
import { defaultGceWeights, evaluateGce } from './gceEvaluator';
import { defaultLockGates, evaluateLock } from './lockGates';
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

function testBasieProfileIdealAndAnti(): boolean {
  return testBasieProfileStructure() && testIdealBasieFeaturesScore() && testAntiBasieFeaturesScore();
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

function testGceEvaluatorSmoke(): boolean {
  const gceCategories = [
    'cadentialClarity',
    'melodicIdentity',
    'phraseGrammar',
    'harmonyAndLanguage',
    'rhythmicIdentity',
    'structureAndForm',
    'arrangementAndOrchestration',
    'economyAndFocus',
    'tensionAndRelease',
    'thematicRecallPotential',
  ] as const;

  const weightSum = (Object.values(defaultGceWeights) as number[]).reduce((a, v) => a + v, 0);
  const weightsOk = Math.abs(weightSum - 1.0) < 1e-9;

  const res = evaluateGce({
    output: {},
    features: {},
    weights: defaultGceWeights,
  });

  const allPresent = gceCategories.every((k) => res.categories[k] != null);
  const scoreOk = res.finalScore >= 0 && res.finalScore <= 10;

  return weightsOk && allPresent && scoreOk;
}

function testLockGatesSmoke(): boolean {
  const idsOk =
    defaultLockGates.length === 6 &&
    defaultLockGates.map((g) => g.id).join(',') ===
      'xmlValidity,barDurationIntegrity,chordMelodyAlignment,sectionContrast,rhythmAntiLoop,registerIntegrity';

  const validFeatures: ExtractedStyleFeatures = {
    formal: { barCount: 32, riffRepetitionRatio: 0.55 },
    harmonic: { chordTimelinePresent: true },
    rhythmic: { swingGridAlignment: 0.72 },
    orchestration: { avgVoicingSize: 5 },
  };

  const failNull = evaluateLock(null, validFeatures);
  const xmlFail = failNull.failedGates.find((g) => g.gateId === 'xmlValidity');
  const nullCaseOk =
    !failNull.pass &&
    xmlFail != null &&
    xmlFail.severity === 'critical' &&
    xmlFail.status === 'fail';

  const passAll = evaluateLock({}, validFeatures);
  const passOk = passAll.pass && passAll.failedGates.length === 0;

  return idsOk && nullCaseOk && passOk;
}

export function runEvaluationSmokeTests(): { name: string; ok: boolean }[] {
  return [
    ['Evaluation: Basie profile + ideal/anti scoring', testBasieProfileIdealAndAnti],
    ['Evaluation: non-scoreModel extraction yields null metrics', testNonScoreModelExtractorReturnsNulls],
    ['Evaluation: GCE evaluator (10 categories, weights, score range)', testGceEvaluatorSmoke],
    ['Evaluation: LOCK gates (defaults, xml fail, mock pass)', testLockGatesSmoke],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
