/**
 * Receipt compiler — sly_stone / led_zeppelin research fingerprint coverage.
 */

import {
  LED_ZEPPELIN_RESEARCH_RECEIPT_IDS,
  SLY_STONE_RESEARCH_RECEIPT_IDS,
  assertPatchKeysKnown,
  compileReceiptMetadata,
  compileReceiptsToRiffProfilePatch,
} from '../core/riff-generator/riffReceiptCompiler';
import { resolveRiffGeneratorProfileWithMeta } from '../core/riff-generator/resolveRiffGeneratorProfile';

function receiptHasPatchField(
  patch: ReturnType<typeof compileReceiptsToRiffProfilePatch>,
  id: string
): boolean {
  if (id.startsWith('sly_horns_')) return (patch.hornStabTopology?.length ?? 0) > 0;
  if (id.startsWith('sly_vocal_gtr_')) return patch.spacePolicy?.callResponsePattern !== undefined;
  if (id.startsWith('sly_organ_')) return patch.ensembleInterlockMode !== undefined;
  if (id.startsWith('sly_bass_')) return patch.bassContourPolicy !== undefined;
  if (id.startsWith('sly_variation_')) return (patch.variationOperators?.length ?? 0) > 0;
  if (id.startsWith('sly_riff_identity_')) return patch.loopIdentityPolicy !== undefined;
  if (id.startsWith('page_bow_')) return (patch.bowEventPolicy?.events?.length ?? 0) > 0;
  if (id.startsWith('page_theremin_') || id.startsWith('page_fx_')) {
    return (patch.fxMarkerPolicy?.markers?.length ?? 0) > 0;
  }
  if (id.startsWith('page_variation_')) {
    return (
      (patch.variationOperators?.length ?? 0) > 0 ||
      Object.keys(patch.variationOperatorsByStyleMode ?? {}).length > 0
    );
  }
  if (id.startsWith('page_doubletrack_')) return patch.doubleTrackPolicy !== undefined;
  if (id.startsWith('page_cadence_')) return patch.cadenceTypes !== undefined;
  if (id.startsWith('page_density_')) return (patch.sectionDensityPolicy?.transitions?.length ?? 0) > 0;
  return false;
}

export function runRiffReceiptCompilerTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  for (const vrbId of ['sly_stone', 'led_zeppelin'] as const) {
    const ids = vrbId === 'sly_stone' ? SLY_STONE_RESEARCH_RECEIPT_IDS : LED_ZEPPELIN_RESEARCH_RECEIPT_IDS;
    const patch = compileReceiptsToRiffProfilePatch(vrbId);
    const meta = compileReceiptMetadata(vrbId);
    const allOk = ids.every((id) => {
      const m = meta[id];
      if (!m) return false;
      if (m.metadataOnly) return true;
      return receiptHasPatchField(patch, id);
    });
    out.push({
      ok: allOk && ids.every((id) => meta[id] !== undefined),
      name: `${vrbId}: all ${ids.length} research receipt ids mapped or metadataOnly`,
    });

    const unknown = assertPatchKeysKnown(patch);
    out.push({
      ok: unknown.length === 0,
      name: `${vrbId}: compileReceiptsToRiffProfilePatch has no unknown keys`,
    });
  }

  {
    const meta = resolveRiffGeneratorProfileWithMeta({
      vrbId: 'sly_stone',
      style: 'funk',
      grid: 'sixteenth',
      density: 'medium',
    });
    const ok =
      meta.source === 'vrb' &&
      (meta.profile.hornStabTopology?.length ?? 0) >= 1 &&
      meta.profile.bassContourPolicy?.octaveJumpEveryBars !== undefined;
    out.push({
      ok,
      name: 'resolveRiffGeneratorProfileWithMeta merges sly_stone receipt patch over stub',
    });
  }

  return out;
}
