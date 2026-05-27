/**
 * Composer OS V2 — smoke tier (~fast allowlist).
 * Runs a short fixed list of existing `run*Tests` entrypoints (no duplicate assertions).
 *
 * When you add/remove suites or change row counts: run `npm run test:composer-smoke` from repo root, read
 * `Passed: N rows (M suites)` in the smoke summary, then sync **N** + **M** into `CLAUDE.md` and `docs/COMPOSER_OS_ROADMAP.md`
 * Current (see roadmap § **Smoke tier — maintenance checklist**): full **498** PASS rows, **96** suites; fast **332** rows, **82** suites (V68 P2 SD parser gate).
 *
 * **Fast subset:** `COMPOSER_OS_SMOKE_TIER=fast` or `npm run test:composer-smoke-fast` — skips `SMOKE_FAST_EXCLUDE` suites (local dev).
 * **Full tier (default / CI):** unset or `COMPOSER_OS_SMOKE_TIER=full` — all suites in `smokeSuites`.
 *
 * Retired Cursor background smoke task IDs (pre-eb92c73a `harmonyModeRequested` slice gate + Gate B4 harness): **875851**, **984173** — no in-repo harness keyed by those IDs; failures were historical terminal runs only.
 */

import { runReadinessTests } from './readiness.test';
import { runConductorTests } from './conductor.test';
import { runAppApiBoundaryTests } from './appApiBoundary.test';
import { runChordSymbolMusicXmlHarmonyTests } from './chordSymbolMusicXmlHarmony.test';
import { runIndieGuitar2SongModeChordEventQualityTests } from './indieGuitar2SongModeChordEventQuality.test';
import { runBrianWilsonPetSoundsSliceSmokeTests } from './brianWilsonPetSoundsSliceSmoke.test';
import { runStevieWonderSliceSmokeTests } from './stevieWonderSliceSmoke.test';
import { runRadioheadSliceSmokeTests } from './radioheadSliceSmoke.test';
import { runJamesBrownSliceSmokeTests } from './jamesBrownSliceSmoke.test';
import { runJoniMitchellSliceSmokeTests } from './joniMitchellSliceSmoke.test';
import { runSonicYouthSliceSmokeTests } from './sonicYouthSliceSmoke.test';
import { runPatMethenySliceSmokeTests } from './patMethenySliceSmoke.test';
import { runWayneShorterSliceSmokeTests } from './wayneShorterSliceSmoke.test';
import { runJimHallSliceSmokeTests } from './jimHallSliceSmoke.test';
import { runSteveReichSliceSmokeTests } from './steveReichSliceSmoke.test';
import { runMessiaenSliceSmokeTests } from './messiaenSliceSmoke.test';
import { runFrankZappaSliceSmokeTests } from './frankZappaSliceSmoke.test';
import { runOddMeterInfrastructureSmokeTests } from './oddMeterInfrastructureSmoke.test';
import { runAsymmetricRhythmIntegrationTests } from './asymmetricRhythmIntegration.test';
import { runZappaSoloSmokeTests } from './zappasoloSmoke.test';
import { runBarryHarrisSliceSmokeTests } from './barryHarrisSliceSmoke.test';
import { runBillEvansSliceSmokeTests } from './billEvansSliceSmoke.test';
import { runBacharachSliceSmokeTests } from './bacharachSliceSmoke.test';
import { runBeatlesSliceSmokeTests } from './beatlesSliceSmoke.test';
import { runDebussySliceSmokeTests } from './debussySliceSmoke.test';
import { runDonaldFagenSliceSmokeTests } from './donaldFagenSliceSmoke.test';
import { runEcmChamberSliceSmokeTests } from './ecmChamberSliceSmoke.test';
import { runJobimSliceSmokeTests } from './jobimSliceSmoke.test';
import { runHerbieHancockSliceSmokeTests } from './herbieHancockSliceSmoke.test';
import { runSondheimSliceSmokeTests } from './sondheimSliceSmoke.test';
import { runKateBushSliceSmokeTests } from './kateBushSliceSmoke.test';
import { runTheloniousMonkSliceSmokeTests } from './theloniousMonkSliceSmoke.test';
import { runJohnColtraneSliceSmokeTests } from './johnColtraneSliceSmoke.test';
import { runAndrewHillSliceSmokeTests } from './andrewHillSliceSmoke.test';
import { runCharlieParkerSliceSmokeTests } from './charlieParkerSliceSmoke.test';
import { runFrippKingCrimsonSliceSmokeTests } from './frippKingCrimsonSliceSmoke.test';
import { runThadJonesSliceSmokeTests } from './thadJonesSliceSmoke.test';
import { runBasieSliceSmokeTests } from './basieSliceSmoke.test';
import { runBobBrookmeyerSliceSmokeTests } from './bobBrookmeyerSliceSmoke.test';
import { runOliverNelsonSliceSmokeTests } from './oliverNelsonSliceSmoke.test';
import { runEcmChamberVariantSweepTests } from './ecmChamberVariantSweep.test';
import { runAlternateGuitarTuningsTests } from './alternateGuitarTunings.test';
import { runImportHarmonyEnsembleSmokeTests } from './importHarmonyEnsembleSmoke.test';
import { runZappaStringQuartetSmokeTests } from './zappaStringQuartetSmoke.test';
import { runDrumGuideExportSmokeTests } from './drumGuideExportSmoke.test';
import { runZappaBigBandSmokeTests } from './zappaBigBandSmoke.test';
import { runUniversalLeadSheetRepeatSmokeTests } from './universalLeadSheetBuilder.test';
import { runVocalMelodySmokeTests } from './vocalMelodySmoke.test';
import { runRealBookStressTests } from './realBookStressTest.test';
import { runSonicYouthTextureTests } from '../core/score-model/__tests__/sonicYouthTexture.test';
import { runEvaluationSmokeTests } from '../core/evaluation/evaluation.smoke.test';
import { runPhraseEngineV2SmokeTests } from './phraseEngineV2Smoke.test';
import { runPhraseEngineV2IntegrationTests } from './phraseEngineV2Integration.test';
import { runDuoIntentTests } from './duoIntent.test';
import { runVaultQualitySmokeTests } from '../smoke/vaultQuality.smoke.test';
import { runVoiceRuleBundleTests } from './voiceRuleBundle.test';
import { runRiffGeneratorIntegrationTests } from './riffGeneratorIntegration.test';
import { runMusicXmlValidatorGateTests } from '../../../src/utils/musicXmlValidator.test';
import { runRhythmToolboxGateTests } from '../../../src/engine/__tests__/rhythmToolbox.test';
import { runSdParserGateTests } from '../../../src/engine/__tests__/sdParser.test';
import { runChordParserGateTests } from '../../../src/engine/__tests__/chordParser.test';
import { runPhase67EnsembleGuitarEtudeTests } from './phase67EnsembleGuitarEtude.test';
import { runPhase67InstrumentGroupMusicXmlTests } from './phase67InstrumentGroupMusicXml.test';
import { runPhase8ImprovReharmStochasticCollisionTests } from './phase8ImprovReharmStochasticCollision.test';
import { runHarmonicSceneMotifShoutSmokeTests } from './harmonicSceneMotifShoutSmoke.test';
import { runFollowup4MingusSchneiderThreadgillSmokeTests } from './followup4MingusSchneiderThreadgillSmoke.test';
import { runFollowup5ShoutBrassInPlaceSmokeTests } from './followup5ShoutBrassInPlaceSmoke.test';
import { runHarmonySpineLockSmokeTests } from './harmonySpineLock.smoke.test';
import { runOutputValidationSmokeTests } from './outputValidationSmoke.test';
import { runSqSwingRhythmTests } from './sqSwingRhythm.test';
import { runPorterGershwinDistinctionTests } from './porterGershwinDistinction.test';
import { runSqAntimetricRhythmTests } from './sqAntimetricRhythm.test';
import { runWybleDuoParityTests } from './wybleDuoParity.test';
import { runEcmGceOrchestrationTests } from './ecmGceOrchestration.test';
import { runMelodyV2Tests } from './melodyV2.test';
import { runMidiChordExtractorTests } from './midiChordExtractor.test';
import { runSlonimskyHarmonicSceneTests } from './slonimskyHarmonicScene.test';
import { runSlonimskyGbdContextTests } from './slonimskyGbdContext.test';
import { runSongModeSlonimskyTests } from './songModeSlonimsky.test';
import { runSlonimskyEnsembleReceiptTests } from './slonimskyEnsembleReceipt.test';
import { runSlonimskyUiTests } from './slonimskyUiBoundary.test';
import { runModeExposureTests } from './modeExposure.test';
import { runWybleEtudePitchOffsetTests } from './wybleEtudePitchOffset.test';
import { runV63PromotedVoicesGoldenTests } from './v63PromotedVoicesGolden.test';
import { runSonicYouthPerSectionVrbTests } from './sonicYouthPerSectionVrb.test';
import { runZappaGceFingerprintTests } from './zappaGceFingerprint.test';
import { runFzBurstReceiptTests } from './fzBurstReceipt.test';
import { runFzMetricShiftReceiptTests } from './fzMetricShiftReceipt.test';
import { runFzRegisterCollisionReceiptTests } from './fzRegisterCollisionReceipt.test';
import { runSectionArchitectureDomainTests } from './sectionArchitectureDomain.test';
import { runPerSectionMeterTests } from './perSectionMeter.test';
import { runSectionArchitectureP1GoldenTests } from './sectionArchitectureP1Golden.test';
import { runSectionArchitectureP2GoldenTests } from './sectionArchitectureP2Golden.test';
import { runMusicXmlDeepImportV65P3GoldenTests } from './musicXmlImport.test';
import { runGrooveScaffoldGoldenTests } from './grooveScaffold.test';
import { runFzDiff01ReceiptTests } from './fzDiff01Receipt.test';
import { runFzDiff02ReceiptTests } from './fzDiff02Receipt.test';
import { runZappaPerSectionTests } from './zappaPerSection.test';

type Row = { name: string; ok: boolean };

/** Smoke fast tier — heaviest suites omitted (~7.5s of ~22s wall clock on typical dev machine). */
const SMOKE_FAST_EXCLUDE: readonly string[] = [
  'Wyble duo parity + BB Light Touch',
  'Melody V2 (motif / register / cadenza)',
  'MIDI chord extractor (SQ→BB import)',
  'ECM GCE orchestration',
  'SQ anti-metric rhythm engine (sq_antimetric)',
  'SQ swing rhythm engine (sq_swing)',
  'App API boundary',
  'Frank Zappa songwriter slice',
  'SD3 drum guide export (MIDI + JSON sidecar)',
  'Import harmony ensemble (Big Band / String Quartet)',
  'Phase 6+7 — instrumentGroup MusicXML (quartet + guitar TAB)',
  'Indie guitar_2 Song Mode comp (ChordEvent quality)',
  'Charlie Parker songwriter slice',
  'Output validation — MIDI + MusicXML structural',
];

function resolveSmokeTier(): 'fast' | 'full' {
  const raw = (process.env.COMPOSER_OS_SMOKE_TIER ?? 'full').trim().toLowerCase();
  return raw === 'fast' ? 'fast' : 'full';
}

function runPhraseEngineV2IntegrationWithDuoIntentSmokeGuard(): Row[] {
  const rows = runPhraseEngineV2IntegrationTests();
  const duoRows = runDuoIntentTests();
  const failedDuoRows = duoRows.filter((row) => !row.ok);
  return failedDuoRows.length > 0 ? [...rows, ...failedDuoRows] : rows;
}

const smokeSuites: { label: string; run: () => Row[] }[] = [
  { label: 'Readiness', run: runReadinessTests },
  { label: 'Evaluation — Basie style profile structure', run: runEvaluationSmokeTests },
  { label: 'Phrase engine V2 — motif pool hook', run: runPhraseEngineV2SmokeTests },
  { label: 'Phrase engine V2 — integration (duo mock + duoIntent depth guard)', run: runPhraseEngineV2IntegrationWithDuoIntentSmokeGuard },
  { label: 'Wyble duo parity + BB Light Touch', run: runWybleDuoParityTests },
  { label: 'Melody V2 (motif / register / cadenza)', run: runMelodyV2Tests },
  { label: 'MIDI chord extractor (SQ→BB import)', run: runMidiChordExtractorTests },
  { label: 'ECM GCE orchestration', run: runEcmGceOrchestrationTests },
  { label: 'Conductor', run: runConductorTests },
  { label: 'SQ swing rhythm engine (sq_swing)', run: runSqSwingRhythmTests },
  { label: 'Porter vs Gershwin swing fine-grain', run: runPorterGershwinDistinctionTests },
  { label: 'SQ anti-metric rhythm engine (sq_antimetric)', run: runSqAntimetricRhythmTests },
  { label: 'App API boundary', run: runAppApiBoundaryTests },
  { label: 'MusicXML harmony (kind/@text + degrees)', run: runChordSymbolMusicXmlHarmonyTests },
  { label: 'Universal lead sheet — repeatMarkers (import → parity)', run: runUniversalLeadSheetRepeatSmokeTests },
  { label: 'Vocal melody engine — composer profiles + lead sheet', run: runVocalMelodySmokeTests },
  { label: 'Real Book MusicXML stress (import timeline + universal + export)', run: runRealBookStressTests },
  { label: 'Alternate guitar tunings (zones + texture)', run: runAlternateGuitarTuningsTests },
  { label: 'Indie guitar_2 Song Mode comp (ChordEvent quality)', run: runIndieGuitar2SongModeChordEventQualityTests },
  { label: 'Brian Wilson Pet Sounds songwriter slice', run: runBrianWilsonPetSoundsSliceSmokeTests },
  { label: 'Stevie Wonder (1972–76) songwriter slice', run: runStevieWonderSliceSmokeTests },
  { label: 'Radiohead (OK Computer–era) songwriter slice', run: runRadioheadSliceSmokeTests },
  { label: 'James Brown songwriter slice', run: runJamesBrownSliceSmokeTests },
  { label: 'Joni Mitchell songwriter slice', run: runJoniMitchellSliceSmokeTests },
  { label: 'Sonic Youth songwriter slice', run: runSonicYouthSliceSmokeTests },
  { label: 'Sonic Youth texture + MusicXML augmentation', run: runSonicYouthTextureTests },
  { label: 'Pat Metheny songwriter slice', run: runPatMethenySliceSmokeTests },
  { label: 'Wayne Shorter songwriter slice', run: runWayneShorterSliceSmokeTests },
  { label: 'Jim Hall songwriter slice', run: runJimHallSliceSmokeTests },
  { label: 'Steve Reich songwriter slice', run: runSteveReichSliceSmokeTests },
  { label: 'Olivier Messiaen songwriter slice', run: runMessiaenSliceSmokeTests },
  { label: 'Odd meter infrastructure (Phase A)', run: runOddMeterInfrastructureSmokeTests },
  { label: 'Asymmetric rhythm engine (preset → NoteEvent)', run: runAsymmetricRhythmIntegrationTests },
  { label: 'Zappa solo engine (Phase B)', run: runZappaSoloSmokeTests },
  { label: 'Frank Zappa songwriter slice', run: runFrankZappaSliceSmokeTests },
  { label: 'Barry Harris songwriter slice', run: runBarryHarrisSliceSmokeTests },
  { label: 'Bill Evans songwriter slice', run: runBillEvansSliceSmokeTests },
  { label: 'Beatles songwriter slice', run: runBeatlesSliceSmokeTests },
  { label: 'Bacharach songwriter slice', run: runBacharachSliceSmokeTests },
  { label: 'Debussy songwriter slice', run: runDebussySliceSmokeTests },
  { label: 'Donald Fagen songwriter slice', run: runDonaldFagenSliceSmokeTests },
  { label: 'ECM Chamber songwriter slice', run: runEcmChamberSliceSmokeTests },
  { label: 'Antônio Carlos Jobim songwriter slice', run: runJobimSliceSmokeTests },
  { label: 'Herbie Hancock songwriter slice', run: runHerbieHancockSliceSmokeTests },
  { label: 'Stephen Sondheim songwriter slice', run: runSondheimSliceSmokeTests },
  { label: 'Kate Bush songwriter slice', run: runKateBushSliceSmokeTests },
  { label: 'Thelonious Monk songwriter slice', run: runTheloniousMonkSliceSmokeTests },
  { label: 'John Coltrane songwriter slice', run: runJohnColtraneSliceSmokeTests },
  { label: 'Andrew Hill songwriter slice', run: runAndrewHillSliceSmokeTests },
  { label: 'Charlie Parker songwriter slice', run: runCharlieParkerSliceSmokeTests },
  { label: 'Fripp / King Crimson songwriter slice', run: runFrippKingCrimsonSliceSmokeTests },
  { label: 'Thad Jones songwriter slice', run: runThadJonesSliceSmokeTests },
  { label: 'Count Basie songwriter slice', run: runBasieSliceSmokeTests },
  { label: 'Bob Brookmeyer songwriter slice', run: runBobBrookmeyerSliceSmokeTests },
  { label: 'Oliver Nelson songwriter slice', run: runOliverNelsonSliceSmokeTests },
  { label: 'ECM chamber variant sweep (OOM guard)', run: runEcmChamberVariantSweepTests },
  { label: 'Import harmony ensemble (Big Band / String Quartet)', run: runImportHarmonyEnsembleSmokeTests },
  { label: 'Zappa String Quartet (SQ slice + odd meter)', run: runZappaStringQuartetSmokeTests },
  { label: 'SD3 drum guide export (MIDI + JSON sidecar)', run: runDrumGuideExportSmokeTests },
  { label: 'Zappa Big Band (FZ harmony + Zappa Classic meter)', run: runZappaBigBandSmokeTests },
  { label: 'Tonality Vault quality (inspector, riff modes, LSM, reharm, BB routing, rule sets)', run: runVaultQualitySmokeTests },
  { label: 'VoiceRuleBundle compiler + gil_evans wiring', run: runVoiceRuleBundleTests },
  { label: 'Riff Generator wiring (family / profile / odd-meter / blend)', run: runRiffGeneratorIntegrationTests },
  { label: 'MusicXML stringsync gate (order + displayOctave)', run: runMusicXmlValidatorGateTests },
  { label: 'RhythmToolbox drum analysis gate', run: runRhythmToolboxGateTests },
  { label: 'SD parser percussion gate', run: runSdParserGateTests },
  { label: 'Chord parser gate', run: runChordParserGateTests },
  { label: 'Phase 6+7 — ensemble / guitar / étude helpers', run: runPhase67EnsembleGuitarEtudeTests },
  { label: 'Phase 6+7 — instrumentGroup MusicXML (quartet + guitar TAB)', run: runPhase67InstrumentGroupMusicXmlTests },
  { label: 'Phase 8 — improv + reharm + stochastic + collision', run: runPhase8ImprovReharmStochasticCollisionTests },
  { label: 'Harmony spine LOCK harness (mismatch throws)', run: runHarmonySpineLockSmokeTests },
  { label: 'HarmonicScene motif filter + shout/outro energy', run: runHarmonicSceneMotifShoutSmokeTests },
  { label: 'Slonimsky Z7 harmonic scene (cell → voicing colour)', run: runSlonimskyHarmonicSceneTests },
  { label: 'Slonimsky Z8 GBD duo context', run: runSlonimskyGbdContextTests },
  { label: 'Slonimsky Z9 song mode cell layer', run: runSongModeSlonimskyTests },
  { label: 'Slonimsky Z10/Z11 ensemble cell receipts', run: runSlonimskyEnsembleReceiptTests },
  { label: 'slonimsky-ui', run: runSlonimskyUiTests },
  { label: 'Mode exposure (V1)', run: runModeExposureTests },
  { label: 'Wyble Etude guitar pitch offset', run: runWybleEtudePitchOffsetTests },
  { label: 'V63 promoted voices (UI/boundary + distinctness goldens)', run: runV63PromotedVoicesGoldenTests },
  { label: 'V64 — sonic_youth per-section VRB golden (seed 75002)', run: runSonicYouthPerSectionVrbTests },
  { label: 'V64 — Zappa GCE structural fingerprint golden (seed 76001)', run: runZappaGceFingerprintTests },
  { label: 'V64 — FZ_BURST receipt golden (seed 77001)', run: runFzBurstReceiptTests },
  { label: 'V64 — FZ_METRIC_SHIFT receipt golden (seed 77002)', run: runFzMetricShiftReceiptTests },
  { label: 'V64 — FZ_REGISTER_COLLISION receipt golden (seed 77003)', run: runFzRegisterCollisionReceiptTests },
  { label: 'V64 — section architecture domain golden (seed 78001)', run: runSectionArchitectureDomainTests },
  { label: 'V64 — per-section meter golden (seeds 79001–79003)', run: runPerSectionMeterTests },
  { label: 'V65 P1 — section architecture wiring goldens (seeds 80001–80002)', run: runSectionArchitectureP1GoldenTests },
  { label: 'V65 P2 — per-section tuning / Slonimsky / Big Band goldens (seeds 81001–81003)', run: runSectionArchitectureP2GoldenTests },
  { label: 'V65 P3 — MusicXML deep import golden (seed 82001)', run: runMusicXmlDeepImportV65P3GoldenTests },
  { label: 'V65 P4 — groove scaffold goldens (seeds 83001–83002)', run: runGrooveScaffoldGoldenTests },
  { label: 'V65 P5 — FZ_DIFF_01 receipt golden (seed 84001)', run: runFzDiff01ReceiptTests },
  { label: 'V65 P5 — FZ_DIFF_02 receipt golden (seed 84002)', run: runFzDiff02ReceiptTests },
  { label: 'V65 P5 — Zappa per-section golden (seed 84003)', run: runZappaPerSectionTests },
  { label: 'Follow-up 4 — Mingus overlay + activeMotifIds + shout export', run: runFollowup4MingusSchneiderThreadgillSmokeTests },
  { label: 'Follow-up 5 — shout-chorus in-place brass merge', run: runFollowup5ShoutBrassInPlaceSmokeTests },
  { label: 'Output validation — MIDI + MusicXML structural', run: runOutputValidationSmokeTests },
];

function toRows(results: { name: string; ok: boolean }[] | { ok: boolean; name: string }[]): Row[] {
  return results.map((r) => ({ name: r.name, ok: r.ok }));
}

function main(): void {
  const smokeTier = resolveSmokeTier();
  const suitesToRun =
    smokeTier === 'fast'
      ? smokeSuites.filter((s) => !SMOKE_FAST_EXCLUDE.includes(s.label))
      : smokeSuites;

  console.log(`[smoke] Composer OS v2 — tier=${smokeTier}\n`);

  let passed = 0;
  let failed = 0;

  for (const suite of suitesToRun) {
    const t0 = Date.now();
    const rows = toRows(suite.run());
    console.log(`=== ${suite.label} (${Date.now() - t0}ms) ===`);
    for (const r of rows) {
      if (r.ok) {
        console.log(`  PASS: ${r.name}`);
        passed++;
      } else {
        console.log(`  FAIL: ${r.name}`);
        failed++;
      }
    }
  }

  console.log('\n=== Smoke summary ===');
  console.log(`Passed: ${passed} rows (${suitesToRun.length} suites)`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
  console.log('\nCOMPOSER OS V2 SMOKE: PASS');
}

main();
