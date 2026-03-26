"use strict";
/**
 * Composer OS V2 — Run all tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const conductor_test_1 = require("./conductor.test");
const rhythmEngine_test_1 = require("./rhythmEngine.test");
const instrumentProfiles_test_1 = require("./instrumentProfiles.test");
const scoreIntegrity_test_1 = require("./scoreIntegrity.test");
const readiness_test_1 = require("./readiness.test");
const export_test_1 = require("./export.test");
const scoreModel_test_1 = require("./scoreModel.test");
const goldenPath_test_1 = require("./goldenPath.test");
const stage2MusicalCore_test_1 = require("./stage2MusicalCore.test");
const motif_test_1 = require("./motif.test");
const styleModule_test_1 = require("./styleModule.test");
const interaction_test_1 = require("./interaction.test");
const control_test_1 = require("./control.test");
const performance_test_1 = require("./performance.test");
const exportHardening_test_1 = require("./exportHardening.test");
const appApi_test_1 = require("./appApi.test");
const composerOsOutputPaths_test_1 = require("./composerOsOutputPaths.test");
const mapStyleStack_test_1 = require("./mapStyleStack.test");
const openOutputFolderGate_test_1 = require("./openOutputFolderGate.test");
const correctnessGates_test_1 = require("./correctnessGates.test");
const index_1 = require("./retro/index");
const suites = [
    { name: 'Conductor', run: conductor_test_1.runConductorTests },
    { name: 'Rhythm Engine', run: rhythmEngine_test_1.runRhythmEngineTests },
    { name: 'Instrument Profiles', run: instrumentProfiles_test_1.runInstrumentProfileTests },
    { name: 'Score Integrity', run: scoreIntegrity_test_1.runScoreIntegrityTests },
    { name: 'Readiness', run: readiness_test_1.runReadinessTests },
    { name: 'Export', run: export_test_1.runExportTests },
    { name: 'Score Model', run: scoreModel_test_1.runScoreModelTests },
    { name: 'Golden Path', run: goldenPath_test_1.runGoldenPathTests },
    { name: 'Stage 2 Musical Core', run: stage2MusicalCore_test_1.runStage2MusicalCoreTests },
    { name: 'Motif', run: motif_test_1.runMotifTests },
    { name: 'Style Module', run: styleModule_test_1.runStyleModuleTests },
    { name: 'Interaction', run: interaction_test_1.runInteractionTests },
    { name: 'Control', run: control_test_1.runControlTests },
    { name: 'Performance', run: performance_test_1.runPerformanceTests },
    { name: 'Export Hardening', run: exportHardening_test_1.runExportHardeningTests },
    { name: 'App API', run: appApi_test_1.runAppApiTests },
    { name: 'Composer output paths', run: composerOsOutputPaths_test_1.runComposerOsOutputPathsTests },
    { name: 'Style Blend mapping', run: mapStyleStack_test_1.runMapStyleStackTests },
    { name: 'Open output folder gate', run: openOutputFolderGate_test_1.runOpenOutputFolderGateTests },
    { name: 'Correctness gates', run: correctnessGates_test_1.runCorrectnessGatesTests },
    ...index_1.retroSuites,
];
function main() {
    let totalPassed = 0;
    let totalFailed = 0;
    for (const suite of suites) {
        const results = suite.run();
        console.log(`\n=== ${suite.name} ===`);
        for (const r of results) {
            if (r.ok) {
                console.log(`  PASS: ${r.name}`);
                totalPassed++;
            }
            else {
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
