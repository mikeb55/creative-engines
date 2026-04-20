/**
 * Bacharach developer workflow — parsing, receipts, eval pipeline, summary (no Song Mode generation).
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  buildBacharachEvalPipeline,
  buildWorkflowReadySummary,
  parseBacharachBatchArgs,
  REPO_ROOT,
  verifyBacharachSongModeReceipts,
} from '../scripts/bacharachSongModeWorkflowCore';
import type { BacharachEvalCsvRow } from '../scripts/eval/bacharachSongModeEvalCore';

function testParseBatchArgs(): boolean {
  const argv = ['node', 'script', '--out', 'output/foo-bach', '--count', '2', '--seed-start', '100', '--neutral-songwriter', 'beatles'];
  const r = parseBacharachBatchArgs(argv, {
    outDir: path.join(REPO_ROOT, 'output', 'default'),
    seedStart: 1,
    count: 9,
  });
  return (
    r.seeds.length === 2 &&
    r.seeds[0] === 100 &&
    r.seeds[1] === 101 &&
    r.neutralPrimary === 'beatles' &&
    r.outDir === path.resolve(REPO_ROOT, 'output', 'foo-bach')
  );
}

function testParseSkipsWorkflowOnlyFlags(): boolean {
  const argv = ['x', '--skip-build', '--out', 'output/z', '--count', '1', '--seed-start', '5', '--skip-launch'];
  const r = parseBacharachBatchArgs(argv, {
    outDir: path.join(REPO_ROOT, 'output', 'default'),
    seedStart: 0,
    count: 1,
  });
  return r.seeds.length === 1 && r.seeds[0] === 5 && r.outDir === path.resolve(REPO_ROOT, 'output', 'z');
}

function testReceiptsMissingManifest(): boolean {
  const v = verifyBacharachSongModeReceipts(null);
  return v.manifestParsed === false && v.allImplementedChecksHit === false;
}

function testReceiptsWithSliceNotes(): boolean {
  const raw = JSON.stringify({
    songModeStyleSurfaceNotes: [
      'Song Mode Bacharach slice: keyboard comp ...',
      'Bacharach slice: favoured smooth I/IV/vi maj7-m7 colours and light secondary-dominant motion on key cadences.',
      'Bacharach slice: bridge allowed a small controlled key-colour shift before returning home.',
      'Bacharach slice: accompaniment stayed lighter and melody-supportive rather than densely syncopated.',
    ],
  });
  const v = verifyBacharachSongModeReceipts(raw);
  return (
    v.bacharachSliceLineCount === 4 &&
    v.songModeNotesPresent === true &&
    v.checks.smoothPillarColour &&
    v.checks.secondaryDominantMotion &&
    v.checks.bridgeColourShift &&
    v.checks.lighterAccompaniment &&
    v.checks.returnOrHomeMention &&
    v.allImplementedChecksHit === true
  );
}

function testEvalPipelineAndSummary(): boolean {
  const neutralJson = JSON.stringify({
    seed: 1,
    parsedCustomProgressionBars: Array(32).fill('C'),
    songModeStyleSurfaceNotes: [],
  });
  const bachJson = JSON.stringify({
    seed: 1,
    parsedCustomProgressionBars: Array(32)
      .fill(null)
      .map((_, i) => (i % 4 === 0 ? 'Cmaj7' : 'Am7')),
    bacharachHarmonyDiagnostics: {
      barsConsidered: 32,
      barsChanged: 8,
      meanColourDepth: 1,
      meanColourDepthSectionA: 0.8,
      meanColourDepthSectionB: 1.1,
      sectionContrastDelta: 0.15,
      bridgeColourApplied: true,
      returnCadenceLiftApplied: true,
      secondaryDominantTouches: 1,
      mixtureTouches: 1,
    },
    songModeStyleSurfaceNotes: [
      'Bacharach slice: favoured smooth I/IV/vi maj7-m7 colours and light secondary-dominant motion on key cadences.',
      'Bacharach slice: bridge allowed a small controlled key-colour shift before returning home.',
      'Bacharach slice: accompaniment stayed lighter and melody-supportive rather than densely syncopated.',
    ],
  });

  const internal: Array<BacharachEvalCsvRow & { manifestRaw: string | null }> = [
    {
      arm: 'bacharach',
      seed: 1,
      primarySongwriter: 'bacharach',
      success: true,
      engineDeclaredSuccess: true,
      manifestBehaviourGates: 'true',
      smoothMaj7M7Ratio: '',
      secDomTotal: '',
      secDomBMinusA: '',
      safeNonDiatonicTotal: '',
      nonDiatonicBMinusA: '',
      colourBMinusA: '',
      openingReturnDelta: '',
      sectionContrastDelta: '',
      bridgeColourApplied: '',
      returnCadenceLiftApplied: '',
      mixtureTouches: '',
      bacharachSliceReceiptLines: '',
      receiptsDescribeBehaviours: '',
      sectionShaping_densityDeltaBMinusA: '',
      sectionShaping_colourDeltaBMinusA: '',
      sectionShaping_openingVsReturnDelta: '',
      sectionShaping_returnVariationType: '',
      sectionShaping_contributingSliceCount: '',
      sectionShaping_returnSummary: '',
      bacharachGceScore: '',
      flagSmoothWin: '',
      flagBridgeContrast: '',
      flagReturnWin: '',
      flagReceipts: '',
      manifestRaw: bachJson,
    },
    {
      arm: 'neutral',
      seed: 1,
      primarySongwriter: 'carole_king',
      success: true,
      engineDeclaredSuccess: true,
      manifestBehaviourGates: 'true',
      smoothMaj7M7Ratio: '',
      secDomTotal: '',
      secDomBMinusA: '',
      safeNonDiatonicTotal: '',
      nonDiatonicBMinusA: '',
      colourBMinusA: '',
      openingReturnDelta: '',
      sectionContrastDelta: '',
      bridgeColourApplied: '',
      returnCadenceLiftApplied: '',
      mixtureTouches: '',
      bacharachSliceReceiptLines: '',
      receiptsDescribeBehaviours: '',
      sectionShaping_densityDeltaBMinusA: '',
      sectionShaping_colourDeltaBMinusA: '',
      sectionShaping_openingVsReturnDelta: '',
      sectionShaping_returnVariationType: '',
      sectionShaping_contributingSliceCount: '',
      sectionShaping_returnSummary: '',
      bacharachGceScore: '',
      flagSmoothWin: '',
      flagBridgeContrast: '',
      flagReturnWin: '',
      flagReceipts: '',
      manifestRaw: neutralJson,
    },
  ];

  const evalDir = path.join(REPO_ROOT, 'output', 'bacharach-workflow-test-eval');
  const p = buildBacharachEvalPipeline([1], 'carole_king', internal, evalDir);
  if (!p.csv.includes('bacharach') || !p.csv.includes('smoothMaj7M7Ratio')) return false;
  if (!p.reportMd.includes('Bacharach')) return false;
  if (p.scoreMap.get(1) !== 4) return false;

  let smoothWinCount = 0;
  for (const seed of [1]) {
    if (p.breakdownBySeed.get(seed)?.smoothVersusNeutral) smoothWinCount++;
  }

  const s = buildWorkflowReadySummary({
    seeds: [1],
    scoreMap: p.scoreMap,
    breakdownBySeed: p.breakdownBySeed,
    bachRunsWithArtifacts: 1,
    bachRunsAttempted: 1,
    receiptVerificationHits: 1,
    neutralHigherSmooth: p.neutralHigherSmooth,
    smoothWinCount,
  });
  return s.verdict.includes('distinguishable') && s.lines.some((l) => l.includes('GCE'));
}

function testCsvMarkdownWritten(): boolean {
  const neutralJson = JSON.stringify({ seed: 2, parsedCustomProgressionBars: Array(16).fill('G'), songModeStyleSurfaceNotes: [] });
  const bachJson = JSON.stringify({
    seed: 2,
    parsedCustomProgressionBars: Array(16)
      .fill(null)
      .map((_, i) => (i % 2 === 0 ? 'Cmaj7' : 'Dm7')),
    bacharachHarmonyDiagnostics: {
      barsConsidered: 16,
      barsChanged: 4,
      meanColourDepth: 1,
      meanColourDepthSectionA: 0.9,
      meanColourDepthSectionB: 1.0,
      sectionContrastDelta: 0.12,
      bridgeColourApplied: true,
      returnCadenceLiftApplied: false,
      secondaryDominantTouches: 0,
      mixtureTouches: 0,
    },
    songModeStyleSurfaceNotes: [
      'Bacharach slice: favoured smooth I/IV/vi maj7-m7 colours and light secondary-dominant motion on key cadences.',
      'Bacharach slice: bridge allowed a small controlled key-colour shift before returning home.',
      'Bacharach slice: accompaniment stayed lighter and melody-supportive rather than densely syncopated.',
    ],
  });
  const rows: Array<BacharachEvalCsvRow & { manifestRaw: string | null }> = [
    {
      arm: 'bacharach',
      seed: 2,
      primarySongwriter: 'bacharach',
      success: true,
      engineDeclaredSuccess: true,
      manifestBehaviourGates: '',
      smoothMaj7M7Ratio: '',
      secDomTotal: '',
      secDomBMinusA: '',
      safeNonDiatonicTotal: '',
      nonDiatonicBMinusA: '',
      colourBMinusA: '',
      openingReturnDelta: '',
      sectionContrastDelta: '',
      bridgeColourApplied: '',
      returnCadenceLiftApplied: '',
      mixtureTouches: '',
      bacharachSliceReceiptLines: '',
      receiptsDescribeBehaviours: '',
      sectionShaping_densityDeltaBMinusA: '',
      sectionShaping_colourDeltaBMinusA: '',
      sectionShaping_openingVsReturnDelta: '',
      sectionShaping_returnVariationType: '',
      sectionShaping_contributingSliceCount: '',
      sectionShaping_returnSummary: '',
      bacharachGceScore: '',
      flagSmoothWin: '',
      flagBridgeContrast: '',
      flagReturnWin: '',
      flagReceipts: '',
      manifestRaw: bachJson,
    },
    {
      arm: 'neutral',
      seed: 2,
      primarySongwriter: 'carole_king',
      success: true,
      engineDeclaredSuccess: true,
      manifestBehaviourGates: '',
      smoothMaj7M7Ratio: '',
      secDomTotal: '',
      secDomBMinusA: '',
      safeNonDiatonicTotal: '',
      nonDiatonicBMinusA: '',
      colourBMinusA: '',
      openingReturnDelta: '',
      sectionContrastDelta: '',
      bridgeColourApplied: '',
      returnCadenceLiftApplied: '',
      mixtureTouches: '',
      bacharachSliceReceiptLines: '',
      receiptsDescribeBehaviours: '',
      sectionShaping_densityDeltaBMinusA: '',
      sectionShaping_colourDeltaBMinusA: '',
      sectionShaping_openingVsReturnDelta: '',
      sectionShaping_returnVariationType: '',
      sectionShaping_contributingSliceCount: '',
      sectionShaping_returnSummary: '',
      bacharachGceScore: '',
      flagSmoothWin: '',
      flagBridgeContrast: '',
      flagReturnWin: '',
      flagReceipts: '',
      manifestRaw: neutralJson,
    },
  ];
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bacharach-wf-'));
  const p = buildBacharachEvalPipeline([2], 'carole_king', rows, outDir);
  const csvPath = path.join(outDir, 'snap.csv');
  const mdPath = path.join(outDir, 'snap.md');
  fs.writeFileSync(csvPath, p.csv, 'utf-8');
  fs.writeFileSync(mdPath, p.reportMd, 'utf-8');
  const csvRead = fs.readFileSync(csvPath, 'utf-8');
  const mdRead = fs.readFileSync(mdPath, 'utf-8');
  try {
    fs.unlinkSync(csvPath);
    fs.unlinkSync(mdPath);
    fs.rmdirSync(outDir);
  } catch {
    /* ignore */
  }
  return csvRead.split('\n').length >= 3 && mdRead.includes('# Bacharach Song Mode eval');
}

/** Workflow entrypoint stays isolated from Fagen / Sophisticated Pop *batch eval runners* (shared CSV helpers are OK). */
function testWorkflowScriptImportsIsolation(): boolean {
  const wf = fs.readFileSync(path.join(REPO_ROOT, 'engines', 'composer-os-v2', 'scripts', 'runBacharachWorkflow.ts'), 'utf-8');
  const core = fs.readFileSync(path.join(REPO_ROOT, 'engines', 'composer-os-v2', 'scripts', 'bacharachSongModeWorkflowCore.ts'), 'utf-8');
  const badWf =
    wf.includes('runFagenSongModeEval') ||
    wf.includes('runSophisticatedPopStyleEval') ||
    wf.includes('runFagenSongModeEval.ts') ||
    wf.includes('runSophisticatedPopStyleEval.ts');
  const badCore =
    core.includes('runFagenSongModeEval') ||
    core.includes('runSophisticatedPopStyleEval') ||
    /\bfagenSongModeEvalCore\b/.test(core);
  return !badWf && !badCore;
}

export function runBacharachWorkflowDeveloperTests(): { name: string; ok: boolean }[] {
  return [
    ['parseBacharachBatchArgs (count, seed-start, out, neutral-songwriter)', testParseBatchArgs],
    ['parseBacharachBatchArgs ignores --skip-build / --skip-launch', testParseSkipsWorkflowOnlyFlags],
    ['verifyBacharachSongModeReceipts when manifest missing', testReceiptsMissingManifest],
    ['verifyBacharachSongModeReceipts when Bacharach slice notes present', testReceiptsWithSliceNotes],
    ['buildBacharachEvalPipeline + buildWorkflowReadySummary (synthetic manifests)', testEvalPipelineAndSummary],
    ['CSV / Markdown eval artifacts shape', testCsvMarkdownWritten],
    ['workflow scripts do not import Fagen / Sophisticated Pop eval runners', testWorkflowScriptImportsIsolation],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
