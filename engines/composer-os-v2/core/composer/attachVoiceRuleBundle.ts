/**
 * Session wiring: VoiceRuleBundle + HarmonicScene stubs on CompositionContext.
 */

import type { CompositionContext } from '../compositionContext';
import { buildHarmonicSceneStubs } from './harmonicScene';
import { getVoiceRuleBundle, normalizeHarmonicVoiceId } from './voiceRuleBundles';

export function attachVoiceRuleBundleAndHarmonicScenes(
  context: CompositionContext,
  options: { harmonicVoice?: string } | undefined
): void {
  context.harmonicScenes = buildHarmonicSceneStubs(context.form);
  const raw = options?.harmonicVoice?.trim();
  if (!raw) {
    context.voiceBundle = undefined;
    if (context.generationMetadata) {
      context.generationMetadata.voiceBundleHarmonicRhythmState = undefined;
    }
    return;
  }

  const id = normalizeHarmonicVoiceId(raw);
  const bundle = getVoiceRuleBundle(id);
  context.voiceBundle = bundle;
  context.harmonicScenes = buildHarmonicSceneStubs(context.form);

  context.generationMetadata = {
    ...context.generationMetadata,
    harmonicVoice: id,
    voiceBundleHarmonicRhythmState: undefined,
    voiceBundlePolicyEcho: {
      bassRole: bundle.bassPolicy.role,
      voicingMinSpreadSemitones: bundle.voicingPolicy.minSpreadSemitones,
      melodicMaxLeapSemitones: bundle.melodicPolicy.maxLeapSemitones,
      rhythmAntiMetric: bundle.rhythmPolicy.antiMetric,
    },
    voiceBundleRhythmAntiMetric: bundle.rhythmPolicy.antiMetric,
  };

  if (typeof process !== 'undefined' && process.env?.COMPOSER_OS_DEBUG_VOICE_BUNDLE !== '0') {
    console.log(
      `[HarmonicScene] voice=${bundle.voiceId} scenes=${JSON.stringify(context.harmonicScenes?.map((s) => s.sceneId) ?? [])}`
    );
  }
}
