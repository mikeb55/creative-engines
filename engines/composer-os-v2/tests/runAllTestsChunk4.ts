/**
 * Full harness chunk 4/4 — ensembles, app shell, riff, retro suites (isolated process).
 */

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
import { runBacharachWorkflowDeveloperTests } from './bacharachWorkflow.test';
import { runEvalReadableSummaryTests } from './evalReadableSummary.test';
import { runSongModeAbInspectHarnessTests } from './songModeAbInspectHarness.test';
import { runMotifAuthorityPilotSliceTests } from './motifAuthorityPilotSlice.test';
import { runGreekRhythmMusicXmlExporterTests } from './greekRhythmMusicXmlExporter.test';
import { runRhythmBlendV43Tests } from './rhythmBlendV43.test';
import { runHarmonySpineTests } from './harmonySpine.test';
import { runMusicXmlImportTests } from './musicXmlImport.test';
import { runVoiceRuleBundleHarnessAdditiveTests } from './voiceRuleBundleHarnessAdditive.test';
import { runLigetiVrbTests } from '../core/counterpoint/vrbProfiles/ligetiVrb.test';
import { runSatieVrbTests } from '../core/counterpoint/vrbProfiles/satieVrb.test';
import { runColePorterVrbTests } from '../core/counterpoint/vrbProfiles/colePorterVrb.test';
import { runGershwinVrbTests } from '../core/counterpoint/vrbProfiles/gershwinVrb.test';
import { runArvoPartVrbTests } from '../core/counterpoint/vrbProfiles/arvoPartVrb.test';
import { runDebussyBartokVrbTests } from './debussyBartokVrb.test';
import { runBlendedVrbTests } from './blendedVrb.test';
import { runBoundarySwingRampTests } from './boundarySwingRamp.test';
import { runTempoAdaptiveSwingTests } from './tempoAdaptiveSwing.test';
import { runVrbTooltipsTests } from './vrbTooltips.test';
import { runDuoIntentTests } from './duoIntent.test';
import { runMacroFormPlannerTests } from './macroFormPlanner.test';
import { runOrnettePitchFieldTests } from './ornettePitchField.test';
import { retroSuites } from './retro/index';
import { runHarnessMain, type SuiteEntry } from './harness/runHarnessMain';

const suites: SuiteEntry[] = [
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
  { name: 'Greek rhythm MusicXML exporter (drum kit)', run: runGreekRhythmMusicXmlExporterTests },
  { name: 'Rhythm blend V43 (catalog + merge)', run: runRhythmBlendV43Tests },
  { name: 'Harmony spine harness (stub)', run: runHarmonySpineTests },
  { name: 'MusicXML import (ParsedChart)', run: runMusicXmlImportTests },
  { name: 'VoiceRuleBundle Phase 2+3a harness (additive)', run: runVoiceRuleBundleHarnessAdditiveTests },
  { name: 'Ligeti SQ VRB profile (σ=32)', run: runLigetiVrbTests },
  { name: 'Satie SQ VRB profile (σ=19)', run: runSatieVrbTests },
  { name: 'Cole Porter SQ VRB profile (σ=25)', run: runColePorterVrbTests },
  { name: 'Gershwin SQ VRB profile (σ=27)', run: runGershwinVrbTests },
  { name: 'Arvo Pärt SQ VRB profile (σ=16)', run: runArvoPartVrbTests },
  { name: 'Debussy + Bartók SQ VRB stubs (σ=21/29)', run: runDebussyBartokVrbTests },
  { name: '3-way VRB blend (blendedVrb)', run: runBlendedVrbTests },
  { name: 'Boundary swing ramp (same-family VRB)', run: runBoundarySwingRampTests },
  { name: 'Tempo-adaptive swing curve (sq_swing)', run: runTempoAdaptiveSwingTests },
  { name: 'VRB composer + gate tooltips', run: runVrbTooltipsTests },
  { name: 'Duo intent (product vs PhraseIntent)', run: runDuoIntentTests },
  { name: 'Macro form planner', run: runMacroFormPlannerTests },
  { name: 'Ornette pitch-field spine (Phase 1)', run: runOrnettePitchFieldTests },
  ...retroSuites,
];

runHarnessMain(suites, '[harness] chunk 4/4 — ensembles + app + riff + retro');
