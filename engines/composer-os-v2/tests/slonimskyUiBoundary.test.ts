/**
 * V61 U9 + V62 — Slonimsky UI boundary goldens (state → GenerateRequest mappers only).
 * Does not re-assert Z7–Z11 engine lock goldens 1,2,6,7.
 */

import * as fs from 'fs';
import * as path from 'path';
import { mapSlonimskyMacroStateToGenerateRequest } from '../../../apps/composer-os-app/src/types/slonimskyMacroState';
import {
  mapSongModeSlonimskyToGenerateRequest,
  slonimskySectionOverridesToContextKeys,
  slonimskySongModeWriterPresets,
} from '../../../apps/composer-os-app/src/types/slonimskySongModeState';
import { slonimskyGbdWriterPresets } from '../../../apps/composer-os-app/src/types/slonimskyGbdState';
import {
  DEFAULT_BIG_BAND_SLONIMSKY_MIDDLE,
  DEFAULT_STRING_QUARTET_SLONIMSKY_MIDDLE,
  mapBigBandEnsembleSlonimskyToGenerateRequest,
  mapEnsembleSlonimskyToGenerateRequest,
  mapStringQuartetEnsembleSlonimskyToGenerateRequest,
} from '../../../apps/composer-os-app/src/types/slonimskyEnsembleState';
import {
  verifyBbCohesionKnobGolden,
  verifyBbHarmonicGripKnobGolden,
  verifySqBbHybridKnobGolden,
  verifySqRegisterSpreadKnobGolden,
  verifySqVoiceIndependenceKnobGolden,
} from './slonimskyKnobGolden';
import { mapSqBbHybridToGenerateRequest } from '../../../apps/composer-os-app/src/types/slonimskySqBbHybridState';
import { getVoiceRuleBundle } from '../core/composer/voiceRuleBundles';
import { chromaticStrengthToOutsideLevel } from '../core/slonimsky/slonimskyPatternService';
import {
  verifyEtudeSurfacesGolden,
  verifyGbdWritersV62Golden,
  verifyLane3PresetWiringGolden,
  verifySongModeWritersV62Golden,
} from './slonimskyUiGolden';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const APP_SRC = path.join(REPO_ROOT, 'apps/composer-os-app/src');

function readAppFile(rel: string): string {
  return fs.readFileSync(path.join(APP_SRC, rel), 'utf8');
}

function isConfirmedHarmonicVoiceBundle(id: string): boolean {
  return getVoiceRuleBundle(id).voiceId !== 'neutral';
}

/** Mirror {@link slonimskyAdvancedOverridesToContextKeys} — avoid app advanced module (thesaurus import). */
function slonimskyAdvancedOverridesToContextKeys(overrides: {
  pinnedCellIds: string[];
  forbiddenCellIds: string[];
}): string[] {
  const keys: string[] = [];
  for (const id of overrides.pinnedCellIds) keys.push(`slonimsky:pin:cell=${id}`);
  for (const id of overrides.forbiddenCellIds) keys.push(`slonimsky:forbid:cell=${id}`);
  return keys;
}

/** Mirror {@link slonimskyUiExtrasFromAdvanced} harmonic-voice branch only. */
function slonimskyUiExtrasFromAdvanced(
  overrides: { pinnedCellIds: string[]; forbiddenCellIds: string[] },
  harmonicVoiceId: string | null,
  baseStyleKeys?: string[]
): {
  harmonicVoice?: string;
  slonimskyGenericHarmonicVoice?: string;
  styleGenerationContextKeys?: string[];
} {
  const advancedKeys = slonimskyAdvancedOverridesToContextKeys(overrides);
  const option = harmonicVoiceId?.trim() ?? '';
  if (option === 'sonic_youth') advancedKeys.push('slonimsky:harmonic_voice=sonic_youth_generic');
  const merged = [...(baseStyleKeys ?? []), ...advancedKeys];
  const harmonicVoice =
    option && option !== 'sonic_youth' && isConfirmedHarmonicVoiceBundle(option) ? option : undefined;
  return {
    ...(merged.length ? { styleGenerationContextKeys: merged } : {}),
    ...(harmonicVoice ? { harmonicVoice } : {}),
    ...(option === 'sonic_youth' ? { slonimskyGenericHarmonicVoice: 'sonic_youth' as const } : {}),
  };
}

function testUniversalFlavorMapsMacroToGenerateRequest(): boolean {
  const lyrical = mapSlonimskyMacroStateToGenerateRequest({
    sourcePreset: 'lyrical',
    motion: 0,
    tension: 0,
    variation: 0,
  });
  const chromatic = mapSlonimskyMacroStateToGenerateRequest({
    sourcePreset: 'chromatic',
    motion: 0,
    tension: 0,
    variation: 0,
  });
  const angular = mapSlonimskyMacroStateToGenerateRequest({
    sourcePreset: 'angular',
    motion: 0.2,
    tension: 0,
    variation: -0.2,
  });
  return (
    lyrical.chromaticStrength === 'off' &&
    chromatic.chromaticStrength === 'prominent' &&
    angular.chromaticStrength === 'prominent' &&
    angular.blendStrength === 'medium' &&
    angular.duoIntent === 'supportive'
  );
}

function testSongModeWriterPresetSetsMacroDefaults(): boolean {
  const zappaChromatic = slonimskySongModeWriterPresets('frank_zappa').find((p) => p.label === 'Chromatic');
  const methenyLyrical = slonimskySongModeWriterPresets('pat_metheny').find((p) => p.label === 'Lyrical');
  return (
    zappaChromatic?.macro.sourcePreset === 'chromatic' &&
    zappaChromatic.macro.tension === 0.45 &&
    methenyLyrical?.macro.sourcePreset === 'lyrical' &&
    methenyLyrical.macro.tension === -0.2
  );
}

function testSongModeSectionPinAvoidContextKeys(): boolean {
  const keys = slonimskySectionOverridesToContextKeys({
    verse: { pin: 'lyrical', avoid: ['chromatic', 'riff'] },
    chorus: { pin: 'angular' },
  });
  return (
    keys.includes('slonimsky:pin:verse=lyrical') &&
    keys.includes('slonimsky:avoid:verse=chromatic,riff') &&
    keys.includes('slonimsky:pin:chorus=angular')
  );
}

function testSongModeMapperMergesSectionKeys(): boolean {
  const out = mapSongModeSlonimskyToGenerateRequest(
    { sourcePreset: 'lyrical', motion: 0, tension: 0, variation: 0 },
    { verse: { pin: 'lyrical' } },
    ['hv:pat_metheny']
  );
  const keys = out.styleGenerationContextKeys ?? [];
  return keys.includes('hv:pat_metheny') && keys.includes('slonimsky:pin:verse=lyrical');
}

function testEnsembleBbSqMiddleLayersDistinct(): boolean {
  const ensembleSrc = readAppFile('components/slonimsky/SlonimskyEnsemblePanel.tsx');
  const home = readAppFile('pages/HomeGenerate.tsx');
  return (
    ensembleSrc.includes('BigBandMiddleLayer') &&
    ensembleSrc.includes('StringQuartetMiddleLayer') &&
    ensembleSrc.includes("mode === 'big_band'") &&
    DEFAULT_BIG_BAND_SLONIMSKY_MIDDLE.sectionRole === 'lead' &&
    DEFAULT_STRING_QUARTET_SLONIMSKY_MIDDLE.textureRole === 'melody' &&
    DEFAULT_BIG_BAND_SLONIMSKY_MIDDLE.ensemblePreset !== DEFAULT_STRING_QUARTET_SLONIMSKY_MIDDLE.ensemblePreset &&
    home.includes('mapBigBandEnsembleSlonimskyToGenerateRequest') &&
    home.includes('bigBandSlonimskyExtras') &&
    home.includes('mapStringQuartetEnsembleSlonimskyToGenerateRequest') &&
    home.includes('stringQuartetSlonimskyExtras')
  );
}

function testEnsembleMapperOutputsRequestFields(): boolean {
  const sqMacroOnly = mapEnsembleSlonimskyToGenerateRequest({
    sourcePreset: 'symmetric',
    motion: -0.5,
    tension: 0,
    variation: 0.5,
  });
  const sq = mapStringQuartetEnsembleSlonimskyToGenerateRequest(
    { sourcePreset: 'symmetric', motion: 0, tension: 0, variation: 0 },
    { ...DEFAULT_STRING_QUARTET_SLONIMSKY_MIDDLE, voiceIndependence: 0.8, registerSpread: -0.6 }
  );
  const bb = mapBigBandEnsembleSlonimskyToGenerateRequest(
    { sourcePreset: 'symmetric', motion: 0, tension: 0, variation: 0 },
    { ...DEFAULT_BIG_BAND_SLONIMSKY_MIDDLE, cohesion: 1, harmonicGrip: -1 }
  );
  return (
    sqMacroOnly.chromaticStrength === 'subtle' &&
    sqMacroOnly.blendStrength === 'light' &&
    sqMacroOnly.duoIntent === 'conversational' &&
    sq.blendStrength === 'strong' &&
    sq.duoIntent === 'conversational' &&
    sq.chromaticStrength === 'off' &&
    bb.figureResponse === 'high' &&
    bb.chromaticStrength === 'prominent'
  );
}

function testGbdChromaticStrengthValues(): boolean {
  const home = readAppFile('pages/HomeGenerate.tsx');
  const gbd = readAppFile('components/slonimsky/SlonimskyGbdPanel.tsx');
  const presets = slonimskyGbdWriterPresets('wes_montgomery');
  const lyrical = presets.find((p) => p.label === 'Lyrical');
  return (
    chromaticStrengthToOutsideLevel('off') === 0 &&
    chromaticStrengthToOutsideLevel('subtle') === 1 &&
    chromaticStrengthToOutsideLevel('prominent') === 2 &&
    home.includes('chromaticStrength: gbdChromaticStrength') &&
    home.includes('gbdWriterId') &&
    home.includes('guitar_bass_duo_single_line') &&
    home.includes('chromaticOnly') &&
    home.includes('outsideLevelNumericLabels') &&
    home.includes("presetId === 'ecm_chamber'") &&
    home.includes('hideHarmonicVoice') &&
    gbd.includes('wes_montgomery') &&
    lyrical?.macro.sourcePreset === 'lyrical'
  );
}

function testSqBbHybridMapperContextAndBlend(): boolean {
  const out = mapSqBbHybridToGenerateRequest({
    ensembleRelationship: 'call_and_response',
    foregroundOwner: 'bb',
    densitySplit: 0.6,
    registerCarve: -0.5,
  });
  const keys = out.styleGenerationContextKeys ?? [];
  return (
    keys.includes('slonimsky:sq_bb:relationship=call_and_response') &&
    keys.includes('slonimsky:sq_bb:foreground=bb') &&
    out.blendStrength === 'strong' &&
    out.chromaticStrength === 'off' &&
    out.duoIntent === 'conversational' &&
    verifyBbCohesionKnobGolden() &&
    verifyBbHarmonicGripKnobGolden() &&
    verifySqBbHybridKnobGolden() &&
    verifySqVoiceIndependenceKnobGolden() &&
    verifySqRegisterSpreadKnobGolden()
  );
}

function testAdvancedDrawerPinForbidCellKeys(): boolean {
  const keys = slonimskyAdvancedOverridesToContextKeys({
    pinnedCellIds: ['p_wholeTone', 'p_tritonePole'],
    forbiddenCellIds: ['p_chromaticInterp'],
  });
  return (
    keys.includes('slonimsky:pin:cell=p_wholeTone') &&
    keys.includes('slonimsky:pin:cell=p_tritonePole') &&
    keys.includes('slonimsky:forbid:cell=p_chromaticInterp')
  );
}

function testHarmonicVoicePassesConfirmedVrb(): boolean {
  if (!isConfirmedHarmonicVoiceBundle('wayne_shorter')) return false;
  const out = slonimskyUiExtrasFromAdvanced(
    { pinnedCellIds: [], forbiddenCellIds: [] },
    'wayne_shorter'
  );
  return out.harmonicVoice === 'wayne_shorter' && !out.slonimskyGenericHarmonicVoice;
}

function testSonicYouthNoHarmonicVoicePayload(): boolean {
  const out = slonimskyUiExtrasFromAdvanced(
    { pinnedCellIds: [], forbiddenCellIds: [] },
    'sonic_youth'
  );
  const keys = out.styleGenerationContextKeys ?? [];
  return (
    out.harmonicVoice === undefined &&
    out.slonimskyGenericHarmonicVoice === 'sonic_youth' &&
    keys.includes('slonimsky:harmonic_voice=sonic_youth_generic')
  );
}

function testSonicYouthGenericVoiceWarningsInPanels(): boolean {
  const universal = readAppFile('components/SlonimskyUniversalPanel.tsx');
  const songMode = readAppFile('components/slonimsky/SlonimskySongModePanel.tsx');
  const constants = readAppFile('constants/slonimskyHarmonicVoices.ts');
  const constantsOk =
    constants.includes('generic voice') && constants.includes('no dedicated VRB bundle');
  const gbd = readAppFile('components/slonimsky/SlonimskyGbdPanel.tsx');
  return (
    constantsOk &&
    universal.includes('isSlonimskyGenericVoiceWarning') &&
    universal.includes('slonimskySongModeWriterWarningBody') &&
    songMode.includes('isSlonimskyGenericVoiceWarning(writerId)') &&
    songMode.includes('SLONIMSKY_GENERIC_VOICE_OPTION_SUFFIX') &&
    songMode.includes('slonimskySongModeWriterWarningBody') &&
    gbd.includes('slonimskyGbdWriterWarningBody') &&
    gbd.includes('SLONIMSKY_GBD_WRITERS')
  );
}

function testAdvancedDrawerMountedFromHomeGenerate(): boolean {
  const src = readAppFile('pages/HomeGenerate.tsx');
  return src.includes('SlonimskyAdvancedDrawer') && src.includes('slonimskyUiExtrasFromAdvanced');
}

function testSongModePanelListsV62Writers(): boolean {
  const panel = readAppFile('components/slonimsky/SlonimskySongModePanel.tsx');
  const ids = [
    'wayne_shorter',
    'bill_evans',
    'herbie_hancock',
    'larry_carlton',
    'david_gilmour',
    'mccoy_tyner',
    'miles_davis',
  ];
  return ids.every((id) => panel.includes(id)) && panel.includes('isSlonimskyGenericVoiceWarning(writerId)');
}

function testMccoyTynerNotSongModeStub(): boolean {
  const constants = readAppFile('constants/slonimskyHarmonicVoices.ts');
  return (
    constants.includes('SLONIMSKY_SONG_MODE_STUB_WRITER_IDS = []') &&
    constants.includes('isSlonimskySongModeStubWriter') &&
    !constants.includes("SLONIMSKY_SONG_MODE_STUB_WRITER_IDS = ['mccoy_tyner']")
  );
}

function testGbdStubWritersWarningOnly(): boolean {
  const constants = readAppFile('constants/slonimskyHarmonicVoices.ts');
  const stubMatch = constants.match(/SLONIMSKY_GBD_STUB_WRITER_IDS\s*=\s*\[([\s\S]*?)\]\s*as const/);
  const stubBody = stubMatch?.[1] ?? '';
  return (
    constants.includes('SLONIMSKY_GBD_STUB_WRITER_IDS') &&
    constants.includes('isSlonimskyGbdStubWriter') &&
    constants.includes('wes_montgomery') &&
    isConfirmedHarmonicVoiceBundle('wes_montgomery') &&
    stubBody.includes("'joe_pass'") &&
    stubBody.includes("'allan_holdsworth'") &&
    stubBody.includes("'scott_henderson'") &&
    !stubBody.includes('wes_montgomery')
  );
}

export function runSlonimskyUiTests(): { name: string; ok: boolean }[] {
  const cases: [string, () => boolean][] = [
    ['slonimsky-ui — universal flavor → GenerateRequest macro fields', testUniversalFlavorMapsMacroToGenerateRequest],
    ['slonimsky-ui — song mode writer preset → flavor + knob defaults', testSongModeWriterPresetSetsMacroDefaults],
    ['slonimsky-ui — song mode section pin/avoid → context keys', testSongModeSectionPinAvoidContextKeys],
    ['slonimsky-ui — song mode mapper merges section style keys', testSongModeMapperMergesSectionKeys],
    ['slonimsky-ui — ensemble BB/SQ middle layers distinct', testEnsembleBbSqMiddleLayersDistinct],
    ['slonimsky-ui — ensemble mapper → chromatic/blend/duoIntent', testEnsembleMapperOutputsRequestFields],
    ['slonimsky-ui — GBD Off/Subtle/Prominent chromaticStrength', testGbdChromaticStrengthValues],
    ['slonimsky-ui — SQ+BB hybrid → context keys + blendStrength', testSqBbHybridMapperContextAndBlend],
    ['slonimsky-ui — advanced pin/forbid → cell context keys', testAdvancedDrawerPinForbidCellKeys],
    ['slonimsky-ui — harmonic voice confirmed VRB → harmonicVoice', testHarmonicVoicePassesConfirmedVrb],
    ['slonimsky-ui — sonic_youth → no harmonicVoice + generic metadata key', testSonicYouthNoHarmonicVoicePayload],
    ['slonimsky-ui — sonic_youth generic voice warnings (universal + song mode)', testSonicYouthGenericVoiceWarningsInPanels],
    ['slonimsky-ui — advanced drawer wired in HomeGenerate', testAdvancedDrawerMountedFromHomeGenerate],
    ['slonimsky-ui — V62 song mode writers golden (7)', verifySongModeWritersV62Golden],
    ['slonimsky-ui — V62 GBD stub writers golden (4)', verifyGbdWritersV62Golden],
    ['slonimsky-ui — V62 song mode panel lists seven new writers', testSongModePanelListsV62Writers],
    ['slonimsky-ui — V62 mccoy_tyner full slice (no stub warning)', testMccoyTynerNotSongModeStub],
    ['slonimsky-ui — V62 GBD stub writers (Joe/Allan/Scott); wes shipped', testGbdStubWritersWarningOnly],
    ['slonimsky-ui — V62 lane3 preset HomeGenerate wiring', verifyLane3PresetWiringGolden],
    ['slonimsky-ui — V62 etude surfaces (Wyble + Slonimsky cell family)', verifyEtudeSurfacesGolden],
  ];
  return cases.map(([name, fn]) => ({ name, ok: fn() }));
}
