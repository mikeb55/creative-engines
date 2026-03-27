/**
 * Composer OS V2 — Run all tests
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
import { runDuoV36bTests } from './duoV36b.test';
import { runPipelineTruthTests } from './pipelineTruth.test';
import { runNotationSafeRhythmTests } from './notationSafeRhythm.test';
import { runMusicXmlWrittenBarRegressionTests } from './musicXmlWrittenBarRegression.test';
import { runEcmIdentityTests } from './ecmIdentity.test';
import { runConductorAlignmentTests } from './conductorAlignment.test';
import { runHandoffMapTests } from './handoffMap.test';
import { runModuleInvocationTests } from './moduleInvocation.test';
import { runSongModeFoundationTests } from './songModeFoundation.test';
import { runSongModeIntegrationTests } from './songModeIntegration.test';
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
  { name: 'Duo V3.6b labeling + bar math', run: runDuoV36bTests },
  { name: 'Pipeline truth (input/score/XML)', run: runPipelineTruthTests },
  { name: 'Notation-safe rhythm atoms', run: runNotationSafeRhythmTests },
  { name: 'MusicXML written bar regression', run: runMusicXmlWrittenBarRegressionTests },
  { name: 'ECM identity', run: runEcmIdentityTests },
  { name: 'Conductor alignment', run: runConductorAlignmentTests },
  { name: 'Handoff map', run: runHandoffMapTests },
  { name: 'Module invocation', run: runModuleInvocationTests },
  { name: 'Song Mode foundation', run: runSongModeFoundationTests },
  { name: 'Song Mode integration', run: runSongModeIntegrationTests },
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
  ...retroSuites,
];

function main(): void {
  let totalPassed = 0;
  let totalFailed = 0;

  for (const suite of suites) {
    const results = suite.run();
    console.log(`\n=== ${suite.name} ===`);
    for (const r of results) {
      if (r.ok) {
        console.log(`  PASS: ${r.name}`);
        totalPassed++;
      } else {
        console.log(`  FAIL: ${r.name}`);
        totalFailed++;
      }
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Passed: ${totalPassed}`);
  console.log(`Failed: ${totalFailed}`);

  if (totalFailed > 0) {
    process.exit(1);
  }
  console.log('\nCOMPOSER OS V2 TESTS: PASS');
}

main();
