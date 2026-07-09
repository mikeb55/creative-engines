/**
 * GCE scorer routing - effective style from engaged authority (not harmonicVoice metadata alone).
 */

import type { CompositionContext } from '../core/compositionContext';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';
import {
  scoreEcmChamberResultForGce,
  scoreFrankZappaResultForGce,
  scoreGoldenPathResultForGce,
} from '../core/gce/gceGate';
import {
  HV_SCORER_MISMATCH_PREFIX,
  resolveEffectiveGceStyleId,
  resolveGceScorerRouting,
} from '../core/gce/resolveEffectiveGceStyle';
import { buildEcmChamberContext } from '../core/ecm/buildEcmChamberContext';
import { planEcmTextureBars } from '../core/ecm/ecmTextureEngine';

function minimalScore(): ScoreModel {
  const measures = Array.from({ length: 8 }, (_, i) => ({
    index: i + 1,
    chord: 'Cmaj7',
    events: [{ kind: 'note' as const, pitch: 64, startBeat: 0, duration: 1, voice: 1 }],
  }));
  return {
    parts: [
      {
        id: 'guitar',
        name: 'Guitar',
        instrumentIdentity: 'clean_electric_guitar',
        midiProgram: 27,
        clef: 'treble',
        measures,
      },
    ],
  } as ScoreModel;
}

function baseContext(overrides: Partial<CompositionContext> = {}): CompositionContext {
  return {
    presetId: 'guitar_bass_duo',
    form: { totalBars: 8, sections: [{ label: 'a', startBar: 1, length: 8 }] },
    generationMetadata: {
      songwriterStyleId: 'barry_harris',
    },
    ...overrides,
  } as CompositionContext;
}

function testPrimaryFrankZappaRoutesZappaScorer(): boolean {
  const ctx = baseContext({
    generationMetadata: { songwriterStyleId: 'frank_zappa' },
  });
  const routing = resolveGceScorerRouting(ctx);
  const gate = scoreGoldenPathResultForGce(minimalScore(), ctx);
  const direct = scoreFrankZappaResultForGce(minimalScore(), ctx);
  return (
    routing.routeFrankZappaScorer &&
    routing.effectiveStyleId === 'frank_zappa' &&
    !routing.harmonicVoiceScorerMismatch &&
    gate.overallScore === direct.overallScore
  );
}

function testFrankZappaHvWithoutAuthorityDoesNotRouteZappaScorer(): boolean {
  const ctx = baseContext({
    generationMetadata: {
      songwriterStyleId: 'barry_harris',
      harmonicVoice: 'frank_zappa',
    },
  });
  const routing = resolveGceScorerRouting(ctx);
  const gate = scoreGoldenPathResultForGce(minimalScore(), ctx);
  const zappaDirect = scoreFrankZappaResultForGce(minimalScore(), ctx);
  return (
    !routing.routeFrankZappaScorer &&
    routing.effectiveStyleId === 'barry_harris' &&
    Boolean(routing.harmonicVoiceScorerMismatch?.startsWith(HV_SCORER_MISMATCH_PREFIX)) &&
    gate.overallScore !== zappaDirect.overallScore &&
    Boolean(ctx.generationMetadata?.harmonicVoiceScorerMismatch)
  );
}

function testVerlaineHvWithAuthorityUsesEffectiveVerlaine(): boolean {
  const bars = Array.from({ length: 8 }, () => 'Esus4/D');
  const ctx = baseContext({
    generationMetadata: {
      songwriterStyleId: 'barry_harris',
      harmonicVoice: 'verlaine',
      verlaineEffectiveHarmonyBars: bars,
    },
  });
  const routing = resolveGceScorerRouting(ctx);
  return routing.effectiveStyleId === 'verlaine' && !routing.harmonicVoiceScorerMismatch;
}

function testVerlaineHvWithoutAuthorityEmitsMismatch(): boolean {
  const ctx = baseContext({
    generationMetadata: {
      songwriterStyleId: 'barry_harris',
      harmonicVoice: 'verlaine',
    },
  });
  scoreGoldenPathResultForGce(minimalScore(), ctx);
  const routing = resolveGceScorerRouting(ctx);
  return (
    resolveEffectiveGceStyleId(ctx) === 'barry_harris' &&
    Boolean(routing.harmonicVoiceScorerMismatch?.includes('verlaine'))
  );
}

function testEcmChamberPresetRoutingUnchanged(): boolean {
  const ctx = buildEcmChamberContext(42, 'ECM_METHENY_QUARTET', { totalBars: 8 });
  ctx.presetId = 'ecm_chamber';
  ctx.generationMetadata = {
    ...ctx.generationMetadata,
    ecmMode: 'ECM_METHENY_QUARTET',
    ecmBarTexturePlan: planEcmTextureBars(8, 'ECM_METHENY_QUARTET', 42),
  };
  const score = minimalScore();
  const gate = scoreGoldenPathResultForGce(score, ctx);
  const direct = scoreEcmChamberResultForGce(score, ctx);
  return gate.overallScore === direct.overallScore && gate.weakestCategory === direct.weakestCategory;
}

export function runGceScorerRoutingTests(): { name: string; ok: boolean }[] {
  return [
    ['GCE routing - primary frank_zappa uses Zappa scorer', testPrimaryFrankZappaRoutesZappaScorer],
    [
      'GCE routing - frank_zappa HV without authority stays generic + mismatch',
      testFrankZappaHvWithoutAuthorityDoesNotRouteZappaScorer,
    ],
    ['GCE routing - verlaine HV with eff bars uses effective verlaine', testVerlaineHvWithAuthorityUsesEffectiveVerlaine],
    ['GCE routing - verlaine HV without authority emits mismatch', testVerlaineHvWithoutAuthorityEmitsMismatch],
    ['GCE routing - ecm_chamber preset unchanged', testEcmChamberPresetRoutingUnchanged],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}