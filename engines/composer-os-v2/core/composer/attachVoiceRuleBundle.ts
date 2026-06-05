/**
 * Session wiring: VoiceRuleBundle + HarmonicScene stubs on CompositionContext.
 */

import type { CompositionContext } from '../compositionContext';
import { buildHarmonicSceneStubs, buildHarmonicScenesForVoiceBundle } from './harmonicScene';
import { getVoiceRuleBundle, normalizeHarmonicVoiceId } from './voiceRuleBundles';
import { applySlonimskyHarmonicSceneToContext } from '../slonimsky/slonimskyHarmonicScene';
import { applySongModeSlonimskyCellLayer } from '../song-mode/songModeSlonimsky';
import { attachDefaultSonicYouthSectionMarkers } from './resolveSectionVrb';

/**
 * Songwriter ids that auto-resolve to a same-named VoiceRuleBundle when picked
 * in the UI (no explicit `harmonicVoice` option required). Extend this set
 * whenever a slice + matching VRB ship together. SQ VRB family ids plus
 * Jobim, Arvo Pärt tintinnabuli, Satie, and Ornette Coleman harmolodics resolve
 * here so String Quartet / Song Mode can attach bundles without a separate pick.
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
  'antonio_carlos_jobim',
  'arvo_part',
  'satie',
  'ornette_coleman',
  'gershwin',
  'cole_porter',
  'billy_strayhorn',
  'don_sebesky',
  'johnny_mandel',
  'john_barry',
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

  applySlonimskyHarmonicSceneToContext(context);
  applySongModeSlonimskyCellLayer(context);
  attachDefaultSonicYouthSectionMarkers(context);

  if (!attachOpts?.skipHarmonicSceneLog) {
    console.log(
      `[HarmonicScene] voice=${bundle.voiceId} scenes=${JSON.stringify(context.harmonicScenes?.map((s) => s.sceneId) ?? [])}`
    );
  }
}
