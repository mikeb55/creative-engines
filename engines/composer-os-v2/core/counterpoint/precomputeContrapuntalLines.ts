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
 * When `voiceBundle` is Brookmeyer or Bartók VRB with `contrapuntalLinePolicy.enabled`, builds
 * `AbstractLineSet` and stores on `generationMetadata.contrapuntalLineSet`.
 */
export function precomputeContrapuntalLines(context: CompositionContext, vrbId: string): AbstractLineSet | null {
  const id = (vrbId || context.voiceBundle?.voiceId || '').trim();
  if (id !== 'bartok' && id !== 'bob_brookmeyer') return null;
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
