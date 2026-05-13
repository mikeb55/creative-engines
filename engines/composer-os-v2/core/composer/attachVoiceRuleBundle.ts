/**
 * Session wiring: VoiceRuleBundle + HarmonicScene stubs on CompositionContext.
 */

import type { CompositionContext } from '../compositionContext';
import { buildHarmonicSceneStubs, buildHarmonicScenesForVoiceBundle } from './harmonicScene';
import { getVoiceRuleBundle, normalizeHarmonicVoiceId } from './voiceRuleBundles';

/**
 * Songwriter ids that auto-resolve to a same-named VoiceRuleBundle when picked
 * in the UI (no explicit `harmonicVoice` option required). Extend this set
 * whenever a slice + matching VRB ship together. The full SQ VRB family
 * (Beethoven late, Turtle Island, Reich/Glass, Shostakovich, Lachenmann)
 * is auto-resolved here so the String Quartet preset surfaces them.
 */
const AUTO_RESOLVE_SONGWRITER_TO_VOICE_ID: ReadonlySet<string> = new Set([
  'radiohead',
  'debussy',
  'beethoven_late',
  'turtle_island',
  'reich_glass',
  'shostakovich',
  'lachenmann',
  'ligeti',
  'crumb_black_angels',
  'dutilleux',
]);

export function attachVoiceRuleBundleAndHarmonicScenes(
  context: CompositionContext,
  options: { harmonicVoice?: string } | undefined,
  attachOpts?: { skipHarmonicSceneLog?: boolean }
): void {
  context.harmonicScenes = buildHarmonicSceneStubs(context.form);
  const songwriterStyleId = context.generationMetadata?.songwriterStyleId;
  const autoResolved =
    typeof songwriterStyleId === 'string' && AUTO_RESOLVE_SONGWRITER_TO_VOICE_ID.has(songwriterStyleId)
      ? songwriterStyleId
      : '';
  const raw = options?.harmonicVoice?.trim() || autoResolved;
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
  context.harmonicScenes = buildHarmonicScenesForVoiceBundle(context.form, bundle);

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

  if (!attachOpts?.skipHarmonicSceneLog) {
    console.log(
      `[HarmonicScene] voice=${bundle.voiceId} scenes=${JSON.stringify(context.harmonicScenes?.map((s) => s.sceneId) ?? [])}`
    );
  }
}
