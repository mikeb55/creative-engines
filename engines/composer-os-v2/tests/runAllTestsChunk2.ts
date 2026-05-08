/**
 * Full harness chunk 2/4 — harmony, ECM, Song Mode (isolated process).
 */

import { runChordSymbolMusicXmlHarmonyTests } from './chordSymbolMusicXmlHarmony.test';
import { runChordSemanticsTests } from './chordSemantics.test';
import { runWybleEtudePitchOffsetTests } from './wybleEtudePitchOffset.test';
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
import { runFilmComposerSlicesTests } from './filmComposerSlices.test';
import { runAuthorOverlayResolverTests } from './authorOverlayResolver.test';
import { runHookPlannerTests } from './hookPlanner.test';
import { runSongModeBehaviourEncodingTests } from './songModeBehaviourEncoding.test';
import { runNamedPresetLibraryTests } from './namedPresetLibrary.test';
import { runSessionStoreTests } from './sessionStore.test';
import { runLeadMelodyPlannerTests } from './leadMelodyPlanner.test';
import { runSingerRangeValidationTests } from './singerRangeValidation.test';
import { runProsodyPlannerTests } from './prosodyPlanner.test';
import { runSongModeCompletionTests } from './songModeCompletion.test';
import { runIndieArtPopPhaseATests } from './indieArtPopPhaseA.test';
import { runHarnessMain, type SuiteEntry } from './harness/runHarnessMain';

const suites: SuiteEntry[] = [
  { name: 'MusicXML harmony (kind/@text + degrees)', run: runChordSymbolMusicXmlHarmonyTests },
  { name: 'Chord semantics (unified)', run: runChordSemanticsTests },
  { name: 'Wyble Etude guitar pitch offset', run: runWybleEtudePitchOffsetTests },
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
  { name: 'Song Mode Phase A (alt-tuning style profiles)', run: runIndieArtPopPhaseATests },
  { name: 'Song Mode LeadSheet input (Donald Fagen Phase 1)', run: runSongModeLeadSheetInputTests },
  { name: 'Songwriting research parsing', run: runSongwritingResearchParsingTests },
  { name: 'Songwriter rule registry', run: runSongwriterRuleRegistryTests },
  { name: 'Songwriter style resolver', run: runSongwriterStyleResolverTests },
  { name: 'Film soundtrack composer slices', run: runFilmComposerSlicesTests },
  { name: 'Author overlay resolver', run: runAuthorOverlayResolverTests },
  { name: 'Hook planner', run: runHookPlannerTests },
  { name: 'Lead melody planner', run: runLeadMelodyPlannerTests },
  { name: 'Singer range validation', run: runSingerRangeValidationTests },
  { name: 'Prosody planner', run: runProsodyPlannerTests },
  { name: 'Song Mode completion', run: runSongModeCompletionTests },
  { name: 'Song Mode behaviour encoding', run: runSongModeBehaviourEncodingTests },
  { name: 'Named preset library', run: runNamedPresetLibraryTests },
  { name: 'Session store', run: runSessionStoreTests },
];

runHarnessMain(suites, '[harness] chunk 2/4 — harmony + ECM + Song Mode');
