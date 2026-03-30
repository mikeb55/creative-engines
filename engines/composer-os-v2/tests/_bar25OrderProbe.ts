/**
 * One-off: first wrapped pipeline fn where bar 25 time-sorted pitch order changes (seed 50021).
 */
import type { PartModel, ScoreModel } from '../core/score-model/scoreModelTypes';
import * as phrase from '../core/goldenPath/songModePhraseEngineV1';
import * as pp from '../core/performance/performancePass';
import * as ex from '../core/goldenPath/expressiveDuoFeel';
import * as orch from '../core/goldenPath/duoOrchestrationPass';
import * as style from '../core/song-mode/songModeStyleEngine';
import * as rhy from '../core/goldenPath/songModeRhythmOverlayC1';
import * as jb from '../core/goldenPath/jamesBrownFunkOverlay';
import * as os4 from '../core/goldenPath/songModeOstinatoC4';
import * as c5 from '../core/goldenPath/songModeControlC5';
import * as c6 from '../core/goldenPath/songModeExpressionC6';
import * as c7 from '../core/goldenPath/songModeSpaceC7';
import * as fin from '../core/score-integrity/duoBarMathFinalize';

function b25FromPart(guitar: PartModel | undefined): number[] {
  const m = guitar?.measures.find((x) => x.index === 25);
  if (!m) return [];
  return m.events
    .filter((e) => e.kind === 'note')
    .map((e) => e as { pitch: number; startBeat: number })
    .sort((a, b) => a.startBeat - b.startBeat)
    .map((n) => n.pitch);
}

function b25Order(s: ScoreModel): number[] {
  const g = s.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  return b25FromPart(g);
}

function wrapPart(name: string, fn: (g: PartModel, c: import('../core/compositionContext').CompositionContext) => void) {
  return (g: PartModel, c: import('../core/compositionContext').CompositionContext) => {
    const before = JSON.stringify(b25FromPart(g));
    fn(g, c);
    const after = JSON.stringify(b25FromPart(g));
    if (before !== after) {
      // eslint-disable-next-line no-console
      console.log(`FIRST_CHANGE ${name}\nBEFORE ${before}\nAFTER ${after}`);
      process.exit(0);
    }
  };
}

function wrapScoreMutate(
  name: string,
  fn: (s: ScoreModel, ...rest: unknown[]) => ScoreModel | void
) {
  return (s: ScoreModel, ...rest: unknown[]) => {
    const before = JSON.stringify(b25Order(s));
    const out = fn(s, ...rest);
    const score = (out ?? s) as ScoreModel;
    const after = JSON.stringify(b25Order(score));
    if (before !== after) {
      // eslint-disable-next-line no-console
      console.log(`FIRST_CHANGE ${name}\nBEFORE ${before}\nAFTER ${after}`);
      process.exit(0);
    }
    return out;
  };
}

function wrapScoreNew(name: string, fn: (s: ScoreModel, ...rest: unknown[]) => ScoreModel) {
  return (s: ScoreModel, ...rest: unknown[]) => {
    const before = JSON.stringify(b25Order(s));
    const out = fn(s, ...rest);
    const after = JSON.stringify(b25Order(out));
    if (before !== after) {
      // eslint-disable-next-line no-console
      console.log(`FIRST_CHANGE ${name}\nBEFORE ${before}\nAFTER ${after}`);
      process.exit(0);
    }
    return out;
  };
}

function def<T extends object, K extends keyof T>(mod: T, key: K, val: T[K]): void {
  Object.defineProperty(mod, key, { value: val, configurable: true, enumerable: true });
}

const _p = phrase.applySongModePhraseEngineV1;
def(phrase, 'applySongModePhraseEngineV1', wrapPart('applySongModePhraseEngineV1', _p));
const _pp = pp.applyPerformancePass;
def(pp, 'applyPerformancePass', wrapScoreNew('applyPerformancePass', _pp));
const _ex = ex.applyExpressiveDuoFeel;
def(ex, 'applyExpressiveDuoFeel', wrapScoreNew('applyExpressiveDuoFeel', _ex));
const _o = orch.applyDuoOrchestrationPass;
def(orch, 'applyDuoOrchestrationPass', wrapScoreMutate('applyDuoOrchestrationPass', _o));
const _st = style.applySongModeStyleEngineToScore;
def(style, 'applySongModeStyleEngineToScore', wrapScoreMutate('applySongModeStyleEngineToScore', _st));
const _r = rhy.applySongModeRhythmOverlayC1;
def(rhy, 'applySongModeRhythmOverlayC1', wrapScoreMutate('applySongModeRhythmOverlayC1', _r));
const _jb = jb.applyJamesBrownFunkOverlay;
def(jb, 'applyJamesBrownFunkOverlay', wrapScoreMutate('applyJamesBrownFunkOverlay', _jb));
const _os = os4.applySongModeOstinatoC4;
def(os4, 'applySongModeOstinatoC4', wrapScoreMutate('applySongModeOstinatoC4', _os));
const _c5 = c5.applySongModeControlC5;
def(c5, 'applySongModeControlC5', wrapScoreMutate('applySongModeControlC5', _c5));
const _c6 = c6.applySongModeExpressionC6;
def(c6, 'applySongModeExpressionC6', wrapScoreMutate('applySongModeExpressionC6', _c6));
const _c7 = c7.applySongModeSpaceC7;
def(c7, 'applySongModeSpaceC7', wrapScoreMutate('applySongModeSpaceC7', _c7));
const _fi = fin.finalizeAndSealDuoScoreBarMath;
def(fin, 'finalizeAndSealDuoScoreBarMath', wrapScoreMutate('finalizeAndSealDuoScoreBarMath', _fi));

async function main() {
  const { generateGoldenPathDuoScore } = await import('../core/goldenPath/generateGoldenPathDuoScore');
  const { buildContextForGoldenPath, buildGoldenPathPlans } = await import('../core/goldenPath/runGoldenPath');
  const seed = 50021;
  const opts = {
    songModeHookFirstIdentity: true,
    presetId: 'guitar_bass_duo' as const,
    totalBars: 32,
    longFormEnabled: true,
  };
  const ctx = buildContextForGoldenPath(seed, opts);
  const plans = buildGoldenPathPlans(seed, ctx, opts);
  generateGoldenPathDuoScore(ctx, plans, {});
  // eslint-disable-next-line no-console
  console.log('NO_CHANGE in wrapped fns');
}

main();
