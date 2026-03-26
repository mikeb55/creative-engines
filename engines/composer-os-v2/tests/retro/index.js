"use strict";
/**
 * Composer OS V2 — Retro self-test index
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.retroSuites = void 0;
const foundationRetro_test_1 = require("./foundationRetro.test");
const goldenPathRetro_test_1 = require("./goldenPathRetro.test");
const musicalCoreRetro_test_1 = require("./musicalCoreRetro.test");
const firstIntelligenceRetro_test_1 = require("./firstIntelligenceRetro.test");
const styleSystemRetro_test_1 = require("./styleSystemRetro.test");
const regressionFixtures_test_1 = require("./regressionFixtures.test");
const stageExitGates_test_1 = require("./stageExitGates.test");
exports.retroSuites = [
    { name: 'Foundation Retro', run: foundationRetro_test_1.runFoundationRetroTests },
    { name: 'Golden Path Retro', run: goldenPathRetro_test_1.runGoldenPathRetroTests },
    { name: 'Musical Core Retro', run: musicalCoreRetro_test_1.runMusicalCoreRetroTests },
    { name: 'First Intelligence Retro', run: firstIntelligenceRetro_test_1.runFirstIntelligenceRetroTests },
    { name: 'Style System Retro', run: styleSystemRetro_test_1.runStyleSystemRetroTests },
    { name: 'Regression Fixtures', run: regressionFixtures_test_1.runRegressionFixturesTests },
    { name: 'Stage Exit Gates', run: stageExitGates_test_1.runStageExitGatesTests },
];
