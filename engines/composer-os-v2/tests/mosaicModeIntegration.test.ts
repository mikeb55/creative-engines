/**
 * Mosaic Mode integration — full golden-path generation with section plan seed 77777.
 */

import { assertScoreMatchesLockedHarmonyWire } from '../core/goldenPath/customLockedHarmonyRouting';
import {
  buildMosaicTonicMap,
  precomputeMosaicEffectiveHarmonyBars,
} from '../core/mosaic-mode/precomputeMosaicEffectiveHarmonyBars';
import { resolveMosaicSectionStyles } from '../core/mosaic-mode/resolveMosaicSectionStyles';
import type { GoldenPathResult } from '../core/goldenPath/runGoldenPath';
import { lockedHarmonyChordSymbolsEquivalent } from '../core/harmony/chordProgressionParser';

const SEED = 77777;

const DUO_PLAN = [
  { sectionLabel: 'verse', startBar: 1, endBar: 8, songwriterStyleId: 'verlaine' as const },
  { sectionLabel: 'chorus', startBar: 9, endBar: 16, songwriterStyleId: 'marr' as const },
];

function lockedProgression16(): string[] {
  const bars = Array.from({ length: 16 }, (_, i) => {
    const roots = ['E', 'A', 'B', 'C#m', 'A', 'E', 'F#m', 'B'];
    return i < 8 ? `${roots[i]}maj7` : `${roots[i - 8]}7`;
  });
  return bars;
}

function patchGenerateGoldenPathDuoScoreForDuoPlan(): () => void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const gp = require('../core/goldenPath/generateGoldenPathDuoScore') as {
    generateGoldenPathDuoScore: (
      context: import('../core/compositionContext').CompositionContext,
      plans: unknown,
      opts?: unknown
    ) => unknown;
  };
  const original = gp.generateGoldenPathDuoScore;
  gp.generateGoldenPathDuoScore = function duoPlanPatchedGenerate(
    context: import('../core/compositionContext').CompositionContext,
    plans: unknown,
    opts?: unknown
  ) {
    context.generationMetadata = {
      ...context.generationMetadata,
      mosaicSectionPlan: DUO_PLAN,
    };
    const routing = resolveMosaicSectionStyles(context.form, context.generationMetadata);
    const tonicMap = buildMosaicTonicMap(routing.sectionComposerMap, context);
    precomputeMosaicEffectiveHarmonyBars(context, routing, tonicMap);
    return original.call(gp, context, plans, opts);
  };
  return () => {
    gp.generateGoldenPathDuoScore = original;
  };
}

function loadRunGoldenPathOnce(): (
  seed: number,
  options?: import('../core/goldenPath/runGoldenPath').RunGoldenPathOptions
) => GoldenPathResult {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  delete require.cache[require.resolve('../core/goldenPath/runGoldenPath')];
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../core/goldenPath/runGoldenPath').runGoldenPathOnce;
}

function guitarChordAtBar(
  result: GoldenPathResult,
  bar: number
): string | undefined {
  const guitar = result.score?.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  return guitar?.measures.find((m) => m.index === bar)?.chord;
}

function allReceiptStrings(result: GoldenPathResult): string {
  const md = result.context?.generationMetadata;
  const parts = [
    ...(md?.verlaineDeviceReceipts ?? []),
    ...(md?.marrDeviceReceipts ?? []),
    md?.verlaineSliceReceipt ?? '',
    md?.marrSliceReceipt ?? '',
    JSON.stringify(md?.verlaineDiagnostics ?? {}),
    JSON.stringify(md?.marrDiagnostics ?? {}),
  ];
  return parts.join('\n');
}

export function runMosaicModeIntegrationTests(): { ok: boolean; name: string; detail?: string }[] {
  const out: { ok: boolean; name: string; detail?: string }[] = [];
  const locked = lockedProgression16();
  const progressionText = locked.join(' | ');

  let result: GoldenPathResult | undefined;
  let generationError: string | undefined;
  let lockError: string | undefined;

  const restore = patchGenerateGoldenPathDuoScoreForDuoPlan();
  try {
    const runGoldenPathOnce = loadRunGoldenPathOnce();
    try {
      result = runGoldenPathOnce(SEED, {
        presetId: 'guitar_bass_duo',
        totalBars: 16,
        longFormEnabled: true,
        harmonyMode: 'custom_locked',
        lockedHarmonyBarsRaw: locked,
        parsedChordBars: [...locked],
        chordProgressionText: progressionText,
        songModeHookFirstIdentity: true,
        primarySongwriterStyle: 'verlaine',
      });
    } catch (err) {
      generationError = err instanceof Error ? err.message : String(err);
    }

    out.push({
      ok: generationError === undefined && result?.success === true,
      name: 'integration: generation does not throw',
      detail: generationError ?? (result?.success === false ? result.errors.join('; ') : undefined),
    });

    if (result?.score && result.context) {
      try {
        assertScoreMatchesLockedHarmonyWire(result.score, {
          harmonyMode: 'custom_locked',
          lockedHarmonyBarsRaw: locked,
          parsedChordBars: locked,
        }, result.context);
      } catch (err) {
        lockError = err instanceof Error ? err.message : String(err);
      }
    } else {
      lockError = 'no score/context to LOCK-check';
    }

    out.push({
      ok: lockError === undefined,
      name: 'integration: LOCK does not throw on output',
      detail: lockError,
    });

    const guitar = result?.score?.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
    const barCount = guitar?.measures.length ?? 0;
    out.push({
      ok: barCount === 16,
      name: 'integration: score has 16 bars',
      detail: barCount !== 16 ? `got ${barCount}` : undefined,
    });

    const md = result?.context?.generationMetadata;
    const verlaineEff = md?.verlaineEffectiveHarmonyBars;
    const marrEff = md?.marrEffectiveHarmonyBars;
    const bar1 = guitarChordAtBar(result!, 1);
    const bar9 = guitarChordAtBar(result!, 9);

    const bar1Expected = verlaineEff?.[0];
    const bar1Ok =
      bar1 !== undefined &&
      bar1Expected !== undefined &&
      lockedHarmonyChordSymbolsEquivalent(bar1, bar1Expected);
    out.push({
      ok: bar1Ok === true,
      name: 'integration: bar 1 chord matches verlaineEffectiveHarmonyBars[0]',
      detail:
        bar1Ok === true
          ? undefined
          : `bar1="${bar1 ?? ''}" expected="${bar1Expected ?? ''}"`,
    });

    const bar9Expected = marrEff?.[0];
    const bar9Ok =
      bar9 !== undefined &&
      bar9Expected !== undefined &&
      lockedHarmonyChordSymbolsEquivalent(bar9, bar9Expected);
    out.push({
      ok: bar9Ok === true,
      name: 'integration: bar 9 chord matches marrEffectiveHarmonyBars[0]',
      detail:
        bar9Ok === true
          ? undefined
          : `bar9="${bar9 ?? ''}" expected="${bar9Expected ?? ''}" (marrEff[8]="${marrEff?.[8] ?? ''}")`,
    });

    const receipts = allReceiptStrings(result!);
    const hasTv = receipts.includes('tv:');
    const hasJma = receipts.includes('jma:');
    out.push({
      ok: hasTv && hasJma,
      name: 'integration: metadata receipts contain tv:* and jma:* prefixes',
      detail: !hasTv || !hasJma ? `tv=${hasTv} jma=${hasJma}` : undefined,
    });

    const evalResults = md?.mosaicSectionEvalResults;
    const evalOk =
      Array.isArray(evalResults) &&
      evalResults.length === 2 &&
      evalResults[0]?.composerId === 'verlaine' &&
      evalResults[1]?.composerId === 'marr' &&
      evalResults.every(
        (entry) =>
          typeof entry.sectionLabel === 'string' &&
          typeof entry.passed === 'boolean' &&
          typeof entry.scores?.overall === 'number' &&
          Array.isArray(entry.failures)
      );
    out.push({
      ok: evalOk === true,
      name: 'integration: mosaicSectionEvalResults — 2 sections verlaine + marr, no throw',
      detail:
        evalOk === true
          ? undefined
          : `evalResults=${JSON.stringify(evalResults?.map((e) => ({ label: e.sectionLabel, composer: e.composerId })))}`,
    });
  } finally {
    restore();
  }

  return out;
}

if (require.main === module) {
  const rows = runMosaicModeIntegrationTests();
  let failed = 0;
  for (const row of rows) {
    const mark = row.ok ? 'PASS' : 'FAIL';
    console.log(`${mark} ${row.name}${row.detail ? ` — ${row.detail}` : ''}`);
    if (!row.ok) failed++;
  }
  process.exit(failed > 0 ? 1 : 0);
}
