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
