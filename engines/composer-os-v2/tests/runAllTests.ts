/**
 * Composer OS V2 — unified custom test harness (`npm test` / `npm run test:full`).
 *
 * **Modes**
 * - `smoke`: **not** this file — use `npm run test:smoke` → `tests/runSmokeTests.ts` (small fixed allowlist).
 * - `full` (default): every suite below. Expect **known debt** (exit 1) until tests are fixed — see
 *   `docs/TEST_DEBT_COMPOSER_OS_V2.md` and `docs/TEST_HARNESS_PLAN.md`.
 * - `fast`: skips suites in `tests/harness/fastExcludeSuites.ts` (heavy golden-path / export / retro debt).
 *   Pass `fast` as the **last argv token** (`npm run test:fast`) or set `COMPOSER_OS_TEST_MODE=fast`.
 *
 * **Optional env**
 * - `COMPOSER_OS_SKIP_STAGE_EXIT_GATES=1` — skip **Stage Exit Gates** (retro aggregate; quarantine).
 * - `COMPOSER_OS_TEST_EXCLUDE_SUBSTR=a,b` — skip suites whose **name contains** any substring.
 *
 * **Timings:** slowest suites printed at end for triage.
 */

import { runConductorTests } from './conductor.test';
import { runRhythmEngineTests } from './rhythmEngine.test';
import { runInstrumentProfileTests } from './instrumentProfiles.test';
import { runScoreIntegrityTests } from './scoreIntegrity.test';
import { runReadinessTests } from './readiness.test';
import { runExportTests } from './export.test';
import { runKeyInferenceTests } from './keyInference.test';
import { runScoreModelTests } from './scoreModel.test';
import { runGoldenPathTests } from './goldenPath.test';
import { runDuoPitchVariationTests } from './duoPitchVariation.test';
import { runGuitarBassDuoSingleLineTests } from './guitarBassDuoSingleLine.test';
import { runGuitarBassDuoWybleVoice2Tests } from './guitarBassDuoWybleVoice2.test';
import { runStage2MusicalCoreTests } from './stage2MusicalCore.test';
import { runMotifTests } from './motif.test';
import { runStyleModuleTests } from './styleModule.test';
import { runInteractionTests } from './interaction.test';
import { runControlTests } from './control.test';
import { runPerformanceTests } from './performance.test';
import { runExportHardeningTests } from './exportHardening.test';
import { runAppApiTests } from './appApi.test';
import { runComposerOsOutputPathsTests } from './composerOsOutputPaths.test';
import { runMapStyleStackTests } from './mapStyleStack.test';
import { runOpenOutputFolderGateTests } from './openOutputFolderGate.test';
import { runCorrectnessGatesTests } from './correctnessGates.test';
import { runGceEvaluationTests } from './gceEvaluation.test';
import { runBassIdentityTests } from './bassIdentity.test';
import { runPhraseAuthorityTests } from './phraseAuthority.test';
import { runJazzDuoBehaviourTests } from './jazzDuoBehaviour.test';
import { runDuoLockQualityTests } from './duoLockQuality.test';
import { runDuoInteractionV31Tests } from './duoInteractionV31.test';
import { runDuoIdentityV32Tests } from './duoIdentityV32.test';
import { runDuoPolishV33Tests } from './duoPolishV33.test';
import { runLongFormDuoTests } from './longFormDuo.test';
import { runChordProgressionTests } from './chordProgression.test';
import { runChordSymbolMusicXmlHarmonyTests } from './chordSymbolMusicXmlHarmony.test';
import { runChordSemanticsTests } from './chordSemantics.test';
import { runWybleEtudePitchOffsetTests } from './wybleEtudePitchOffset.test';
import { runGuitarBassDuoFamilyParityTests } from './guitarBassDuoFamilyParity.test';
import { runEvalDiagnosticsHarnessTests } from './evalDiagnosticsHarness.test';
import { runEvalDiagnosticsRankingTests } from './evalDiagnosticsRanking.test';
import { runWybleInnerLineDepthTests } from './wybleInnerLineDepth.test';
import { runChordExportDiagnosticsTests } from './chordExportDiagnostics.test';
import { runDuoV36bTests } from './duoV36b.test';
import { runPipelineTruthTests } from './pipelineTruth.test';
import { runNotationSafeRhythmTests } from './notationSafeRhythm.test';
import { runMusicXmlWrittenBarRegressionTests } from './musicXmlWrittenBarRegression.test';
import { runEcmIdentityTests } from './ecmIdentity.test';
import { runEcmShapingPassTests } from './ecmShapingPass.test';
import { runEcmArrangementPolicyTests } from './ecmArrangementPolicy.test';
import { runDuoOrchestrationPassTests } from './duoOrchestrationPass.test';
import { runIdentityCellTests } from './identityCell.test';
import { runConductorAlignmentTests } from './conductorAlignment.test';
import { runHandoffMapTests } from './handoffMap.test';
import { runModuleInvocationTests } from './moduleInvocation.test';
import { runSongModeFoundationTests } from './songModeFoundation.test';
import { runSongModeIntegrationTests } from './songModeIntegration.test';
import { runSongModeMusicXmlTests } from './songModeMusicXml.test';
import { runSongModeHookIdentityTests } from './songModeHookIdentity.test';
import { runSongModeLeadSheetInputTests } from './songModeLeadSheetInput.test';
import { runSongwritingResearchParsingTests } from './songwritingResearchParsing.test';
import { runSongwriterRuleRegistryTests } from './songwriterRuleRegistry.test';
import { runSongwriterStyleResolverTests } from './songwriterStyleResolver.test';
import { runAuthorOverlayResolverTests } from './authorOverlayResolver.test';
import { runHookPlannerTests } from './hookPlanner.test';
import { runSongModeBehaviourEncodingTests } from './songModeBehaviourEncoding.test';
import { runNamedPresetLibraryTests } from './namedPresetLibrary.test';
import { runSessionStoreTests } from './sessionStore.test';
import { runCandidateRankerTests } from './candidateRanker.test';
import { runDiagnosticsBuilderTests } from './diagnosticsBuilder.test';
import { runUniversalLeadSheetBuilderTests } from './universalLeadSheetBuilder.test';
import { runChordInputParserTests } from './chordInputParser.test';
import { runMotifExtractorPlusTests } from './motifExtractorPlus.test';
import { runMotifReusePlannerTests } from './motifReusePlanner.test';
import { runContinuationPlannerTests } from './continuationPlanner.test';
import { runSectionRegeneratorTests } from './sectionRegenerator.test';
import { runStyleStackPresetLibraryTests } from './styleStackPresetLibrary.test';
import { runHumanisationToggleTests } from './humanisationToggle.test';
import { runReferenceImportTypesTests } from './referenceImportTypes.test';
import { runMusicXmlReferenceParserTests } from './musicXmlReferenceParser.test';
import { runLeadSheetReferenceParserTests } from './leadSheetReferenceParser.test';
import { runImportedHarmonyTimelineTests } from './importedHarmonyTimeline.test';
import { runLeadSheetMusicXmlImportTests } from './leadSheetMusicXmlImport.test';
import { runMusicXmlMxlSampleFolderTests } from './musicXmlMxlSampleFolder.test';
import { runLeadSheetPerformanceRenderingTests } from './leadSheetPerformanceRendering.test';
import { runReferenceBehaviourExtractionTests } from './referenceBehaviourExtraction.test';
import { runReferenceReuseAdapterTests } from './referenceReuseAdapter.test';
import { runLeadSheetContractTests } from './leadSheetContract.test';
import { runLeadMelodyPlannerTests } from './leadMelodyPlanner.test';
import { runSingerRangeValidationTests } from './singerRangeValidation.test';
import { runProsodyPlannerTests } from './prosodyPlanner.test';
import { runSongModeCompletionTests } from './songModeCompletion.test';
import { runOrchestrationCoreTests } from './orchestrationCore.test';
import { runOrchestrationPlannerTests } from './orchestrationPlanner.test';
import { runEnsembleFamilyProfilesTests } from './ensembleFamilyProfiles.test';
import { runOrchestrationCompatibilityTests } from './orchestrationCompatibility.test';
import { runBigBandTypesTests } from './bigBandTypes.test';
import { runBigBandPlanningTests } from './bigBandPlanning.test';
import { runBigBandValidationTests } from './bigBandValidation.test';
import { runBigBandModeTests } from './bigBandMode.test';
import { runBigBandResearchParsingTests } from './bigBandResearchParsing.test';
import { runBigBandEraSystemTests } from './bigBandEraSystem.test';
import { runBebopLinePlannerTests } from './bebopLinePlanner.test';
import { runBigBandRuleApplicationTests } from './bigBandRuleApplication.test';
import { runVariationAdapterTests } from './variationAdapter.test';
import { runCreativeControlResolverTests } from './creativeControlResolver.test';
import { runMutationEngineTests } from './mutationEngine.test';
import { runExperimentalEvaluatorTests } from './experimentalEvaluator.test';
import { runBigBandEnsembleConfigTests } from './bigBandEnsembleConfig.test';
import { runStylePairingResolverTests } from './stylePairingResolver.test';
import { runSongwriterResearchParsingTests } from './songwriterResearchParsing.test';
import { runVoicingPlannerTests } from './voicingPlanner.test';
import { runBigBandRealisationTests } from './bigBandRealisation.test';
import { runBigBandEraChordPoolsScoreTests } from './bigBandEraChordPoolsScore.test';
import { runQuartetEraChordPoolsScoreTests } from './quartetEraChordPoolsScore.test';
import { runStringQuartetEraAppPassthroughTests } from './stringQuartetEraAppPassthrough.test';
import { runQuartetRealisationTests } from './quartetRealisation.test';
import { runEnsembleExportTests } from './ensembleExport.test';
import { runStringQuartetTypesTests } from './stringQuartetTypes.test';
import { runStringQuartetPlanningTests } from './stringQuartetPlanning.test';
import { runStringQuartetValidationTests } from './stringQuartetValidation.test';
import { runStringQuartetModeTests } from './stringQuartetMode.test';
import { runAppApiBoundaryTests } from './appApiBoundary.test';
import { runModeExposureTests } from './modeExposure.test';
import { runWindowsPackagingPrepTests } from './windowsPackagingPrep.test';
import { runOutputUxTests } from './outputUx.test';
import { runAppShellTests } from './appShell.test';
import { runSystemCheckTests } from './systemCheck.test';
import { runRiffGeneratorTests } from './riffGenerator.test';
import { runSongwritingEngineTests } from './songwritingEngine.test';
import { retroSuites } from './retro/index';
import { runBacharachWorkflowDeveloperTests } from './bacharachWorkflow.test';
import { runEvalReadableSummaryTests } from './evalReadableSummary.test';
import { runSongModeAbInspectHarnessTests } from './songModeAbInspectHarness.test';
import { runMotifAuthorityPilotSliceTests } from './motifAuthorityPilotSlice.test';
import { isFastExcludedSuiteName } from './harness/fastExcludeSuites';

const suites = [
  { name: 'Conductor', run: runConductorTests },
  { name: 'Rhythm Engine', run: runRhythmEngineTests },
  { name: 'Instrument Profiles', run: runInstrumentProfileTests },
  { name: 'Score Integrity', run: runScoreIntegrityTests },
  { name: 'Readiness', run: runReadinessTests },
  { name: 'Export', run: runExportTests },
  { name: 'Key inference (V3.4)', run: runKeyInferenceTests },
  { name: 'Score Model', run: runScoreModelTests },
  { name: 'Golden Path', run: runGoldenPathTests },
  { name: 'Duo pitch variation (variationEnabled)', run: runDuoPitchVariationTests },
  { name: 'Guitar–Bass Duo (Single-Line)', run: runGuitarBassDuoSingleLineTests },
  { name: 'Guitar–Bass Duo Wyble voice 2 (polyphony)', run: runGuitarBassDuoWybleVoice2Tests },
  { name: 'Stage 2 Musical Core', run: runStage2MusicalCoreTests },
  { name: 'Motif', run: runMotifTests },
  { name: 'Style Module', run: runStyleModuleTests },
  { name: 'Interaction', run: runInteractionTests },
  { name: 'Control', run: runControlTests },
  { name: 'Performance', run: runPerformanceTests },
  { name: 'Export Hardening', run: runExportHardeningTests },
  { name: 'App API', run: runAppApiTests },
  { name: 'Composer output paths', run: runComposerOsOutputPathsTests },
  { name: 'Style Blend mapping', run: runMapStyleStackTests },
  { name: 'Open output folder gate', run: runOpenOutputFolderGateTests },
  { name: 'Correctness gates', run: runCorrectnessGatesTests },
  { name: 'GCE evaluation', run: runGceEvaluationTests },
  { name: 'Bass identity', run: runBassIdentityTests },
  { name: 'Phrase authority', run: runPhraseAuthorityTests },
  { name: 'Jazz duo behaviour', run: runJazzDuoBehaviourTests },
  { name: 'Duo LOCK quality', run: runDuoLockQualityTests },
  { name: 'Duo interaction V3.1', run: runDuoInteractionV31Tests },
  { name: 'Duo identity V3.2', run: runDuoIdentityV32Tests },
  { name: 'Duo polish V3.3', run: runDuoPolishV33Tests },
  { name: 'Long-form Duo (32)', run: runLongFormDuoTests },
  { name: 'Chord progression', run: runChordProgressionTests },
  { name: 'MusicXML harmony (kind/@text + degrees)', run: runChordSymbolMusicXmlHarmonyTests },
  { name: 'Chord semantics (unified)', run: runChordSemanticsTests },
  { name: 'Wyble Etude guitar pitch offset', run: runWybleEtudePitchOffsetTests },
  { name: 'Guitar–Bass Duo family parity (T2.1)', run: runGuitarBassDuoFamilyParityTests },
  { name: 'Eval diagnostics harness (T2.2)', run: runEvalDiagnosticsHarnessTests },
  { name: 'Eval diagnostics ranking (advisory)', run: runEvalDiagnosticsRankingTests },
  { name: 'Wyble inner-line depth (BB/SQ)', run: runWybleInnerLineDepthTests },
  { name: 'Chord export diagnostics (#17)', run: runChordExportDiagnosticsTests },
  { name: 'Duo V3.6b labeling + bar math', run: runDuoV36bTests },
  { name: 'Pipeline truth (input/score/XML)', run: runPipelineTruthTests },
  { name: 'Notation-safe rhythm atoms', run: runNotationSafeRhythmTests },
  { name: 'MusicXML written bar regression', run: runMusicXmlWrittenBarRegressionTests },
  { name: 'ECM identity', run: runEcmIdentityTests },
  { name: 'ECM shaping pass', run: runEcmShapingPassTests },
  { name: 'ECM arrangement policy', run: runEcmArrangementPolicyTests },
  { name: 'Duo orchestration pass', run: runDuoOrchestrationPassTests },
  { name: 'ECM identity cell', run: runIdentityCellTests },
  { name: 'Conductor alignment', run: runConductorAlignmentTests },
  { name: 'Handoff map', run: runHandoffMapTests },
  { name: 'Module invocation', run: runModuleInvocationTests },
  { name: 'Song Mode foundation', run: runSongModeFoundationTests },
  { name: 'Song Mode integration', run: runSongModeIntegrationTests },
  { name: 'Song Mode MusicXML app', run: runSongModeMusicXmlTests },
  { name: 'Song Mode regression baseline (50021)', run: runSongModeHookIdentityTests },
  { name: 'Song Mode LeadSheet input (Donald Fagen Phase 1)', run: runSongModeLeadSheetInputTests },
  { name: 'Songwriting research parsing', run: runSongwritingResearchParsingTests },
  { name: 'Songwriter rule registry', run: runSongwriterRuleRegistryTests },
  { name: 'Songwriter style resolver', run: runSongwriterStyleResolverTests },
  { name: 'Author overlay resolver', run: runAuthorOverlayResolverTests },
  { name: 'Hook planner', run: runHookPlannerTests },
  { name: 'Lead melody planner', run: runLeadMelodyPlannerTests },
  { name: 'Singer range validation', run: runSingerRangeValidationTests },
  { name: 'Prosody planner', run: runProsodyPlannerTests },
  { name: 'Song Mode completion', run: runSongModeCompletionTests },
  { name: 'Song Mode behaviour encoding', run: runSongModeBehaviourEncodingTests },
  { name: 'Named preset library', run: runNamedPresetLibraryTests },
  { name: 'Session store', run: runSessionStoreTests },
  { name: 'Candidate ranker', run: runCandidateRankerTests },
  { name: 'Diagnostics builder', run: runDiagnosticsBuilderTests },
  { name: 'Universal lead sheet builder', run: runUniversalLeadSheetBuilderTests },
  { name: 'Chord input parser', run: runChordInputParserTests },
  { name: 'Motif extractor plus', run: runMotifExtractorPlusTests },
  { name: 'Motif reuse planner', run: runMotifReusePlannerTests },
  { name: 'Continuation planner', run: runContinuationPlannerTests },
  { name: 'Section regenerator', run: runSectionRegeneratorTests },
  { name: 'Style stack preset library', run: runStyleStackPresetLibraryTests },
  { name: 'Humanisation toggle', run: runHumanisationToggleTests },
  { name: 'Reference import types', run: runReferenceImportTypesTests },
  { name: 'MusicXML reference parser', run: runMusicXmlReferenceParserTests },
  { name: 'Lead sheet reference parser', run: runLeadSheetReferenceParserTests },
  { name: 'Imported harmony timeline (Stage 1 storage)', run: runImportedHarmonyTimelineTests },
  { name: 'Lead sheet MusicXML import (Phase 1)', run: runLeadSheetMusicXmlImportTests },
  { name: 'MusicXML .mxl sample folder (MuseScore)', run: runMusicXmlMxlSampleFolderTests },
  { name: 'Lead sheet performance shaping (import → expression)', run: runLeadSheetPerformanceRenderingTests },
  { name: 'Reference behaviour extraction', run: runReferenceBehaviourExtractionTests },
  { name: 'Reference reuse adapter', run: runReferenceReuseAdapterTests },
  { name: 'Lead sheet contract', run: runLeadSheetContractTests },
  { name: 'Orchestration core', run: runOrchestrationCoreTests },
  { name: 'Orchestration planner', run: runOrchestrationPlannerTests },
  { name: 'Ensemble family profiles', run: runEnsembleFamilyProfilesTests },
  { name: 'Orchestration compatibility', run: runOrchestrationCompatibilityTests },
  { name: 'Big Band types', run: runBigBandTypesTests },
  { name: 'Big Band planning', run: runBigBandPlanningTests },
  { name: 'Big Band validation', run: runBigBandValidationTests },
  { name: 'Big Band mode', run: runBigBandModeTests },
  { name: 'Big Band research parsing', run: runBigBandResearchParsingTests },
  { name: 'Big Band era system', run: runBigBandEraSystemTests },
  { name: 'Bebop line planner', run: runBebopLinePlannerTests },
  { name: 'Big Band rule application', run: runBigBandRuleApplicationTests },
  { name: 'Variation adapter', run: runVariationAdapterTests },
  { name: 'Creative control resolver', run: runCreativeControlResolverTests },
  { name: 'Mutation engine', run: runMutationEngineTests },
  { name: 'Experimental evaluator', run: runExperimentalEvaluatorTests },
  { name: 'Big Band ensemble config', run: runBigBandEnsembleConfigTests },
  { name: 'Style pairing resolver', run: runStylePairingResolverTests },
  { name: 'Songwriter research parsing (alias)', run: runSongwriterResearchParsingTests },
  { name: 'Voicing planner', run: runVoicingPlannerTests },
  { name: 'Big Band realisation', run: runBigBandRealisationTests },
  { name: 'Big Band era chord pools (score)', run: runBigBandEraChordPoolsScoreTests },
  { name: 'String Quartet era chord pools (score)', run: runQuartetEraChordPoolsScoreTests },
  { name: 'String Quartet era app passthrough (MusicXML)', run: runStringQuartetEraAppPassthroughTests },
  { name: 'String Quartet realisation', run: runQuartetRealisationTests },
  { name: 'Ensemble export', run: runEnsembleExportTests },
  { name: 'String Quartet types', run: runStringQuartetTypesTests },
  { name: 'String Quartet planning', run: runStringQuartetPlanningTests },
  { name: 'String Quartet validation', run: runStringQuartetValidationTests },
  { name: 'String Quartet mode', run: runStringQuartetModeTests },
  { name: 'App API boundary', run: runAppApiBoundaryTests },
  { name: 'Mode exposure (V1)', run: runModeExposureTests },
  { name: 'Windows packaging prep', run: runWindowsPackagingPrepTests },
  { name: 'Output UX', run: runOutputUxTests },
  { name: 'App shell (product)', run: runAppShellTests },
  { name: 'System check (repo root)', run: runSystemCheckTests },
  { name: 'Riff Generator', run: runRiffGeneratorTests },
  { name: 'Songwriting Engine (Phase 1)', run: runSongwritingEngineTests },
  { name: 'Bacharach developer workflow', run: runBacharachWorkflowDeveloperTests },
  { name: 'Eval readable summary', run: runEvalReadableSummaryTests },
  { name: 'Song Mode A/B inspect harness', run: runSongModeAbInspectHarnessTests },
  { name: 'Motif Authority pilot slice', run: runMotifAuthorityPilotSliceTests },
  ...retroSuites,
];

type SuiteEntry = (typeof suites)[number];

function resolveTestMode(): 'fast' | 'full' {
  const last = process.argv[process.argv.length - 1];
  if (last === 'fast' || last === 'full') return last;
  const env = process.env.COMPOSER_OS_TEST_MODE;
  if (env === 'fast' || env === 'full') return env;
  return 'full';
}

function filterSuitesForRun(all: SuiteEntry[], mode: 'fast' | 'full'): SuiteEntry[] {
  let out = all;
  if (process.env.COMPOSER_OS_SKIP_STAGE_EXIT_GATES === '1') {
    out = out.filter((s) => s.name !== 'Stage Exit Gates');
    console.log('[harness] COMPOSER_OS_SKIP_STAGE_EXIT_GATES=1 — skipping Stage Exit Gates');
  }
  const sub = process.env.COMPOSER_OS_TEST_EXCLUDE_SUBSTR?.trim();
  if (sub) {
    const parts = sub.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length) {
      out = out.filter((s) => !parts.some((p) => s.name.includes(p)));
      console.log(`[harness] COMPOSER_OS_TEST_EXCLUDE_SUBSTR active: ${parts.join(' | ')}`);
    }
  }
  if (mode === 'fast') {
    const skipped = all.filter((s) => isFastExcludedSuiteName(s.name)).map((s) => s.name);
    out = out.filter((s) => !isFastExcludedSuiteName(s.name));
    const total = all.length;
    console.log(`[harness] mode=fast — running ${out.length}/${total} suites (${skipped.length} excluded).`);
  } else {
    console.log(`[harness] mode=full — running ${out.length} suites.`);
  }
  return out;
}

function main(): void {
  const mode = resolveTestMode();
  const toRun = filterSuitesForRun(suites, mode);
  let totalPassed = 0;
  let totalFailed = 0;
  const timings: { name: string; ms: number; passed: number; failed: number }[] = [];

  for (const suite of toRun) {
    const t0 = Date.now();
    const results = suite.run();
    const dt = Date.now() - t0;
    console.log(`\n=== ${suite.name} ===`);
    const rows = Array.isArray(results)
      ? results
      : [{ name: suite.name, ok: (results as { success: boolean }).success }];
    let p = 0;
    let f = 0;
    for (const r of rows) {
      if (r.ok) {
        console.log(`  PASS: ${r.name}`);
        totalPassed++;
        p++;
      } else {
        console.log(`  FAIL: ${r.name}`);
        totalFailed++;
        f++;
      }
    }
    timings.push({ name: suite.name, ms: dt, passed: p, failed: f });
  }

  console.log(`\n=== Summary ===`);
  console.log(`Mode: ${mode}`);
  console.log(`Passed: ${totalPassed}`);
  console.log(`Failed: ${totalFailed}`);

  if (totalFailed > 0) {
    const debt = timings
      .filter((t) => t.failed > 0)
      .sort((a, b) => b.failed - a.failed || b.ms - a.ms);
    console.log(`\n=== Failures by suite (${debt.length} suites, most failures first) ===`);
    for (const row of debt) {
      console.log(`  ${row.failed}\t${row.name}`);
    }
    if (mode === 'full') {
      console.log(
        `\n[harness] Exit code 1: full mode includes known debt (see docs/TEST_DEBT_COMPOSER_OS_V2.md). Fast mode remains the regression gate.`
      );
    }
  }

  const slow = [...timings].sort((a, b) => b.ms - a.ms).slice(0, 20);
  console.log(`\n=== Slowest suites (top ${slow.length}, ms) ===`);
  for (const row of slow) {
    console.log(`  ${row.ms}ms  ${row.name}  (+${row.passed} / -${row.failed})`);
  }

  if (totalFailed > 0) {
    process.exit(1);
  }
  console.log('\nCOMPOSER OS V2 TESTS: PASS');
}

main();
