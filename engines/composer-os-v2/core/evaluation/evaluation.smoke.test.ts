/**
 * Evaluation module — Basie style profile + feature extraction + GCE + LOCK + DCR (smoke).
 */

import type {
  CandidateGenerationInput,
  CandidateGenerator,
  CandidateRefiner,
  CombinedEvaluationInput,
  CombinedEvaluationResult,
  CombinedEvaluator,
  DcrProtocolConfig,
  ExtractedStyleFeatures,
} from './evaluationTypes';
import type { ScoreModel } from '../score-model/scoreModelTypes';
import { basieStyleProfile } from './basieStyleProfile';
import { createCombinedEvaluator } from './combinedEvaluator';
import { ellingtonStyleProfile } from './ellingtonStyleProfile';
import { schneiderStyleProfile } from './schneiderStyleProfile';
import { quincyStyleProfile } from './quincyStyleProfile';
import { thadJonesStyleProfile } from './thadJonesStyleProfile';
import { gilEvansStyleProfile } from './gilEvansStyleProfile';
import { bobBrookmeyerStyleProfile } from './bobBrookmeyerStyleProfile';
import { clareFischerStyleProfile } from './clareFischerStyleProfile';
import { oliverNelsonStyleProfile } from './oliverNelsonStyleProfile';
import { sammyNesticoStyleProfile } from './sammyNesticoStyleProfile';
import { strayhornStyleProfile, evaluateStrayhornHardFails } from './strayhornStyleProfile';
import { sebeskyStyleProfile, evaluateSebeskyHardFails } from './sebeskyStyleProfile';
import { defaultGceWeights, evaluateGce } from './gceEvaluator';
import { defaultLockGates, evaluateLock } from './lockGates';
import { runDcrProtocol } from './dcrProtocol';
import { scoreModelFeatureExtractor } from './featureExtractor';

const emptyScoreStub = (): ScoreModel => ({ title: '', parts: [] });

/** Minimal 2-bar piano score for combined-evaluator smoke (scoreModel extract path). */
function smokeScoreModel(): ScoreModel {
  return {
    title: 'eval-smoke',
    parts: [
      {
        id: 'piano',
        name: 'Piano',
        instrumentIdentity: 'piano',
        midiProgram: 0,
        clef: 'treble',
        songModePresentAsPianoComp: true,
        measures: [
          { index: 1, events: [{ kind: 'note', pitch: 60, startBeat: 0, duration: 2 }] },
          { index: 2, events: [{ kind: 'note', pitch: 64, startBeat: 0, duration: 2 }] },
        ],
      },
    ],
  };
}

function testProfileRegistrySmoke(): boolean {
  const profiles = [
    ellingtonStyleProfile,
    schneiderStyleProfile,
    quincyStyleProfile,
    thadJonesStyleProfile,
    gilEvansStyleProfile,
    bobBrookmeyerStyleProfile,
    clareFischerStyleProfile,
    oliverNelsonStyleProfile,
    sammyNesticoStyleProfile,
    sebeskyStyleProfile,
  ];
  for (const p of profiles) {
    if (p.dimensions.length !== 4) return false;
    const w = p.dimensions.reduce((a, d) => a + d.weight, 0);
    if (Math.abs(w - 1.0) > 1e-9) return false;
    if (p.threshold !== 7.0) return false;
  }
  return true;
}

function testCombinedEvaluatorBasieSmoke(): boolean {
  const ce = createCombinedEvaluator({ lockRequired: false });
  const r = ce.evaluate({
    output: smokeScoreModel(),
    sourceFormat: 'scoreModel',
    styleProfile: basieStyleProfile,
    featureExtractor: scoreModelFeatureExtractor,
    gceWeights: defaultGceWeights,
    lockGates: defaultLockGates,
    config: {
      gceWeight: 0.6,
      styleWeight: 0.4,
      lockRequired: false,
      passThreshold: 7.0,
    },
  });
  return (
    typeof r.finalScore === 'number' &&
    r.finalScore >= 0 &&
    r.finalScore <= 10 &&
    typeof r.pass === 'boolean'
  );
}

const LOCK_PASS_FEATURES: ExtractedStyleFeatures = {
  formal: { barCount: 32, riffRepetitionRatio: 0.55 },
  harmonic: { chordTimelinePresent: true },
  rhythmic: { swingGridAlignment: 0.72 },
  orchestration: { avgVoicingSize: 5 },
};

function mkStubCombinedResult(finalScore: number): CombinedEvaluationResult {
  const gce = evaluateGce({
    output: {},
    features: LOCK_PASS_FEATURES,
    weights: defaultGceWeights,
  });
  const style = basieStyleProfile.score({
    output: {},
    features: LOCK_PASS_FEATURES,
    profile: basieStyleProfile,
  });
  const lock = evaluateLock({}, LOCK_PASS_FEATURES);
  return {
    features: LOCK_PASS_FEATURES,
    gce,
    style,
    lock,
    finalScore,
    weakestDimension: gce.weakestCategory,
    pass: finalScore >= 7,
    reasons: [],
  };
}

function stubCombinedEvaluatorFromOutput(): CombinedEvaluator<number> {
  return {
    evaluate(input: CombinedEvaluationInput<number>): CombinedEvaluationResult {
      const fs =
        typeof input.output === 'number' && Number.isFinite(input.output)
          ? input.output
          : 5;
      return mkStubCombinedResult(fs);
    },
  };
}

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

function testGceEvaluatorOnly(): boolean {
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

function testStrayhornProfileSmoke(): boolean {
  const w = strayhornStyleProfile.dimensions.reduce((a, d) => a + d.weight, 0);
  if (strayhornStyleProfile.dimensions.length !== 6 || Math.abs(w - 1.0) > 1e-9) return false;
  const fails = evaluateStrayhornHardFails({});
  return Array.isArray(fails);
}

function testGceCombinedAndProfilesSmoke(): boolean {
  return testGceEvaluatorOnly() && testCombinedEvaluatorBasieSmoke() && testProfileRegistrySmoke() && testStrayhornProfileSmoke();
}

function testLockGatesSmoke(): boolean {
  const idsOk =
    defaultLockGates.length === 6 &&
    defaultLockGates.map((g) => g.id).join(',') ===
      'xmlValidity,barDurationIntegrity,chordMelodyAlignment,sectionContrast,rhythmAntiLoop,registerIntegrity';

  const failNull = evaluateLock(null, LOCK_PASS_FEATURES);
  const xmlFail = failNull.failedGates.find((g) => g.gateId === 'xmlValidity');
  const nullCaseOk =
    !failNull.pass &&
    xmlFail != null &&
    xmlFail.severity === 'critical' &&
    xmlFail.status === 'fail';

  const passAll = evaluateLock({}, LOCK_PASS_FEATURES);
  const passOk = passAll.pass && passAll.failedGates.length === 0;

  return idsOk && nullCaseOk && passOk;
}

function testDcrProtocolSmoke(): boolean {
  const baseConfig = (): DcrProtocolConfig => ({
    candidateCount: 3,
    allowSingleRefinementPass: true,
    targetScore: 9.0,
    minimumGceScore: 0,
    minimumStyleScore: 0,
    requireLockPass: false,
  });

  const stubGen: CandidateGenerator<number> = {
    generate(_inp: CandidateGenerationInput) {
      return [
        { id: 'c1', output: 9 },
        { id: 'c2', output: 5 },
        { id: 'c3', output: 4 },
      ];
    },
  };

  const stubRef: CandidateRefiner<number> = {
    refine(c) {
      return { ...c, output: (c.output as number) + 100 };
    },
  };

  const genIn: CandidateGenerationInput = { seed: 1 };

  const highTarget = runDcrProtocol({
    generationInput: genIn,
    generator: stubGen,
    refiner: stubRef,
    evaluator: stubCombinedEvaluatorFromOutput(),
    config: { ...baseConfig(), targetScore: 8 },
  });

  const commitOk =
    highTarget.finalCandidate != null &&
    typeof highTarget.refinementApplied === 'boolean' &&
    highTarget.refinementApplied === false &&
    highTarget.refinedCandidate === undefined;

  const lowTarget = runDcrProtocol({
    generationInput: genIn,
    generator: stubGen,
    refiner: stubRef,
    evaluator: stubCombinedEvaluatorFromOutput(),
    config: { ...baseConfig(), targetScore: 100 },
  });

  const refineOk =
    typeof lowTarget.refinementApplied === 'boolean' &&
    lowTarget.refinementApplied === true &&
    lowTarget.refinedCandidate !== undefined &&
    lowTarget.finalCandidate !== undefined;

  return commitOk && refineOk;
}

function testLockAndDcrSmoke(): boolean {
  return testLockGatesSmoke() && testDcrProtocolSmoke();
}

export function runEvaluationSmokeTests(): { name: string; ok: boolean }[] {
  return [
    ['Evaluation: Basie profile + ideal/anti scoring', testBasieProfileIdealAndAnti],
    ['Evaluation: non-scoreModel extraction yields null metrics', testNonScoreModelExtractorReturnsNulls],
    [
      'Evaluation: GCE + combined evaluator + Big Band arranger style profiles (10)',
      testGceCombinedAndProfilesSmoke,
    ],
    ['Evaluation: LOCK gates + DCR protocol (smoke)', testLockAndDcrSmoke],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
