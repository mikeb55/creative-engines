/**
 * harmonicVoice forwarding — GCE/LOCK verification matrix skeleton.
 * Delegates to existing eval infra; not registered in runSmokeTests.
 *
 * Usage:
 *   npx tsx --tsconfig ../../tsconfig.json scripts/runHarmonicVoiceForwardingGceLockMatrix.ts
 *   npx tsx --tsconfig ../../tsconfig.json scripts/runHarmonicVoiceForwardingGceLockMatrix.ts --rows gbd_full_generate,ecm_full_generate --seed 50021
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import {
  buildVerlaineGbdGoldenPathRequest,
  evaluateHardGates,
  runVerlaineGbdFormalEval,
  stripFromContext,
  type HardGateId,
} from './eval/verlaineGbdWriterEvalCore';
import { evaluateGce, defaultGceWeights } from '../core/evaluation/gceEvaluator';
import { extractScoreModelFeatures } from '../core/evaluation/featureExtractor';
import {
  GCE_GATE_HARMONIC_BAR_TARGET,
  scoreEcmChamberResultForGce,
} from '../core/gce/gceGate';
import { defaultStyleProfileForPrimarySongwriter } from '../core/song-mode/songModeStyleProfileDefaults';

type MatrixVariant = 'baseline' | 'verlaine_hv';

type EvalCoreDelegate = 'verlaineGbd' | 'genericGceGate';

type MatrixRowDef = {
  pathId: string;
  presetId: 'guitar_bass_duo' | 'ecm_chamber';
  primarySongwriterStyle: string;
  baseline: { harmonicVoice?: undefined };
  test: { harmonicVoice: 'verlaine' };
  evalCore: EvalCoreDelegate;
  implemented: boolean;
};

type MatrixOutputRow = {
  pathId: string;
  variant: MatrixVariant;
  generationSuccess: boolean;
  exportIntegrityPassed: boolean;
  lockPass: boolean;
  gceOverall: number | null;
  hardGateFailures: HardGateId[];
  deltaVsBaseline: number | null;
  status: 'OK' | 'SKIPPED' | 'FAILED';
  detail?: string;
};

const ALL_ROWS: MatrixRowDef[] = [
  {
    pathId: 'gbd_full_generate',
    presetId: 'guitar_bass_duo',
    primarySongwriterStyle: 'barry_harris',
    baseline: {},
    test: { harmonicVoice: 'verlaine' },
    evalCore: 'verlaineGbd',
    implemented: true,
  },
  {
    pathId: 'ecm_full_generate',
    presetId: 'ecm_chamber',
    primarySongwriterStyle: 'barry_harris',
    baseline: {},
    test: { harmonicVoice: 'verlaine' },
    evalCore: 'genericGceGate',
    implemented: true,
  },
  {
    pathId: 'gbd_section_regen',
    presetId: 'guitar_bass_duo',
    primarySongwriterStyle: 'barry_harris',
    baseline: {},
    test: { harmonicVoice: 'verlaine' },
    evalCore: 'verlaineGbd',
    implemented: false,
  },
  {
    pathId: 'ecm_section_regen',
    presetId: 'ecm_chamber',
    primarySongwriterStyle: 'barry_harris',
    baseline: {},
    test: { harmonicVoice: 'verlaine' },
    evalCore: 'genericGceGate',
    implemented: false,
  },
  {
    pathId: 'song_mode_full',
    presetId: 'guitar_bass_duo',
    primarySongwriterStyle: 'barry_harris',
    baseline: {},
    test: { harmonicVoice: 'verlaine' },
    evalCore: 'verlaineGbd',
    implemented: false,
  },
  {
    pathId: 'song_mode_section_regen',
    presetId: 'guitar_bass_duo',
    primarySongwriterStyle: 'barry_harris',
    baseline: {},
    test: { harmonicVoice: 'verlaine' },
    evalCore: 'verlaineGbd',
    implemented: false,
  },
  {
    pathId: 'big_band',
    presetId: 'guitar_bass_duo',
    primarySongwriterStyle: 'barry_harris',
    baseline: {},
    test: { harmonicVoice: 'verlaine' },
    evalCore: 'genericGceGate',
    implemented: false,
  },
  {
    pathId: 'string_quartet',
    presetId: 'guitar_bass_duo',
    primarySongwriterStyle: 'barry_harris',
    baseline: {},
    test: { harmonicVoice: 'verlaine' },
    evalCore: 'genericGceGate',
    implemented: false,
  },
  {
    pathId: 'riff_generator',
    presetId: 'guitar_bass_duo',
    primarySongwriterStyle: 'barry_harris',
    baseline: {},
    test: { harmonicVoice: 'verlaine' },
    evalCore: 'genericGceGate',
    implemented: false,
  },
];

function parseArgs(argv: string[]): { seed: number; rowIds: string[] | null } {
  let seed = 50021;
  let rowIds: string[] | null = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--seed' && argv[i + 1]) {
      seed = Number(argv[i + 1]);
      i++;
      continue;
    }
    if (argv[i] === '--rows' && argv[i + 1]) {
      rowIds = argv[i + 1]!.split(',').map((s) => s.trim()).filter(Boolean);
      i++;
    }
  }
  return { seed, rowIds };
}

function buildEcmGoldenPathOptions(
  seed: number,
  primary: string,
  harmonicVoice?: string
): Parameters<typeof runGoldenPathOnce>[1] {
  return {
    presetId: 'ecm_chamber',
    totalBars: 32,
    longFormEnabled: true,
    ecmMode: 'ECM_METHENY_QUARTET',
    primarySongwriterStyle: primary,
    styleProfile: defaultStyleProfileForPrimarySongwriter(primary) ?? 'STYLE_ECM',
    creativeControlLevel: 'balanced',
    ...(harmonicVoice ? { harmonicVoice } : {}),
    scoreTitle: `ecm matrix seed ${seed}`,
  };
}

function runGbdVariant(
  seed: number,
  primary: string,
  harmonicVoice?: string
): {
  generationSuccess: boolean;
  exportIntegrityPassed: boolean;
  lockPass: boolean;
  gceOverall: number | null;
  hardGateFailures: HardGateId[];
} {
  if (harmonicVoice) {
    const { result, gce, hard } = runVerlaineGbdFormalEval(seed, primary);
    const hardGateFailures = hard.gates.filter((g) => !g.pass).map((g) => g.id);
    return {
      generationSuccess: result.success,
      exportIntegrityPassed: result.exportIntegrityPassed,
      lockPass: result.exportIntegrityPassed && hard.allPass,
      gceOverall: gce.finalScore,
      hardGateFailures,
    };
  }

  const result = runGoldenPathOnce(seed, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: primary,
    creativeControlLevel: 'balanced',
    styleProfile: defaultStyleProfileForPrimarySongwriter(primary) ?? 'STYLE_MODERN_JAZZ',
  });
  if (!result.score) {
    return {
      generationSuccess: false,
      exportIntegrityPassed: false,
      lockPass: false,
      gceOverall: null,
      hardGateFailures: [],
    };
  }
  const strip = stripFromContext(result.context);
  const hard = evaluateHardGates(result.score, result.context, strip);
  const features = extractScoreModelFeatures(result.score);
  const gce = evaluateGce({
    output: result.score,
    features,
    weights: defaultGceWeights,
    metadata: { songwriterStyleId: result.context.generationMetadata?.songwriterStyleId ?? primary },
  });
  const hardGateFailures = hard.gates.filter((g) => !g.pass).map((g) => g.id);
  return {
    generationSuccess: result.success,
    exportIntegrityPassed: result.exportIntegrityPassed,
    lockPass: result.exportIntegrityPassed && hard.allPass,
    gceOverall: gce.finalScore,
    hardGateFailures,
  };
}

function runEcmVariant(
  seed: number,
  primary: string,
  harmonicVoice?: string
): {
  generationSuccess: boolean;
  exportIntegrityPassed: boolean;
  lockPass: boolean;
  gceOverall: number | null;
  hardGateFailures: HardGateId[];
} {
  const result = runGoldenPathOnce(seed, buildEcmGoldenPathOptions(seed, primary, harmonicVoice));
  if (!result.score) {
    return {
      generationSuccess: false,
      exportIntegrityPassed: false,
      lockPass: false,
      gceOverall: null,
      hardGateFailures: [],
    };
  }
  const strip = stripFromContext(result.context);
  const hard = evaluateHardGates(result.score, result.context, strip);
  const gce = scoreEcmChamberResultForGce(result.score, result.context, GCE_GATE_HARMONIC_BAR_TARGET);
  const hardGateFailures = hard.gates.filter((g) => !g.pass).map((g) => g.id);
  return {
    generationSuccess: result.success,
    exportIntegrityPassed: result.exportIntegrityPassed,
    lockPass: result.exportIntegrityPassed && hard.allPass,
    gceOverall: gce.overallScore,
    hardGateFailures,
  };
}

function runRowVariant(
  row: MatrixRowDef,
  seed: number,
  variant: MatrixVariant
): Omit<MatrixOutputRow, 'pathId' | 'variant' | 'deltaVsBaseline' | 'status'> {
  const harmonicVoice = variant === 'verlaine_hv' ? row.test.harmonicVoice : undefined;
  const primary = row.primarySongwriterStyle;

  if (row.evalCore === 'verlaineGbd') {
    return runGbdVariant(seed, primary, harmonicVoice);
  }
  return runEcmVariant(seed, primary, harmonicVoice);
}

function runMatrix(seed: number, rowFilter: string[] | null): MatrixOutputRow[] {
  const rows = rowFilter
    ? ALL_ROWS.filter((r) => rowFilter.includes(r.pathId))
    : ALL_ROWS;
  const output: MatrixOutputRow[] = [];

  for (const row of rows) {
    if (!row.implemented) {
      output.push({
        pathId: row.pathId,
        variant: 'baseline',
        generationSuccess: false,
        exportIntegrityPassed: false,
        lockPass: false,
        gceOverall: null,
        hardGateFailures: [],
        deltaVsBaseline: null,
        status: 'SKIPPED',
        detail: 'pending forwarding fix — matrix row not implemented',
      });
      output.push({
        pathId: row.pathId,
        variant: 'verlaine_hv',
        generationSuccess: false,
        exportIntegrityPassed: false,
        lockPass: false,
        gceOverall: null,
        hardGateFailures: [],
        deltaVsBaseline: null,
        status: 'SKIPPED',
        detail: 'pending forwarding fix — matrix row not implemented',
      });
      continue;
    }

    const baseline = runRowVariant(row, seed, 'baseline');
    const test = runRowVariant(row, seed, 'verlaine_hv');
    const delta =
      baseline.gceOverall != null && test.gceOverall != null
        ? Math.round((test.gceOverall - baseline.gceOverall) * 10) / 10
        : null;

    for (const [variant, metrics] of [
      ['baseline', baseline] as const,
      ['verlaine_hv', test] as const,
    ]) {
      output.push({
        pathId: row.pathId,
        variant,
        generationSuccess: metrics.generationSuccess,
        exportIntegrityPassed: metrics.exportIntegrityPassed,
        lockPass: metrics.lockPass,
        gceOverall: metrics.gceOverall,
        hardGateFailures: metrics.hardGateFailures,
        deltaVsBaseline: variant === 'verlaine_hv' ? delta : null,
        status: metrics.generationSuccess ? 'OK' : 'FAILED',
      });
    }
  }

  return output;
}

function main(): void {
  const { seed, rowIds } = parseArgs(process.argv.slice(2));
  const rows = runMatrix(seed, rowIds);
  console.log(JSON.stringify({ seed, rowCount: rows.length, rows }, null, 2));
}

if (require.main === module) {
  main();
}

export { ALL_ROWS, runMatrix, type MatrixOutputRow };
