/**
 * V80 — Map GenerationMetadata (+ import IR) → GenerateResult echo fields.
 * App-api plumbing only; no engine logic.
 */

import type { GenerationMetadata } from '../core/compositionContext';
import type { MosaicImportTimeline } from '../core/import/mosaicImportTimeline';
import { melodyLinesMatchPitchForPitch } from '../core/import/mosaicStyleTransfer';
import type {
  GenerateResultEchoManifest,
  GenerateRequest,
  ImportEcho,
  MixedPresetEcho,
  StyleTransferEcho,
  VariationEcho,
} from './appApiTypes';

export interface BuildGenerateResultEchoesInput {
  generationMetadata: GenerationMetadata;
  importTimeline?: MosaicImportTimeline;
  importHarmonyMode?: string;
  exportIntegrityPassed?: boolean;
  variationMode?: string;
}

export interface GenerateResultEchoBundle {
  importEcho?: ImportEcho;
  variationEcho?: VariationEcho;
  styleTransferEcho?: StyleTransferEcho;
  mixedPresetEcho?: MixedPresetEcho;
}

function parseHarmonyDeltaBarIndices(delta: string[]): number[] {
  const bars: number[] = [];
  for (const entry of delta) {
    const match = /^bar(\d+):/.exec(entry);
    if (match) {
      bars.push(Number(match[1]));
    }
  }
  return bars;
}

/** Golden-path option spread for V80 import / variation / style-transfer / mixed-preset flags. */
export function v80GoldenPathOptionsFromGenerateRequest(
  req: Pick<
    GenerateRequest,
    | 'importTimeline'
    | 'generateVariations'
    | 'variationCount'
    | 'variationMode'
    | 'variationIndex'
    | 'preserveImportHarmony'
    | 'styleTransfer'
    | 'targetComposer'
    | 'styleTransferStrength'
    | 'preserveMelody'
    | 'reorchestrate'
    | 'bbMosaicEnabled'
    | 'sqMosaicEnabled'
    | 'mosaicOutputFormat'
    | 'allowMosaicPostFinalizeInject'
  >
): Record<string, unknown> {
  return {
    ...(req.importTimeline ? { importTimeline: req.importTimeline } : {}),
    ...(req.generateVariations === true ? { generateVariations: true } : {}),
    ...(typeof req.variationCount === 'number' ? { variationCount: req.variationCount } : {}),
    ...(req.variationMode ? { variationMode: req.variationMode } : {}),
    ...(typeof req.variationIndex === 'number' ? { variationIndex: req.variationIndex } : {}),
    ...(req.preserveImportHarmony != null ? { preserveImportHarmony: req.preserveImportHarmony } : {}),
    ...(req.styleTransfer === true ? { styleTransfer: true } : {}),
    ...(req.targetComposer ? { targetComposer: req.targetComposer } : {}),
    ...(typeof req.styleTransferStrength === 'number' ? { styleTransferStrength: req.styleTransferStrength } : {}),
    ...(req.preserveMelody != null ? { preserveMelody: req.preserveMelody } : {}),
    ...(req.reorchestrate === true ? { reorchestrate: true } : {}),
    ...(req.bbMosaicEnabled === true ? { bbMosaicEnabled: true } : {}),
    ...(req.sqMosaicEnabled === true ? { sqMosaicEnabled: true } : {}),
    ...(req.mosaicOutputFormat ? { mosaicOutputFormat: req.mosaicOutputFormat } : {}),
    ...(req.allowMosaicPostFinalizeInject === true ? { allowMosaicPostFinalizeInject: true } : {}),
  };
}

export function buildGenerateResultEchoes(input: BuildGenerateResultEchoesInput): GenerateResultEchoBundle {
  const md = input.generationMetadata;
  const bundle: GenerateResultEchoBundle = {};
  const ir = input.importTimeline;

  if (ir) {
    bundle.importEcho = {
      sourceFormat: ir.sourceFormat,
      bars: ir.bars,
      keyEstimate: {
        tonic: ir.keyEstimate.tonic,
        mode: ir.keyEstimate.mode,
        confidence: ir.keyEstimate.confidence,
      },
      harmonyConfidenceByBar: ir.harmonyByBar.map((h) => h.confidence),
      harmonyOriginByBar: ir.harmonyByBar.map((h) => h.fieldOrigin),
      parseDiagnostics: [...ir.parseDiagnostics],
      importHarmonyMode: input.importHarmonyMode ?? md.importHarmonyMode ?? 'free_harmony',
    };
  }

  const variationResult = md.variationResult;
  if (variationResult) {
    const mode = input.variationMode ?? 'melodic';
    bundle.variationEcho = {
      candidates: variationResult.candidates.map((c) => ({
        variationIndex: c.variationIndex,
        sectionLabel: c.sectionLabel,
        mode,
        evalScore: c.evalResult.scores.overall ?? 0,
      })),
      autoSelected: variationResult.autoSelected,
      baselineScore: variationResult.importBaseline.evalResult.scores.overall ?? 0,
    };
  }

  const styleTransferResult = md.styleTransferResult;
  if (styleTransferResult) {
    const melodyRetained =
      ir != null
        ? melodyLinesMatchPitchForPitch(styleTransferResult.retainedMelody, ir.melodyLine)
        : false;
    bundle.styleTransferEcho = {
      composerApplied: styleTransferResult.composerApplied,
      strengthApplied: styleTransferResult.strengthApplied,
      harmonyDeltaBars: parseHarmonyDeltaBarIndices(styleTransferResult.harmonyDelta),
      melodyRetained,
      evalScore: styleTransferResult.evalResult.scores.overall ?? 0,
    };
  }

  if (md.mixedPresetAssemblyApplied === true) {
    const sections =
      md.mosaicSectionRealizationResults?.map((r) => ({
        label: r.sectionLabel,
        startBar: r.startBar,
        endBar: r.endBar,
        presetRole: r.presetRole,
        partCount: r.partCount ?? 0,
      })) ?? [];
    bundle.mixedPresetEcho = {
      applied: true,
      exportIntegrityPassed: input.exportIntegrityPassed ?? false,
      sections,
      totalParts: md.assembledScoreRegistry?.length ?? 0,
    };
  }

  return bundle;
}

export function buildGenerateResultEchoManifest(
  echoes: GenerateResultEchoBundle
): GenerateResultEchoManifest | undefined {
  const manifest: GenerateResultEchoManifest = {};

  if (echoes.importEcho) {
    manifest.import = {
      sourceFormat: echoes.importEcho.sourceFormat,
      harmonyMode: echoes.importEcho.importHarmonyMode,
      parseDiagnosticCount: echoes.importEcho.parseDiagnostics.length,
    };
  }

  if (echoes.variationEcho) {
    manifest.variation = {
      autoSelected: echoes.variationEcho.autoSelected,
      candidateScores: echoes.variationEcho.candidates.map((c) => c.evalScore),
    };
  }

  if (echoes.styleTransferEcho) {
    manifest.styleTransfer = {
      composer: echoes.styleTransferEcho.composerApplied,
      strength: echoes.styleTransferEcho.strengthApplied,
      melodyRetained: echoes.styleTransferEcho.melodyRetained,
    };
  }

  if (echoes.mixedPresetEcho) {
    manifest.mixedPreset = {
      exportIntegrityPassed: echoes.mixedPresetEcho.exportIntegrityPassed,
      sections: echoes.mixedPresetEcho.sections.map((s) => ({
        label: s.label,
        presetRole: s.presetRole,
      })),
    };
  }

  return Object.keys(manifest).length > 0 ? manifest : undefined;
}
