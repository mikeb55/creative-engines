/**
 * Line-first contrapuntal precompute slot (Basie-style metadata attachment).
 * Runs on duo golden path **before** any `precompute*EffectiveHarmonyBars` so lines are not
 * slaved to post-slice chord blocks. Independent of `lineFirstHierarchy` (voicing solver flag on
 * `VoiceRuleBundle` — Brookmeyer still sets that in slice precompute; complementary concerns).
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import type { AbstractLineSet } from './abstractLineSet';
import { getVoiceRuleBundle } from '../composer/voiceRuleBundles';
import { ContrapuntalLineEngine } from './ContrapuntalLineEngine';
import {
  runSqBbGceGate1,
  shouldApplySqToBbGceGates,
} from './sqToBbGceGates';

/**
 * When the resolved `VoiceRuleBundle` carries `contrapuntalLinePolicy.enabled`, builds
 * `AbstractLineSet` and stores on `generationMetadata.contrapuntalLineSet` (still before harmony-bar precompute).
 */
export function precomputeContrapuntalLines(context: CompositionContext, vrbId: string): AbstractLineSet | null {
  const id = (vrbId || context.voiceBundle?.voiceId || '').trim();
  const bundle = context.voiceBundle ?? getVoiceRuleBundle(id);
  if (!bundle?.contrapuntalLinePolicy?.enabled) return null;
  const engine = new ContrapuntalLineEngine(id, context);
  const tb = Math.max(1, context.form.totalBars);
  const lines = engine.generateLines(tb, 'chords_only');
  let filtered = engine.applyVrbFilter(lines);
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  if (shouldApplySqToBbGceGates(context, id)) {
    const gate1 = runSqBbGceGate1(filtered, context);
    genMeta.sqBbGceGate1 = gate1.record;
    filtered = gate1.refinedLines;
    genMeta.contrapuntalLineSet = filtered;
    if (!gate1.record.proceedToRenderer) {
      genMeta.sqBbGceGate1BlockedRenderer = true;
    }
    return filtered;
  }
  genMeta.contrapuntalLineSet = filtered;
  return filtered;
}
