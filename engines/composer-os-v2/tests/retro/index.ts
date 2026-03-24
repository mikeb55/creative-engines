/**
 * Composer OS V2 — Retro self-test index
 */

import { runFoundationRetroTests } from './foundationRetro.test';
import { runGoldenPathRetroTests } from './goldenPathRetro.test';
import { runMusicalCoreRetroTests } from './musicalCoreRetro.test';
import { runFirstIntelligenceRetroTests } from './firstIntelligenceRetro.test';
import { runStyleSystemRetroTests } from './styleSystemRetro.test';
import { runRegressionFixturesTests } from './regressionFixtures.test';
import { runStageExitGatesTests } from './stageExitGates.test';

export const retroSuites = [
  { name: 'Foundation Retro', run: runFoundationRetroTests },
  { name: 'Golden Path Retro', run: runGoldenPathRetroTests },
  { name: 'Musical Core Retro', run: runMusicalCoreRetroTests },
  { name: 'First Intelligence Retro', run: runFirstIntelligenceRetroTests },
  { name: 'Style System Retro', run: runStyleSystemRetroTests },
  { name: 'Regression Fixtures', run: runRegressionFixturesTests },
  { name: 'Stage Exit Gates', run: runStageExitGatesTests },
];
