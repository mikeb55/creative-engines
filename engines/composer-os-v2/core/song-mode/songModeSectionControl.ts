/**
 * Song Mode — section-role mapping + behaviour registration + aggregated diagnostics/receipts.
 */

import type { GenerationMetadata } from '../compositionContext';
import {
  sectionKindForBar,
  type SophisticatedPopSectionKind,
} from './sophisticatedPopHarmonyDressing';
import type {
  SongModeSectionBehaviourDescriptor,
  SongModeSectionRole,
  SongModeSectionShapingDiagnosticsV1,
  SongModeReturnVariationType,
} from './songModeSectionTypes';

export type { SongModeSectionRole, SongModeSectionBehaviourDescriptor, SongModeSectionShapingDiagnosticsV1 };

/** Map existing Sophisticated Pop section kinds to shared roles (form-relative). */
export function mapSophisticatedPopKindToSongModeRole(kind: SophisticatedPopSectionKind): SongModeSectionRole {
  switch (kind) {
    case 'single':
      return 'WHOLE';
    case 'A':
    case 'A_prime':
      return 'OPENING';
    case 'B':
      return 'BRIDGE_LIFT';
    case 'return':
      return 'RETURN';
    default:
      return 'OPENING';
  }
}

/**
 * Form-relative section role for a bar (1-based). Optionally marks a short **outro** tail on long forms
 * without changing harmony dressing section kinds.
 */
export function songModeSectionRoleForBar(barIndex1: number, totalBars: number): SongModeSectionRole {
  if (totalBars >= 40 && barIndex1 > totalBars - 8) return 'OUTRO';
  const kind = sectionKindForBar(barIndex1, totalBars);
  return mapSophisticatedPopKindToSongModeRole(kind);
}

export function registerSongModeSectionBehaviour(
  metadata: GenerationMetadata,
  descriptor: SongModeSectionBehaviourDescriptor
): void {
  const cur = metadata.songModeSectionBehaviourDescriptors ?? [];
  metadata.songModeSectionBehaviourDescriptors = [...cur, descriptor];
}

function mergeReturnVariationType(descs: SongModeSectionBehaviourDescriptor[]): SongModeReturnVariationType | null {
  const priority: SongModeReturnVariationType[] = [
    'evolved_comp',
    'harmonic_recolour',
    'lighter_texture',
    'delayed_reentry',
  ];
  for (const p of priority) {
    if (descs.some((d) => d.returnVariationType === p)) return p;
  }
  if (descs.some((d) => d.returnVariationType === 'none')) return 'none';
  return null;
}

function appendSurfaceNotes(metadata: GenerationMetadata, lines: string[]): void {
  if (lines.length === 0) return;
  metadata.songModeStyleSurfaceNotes = [...(metadata.songModeStyleSurfaceNotes ?? []), ...lines];
}

function buildReceiptLines(d: SongModeSectionShapingDiagnosticsV1): string[] {
  const lines: string[] = [];
  if (d.colourDeltaBMinusA != null && d.colourDeltaBMinusA > 0.015) {
    lines.push(
      `Song Mode section shaping: B section ran brighter harmonic colour than opening sections (Δ≈${d.colourDeltaBMinusA.toFixed(2)}).`
    );
  }
  if (d.densityDeltaBMinusA != null && Math.abs(d.densityDeltaBMinusA) > 1e-4) {
    lines.push(
      `Song Mode section shaping: B-section density contrast vs opening (keys-comp proxy Δ≈${d.densityDeltaBMinusA.toFixed(3)}).`
    );
  }
  if (d.openingVsReturnDelta != null && Math.abs(d.openingVsReturnDelta) > 1e-4) {
    lines.push(
      `Song Mode section shaping: return re-entered with measurable contrast vs opening rhythm/register (Δ≈${d.openingVsReturnDelta.toFixed(3)}).`
    );
  }
  if (d.returnVariationSummary && d.returnVariationSummary.trim()) {
    lines.push(`Song Mode section shaping: ${d.returnVariationSummary.trim()}`);
  }
  return lines.slice(0, 4);
}

/**
 * Call after score generation so `fagenKeysCompMusicalDiagnostics` is populated when Fagen keys-comp runs.
 * Idempotent: overwrites `songModeSectionShapingDiagnostics` with latest aggregate.
 */
export function finalizeSongModeSectionShaping(metadata: GenerationMetadata): void {
  const descs = metadata.songModeSectionBehaviourDescriptors ?? [];
  const tb =
    (typeof metadata.totalBars === 'number' && metadata.totalBars > 0
      ? metadata.totalBars
      : metadata.parsedCustomProgressionBars?.length) ?? 0;
  if (tb <= 0 && descs.length === 0) return;

  const fagen = metadata.fagenKeysCompMusicalDiagnostics;
  const soph = metadata.sophisticatedPopHarmonyDiagnostics;
  const bach = metadata.bacharachHarmonyDiagnostics;

  const colourDeltaBMinusA =
    bach?.sectionContrastDelta ?? soph?.sectionContrastDelta ?? null;

  const densityDeltaBMinusA = fagen?.densityDeltaBMinusA ?? null;

  const openingVsReturnDelta = fagen?.openingVsReturnRhMeanDelta ?? null;

  let returnVariationSummary: string | null = fagen?.returnVariationSummary ?? null;
  if (!returnVariationSummary && bach?.returnCadenceLiftApplied) {
    returnVariationSummary = 'Return cadence lift applied on harmony surface (small re-colour).';
  }

  const contributingSlices = [...new Set(descs.map((d) => d.sliceId))];

  const returnVariationType = mergeReturnVariationType(descs);

  const diag: SongModeSectionShapingDiagnosticsV1 = {
    version: 1,
    totalBars: tb || 0,
    densityDeltaBMinusA,
    colourDeltaBMinusA,
    openingVsReturnDelta,
    returnVariationSummary,
    returnVariationType,
    contributingSlices,
  };

  metadata.songModeSectionShapingDiagnostics = diag;

  const receiptLines = buildReceiptLines(diag);
  if (receiptLines.length > 0) {
    appendSurfaceNotes(metadata, receiptLines);
  }
}
