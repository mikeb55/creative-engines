/**
 * Consolidated export-truth entry: spine LOCK, locked score/XML, duo pipeline gates, XML harmony truth.
 * Delegates to existing validators without changing their internal logic.
 */

import type { CompositionContext } from '../compositionContext';
import type { ScoreModel } from '../score-model/scoreModelTypes';
import type { CustomLockedRoutingWire } from '../goldenPath/customLockedHarmonyRouting';
import { assertHarmonySpineMatchesScore, resolveBarSymbol } from '../harmony/harmonySpineProvider';
import {
  assertLockedHarmonyScoreAndXmlMatchBars,
  validateLockedHarmonyMusicXmlTruth,
} from './validateLockedHarmonyMusicXml';
import {
  pipelineTruthAllPassed,
  runPipelineTruthGates,
  type PipelineTruthGoldenPathOptions,
  type PipelineTruthReport,
} from '../score-integrity/pipelineTruthGates';

export type ExportTruthRunMode = 'duo' | 'song' | 'bb' | 'sq';

export interface ExportTruthContext {
  scoreModel: ScoreModel;
  exportedXml: string | undefined;
  /** Resolved harmony (slice-effective), not raw user paste. */
  effectiveBars: readonly string[] | undefined;
  /** Present when run used locked/custom_locked wire. */
  lockedBars: readonly string[] | undefined;
  /** Per-bar spine symbols (from harmonySpineProvider); audit / receipt echo. */
  spineSymbols: readonly string[];
  runMode: ExportTruthRunMode;
  context?: CompositionContext;
  routingWire?: CustomLockedRoutingWire;
  pipelineOptions?: PipelineTruthGoldenPathOptions;
  spineLayer?: string;
}

/**
 * Thrown when a duo pipeline truth gate fails after `runPipelineTruthGates` produced a report.
 * Carries that report so callers (e.g. runGoldenPath) can echo real stage results instead of
 * leaving the default skip/skip/skip placeholder.
 */
export class ExportTruthPipelineError extends Error {
  readonly truthReport: PipelineTruthReport;

  constructor(message: string, truthReport: PipelineTruthReport) {
    super(message);
    this.name = 'ExportTruthPipelineError';
    this.truthReport = truthReport;
  }
}

/**
 * Run export-truth validators in order; throw on first hard failure.
 * Returns duo pipeline truth report when runMode === 'duo' (for manifest echo); otherwise undefined.
 */
export function assertExportTruth(ctx: ExportTruthContext): PipelineTruthReport | undefined {
  const layer = ctx.spineLayer ?? 'assertExportTruth';

  if (ctx.lockedBars && ctx.lockedBars.length > 0) {
    if (!ctx.effectiveBars || ctx.effectiveBars.length === 0) {
      throw new Error('EXPORT TRUTH: locked run requires effectiveBars (resolved harmony truth).');
    }
  }

  if (ctx.context && ctx.routingWire) {
    assertHarmonySpineMatchesScore(ctx.scoreModel, ctx.routingWire, ctx.context, layer);
  }

  if (ctx.lockedBars && ctx.lockedBars.length > 0 && ctx.effectiveBars && ctx.effectiveBars.length > 0) {
    assertLockedHarmonyScoreAndXmlMatchBars(
      ctx.scoreModel,
      ctx.exportedXml,
      [...ctx.effectiveBars],
      ctx.context
    );
  }

  let pipelineReport: PipelineTruthReport | undefined;
  if (ctx.runMode === 'duo' && ctx.context) {
    pipelineReport = runPipelineTruthGates({
      context: ctx.context,
      options: ctx.pipelineOptions,
      score: ctx.scoreModel,
      xml: ctx.exportedXml,
    });
    if (!pipelineTruthAllPassed(pipelineReport)) {
      throw new ExportTruthPipelineError(
        pipelineReport.errors[0] ?? 'PIPELINE_TRUTH: export truth gate failed.',
        pipelineReport
      );
    }
  }

  if (
    ctx.lockedBars &&
    ctx.lockedBars.length > 0 &&
    ctx.effectiveBars &&
    ctx.effectiveBars.length > 0 &&
    ctx.exportedXml
  ) {
    const xmlTruth = validateLockedHarmonyMusicXmlTruth(ctx.exportedXml, [...ctx.effectiveBars]);
    if (!xmlTruth.ok) {
      throw new Error(xmlTruth.errors[0] ?? 'SONG MODE HARMONY LOCK: MusicXML harmony mismatch');
    }
    if (ctx.context?.generationMetadata) {
      ctx.context.generationMetadata.customHarmonyMusicXmlTruthPassed = true;
    }
  }

  return ctx.runMode === 'duo' ? pipelineReport : undefined;
}

/** Build per-bar spine symbol list for ExportTruthContext (read-only; spine LOCK still uses live resolve). */
export function buildSpineSymbolsForExportTruth(context: CompositionContext, totalBars: number): string[] {
  const out: string[] = [];
  for (let b = 1; b <= totalBars; b++) {
    out.push(resolveBarSymbol(context, b).symbol);
  }
  return out;
}
