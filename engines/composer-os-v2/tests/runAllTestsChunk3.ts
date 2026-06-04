/**
 * Full harness chunk 3/4 — lead-sheet import + orchestration + Big Band planning (isolated process).
 */

import { runCandidateRankerTests } from './candidateRanker.test';
import { runDiagnosticsBuilderTests } from './diagnosticsBuilder.test';
import { runUniversalLeadSheetBuilderTests } from './universalLeadSheetBuilder.test';
import { runChordInputParserTests } from './chordInputParser.test';
import { runMotifExtractorPlusTests } from './motifExtractorPlus.test';
import { runMotifReusePlannerTests } from './motifReusePlanner.test';
import { runContinuationPlannerTests } from './continuationPlanner.test';
import { runSectionRegeneratorTests } from './sectionRegenerator.test';
import { runSectionRegenerationPlanningTests } from './sectionRegenerationPlanning.test';
import { runSectionRegenerationBarMeterTests } from './sectionRegenerationBarMeter.test';
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
import { runOrchestrationCoreTests } from './orchestrationCore.test';
import { runOrchestrationPlannerTests } from './orchestrationPlanner.test';
import { runEnsembleFamilyProfilesTests } from './ensembleFamilyProfiles.test';
import { runOrchestrationCompatibilityTests } from './orchestrationCompatibility.test';
import { runBigBandTypesTests } from './bigBandTypes.test';
import { runBigBandPlanningTests } from './bigBandPlanning.test';
import { runBigBandValidationTests } from './bigBandValidation.test';
import { runBigBandModeTests } from './bigBandMode.test';
import { runComposerGroupEngineTests } from './composerGroupEngine.test';
import { runBigBandResearchParsingTests } from './bigBandResearchParsing.test';
import { runBigBandEraSystemTests } from './bigBandEraSystem.test';
import { runBebopLinePlannerTests } from './bebopLinePlanner.test';
import { runBigBandRuleApplicationTests } from './bigBandRuleApplication.test';
import { runBigBandOutputQualityControlsTests } from './bigBandOutputQualityControls.test';
import { runVariationAdapterTests } from './variationAdapter.test';
import { runCreativeControlResolverTests } from './creativeControlResolver.test';
import { runHarnessMain, type SuiteEntry } from './harness/runHarnessMain';

const suites: SuiteEntry[] = [
  { name: 'Candidate ranker', run: runCandidateRankerTests },
  { name: 'Diagnostics builder', run: runDiagnosticsBuilderTests },
  { name: 'Universal lead sheet builder', run: runUniversalLeadSheetBuilderTests },
  { name: 'Chord input parser', run: runChordInputParserTests },
  { name: 'Motif extractor plus', run: runMotifExtractorPlusTests },
  { name: 'Motif reuse planner', run: runMotifReusePlannerTests },
  { name: 'Continuation planner', run: runContinuationPlannerTests },
  { name: 'Section regenerator', run: runSectionRegeneratorTests },
  { name: 'Section regeneration planning', run: runSectionRegenerationPlanningTests },
  { name: 'Section regeneration barMeterMap fragment', run: runSectionRegenerationBarMeterTests },
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
  { name: 'Composer group engine', run: runComposerGroupEngineTests },
  { name: 'Big Band research parsing', run: runBigBandResearchParsingTests },
  { name: 'Big Band era system', run: runBigBandEraSystemTests },
  { name: 'Bebop line planner', run: runBebopLinePlannerTests },
  { name: 'Big Band rule application', run: runBigBandRuleApplicationTests },
  { name: 'Big Band output quality controls', run: runBigBandOutputQualityControlsTests },
  { name: 'Variation adapter', run: runVariationAdapterTests },
  { name: 'Creative control resolver', run: runCreativeControlResolverTests },
];

runHarnessMain(suites, '[harness] chunk 3/4 — lead-sheet + orchestration + BB planning');
