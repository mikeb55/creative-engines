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
  const filtered = engine.applyVrbFilter(lines);
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  genMeta.contrapuntalLineSet = filtered;
  return filtered;
}
