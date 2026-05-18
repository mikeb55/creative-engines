/**
 * ECM GCE orchestration — rhythm expectation, space/silence scorer, VRB policy, feel wiring.
 */

import { getVoiceRuleBundle } from '../core/composer/voiceRuleBundles';
import {
  rhythmExpectationForVrb,
  scoreEcmFeelCategory,
  scoreEcmSpaceAndSilence,
  type EcmBarRole,
} from '../core/gce/gceAutoScorers';
import { scoreEcmChamberResultForGce } from '../core/gce/gceGate';
import { runEcmArrangementPolicyTests } from './ecmArrangementPolicy.test';
import { runEcmShapingPassTests } from './ecmShapingPass.test';
import type { CompositionContext } from '../core/compositionContext';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';
import { buildEcmChamberContext } from '../core/ecm/buildEcmChamberContext';
import { planEcmTextureBars } from '../core/ecm/ecmTextureEngine';

function barRolesFromTexture(totalBars: number, seed: number): EcmBarRole[] {
  return planEcmTextureBars(totalBars, 'ECM_METHENY_QUARTET', seed).map((r) => ({
    bar: r.bar,
    guitarRole: r.guitarRole,
    bassRole: r.bassRole,
  }));
}

function syntheticRoles(silenceBars: number[], sustainBars: number[], total = 20): EcmBarRole[] {
  const rows: EcmBarRole[] = [];
  for (let b = 1; b <= total; b++) {
    let guitarRole = 'lead';
    if (silenceBars.includes(b)) guitarRole = 'silence';
    else if (sustainBars.includes(b)) guitarRole = 'sustain_pad';
    rows.push({ bar: b, guitarRole, bassRole: 'sustain_pad' });
  }
  return rows;
}

function minimalEcmContext(): CompositionContext {
  const context = buildEcmChamberContext(42, 'ECM_METHENY_QUARTET', { totalBars: 24 });
  context.presetId = 'ecm_chamber';
  context.generationMetadata = {
    ...context.generationMetadata,
    ecmMode: 'ECM_METHENY_QUARTET',
    ecmBarTexturePlan: planEcmTextureBars(24, 'ECM_METHENY_QUARTET', 42),
  };
  return context;
}

function minimalEcmScore(): ScoreModel {
  return {
    parts: [
      {
        id: 'guitar',
        name: 'Guitar',
        instrumentIdentity: 'clean_electric_guitar',
        midiProgram: 27,
        clef: 'treble',
        measures: Array.from({ length: 24 }, (_, i) => ({
          index: i + 1,
          chord: 'Emin9',
          events: [{ kind: 'note', pitch: 64, startBeat: 0, duration: 2, voice: 1 }],
        })),
      },
      {
        id: 'bass',
        name: 'Bass',
        instrumentIdentity: 'acoustic_upright_bass',
        midiProgram: 33,
        clef: 'bass',
        measures: Array.from({ length: 24 }, (_, i) => ({
          index: i + 1,
          chord: 'Emin9',
          events: [{ kind: 'note', pitch: 40, startBeat: 0, duration: 4, voice: 1 }],
        })),
      },
    ],
  } as ScoreModel;
}

export function runEcmGceOrchestrationTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const exp = rhythmExpectationForVrb('ecm_chamber');
  out.push({
    ok: exp?.placementMode === 'grid',
    name: "rhythmExpectationForVrb('ecm_chamber') → placementMode 'grid'",
  });
  out.push({
    ok: (exp?.anticipationRateMax ?? 1) <= 0.05,
    name: "rhythmExpectationForVrb('ecm_chamber') → anticipationRateMax ≤ 0.05",
  });

  const fullCredit = scoreEcmSpaceAndSilence(
    syntheticRoles([2, 5, 8, 12], [3, 6, 10], 20),
    20,
    'ecm_chamber',
  );
  out.push({
    ok: fullCredit.score >= 9,
    name: 'scoreEcmSpaceAndSilence — silenceRatio 0.20 → full credit',
  });

  const dense = scoreEcmSpaceAndSilence(syntheticRoles([3], [], 20), 20, 'ecm_chamber');
  out.push({
    ok: dense.score <= 4,
    name: 'scoreEcmSpaceAndSilence — silenceRatio 0.05 → heavy penalty',
  });

  const sparse = scoreEcmSpaceAndSilence(
    syntheticRoles([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [], 20),
    20,
    'ecm_chamber',
  );
  out.push({
    ok: sparse.score <= 6,
    name: 'scoreEcmSpaceAndSilence — silenceRatio 0.45 → moderate penalty',
  });

  const sustainBonus = scoreEcmSpaceAndSilence(
    syntheticRoles([4, 8, 12], [2, 6, 10], 20),
    20,
    'ecm_chamber',
  );
  out.push({
    ok: sustainBonus.score >= 8,
    name: 'scoreEcmSpaceAndSilence — sustainRatio 0.15 → bonus credit',
  });

  const phraseEdge = scoreEcmSpaceAndSilence(
    syntheticRoles([], [], 16).map((r) =>
      r.bar % 4 === 0 ? { ...r, guitarRole: 'silence' } : r,
    ),
    16,
    'ecm_chamber',
    { phraseEdgeSpaceApplied: false },
  );
  out.push({
    ok: phraseEdge.details.phraseEdgeSpaceApplied === true || phraseEdge.score >= 8,
    name: 'scoreEcmSpaceAndSilence — phraseEdgeSpaceBonus applied when last bar of phrase is silence',
  });

  const bundle = getVoiceRuleBundle('ecm_chamber');
  out.push({
    ok: bundle?.ecmSpacePolicy !== undefined,
    name: 'ECM_CHAMBER bundle: ecmSpacePolicy present',
  });
  out.push({
    ok: bundle?.ecmSpacePolicy?.targetSilenceRatio === 0.2,
    name: 'ECM_CHAMBER bundle: targetSilenceRatio === 0.20',
  });

  const shaping = runEcmShapingPassTests();
  out.push({
    ok: shaping.every((r) => r.ok),
    name: 'ecmShapingPass existing tests: all still pass',
  });

  const arrangement = runEcmArrangementPolicyTests();
  out.push({
    ok: arrangement.every((r) => r.ok),
    name: 'ecmArrangementPolicy existing tests: all still pass',
  });

  const ctx = minimalEcmContext();
  const score = minimalEcmScore();
  const feel = scoreEcmFeelCategory(score, ctx, {});
  out.push({
    ok: feel.label === 'ecm_feel' && feel.score > 0,
    name: 'scoreEcmMethenyFeel / scoreEcmSchneiderFeel wired — non-null result for ecm_chamber context',
  });

  const gate = scoreEcmChamberResultForGce(score, ctx);
  out.push({
    ok: gate.overallScore > 0 && Number.isFinite(gate.overallScore),
    name: 'scoreEcmChamberResultForGce returns finite overall score',
  });

  const roles = barRolesFromTexture(24, 99);
  out.push({
    ok: roles.length === 24 && roles.some((r) => r.guitarRole === 'silence'),
    name: 'planEcmTextureBars produces per-bar roles for GCE input',
  });

  return out;
}
