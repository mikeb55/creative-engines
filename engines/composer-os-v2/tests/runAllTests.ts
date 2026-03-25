/**
 * Composer OS V2 — Run all tests
 */

import { runConductorTests } from './conductor.test';
import { runRhythmEngineTests } from './rhythmEngine.test';
import { runInstrumentProfileTests } from './instrumentProfiles.test';
import { runScoreIntegrityTests } from './scoreIntegrity.test';
import { runReadinessTests } from './readiness.test';
import { runExportTests } from './export.test';
import { runScoreModelTests } from './scoreModel.test';
import { runGoldenPathTests } from './goldenPath.test';
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
import { runChordProgressionTests } from './chordProgression.test';
import { runEcmIdentityTests } from './ecmIdentity.test';
import { runConductorAlignmentTests } from './conductorAlignment.test';
import { runHandoffMapTests } from './handoffMap.test';
import { runModuleInvocationTests } from './moduleInvocation.test';
import { runSongModeFoundationTests } from './songModeFoundation.test';
import { runSongModeIntegrationTests } from './songModeIntegration.test';
import { runLeadSheetContractTests } from './leadSheetContract.test';
import { runOrchestrationCoreTests } from './orchestrationCore.test';
import { runOrchestrationPlannerTests } from './orchestrationPlanner.test';
import { runEnsembleFamilyProfilesTests } from './ensembleFamilyProfiles.test';
import { runOrchestrationCompatibilityTests } from './orchestrationCompatibility.test';
import { runBigBandTypesTests } from './bigBandTypes.test';
import { runBigBandPlanningTests } from './bigBandPlanning.test';
import { runBigBandValidationTests } from './bigBandValidation.test';
import { runBigBandModeTests } from './bigBandMode.test';
import { runStringQuartetTypesTests } from './stringQuartetTypes.test';
import { runStringQuartetPlanningTests } from './stringQuartetPlanning.test';
import { runStringQuartetValidationTests } from './stringQuartetValidation.test';
import { runStringQuartetModeTests } from './stringQuartetMode.test';
import { runAppApiBoundaryTests } from './appApiBoundary.test';
import { runModeExposureTests } from './modeExposure.test';
import { runWindowsPackagingPrepTests } from './windowsPackagingPrep.test';
import { runOutputUxTests } from './outputUx.test';
import { runAppShellTests } from './appShell.test';
import { retroSuites } from './retro/index';

const suites = [
  { name: 'Conductor', run: runConductorTests },
  { name: 'Rhythm Engine', run: runRhythmEngineTests },
  { name: 'Instrument Profiles', run: runInstrumentProfileTests },
  { name: 'Score Integrity', run: runScoreIntegrityTests },
  { name: 'Readiness', run: runReadinessTests },
  { name: 'Export', run: runExportTests },
  { name: 'Score Model', run: runScoreModelTests },
  { name: 'Golden Path', run: runGoldenPathTests },
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
  { name: 'Chord progression', run: runChordProgressionTests },
  { name: 'ECM identity', run: runEcmIdentityTests },
  { name: 'Conductor alignment', run: runConductorAlignmentTests },
  { name: 'Handoff map', run: runHandoffMapTests },
  { name: 'Module invocation', run: runModuleInvocationTests },
  { name: 'Song Mode foundation', run: runSongModeFoundationTests },
  { name: 'Song Mode integration', run: runSongModeIntegrationTests },
  { name: 'Lead sheet contract', run: runLeadSheetContractTests },
  { name: 'Orchestration core', run: runOrchestrationCoreTests },
  { name: 'Orchestration planner', run: runOrchestrationPlannerTests },
  { name: 'Ensemble family profiles', run: runEnsembleFamilyProfilesTests },
  { name: 'Orchestration compatibility', run: runOrchestrationCompatibilityTests },
  { name: 'Big Band types', run: runBigBandTypesTests },
  { name: 'Big Band planning', run: runBigBandPlanningTests },
  { name: 'Big Band validation', run: runBigBandValidationTests },
  { name: 'Big Band mode', run: runBigBandModeTests },
  { name: 'String Quartet types', run: runStringQuartetTypesTests },
  { name: 'String Quartet planning', run: runStringQuartetPlanningTests },
  { name: 'String Quartet validation', run: runStringQuartetValidationTests },
  { name: 'String Quartet mode', run: runStringQuartetModeTests },
  { name: 'App API boundary', run: runAppApiBoundaryTests },
  { name: 'Mode exposure (V1)', run: runModeExposureTests },
  { name: 'Windows packaging prep', run: runWindowsPackagingPrepTests },
  { name: 'Output UX', run: runOutputUxTests },
  { name: 'App shell (product)', run: runAppShellTests },
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
