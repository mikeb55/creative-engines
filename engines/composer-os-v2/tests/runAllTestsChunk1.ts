/**
 * Full harness chunk 1/4 — core / duo / ECM intro (isolated process for heap stability).
 */

import { runConductorTests } from './conductor.test';
import { runRhythmEngineTests } from './rhythmEngine.test';
import { runAfrobeatRhythmEngineTests } from './afrobeatRhythmEngine.test';
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
import { runMotifAuthorityLayerTests } from './motifAuthorityLayer.test';
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
import { runSlonimskyEngineTests } from './slonimskyEngine.test';
import { runAlternateGuitarTuningVoicingMapsTests } from './alternateGuitarTuningVoicingMaps.test';
import { runJazzDuoBehaviourTests } from './jazzDuoBehaviour.test';
import { runDuoLockQualityTests } from './duoLockQuality.test';
import { runDuoInteractionV31Tests } from './duoInteractionV31.test';
import { runDuoIdentityV32Tests } from './duoIdentityV32.test';
import { runDuoPolishV33Tests } from './duoPolishV33.test';
import { runLongFormDuoTests } from './longFormDuo.test';
import { runChordProgressionTests } from './chordProgression.test';
import { runVoiceLeadingSolverPhase3bTests } from './voiceLeadingSolverPhase3b.test';
import { runRhythmFormTensionPhase45Tests } from './rhythmFormTensionPhase45.test';
import { runPhase67EnsembleGuitarEtudeTests } from './phase67EnsembleGuitarEtude.test';
import { runHarnessMain, type SuiteEntry } from './harness/runHarnessMain';

const suites: SuiteEntry[] = [
  { name: 'Conductor', run: runConductorTests },
  { name: 'Rhythm Engine', run: runRhythmEngineTests },
  { name: 'Afrobeat rhythm engine (Tony Allen grids)', run: runAfrobeatRhythmEngineTests },
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
  { name: 'Motif Authority Layer', run: runMotifAuthorityLayerTests },
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
  { name: 'Slonimsky pattern engine (V1)', run: runSlonimskyEngineTests },
  { name: 'Alternate tuning voicing maps (pilot registry)', run: runAlternateGuitarTuningVoicingMapsTests },
  { name: 'Jazz duo behaviour', run: runJazzDuoBehaviourTests },
  { name: 'Duo LOCK quality', run: runDuoLockQualityTests },
  { name: 'Duo interaction V3.1', run: runDuoInteractionV31Tests },
  { name: 'Duo identity V3.2', run: runDuoIdentityV32Tests },
  { name: 'Duo polish V3.3', run: runDuoPolishV33Tests },
  { name: 'Long-form Duo (32)', run: runLongFormDuoTests },
  { name: 'Chord progression', run: runChordProgressionTests },
  { name: 'Voice-leading solver + HarmonicScene (Phase 3b)', run: runVoiceLeadingSolverPhase3bTests },
  { name: 'RhythmDNA + form + tension (Phase 4+5)', run: runRhythmFormTensionPhase45Tests },
  { name: 'Phase 6+7 — ensemble / guitar / étude helpers', run: runPhase67EnsembleGuitarEtudeTests },
];

runHarnessMain(suites, '[harness] chunk 1/4 — duo core + gates');
