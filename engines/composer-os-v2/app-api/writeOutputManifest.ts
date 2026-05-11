/**
 * Composer OS V2 — App API: write output manifest under `_meta` (MusicXML stays in preset folder).
 */

import type { ChordExportDiagnosticsReceipt } from '../../core/chordExportDiagnostics';
import type { OutputEntry, StyleProfile, ValidationSummary } from './appApiTypes';
import type { GenerationMetadata } from '../core/compositionContext';
import { manifestPathForMusicXml } from './composerOsOutputPaths';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

function tryHideMetaFolderOnWindows(metaDir: string): void {
  if (process.platform !== 'win32') return;
  try {
    execSync(`attrib +h "${metaDir.replace(/"/g, '\\"')}"`, { stdio: 'ignore' });
  } catch {
    /* optional */
  }
}

function buildSongModeDiagnosticsSummary(meta: {
  songModeSectionShapingDiagnostics?: GenerationMetadata['songModeSectionShapingDiagnostics'];
  songModeSectionBehaviourDescriptors?: GenerationMetadata['songModeSectionBehaviourDescriptors'];
  songModeProfileRuleDiagnostics?: GenerationMetadata['songModeProfileRuleDiagnostics'];
}): OutputEntry['songModeDiagnosticsSummary'] | undefined {
  const shape = meta.songModeSectionShapingDiagnostics;
  const desc = meta.songModeSectionBehaviourDescriptors ?? [];
  const profile = meta.songModeProfileRuleDiagnostics;
  if (!shape && desc.length === 0 && !profile) return undefined;
  const sectionSources = ['OPENING', 'BRIDGE_LIFT', 'RETURN', 'OUTRO', 'WHOLE']
    .map((role) => {
      const sources = desc
        .filter((d) => {
          const hasDensity = typeof d.densityBiasByRole?.[role as keyof typeof d.densityBiasByRole] === 'number';
          const hasColour = typeof d.harmonicColourBiasByRole?.[role as keyof typeof d.harmonicColourBiasByRole] === 'number';
          const hasRegister = typeof d.registerBiasByRole?.[role as keyof typeof d.registerBiasByRole] === 'number';
          const hasReturn = role === 'RETURN' && typeof d.returnVariationType === 'string';
          return hasDensity || hasColour || hasRegister || hasReturn;
        })
        .map((d) => d.sliceId);
      if (sources.length === 0) return null;
      return `${role}:${sources.join('|')}`;
    })
    .filter((x): x is string => x != null);
  return {
    profile:
      profile != null
        ? `profile=${profile.styleProfile ?? '-'} primary=${profile.primarySongwriterStyleId ?? '-'} secondary=${profile.secondarySongwriterStyleId ?? '-'}`
        : undefined,
    rules:
      profile?.resolvedRuleIds?.length != null && profile.resolvedRuleIds.length > 0
        ? `rules=${profile.resolvedRuleIds.length} comp=${profile.songwriterCompProfileId ?? '-'} bundle=${profile.bacharachSongModeRuleBundleId ?? '-'}`
        : undefined,
    sectionShape:
      shape != null
        ? `dB-A=${shape.densityDeltaBMinusA ?? 'n/a'} cB-A=${shape.colourDeltaBMinusA ?? 'n/a'} openRet=${shape.openingVsReturnDelta ?? 'n/a'} return=${shape.returnVariationType ?? '-'}`
        : undefined,
    sectionSources,
  };
}

export function writeOutputManifest(
  xmlFilepath: string,
  meta: {
    chordExportDiagnostics?: ChordExportDiagnosticsReceipt;
    presetId: string;
    styleStack: string[];
    seed: number;
    timestamp: string;
    variationId?: string;
    creativeControlLevel?: 'stable' | 'balanced' | 'surprise';
    scoreTitle?: string;
    ecmMode?: string;
    harmonySource?: 'builtin' | 'custom';
    customChordProgressionSummary?: string;
    progressionMode?: 'builtin' | 'custom';
    chordProgressionInputRaw?: string;
    parsedCustomProgressionBars?: string[];
    chordProgressionParseFailed?: boolean;
    builtInHarmonyFallbackOccurred?: boolean;
    keySignatureInferredTonic?: string;
    keySignatureConfidence?: number;
    keySignatureOverrideUsed?: boolean;
    keySignatureNoneMode?: boolean;
    keySignatureHide?: boolean;
    keySignatureFifths?: number;
    keySignatureExportMode?: 'major' | 'minor';
    keySignatureInferredKey?: string;
    keySignatureInferredMode?: 'major' | 'minor' | 'ambiguous';
    keySignatureInferredFifths?: number;
    keySignatureModeApplied?: 'auto' | 'override' | 'none';
    keySignatureExportKeyWritten?: boolean;
    harmonySourceUsed?: 'builtin' | 'custom';
    styleGrammarLabel?: string;
    styleStackPrimaryModuleId?: string;
    styleStackPrimaryDisplayName?: string;
    userSelectedStyleDisplayNames?: string[];
    userExplicitPrimaryStyle?: boolean;
    duoModeReceiptLabel?: string;
    styleProfile?: StyleProfile;
    chordProgressionSubmittedRaw?: string;
    parsedChordBarsSnapshot?: string[];
    pipelineTruthInputStage?: 'pass' | 'fail' | 'skip';
    pipelineTruthScoreStage?: 'pass' | 'fail' | 'skip';
    pipelineTruthExportStage?: 'pass' | 'fail' | 'skip';
    validation: ValidationSummary;
    /** Song Mode Phase C2: compact JSON (same as run manifest). */
    songModeRhythmOverlayPhraseDiagnostics?: string;
    /** Song Mode Phase C2: per-phrase overlay + rhythm intent (optional disk echo). */
    songModeRhythmOverlayByPhrase?: GenerationMetadata['songModeRhythmOverlayByPhrase'];
    rhythmIntentD1Receipt?: string;
    c4_hook_rhythm_applied?: boolean;
    c4_bars_used?: number[];
    songModeStyleSurfaceNotes?: string[];
    songModeDonaldFagenC1Receipt?: string;
    /** Song Mode — resolved primary songwriter id (eval / receipts). */
    songwriterStyleId?: string;
    brianWilsonPetSoundsDiagnostics?: GenerationMetadata['brianWilsonPetSoundsDiagnostics'];
    brianWilsonPetSoundsDeviceReceipts?: GenerationMetadata['brianWilsonPetSoundsDeviceReceipts'];
    brianWilsonPetSoundsSliceReceipt?: GenerationMetadata['brianWilsonPetSoundsSliceReceipt'];
    brianWilsonEffectiveHarmonyBars?: GenerationMetadata['brianWilsonEffectiveHarmonyBars'];
    stevieWonderDiagnostics?: GenerationMetadata['stevieWonderDiagnostics'];
    stevieWonderDeviceReceipts?: GenerationMetadata['stevieWonderDeviceReceipts'];
    stevieWonderSliceReceipt?: GenerationMetadata['stevieWonderSliceReceipt'];
    stevieWonderEffectiveHarmonyBars?: GenerationMetadata['stevieWonderEffectiveHarmonyBars'];
    radioheadDiagnostics?: GenerationMetadata['radioheadDiagnostics'];
    radioheadDeviceReceipts?: GenerationMetadata['radioheadDeviceReceipts'];
    radioheadSliceReceipt?: GenerationMetadata['radioheadSliceReceipt'];
    radioheadEffectiveHarmonyBars?: GenerationMetadata['radioheadEffectiveHarmonyBars'];
    jamesBrownDiagnostics?: GenerationMetadata['jamesBrownDiagnostics'];
    jamesBrownDeviceReceipts?: GenerationMetadata['jamesBrownDeviceReceipts'];
    jamesBrownSliceReceipt?: GenerationMetadata['jamesBrownSliceReceipt'];
    jamesBrownEffectiveHarmonyBars?: GenerationMetadata['jamesBrownEffectiveHarmonyBars'];
    jamesBrownAntiElaborationGuards?: GenerationMetadata['jamesBrownAntiElaborationGuards'];
    joniMitchellDiagnostics?: GenerationMetadata['joniMitchellDiagnostics'];
    joniMitchellDeviceReceipts?: GenerationMetadata['joniMitchellDeviceReceipts'];
    joniMitchellSliceReceipt?: GenerationMetadata['joniMitchellSliceReceipt'];
    joniMitchellEffectiveHarmonyBars?: GenerationMetadata['joniMitchellEffectiveHarmonyBars'];
    joniMitchellAntiElaborationGuards?: GenerationMetadata['joniMitchellAntiElaborationGuards'];
    joniMitchellTuningPatternByBar?: GenerationMetadata['joniMitchellTuningPatternByBar'];
    joniMitchellModalFieldLockLengthBars?: GenerationMetadata['joniMitchellModalFieldLockLengthBars'];
    joniMitchellSliceMeta?: GenerationMetadata['joniMitchellSliceMeta'];
    joniPhase?: GenerationMetadata['joniPhase'];
    joniResolvedPhase?: GenerationMetadata['joniResolvedPhase'];
    thadPhase?: GenerationMetadata['thadPhase'];
    thadResolvedPhase?: GenerationMetadata['thadResolvedPhase'];
    thadJonesDiagnostics?: GenerationMetadata['thadJonesDiagnostics'];
    thadJonesDeviceReceipts?: GenerationMetadata['thadJonesDeviceReceipts'];
    thadJonesSliceReceipt?: GenerationMetadata['thadJonesSliceReceipt'];
    thadJonesEffectiveHarmonyBars?: GenerationMetadata['thadJonesEffectiveHarmonyBars'];
    thadJonesShoutBars?: GenerationMetadata['thadJonesShoutBars'];
    basieTestamentMode?: GenerationMetadata['basieTestamentMode'];
    basieResolvedTestament?: GenerationMetadata['basieResolvedTestament'];
    basieDiagnostics?: GenerationMetadata['basieDiagnostics'];
    basieDeviceReceipts?: GenerationMetadata['basieDeviceReceipts'];
    basieSliceReceipt?: GenerationMetadata['basieSliceReceipt'];
    basieEffectiveHarmonyBars?: GenerationMetadata['basieEffectiveHarmonyBars'];
    basieShoutBars?: GenerationMetadata['basieShoutBars'];
    basieEpisodePlan?: GenerationMetadata['basieEpisodePlan'];
    brookmeyerPeriodMode?: GenerationMetadata['brookmeyerPeriodMode'];
    brookmeyerPeriodModeResolved?: GenerationMetadata['brookmeyerPeriodModeResolved'];
    activePitchModule?: GenerationMetadata['activePitchModule'];
    brookmeyerSoloPermitted?: GenerationMetadata['brookmeyerSoloPermitted'];
    brookmeyerEpisodePlanSummary?: GenerationMetadata['brookmeyerEpisodePlanSummary'];
    bobBrookmeyerDiagnostics?: GenerationMetadata['bobBrookmeyerDiagnostics'];
    bobBrookmeyerDeviceReceipts?: GenerationMetadata['bobBrookmeyerDeviceReceipts'];
    bobBrookmeyerSliceReceipt?: GenerationMetadata['bobBrookmeyerSliceReceipt'];
    bobBrookmeyerEffectiveHarmonyBars?: GenerationMetadata['bobBrookmeyerEffectiveHarmonyBars'];
    lineFirstHierarchy?: GenerationMetadata['lineFirstHierarchy'];
    contrapuntalLineCount?: GenerationMetadata['contrapuntalLineCount'];
    sonicYouthDiagnostics?: GenerationMetadata['sonicYouthDiagnostics'];
    sonicYouthDeviceReceipts?: GenerationMetadata['sonicYouthDeviceReceipts'];
    sonicYouthSliceReceipt?: GenerationMetadata['sonicYouthSliceReceipt'];
    sonicYouthEffectiveHarmonyBars?: GenerationMetadata['sonicYouthEffectiveHarmonyBars'];
    patMethenyDiagnostics?: GenerationMetadata['patMethenyDiagnostics'];
    patMethenyDeviceReceipts?: GenerationMetadata['patMethenyDeviceReceipts'];
    patMethenySliceReceipt?: GenerationMetadata['patMethenySliceReceipt'];
    patMethenyEffectiveHarmonyBars?: GenerationMetadata['patMethenyEffectiveHarmonyBars'];
    patMethenyAntiElaborationGuards?: GenerationMetadata['patMethenyAntiElaborationGuards'];
    patMethenyPedalHoldMaxBars?: GenerationMetadata['patMethenyPedalHoldMaxBars'];
    patMethenyEligibilityStats?: GenerationMetadata['patMethenyEligibilityStats'];
    wayneShorterDiagnostics?: GenerationMetadata['wayneShorterDiagnostics'];
    wayneShorterDeviceReceipts?: GenerationMetadata['wayneShorterDeviceReceipts'];
    wayneShorterSliceReceipt?: GenerationMetadata['wayneShorterSliceReceipt'];
    wayneShorterEffectiveHarmonyBars?: GenerationMetadata['wayneShorterEffectiveHarmonyBars'];
    wayneShorterAntiElaborationGuards?: GenerationMetadata['wayneShorterAntiElaborationGuards'];
    wayneShorterEligibilityStats?: GenerationMetadata['wayneShorterEligibilityStats'];
    barryHarrisDiagnostics?: GenerationMetadata['barryHarrisDiagnostics'];
    barryHarrisDeviceReceipts?: GenerationMetadata['barryHarrisDeviceReceipts'];
    barryHarrisSliceReceipt?: GenerationMetadata['barryHarrisSliceReceipt'];
    barryHarrisEffectiveHarmonyBars?: GenerationMetadata['barryHarrisEffectiveHarmonyBars'];
    barryHarrisAntiElaborationGuards?: GenerationMetadata['barryHarrisAntiElaborationGuards'];
    billEvansDiagnostics?: GenerationMetadata['billEvansDiagnostics'];
    billEvansDeviceReceipts?: GenerationMetadata['billEvansDeviceReceipts'];
    billEvansSliceReceipt?: GenerationMetadata['billEvansSliceReceipt'];
    billEvansEffectiveHarmonyBars?: GenerationMetadata['billEvansEffectiveHarmonyBars'];
    billEvansAntiElaborationGuards?: GenerationMetadata['billEvansAntiElaborationGuards'];
    debussyDiagnostics?: GenerationMetadata['debussyDiagnostics'];
    debussyDeviceReceipts?: GenerationMetadata['debussyDeviceReceipts'];
    debussySliceReceipt?: GenerationMetadata['debussySliceReceipt'];
    debussyEffectiveHarmonyBars?: GenerationMetadata['debussyEffectiveHarmonyBars'];
    debussyAntiElaborationGuards?: GenerationMetadata['debussyAntiElaborationGuards'];
    debussyArabesqueBars?: GenerationMetadata['debussyArabesqueBars'];
    debussyArabesqueMotifByBar?: GenerationMetadata['debussyArabesqueMotifByBar'];
    bernardHerrmannContext?: GenerationMetadata['bernardHerrmannContext'];
    bernardHerrmannDiagnostics?: GenerationMetadata['bernardHerrmannDiagnostics'];
    bernardHerrmannDeviceReceipts?: GenerationMetadata['bernardHerrmannDeviceReceipts'];
    bernardHerrmannSliceReceipt?: GenerationMetadata['bernardHerrmannSliceReceipt'];
    bernardHerrmannEffectiveHarmonyBars?: GenerationMetadata['bernardHerrmannEffectiveHarmonyBars'];
    johnWilliamsContext?: GenerationMetadata['johnWilliamsContext'];
    johnWilliamsDiagnostics?: GenerationMetadata['johnWilliamsDiagnostics'];
    johnWilliamsDeviceReceipts?: GenerationMetadata['johnWilliamsDeviceReceipts'];
    johnWilliamsSliceReceipt?: GenerationMetadata['johnWilliamsSliceReceipt'];
    johnWilliamsEffectiveHarmonyBars?: GenerationMetadata['johnWilliamsEffectiveHarmonyBars'];
    ennioMorriconeContext?: GenerationMetadata['ennioMorriconeContext'];
    ennioMorriconeDiagnostics?: GenerationMetadata['ennioMorriconeDiagnostics'];
    ennioMorriconeDeviceReceipts?: GenerationMetadata['ennioMorriconeDeviceReceipts'];
    ennioMorriconeSliceReceipt?: GenerationMetadata['ennioMorriconeSliceReceipt'];
    ennioMorriconeEffectiveHarmonyBars?: GenerationMetadata['ennioMorriconeEffectiveHarmonyBars'];
    ninoRotaContext?: GenerationMetadata['ninoRotaContext'];
    ninoRotaDiagnostics?: GenerationMetadata['ninoRotaDiagnostics'];
    ninoRotaDeviceReceipts?: GenerationMetadata['ninoRotaDeviceReceipts'];
    ninoRotaSliceReceipt?: GenerationMetadata['ninoRotaSliceReceipt'];
    ninoRotaEffectiveHarmonyBars?: GenerationMetadata['ninoRotaEffectiveHarmonyBars'];
    jerryGoldsmithContext?: GenerationMetadata['jerryGoldsmithContext'];
    jerryGoldsmithDiagnostics?: GenerationMetadata['jerryGoldsmithDiagnostics'];
    jerryGoldsmithDeviceReceipts?: GenerationMetadata['jerryGoldsmithDeviceReceipts'];
    jerryGoldsmithSliceReceipt?: GenerationMetadata['jerryGoldsmithSliceReceipt'];
    jerryGoldsmithEffectiveHarmonyBars?: GenerationMetadata['jerryGoldsmithEffectiveHarmonyBars'];
    philipGlassContext?: GenerationMetadata['philipGlassContext'];
    philipGlassDiagnostics?: GenerationMetadata['philipGlassDiagnostics'];
    philipGlassDeviceReceipts?: GenerationMetadata['philipGlassDeviceReceipts'];
    philipGlassSliceReceipt?: GenerationMetadata['philipGlassSliceReceipt'];
    philipGlassEffectiveHarmonyBars?: GenerationMetadata['philipGlassEffectiveHarmonyBars'];
    reichProcess?: GenerationMetadata['reichProcess'];
    reichResolvedProcess?: GenerationMetadata['reichResolvedProcess'];
    steveReichDiagnostics?: GenerationMetadata['steveReichDiagnostics'];
    steveReichDeviceReceipts?: GenerationMetadata['steveReichDeviceReceipts'];
    steveReichSliceReceipt?: GenerationMetadata['steveReichSliceReceipt'];
    steveReichEffectiveHarmonyBars?: GenerationMetadata['steveReichEffectiveHarmonyBars'];
    steveReichHarmonicRhythmBars?: GenerationMetadata['steveReichHarmonicRhythmBars'];
    steveReichPulseGridDensity?: GenerationMetadata['steveReichPulseGridDensity'];
    messiaenPeriodMode?: GenerationMetadata['messiaenPeriodMode'];
    messiaenPeriodModeResolved?: GenerationMetadata['messiaenPeriodModeResolved'];
    periodMode?: GenerationMetadata['periodMode'];
    activeMode?: GenerationMetadata['activeMode'];
    colourTag?: GenerationMetadata['colourTag'];
    birdsongSpecies?: GenerationMetadata['birdsongSpecies'];
    messiaenHarmonicRhythmMinBars?: GenerationMetadata['messiaenHarmonicRhythmMinBars'];
    messiaenDiagnostics?: GenerationMetadata['messiaenDiagnostics'];
    messiaenDeviceReceipts?: GenerationMetadata['messiaenDeviceReceipts'];
    messiaenSliceReceipt?: GenerationMetadata['messiaenSliceReceipt'];
    messiaenEffectiveHarmonyBars?: GenerationMetadata['messiaenEffectiveHarmonyBars'];
    hansZimmerContext?: GenerationMetadata['hansZimmerContext'];
    hansZimmerDiagnostics?: GenerationMetadata['hansZimmerDiagnostics'];
    hansZimmerDeviceReceipts?: GenerationMetadata['hansZimmerDeviceReceipts'];
    hansZimmerSliceReceipt?: GenerationMetadata['hansZimmerSliceReceipt'];
    hansZimmerEffectiveHarmonyBars?: GenerationMetadata['hansZimmerEffectiveHarmonyBars'];
    angeloBadalamentiContext?: GenerationMetadata['angeloBadalamentiContext'];
    angeloBadalamentiDiagnostics?: GenerationMetadata['angeloBadalamentiDiagnostics'];
    angeloBadalamentiDeviceReceipts?: GenerationMetadata['angeloBadalamentiDeviceReceipts'];
    angeloBadalamentiSliceReceipt?: GenerationMetadata['angeloBadalamentiSliceReceipt'];
    angeloBadalamentiEffectiveHarmonyBars?: GenerationMetadata['angeloBadalamentiEffectiveHarmonyBars'];
    bacharachDiagnostics?: GenerationMetadata['bacharachDiagnostics'];
    bacharachDeviceReceipts?: GenerationMetadata['bacharachDeviceReceipts'];
    bacharachSliceReceipt?: GenerationMetadata['bacharachSliceReceipt'];
    bacharachEffectiveHarmonyBars?: GenerationMetadata['bacharachEffectiveHarmonyBars'];
    bacharachAntiElaborationGuards?: GenerationMetadata['bacharachAntiElaborationGuards'];
    donaldFagenDiagnostics?: GenerationMetadata['donaldFagenDiagnostics'];
    donaldFagenDeviceReceipts?: GenerationMetadata['donaldFagenDeviceReceipts'];
    donaldFagenSliceReceipt?: GenerationMetadata['donaldFagenSliceReceipt'];
    donaldFagenEffectiveHarmonyBars?: GenerationMetadata['donaldFagenEffectiveHarmonyBars'];
    donaldFagenAntiElaborationGuards?: GenerationMetadata['donaldFagenAntiElaborationGuards'];
    ecmChamberDiagnostics?: GenerationMetadata['ecmChamberDiagnostics'];
    ecmChamberDeviceReceipts?: GenerationMetadata['ecmChamberDeviceReceipts'];
    ecmChamberSliceReceipt?: GenerationMetadata['ecmChamberSliceReceipt'];
    ecmChamberEffectiveHarmonyBars?: GenerationMetadata['ecmChamberEffectiveHarmonyBars'];
    ecmChamberAntiElaborationGuards?: GenerationMetadata['ecmChamberAntiElaborationGuards'];
    jobimDiagnostics?: GenerationMetadata['jobimDiagnostics'];
    jobimDeviceReceipts?: GenerationMetadata['jobimDeviceReceipts'];
    jobimSliceReceipt?: GenerationMetadata['jobimSliceReceipt'];
    jobimEffectiveHarmonyBars?: GenerationMetadata['jobimEffectiveHarmonyBars'];
    jobimAntiElaborationGuards?: GenerationMetadata['jobimAntiElaborationGuards'];
    herbieHancockDiagnostics?: GenerationMetadata['herbieHancockDiagnostics'];
    herbieHancockDeviceReceipts?: GenerationMetadata['herbieHancockDeviceReceipts'];
    herbieHancockSliceReceipt?: GenerationMetadata['herbieHancockSliceReceipt'];
    herbieHancockEffectiveHarmonyBars?: GenerationMetadata['herbieHancockEffectiveHarmonyBars'];
    herbieHancockAntiElaborationGuards?: GenerationMetadata['herbieHancockAntiElaborationGuards'];
    hancockPhase?: GenerationMetadata['hancockPhase'];
    hancockResolvedPhase?: GenerationMetadata['hancockResolvedPhase'];
    sondheimDiagnostics?: GenerationMetadata['sondheimDiagnostics'];
    sondheimDeviceReceipts?: GenerationMetadata['sondheimDeviceReceipts'];
    sondheimSliceReceipt?: GenerationMetadata['sondheimSliceReceipt'];
    sondheimEffectiveHarmonyBars?: GenerationMetadata['sondheimEffectiveHarmonyBars'];
    sondheimAntiElaborationGuards?: GenerationMetadata['sondheimAntiElaborationGuards'];
    kateBushDiagnostics?: GenerationMetadata['kateBushDiagnostics'];
    kateBushDeviceReceipts?: GenerationMetadata['kateBushDeviceReceipts'];
    kateBushSliceReceipt?: GenerationMetadata['kateBushSliceReceipt'];
    kateBushEffectiveHarmonyBars?: GenerationMetadata['kateBushEffectiveHarmonyBars'];
    kateBushAntiElaborationGuards?: GenerationMetadata['kateBushAntiElaborationGuards'];
    theloniousMonkDiagnostics?: GenerationMetadata['theloniousMonkDiagnostics'];
    theloniousMonkDeviceReceipts?: GenerationMetadata['theloniousMonkDeviceReceipts'];
    theloniousMonkSliceReceipt?: GenerationMetadata['theloniousMonkSliceReceipt'];
    theloniousMonkEffectiveHarmonyBars?: GenerationMetadata['theloniousMonkEffectiveHarmonyBars'];
    theloniousMonkAntiElaborationGuards?: GenerationMetadata['theloniousMonkAntiElaborationGuards'];
    johnColtraneDiagnostics?: GenerationMetadata['johnColtraneDiagnostics'];
    johnColtraneDeviceReceipts?: GenerationMetadata['johnColtraneDeviceReceipts'];
    johnColtraneSliceReceipt?: GenerationMetadata['johnColtraneSliceReceipt'];
    johnColtraneEffectiveHarmonyBars?: GenerationMetadata['johnColtraneEffectiveHarmonyBars'];
    coltranePhase?: GenerationMetadata['coltranePhase'];
    coltraneHarmonicDensity?: GenerationMetadata['coltraneHarmonicDensity'];
    andrewHillDiagnostics?: GenerationMetadata['andrewHillDiagnostics'];
    andrewHillDeviceReceipts?: GenerationMetadata['andrewHillDeviceReceipts'];
    andrewHillSliceReceipt?: GenerationMetadata['andrewHillSliceReceipt'];
    andrewHillEffectiveHarmonyBars?: GenerationMetadata['andrewHillEffectiveHarmonyBars'];
    andrewHillAntiElaborationGuards?: GenerationMetadata['andrewHillAntiElaborationGuards'];
    jimHallDiagnostics?: GenerationMetadata['jimHallDiagnostics'];
    jimHallDeviceReceipts?: GenerationMetadata['jimHallDeviceReceipts'];
    jimHallSliceReceipt?: GenerationMetadata['jimHallSliceReceipt'];
    jimHallEffectiveHarmonyBars?: GenerationMetadata['jimHallEffectiveHarmonyBars'];
    jimHallMode?: GenerationMetadata['jimHallMode'];
    jimHallResolvedMode?: GenerationMetadata['jimHallResolvedMode'];
    jimHallVoicingCap?: GenerationMetadata['jimHallVoicingCap'];
    frankZappaDiagnostics?: GenerationMetadata['frankZappaDiagnostics'];
    frankZappaDeviceReceipts?: GenerationMetadata['frankZappaDeviceReceipts'];
    frankZappaSliceReceipt?: GenerationMetadata['frankZappaSliceReceipt'];
    frankZappaEffectiveHarmonyBars?: GenerationMetadata['frankZappaEffectiveHarmonyBars'];
    frankZappaAntiElaborationGuards?: GenerationMetadata['frankZappaAntiElaborationGuards'];
    frankZappaEligibilityStats?: GenerationMetadata['frankZappaEligibilityStats'];
    songModeFagenKeysCompV15Applied?: boolean;
    fagenKeysCompMusicalDiagnostics?: GenerationMetadata['fagenKeysCompMusicalDiagnostics'];
    sophisticatedPopHarmonyDiagnostics?: GenerationMetadata['sophisticatedPopHarmonyDiagnostics'];
    bacharachHarmonyDiagnostics?: GenerationMetadata['bacharachHarmonyDiagnostics'];
    bacharachSongModeRuleBundleId?: string;
    songwriterSyncopationBias?: number;
    songwriterDensityBias?: number;
    songModeSectionShapingDiagnostics?: GenerationMetadata['songModeSectionShapingDiagnostics'];
    songModeSectionBehaviourDescriptors?: GenerationMetadata['songModeSectionBehaviourDescriptors'];
    songModeProfileRuleDiagnostics?: GenerationMetadata['songModeProfileRuleDiagnostics'];
    motifAuthorityLevel?: GenerationMetadata['motifAuthorityLevel'];
    motifDevelopmentSummary?: GenerationMetadata['motifDevelopmentSummary'];
    gceScore?: number;
    gceGatePassed?: boolean;
    riffCompositeScore?: number;
    riffInternalGatePassed?: boolean;
    riffQualityRules?: import('../core/riff-generator/riffQualityRules').RiffQualityManifestCompact;
    /** Stage 4: echoed when import-harmony telemetry is present (`core/importHarmonyPolicy.ts`). */
    importHarmonyPolicyVersion?: number;
  }
): void {
  const manifestPath = manifestPathForMusicXml(xmlFilepath);
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  tryHideMetaFolderOnWindows(path.dirname(manifestPath));
  const entry: Partial<OutputEntry> = {
    chordExportDiagnostics: meta.chordExportDiagnostics,
    presetId: meta.presetId,
    styleStack: meta.styleStack,
    seed: meta.seed,
    variationId: meta.variationId,
    creativeControlLevel: meta.creativeControlLevel,
    timestamp: meta.timestamp,
    scoreTitle: meta.scoreTitle,
    ecmMode: meta.ecmMode,
    harmonySource: meta.harmonySource,
    customChordProgressionSummary: meta.customChordProgressionSummary,
    progressionMode: meta.progressionMode,
    chordProgressionInputRaw: meta.chordProgressionInputRaw,
    parsedCustomProgressionBars: meta.parsedCustomProgressionBars,
    chordProgressionParseFailed: meta.chordProgressionParseFailed,
    builtInHarmonyFallbackOccurred: meta.builtInHarmonyFallbackOccurred,
    keySignatureInferredTonic: meta.keySignatureInferredTonic,
    keySignatureConfidence: meta.keySignatureConfidence,
    keySignatureOverrideUsed: meta.keySignatureOverrideUsed,
    keySignatureNoneMode: meta.keySignatureNoneMode,
    keySignatureHide: meta.keySignatureHide,
    keySignatureFifths: meta.keySignatureFifths,
    keySignatureExportMode: meta.keySignatureExportMode,
    keySignatureInferredKey: meta.keySignatureInferredKey,
    keySignatureInferredMode: meta.keySignatureInferredMode,
    keySignatureInferredFifths: meta.keySignatureInferredFifths,
    keySignatureModeApplied: meta.keySignatureModeApplied,
    keySignatureExportKeyWritten: meta.keySignatureExportKeyWritten,
    harmonySourceUsed: meta.harmonySourceUsed,
    styleGrammarLabel: meta.styleGrammarLabel,
    styleStackPrimaryModuleId: meta.styleStackPrimaryModuleId,
    styleStackPrimaryDisplayName: meta.styleStackPrimaryDisplayName,
    userSelectedStyleDisplayNames: meta.userSelectedStyleDisplayNames,
    userExplicitPrimaryStyle: meta.userExplicitPrimaryStyle,
    duoModeReceiptLabel: meta.duoModeReceiptLabel,
    styleProfile: meta.styleProfile,
    chordProgressionSubmittedRaw: meta.chordProgressionSubmittedRaw,
    parsedChordBarsSnapshot: meta.parsedChordBarsSnapshot,
    pipelineTruthInputStage: meta.pipelineTruthInputStage,
    pipelineTruthScoreStage: meta.pipelineTruthScoreStage,
    pipelineTruthExportStage: meta.pipelineTruthExportStage,
    validation: meta.validation,
    songModeRhythmOverlayPhraseDiagnostics: meta.songModeRhythmOverlayPhraseDiagnostics,
    songModeRhythmOverlayByPhrase: meta.songModeRhythmOverlayByPhrase,
    rhythmIntentD1Receipt: meta.rhythmIntentD1Receipt,
    c4_hook_rhythm_applied: meta.c4_hook_rhythm_applied,
    c4_bars_used: meta.c4_bars_used,
    songModeStyleSurfaceNotes: meta.songModeStyleSurfaceNotes,
    songModeDonaldFagenC1Receipt: meta.songModeDonaldFagenC1Receipt,
    songwriterStyleId: meta.songwriterStyleId,
    brianWilsonPetSoundsDiagnostics: meta.brianWilsonPetSoundsDiagnostics,
    brianWilsonPetSoundsDeviceReceipts: meta.brianWilsonPetSoundsDeviceReceipts,
    brianWilsonPetSoundsSliceReceipt: meta.brianWilsonPetSoundsSliceReceipt,
    brianWilsonEffectiveHarmonyBars: meta.brianWilsonEffectiveHarmonyBars,
    stevieWonderDiagnostics: meta.stevieWonderDiagnostics,
    stevieWonderDeviceReceipts: meta.stevieWonderDeviceReceipts,
    stevieWonderSliceReceipt: meta.stevieWonderSliceReceipt,
    stevieWonderEffectiveHarmonyBars: meta.stevieWonderEffectiveHarmonyBars,
    radioheadDiagnostics: meta.radioheadDiagnostics,
    radioheadDeviceReceipts: meta.radioheadDeviceReceipts,
    radioheadSliceReceipt: meta.radioheadSliceReceipt,
    radioheadEffectiveHarmonyBars: meta.radioheadEffectiveHarmonyBars,
    jamesBrownDiagnostics: meta.jamesBrownDiagnostics,
    jamesBrownDeviceReceipts: meta.jamesBrownDeviceReceipts,
    jamesBrownSliceReceipt: meta.jamesBrownSliceReceipt,
    jamesBrownEffectiveHarmonyBars: meta.jamesBrownEffectiveHarmonyBars,
    jamesBrownAntiElaborationGuards: meta.jamesBrownAntiElaborationGuards,
    joniMitchellDiagnostics: meta.joniMitchellDiagnostics,
    joniMitchellDeviceReceipts: meta.joniMitchellDeviceReceipts,
    joniMitchellSliceReceipt: meta.joniMitchellSliceReceipt,
    joniMitchellEffectiveHarmonyBars: meta.joniMitchellEffectiveHarmonyBars,
    joniMitchellAntiElaborationGuards: meta.joniMitchellAntiElaborationGuards,
    joniMitchellTuningPatternByBar: meta.joniMitchellTuningPatternByBar,
    joniMitchellModalFieldLockLengthBars: meta.joniMitchellModalFieldLockLengthBars,
    joniMitchellSliceMeta: meta.joniMitchellSliceMeta,
    joniPhase: meta.joniPhase,
    joniResolvedPhase: meta.joniResolvedPhase,
    thadPhase: meta.thadPhase,
    thadResolvedPhase: meta.thadResolvedPhase,
    thadJonesDiagnostics: meta.thadJonesDiagnostics,
    thadJonesDeviceReceipts: meta.thadJonesDeviceReceipts,
    thadJonesSliceReceipt: meta.thadJonesSliceReceipt,
    thadJonesEffectiveHarmonyBars: meta.thadJonesEffectiveHarmonyBars,
    thadJonesShoutBars: meta.thadJonesShoutBars,
    basieTestamentMode: meta.basieTestamentMode,
    basieResolvedTestament: meta.basieResolvedTestament,
    basieDiagnostics: meta.basieDiagnostics,
    basieDeviceReceipts: meta.basieDeviceReceipts,
    basieSliceReceipt: meta.basieSliceReceipt,
    basieEffectiveHarmonyBars: meta.basieEffectiveHarmonyBars,
    basieShoutBars: meta.basieShoutBars,
    basieEpisodePlan: meta.basieEpisodePlan,
    brookmeyerPeriodMode: meta.brookmeyerPeriodMode,
    brookmeyerPeriodModeResolved: meta.brookmeyerPeriodModeResolved,
    activePitchModule: meta.activePitchModule,
    brookmeyerSoloPermitted: meta.brookmeyerSoloPermitted,
    brookmeyerEpisodePlanSummary: meta.brookmeyerEpisodePlanSummary,
    bobBrookmeyerDiagnostics: meta.bobBrookmeyerDiagnostics,
    bobBrookmeyerDeviceReceipts: meta.bobBrookmeyerDeviceReceipts,
    bobBrookmeyerSliceReceipt: meta.bobBrookmeyerSliceReceipt,
    bobBrookmeyerEffectiveHarmonyBars: meta.bobBrookmeyerEffectiveHarmonyBars,
    lineFirstHierarchy: meta.lineFirstHierarchy,
    contrapuntalLineCount: meta.contrapuntalLineCount,
    sonicYouthDiagnostics: meta.sonicYouthDiagnostics,
    sonicYouthDeviceReceipts: meta.sonicYouthDeviceReceipts,
    sonicYouthSliceReceipt: meta.sonicYouthSliceReceipt,
    sonicYouthEffectiveHarmonyBars: meta.sonicYouthEffectiveHarmonyBars,
    patMethenyDiagnostics: meta.patMethenyDiagnostics,
    patMethenyDeviceReceipts: meta.patMethenyDeviceReceipts,
    patMethenySliceReceipt: meta.patMethenySliceReceipt,
    patMethenyEffectiveHarmonyBars: meta.patMethenyEffectiveHarmonyBars,
    patMethenyAntiElaborationGuards: meta.patMethenyAntiElaborationGuards,
    patMethenyPedalHoldMaxBars: meta.patMethenyPedalHoldMaxBars,
    patMethenyEligibilityStats: meta.patMethenyEligibilityStats,
    wayneShorterDiagnostics: meta.wayneShorterDiagnostics,
    wayneShorterDeviceReceipts: meta.wayneShorterDeviceReceipts,
    wayneShorterSliceReceipt: meta.wayneShorterSliceReceipt,
    wayneShorterEffectiveHarmonyBars: meta.wayneShorterEffectiveHarmonyBars,
    wayneShorterAntiElaborationGuards: meta.wayneShorterAntiElaborationGuards,
    wayneShorterEligibilityStats: meta.wayneShorterEligibilityStats,
    barryHarrisDiagnostics: meta.barryHarrisDiagnostics,
    barryHarrisDeviceReceipts: meta.barryHarrisDeviceReceipts,
    barryHarrisSliceReceipt: meta.barryHarrisSliceReceipt,
    barryHarrisEffectiveHarmonyBars: meta.barryHarrisEffectiveHarmonyBars,
    barryHarrisAntiElaborationGuards: meta.barryHarrisAntiElaborationGuards,
    billEvansDiagnostics: meta.billEvansDiagnostics,
    billEvansDeviceReceipts: meta.billEvansDeviceReceipts,
    billEvansSliceReceipt: meta.billEvansSliceReceipt,
    billEvansEffectiveHarmonyBars: meta.billEvansEffectiveHarmonyBars,
    billEvansAntiElaborationGuards: meta.billEvansAntiElaborationGuards,
    debussyDiagnostics: meta.debussyDiagnostics,
    debussyDeviceReceipts: meta.debussyDeviceReceipts,
    debussySliceReceipt: meta.debussySliceReceipt,
    debussyEffectiveHarmonyBars: meta.debussyEffectiveHarmonyBars,
    debussyAntiElaborationGuards: meta.debussyAntiElaborationGuards,
    debussyArabesqueBars: meta.debussyArabesqueBars,
    debussyArabesqueMotifByBar: meta.debussyArabesqueMotifByBar,
    bernardHerrmannContext: meta.bernardHerrmannContext,
    bernardHerrmannDiagnostics: meta.bernardHerrmannDiagnostics,
    bernardHerrmannDeviceReceipts: meta.bernardHerrmannDeviceReceipts,
    bernardHerrmannSliceReceipt: meta.bernardHerrmannSliceReceipt,
    bernardHerrmannEffectiveHarmonyBars: meta.bernardHerrmannEffectiveHarmonyBars,
    johnWilliamsContext: meta.johnWilliamsContext,
    johnWilliamsDiagnostics: meta.johnWilliamsDiagnostics,
    johnWilliamsDeviceReceipts: meta.johnWilliamsDeviceReceipts,
    johnWilliamsSliceReceipt: meta.johnWilliamsSliceReceipt,
    johnWilliamsEffectiveHarmonyBars: meta.johnWilliamsEffectiveHarmonyBars,
    ennioMorriconeContext: meta.ennioMorriconeContext,
    ennioMorriconeDiagnostics: meta.ennioMorriconeDiagnostics,
    ennioMorriconeDeviceReceipts: meta.ennioMorriconeDeviceReceipts,
    ennioMorriconeSliceReceipt: meta.ennioMorriconeSliceReceipt,
    ennioMorriconeEffectiveHarmonyBars: meta.ennioMorriconeEffectiveHarmonyBars,
    ninoRotaContext: meta.ninoRotaContext,
    ninoRotaDiagnostics: meta.ninoRotaDiagnostics,
    ninoRotaDeviceReceipts: meta.ninoRotaDeviceReceipts,
    ninoRotaSliceReceipt: meta.ninoRotaSliceReceipt,
    ninoRotaEffectiveHarmonyBars: meta.ninoRotaEffectiveHarmonyBars,
    jerryGoldsmithContext: meta.jerryGoldsmithContext,
    jerryGoldsmithDiagnostics: meta.jerryGoldsmithDiagnostics,
    jerryGoldsmithDeviceReceipts: meta.jerryGoldsmithDeviceReceipts,
    jerryGoldsmithSliceReceipt: meta.jerryGoldsmithSliceReceipt,
    jerryGoldsmithEffectiveHarmonyBars: meta.jerryGoldsmithEffectiveHarmonyBars,
    philipGlassContext: meta.philipGlassContext,
    philipGlassDiagnostics: meta.philipGlassDiagnostics,
    philipGlassDeviceReceipts: meta.philipGlassDeviceReceipts,
    philipGlassSliceReceipt: meta.philipGlassSliceReceipt,
    philipGlassEffectiveHarmonyBars: meta.philipGlassEffectiveHarmonyBars,
    reichProcess: meta.reichProcess,
    reichResolvedProcess: meta.reichResolvedProcess,
    steveReichDiagnostics: meta.steveReichDiagnostics,
    steveReichDeviceReceipts: meta.steveReichDeviceReceipts,
    steveReichSliceReceipt: meta.steveReichSliceReceipt,
    steveReichEffectiveHarmonyBars: meta.steveReichEffectiveHarmonyBars,
    steveReichHarmonicRhythmBars: meta.steveReichHarmonicRhythmBars,
    steveReichPulseGridDensity: meta.steveReichPulseGridDensity,
    messiaenPeriodMode: meta.messiaenPeriodMode,
    messiaenPeriodModeResolved: meta.messiaenPeriodModeResolved,
    periodMode: meta.periodMode,
    activeMode: meta.activeMode,
    colourTag: meta.colourTag,
    birdsongSpecies: meta.birdsongSpecies,
    messiaenHarmonicRhythmMinBars: meta.messiaenHarmonicRhythmMinBars,
    messiaenDiagnostics: meta.messiaenDiagnostics,
    messiaenDeviceReceipts: meta.messiaenDeviceReceipts,
    messiaenSliceReceipt: meta.messiaenSliceReceipt,
    messiaenEffectiveHarmonyBars: meta.messiaenEffectiveHarmonyBars,
    hansZimmerContext: meta.hansZimmerContext,
    hansZimmerDiagnostics: meta.hansZimmerDiagnostics,
    hansZimmerDeviceReceipts: meta.hansZimmerDeviceReceipts,
    hansZimmerSliceReceipt: meta.hansZimmerSliceReceipt,
    hansZimmerEffectiveHarmonyBars: meta.hansZimmerEffectiveHarmonyBars,
    angeloBadalamentiContext: meta.angeloBadalamentiContext,
    angeloBadalamentiDiagnostics: meta.angeloBadalamentiDiagnostics,
    angeloBadalamentiDeviceReceipts: meta.angeloBadalamentiDeviceReceipts,
    angeloBadalamentiSliceReceipt: meta.angeloBadalamentiSliceReceipt,
    angeloBadalamentiEffectiveHarmonyBars: meta.angeloBadalamentiEffectiveHarmonyBars,
    bacharachDiagnostics: meta.bacharachDiagnostics,
    bacharachDeviceReceipts: meta.bacharachDeviceReceipts,
    bacharachSliceReceipt: meta.bacharachSliceReceipt,
    bacharachEffectiveHarmonyBars: meta.bacharachEffectiveHarmonyBars,
    bacharachAntiElaborationGuards: meta.bacharachAntiElaborationGuards,
    donaldFagenDiagnostics: meta.donaldFagenDiagnostics,
    donaldFagenDeviceReceipts: meta.donaldFagenDeviceReceipts,
    donaldFagenSliceReceipt: meta.donaldFagenSliceReceipt,
    donaldFagenEffectiveHarmonyBars: meta.donaldFagenEffectiveHarmonyBars,
    donaldFagenAntiElaborationGuards: meta.donaldFagenAntiElaborationGuards,
    ecmChamberDiagnostics: meta.ecmChamberDiagnostics,
    ecmChamberDeviceReceipts: meta.ecmChamberDeviceReceipts,
    ecmChamberSliceReceipt: meta.ecmChamberSliceReceipt,
    ecmChamberEffectiveHarmonyBars: meta.ecmChamberEffectiveHarmonyBars,
    ecmChamberAntiElaborationGuards: meta.ecmChamberAntiElaborationGuards,
    jobimDiagnostics: meta.jobimDiagnostics,
    jobimDeviceReceipts: meta.jobimDeviceReceipts,
    jobimSliceReceipt: meta.jobimSliceReceipt,
    jobimEffectiveHarmonyBars: meta.jobimEffectiveHarmonyBars,
    jobimAntiElaborationGuards: meta.jobimAntiElaborationGuards,
    herbieHancockDiagnostics: meta.herbieHancockDiagnostics,
    herbieHancockDeviceReceipts: meta.herbieHancockDeviceReceipts,
    herbieHancockSliceReceipt: meta.herbieHancockSliceReceipt,
    herbieHancockEffectiveHarmonyBars: meta.herbieHancockEffectiveHarmonyBars,
    herbieHancockAntiElaborationGuards: meta.herbieHancockAntiElaborationGuards,
    hancockPhase: meta.hancockPhase,
    hancockResolvedPhase: meta.hancockResolvedPhase,
    sondheimDiagnostics: meta.sondheimDiagnostics,
    sondheimDeviceReceipts: meta.sondheimDeviceReceipts,
    sondheimSliceReceipt: meta.sondheimSliceReceipt,
    sondheimEffectiveHarmonyBars: meta.sondheimEffectiveHarmonyBars,
    sondheimAntiElaborationGuards: meta.sondheimAntiElaborationGuards,
    kateBushDiagnostics: meta.kateBushDiagnostics,
    kateBushDeviceReceipts: meta.kateBushDeviceReceipts,
    kateBushSliceReceipt: meta.kateBushSliceReceipt,
    kateBushEffectiveHarmonyBars: meta.kateBushEffectiveHarmonyBars,
    kateBushAntiElaborationGuards: meta.kateBushAntiElaborationGuards,
    theloniousMonkDiagnostics: meta.theloniousMonkDiagnostics,
    theloniousMonkDeviceReceipts: meta.theloniousMonkDeviceReceipts,
    theloniousMonkSliceReceipt: meta.theloniousMonkSliceReceipt,
    theloniousMonkEffectiveHarmonyBars: meta.theloniousMonkEffectiveHarmonyBars,
    theloniousMonkAntiElaborationGuards: meta.theloniousMonkAntiElaborationGuards,
    johnColtraneDiagnostics: meta.johnColtraneDiagnostics,
    johnColtraneDeviceReceipts: meta.johnColtraneDeviceReceipts,
    johnColtraneSliceReceipt: meta.johnColtraneSliceReceipt,
    johnColtraneEffectiveHarmonyBars: meta.johnColtraneEffectiveHarmonyBars,
    coltranePhase: meta.coltranePhase,
    coltraneHarmonicDensity: meta.coltraneHarmonicDensity,
    andrewHillDiagnostics: meta.andrewHillDiagnostics,
    andrewHillDeviceReceipts: meta.andrewHillDeviceReceipts,
    andrewHillSliceReceipt: meta.andrewHillSliceReceipt,
    andrewHillEffectiveHarmonyBars: meta.andrewHillEffectiveHarmonyBars,
    andrewHillAntiElaborationGuards: meta.andrewHillAntiElaborationGuards,
    jimHallDiagnostics: meta.jimHallDiagnostics,
    jimHallDeviceReceipts: meta.jimHallDeviceReceipts,
    jimHallSliceReceipt: meta.jimHallSliceReceipt,
    jimHallEffectiveHarmonyBars: meta.jimHallEffectiveHarmonyBars,
    jimHallMode: meta.jimHallMode,
    jimHallResolvedMode: meta.jimHallResolvedMode,
    jimHallVoicingCap: meta.jimHallVoicingCap,
    frankZappaDiagnostics: meta.frankZappaDiagnostics,
    frankZappaDeviceReceipts: meta.frankZappaDeviceReceipts,
    frankZappaSliceReceipt: meta.frankZappaSliceReceipt,
    frankZappaEffectiveHarmonyBars: meta.frankZappaEffectiveHarmonyBars,
    frankZappaAntiElaborationGuards: meta.frankZappaAntiElaborationGuards,
    frankZappaEligibilityStats: meta.frankZappaEligibilityStats,
    songModeFagenKeysCompV15Applied: meta.songModeFagenKeysCompV15Applied,
    fagenKeysCompMusicalDiagnostics: meta.fagenKeysCompMusicalDiagnostics,
    sophisticatedPopHarmonyDiagnostics: meta.sophisticatedPopHarmonyDiagnostics,
    bacharachHarmonyDiagnostics: meta.bacharachHarmonyDiagnostics,
    bacharachSongModeRuleBundleId: meta.bacharachSongModeRuleBundleId,
    songwriterSyncopationBias: meta.songwriterSyncopationBias,
    songwriterDensityBias: meta.songwriterDensityBias,
    songModeSectionShapingDiagnostics: meta.songModeSectionShapingDiagnostics,
    songModeSectionBehaviourDescriptors: meta.songModeSectionBehaviourDescriptors,
    songModeProfileRuleDiagnostics: meta.songModeProfileRuleDiagnostics,
    motifAuthorityLevel: meta.motifAuthorityLevel,
    motifDevelopmentSummary: meta.motifDevelopmentSummary,
    songModeDiagnosticsSummary: buildSongModeDiagnosticsSummary(meta),
    gceScore: meta.gceScore,
    gceGatePassed: meta.gceGatePassed,
    riffCompositeScore: meta.riffCompositeScore,
    riffInternalGatePassed: meta.riffInternalGatePassed,
    riffQualityRules: meta.riffQualityRules,
    importHarmonyPolicyVersion: meta.importHarmonyPolicyVersion,
  };
  fs.writeFileSync(manifestPath, JSON.stringify(entry, null, 0), 'utf-8');
}
