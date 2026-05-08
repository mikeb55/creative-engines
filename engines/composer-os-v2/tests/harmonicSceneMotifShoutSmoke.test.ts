/**
 * HarmonicScene activeMotifIds + shout-chorus / outro scene wiring (additive smoke).
 */

import type { FormSection } from '../core/composer/formController';
import { activeMotifIdsForHarmonicRole, buildHarmonicScenesFromFormPlan } from '../core/composer/harmonicScene';
import { shoutChorusPlan } from '../core/composer/bigBandSectionWriter';
import type { RhythmMotifBinding } from '../core/composer/rhythmDnaMotifBinder';
import { getVoiceRuleBundle } from '../core/composer/voiceRuleBundles';
import { recallMotifCandidatesAtBar } from '../core/motif/sectionRecallEnforcer';
import { buildThemeGenome } from '../core/motif/themeGenomeBuilder';
import type { ThemeGenome } from '../core/motif/themeGenome';

function testIntroSceneOnlyPrimaryMotifId(): boolean {
  const bundle = getVoiceRuleBundle('wayne_shorter');
  const genome = buildThemeGenome('wayne_shorter', 42, undefined, bundle);
  const intro: FormSection = {
    sceneId: 't_intro',
    role: 'intro',
    barRange: [1, 8],
    targetTensionStart: 0.2,
    targetTensionEnd: 0.3,
    motifRecallRequired: false,
  };
  const scenes = buildHarmonicScenesFromFormPlan([intro], genome, undefined);
  return scenes[0]!.activeMotifIds.length === 1 && scenes[0]!.activeMotifIds[0] === genome.primaryCell.id;
}

function testDevelopmentSceneIncludesSecondaryMotifId(): boolean {
  const genome = {
    primaryCell: { id: 'primary_x', role: 'primary' as const },
    secondaryCell: { id: 'secondary_y', role: 'secondary' as const },
  } as ThemeGenome;
  const ids = activeMotifIdsForHarmonicRole('development', genome);
  return ids.includes('primary_x') && ids.includes('secondary_y');
}

function testRecallCandidatesFilteredWhenSceneListsMotifIds(): boolean {
  const bundle = getVoiceRuleBundle('wayne_shorter');
  const genome = buildThemeGenome('wayne_shorter', 99, undefined, bundle);
  const scenes = buildHarmonicScenesFromFormPlan(
    [
      {
        sceneId: 'intro_only',
        role: 'intro',
        barRange: [1, 8],
        targetTensionStart: 0.2,
        targetTensionEnd: 0.25,
        motifRecallRequired: false,
      },
    ],
    genome,
    undefined
  );
  const pool = recallMotifCandidatesAtBar(genome, scenes, 2);
  return pool.length === 1 && pool[0]!.id === genome.primaryCell.id;
}

function testShoutChorusSceneTension095(): boolean {
  const bundle = getVoiceRuleBundle('wayne_shorter');
  const genome = buildThemeGenome('wayne_shorter', 1, undefined, bundle);
  const fs: FormSection = {
    sceneId: 'sh',
    role: 'shout-chorus',
    barRange: [25, 36],
    targetTensionStart: 0.7,
    targetTensionEnd: 0.8,
    motifRecallRequired: false,
  };
  const scenes = buildHarmonicScenesFromFormPlan([fs], genome, new Array(40).fill(0.5));
  return scenes[0]!.tensionLevel === 0.95;
}

function testShoutPlanAllVoicesRhythmicUnison(): boolean {
  const b = getVoiceRuleBundle('gil_evans');
  const fs: FormSection = {
    sceneId: 'shout-a',
    role: 'shout-chorus',
    barRange: [10, 18],
    targetTensionStart: 0.9,
    targetTensionEnd: 1,
    motifRecallRequired: false,
  };
  const plan = shoutChorusPlan(b, undefined, fs);
  return plan.kind === 'shout-chorus' && plan.rhythmicUnison === true;
}

function testMingusBundleGospelShoutPatternAfterBar24(): boolean {
  const b = getVoiceRuleBundle('charles_mingus');
  const binding = { allowedRhythmCells: ['rd_quarter_on_1'] } as RhythmMotifBinding;
  const fs: FormSection = {
    sceneId: 'mingus_shout',
    role: 'shout-chorus',
    barRange: [25, 40],
    targetTensionStart: 0.85,
    targetTensionEnd: 0.95,
    motifRecallRequired: false,
  };
  const plan = shoutChorusPlan(b, binding, fs, { sectionLeadBar: 25 });
  return (
    plan.rhythmCellId === 'rd_shout_grid' &&
    plan.mingusGospelShoutInject === true &&
    plan.mingusCollectiveImprovOverlay === true
  );
}

function testOutroSceneTension01(): boolean {
  const bundle = getVoiceRuleBundle('wayne_shorter');
  const genome = buildThemeGenome('wayne_shorter', 3, undefined, bundle);
  const fs: FormSection = {
    sceneId: 'out',
    role: 'outro',
    barRange: [60, 64],
    targetTensionStart: 0.3,
    targetTensionEnd: 0.1,
    motifRecallRequired: true,
  };
  const scenes = buildHarmonicScenesFromFormPlan([fs], genome, undefined);
  return scenes[0]!.tensionLevel === 0.1;
}

function testOutroSceneStableDominantVoicingColor(): boolean {
  const bundle = getVoiceRuleBundle('wayne_shorter');
  const genome = buildThemeGenome('wayne_shorter', 5, undefined, bundle);
  const fs: FormSection = {
    sceneId: 'out2',
    role: 'outro',
    barRange: [50, 56],
    targetTensionStart: 0.2,
    targetTensionEnd: 0.08,
    motifRecallRequired: true,
  };
  const scenes = buildHarmonicScenesFromFormPlan([fs], genome, undefined);
  return scenes[0]!.dominantVoicingColor === 'stable';
}

export function runHarmonicSceneMotifShoutSmokeTests(): { name: string; ok: boolean }[] {
  return [
    ['HarmonicScene — intro scene lists primary motif id only', testIntroSceneOnlyPrimaryMotifId],
    ['HarmonicScene — development lists primary + secondary motif ids', testDevelopmentSceneIncludesSecondaryMotifId],
    ['MAL recall pool respects HarmonicScene activeMotifIds', testRecallCandidatesFilteredWhenSceneListsMotifIds],
    ['HarmonicScene — shout-chorus tensionLevel 0.95', testShoutChorusSceneTension095],
    ['Big band shout — all voices rhythmic unison plan', testShoutPlanAllVoicesRhythmicUnison],
    ['Mingus shout — gospel grid + overlay after bar threshold', testMingusBundleGospelShoutPatternAfterBar24],
    ['HarmonicScene — outro tensionLevel 0.1', testOutroSceneTension01],
    ['HarmonicScene — outro dominantVoicingColor stable', testOutroSceneStableDominantVoicingColor],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
