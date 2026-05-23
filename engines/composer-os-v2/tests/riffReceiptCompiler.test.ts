/**
 * Receipt compiler — sly_stone / led_zeppelin / frank_zappa research fingerprint coverage.
 */

import {
  DG_FINGERPRINT_RECEIPT_IDS,
  EVH_FINGERPRINT_RECEIPT_IDS,
  FZBLUES_RECEIPT_IDS,
  FRANK_ZAPPA_FZ_RECEIPT_IDS,
  FRANK_ZAPPA_RESEARCH_RECEIPT_IDS,
  FRANK_ZAPPA_RIFF_RECEIPT_IDS,
  FRANK_ZAPPA_RIFF_RECEIPT_LINES,
  LC_FINGERPRINT_RECEIPT_IDS,
  LED_ZEPPELIN_RESEARCH_RECEIPT_IDS,
  SLY_STONE_RESEARCH_RECEIPT_IDS,
  assertPatchKeysKnown,
  compileReceiptMetadata,
  compileReceiptsToRiffProfilePatch,
  compileResearchReceiptLine,
  compileResearchReceiptLines,
} from '../core/riff-generator/riffReceiptCompiler';
import { resolveRiffGeneratorProfileWithMeta } from '../core/riff-generator/resolveRiffGeneratorProfile';
import type { RiffProfile } from '../core/composer/riffProfileTypes';

function receiptHasPatchField(
  patch: Partial<RiffProfile>,
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
  if (id.startsWith('zappa_solo_')) return patch.soloGeneratorProfile?.enabled === true;
  if (id.startsWith('FZ_MELO_')) return (patch.variationOperators?.length ?? 0) > 0;
  if (id.startsWith('FZ_RHY_')) return patch.chromaticBudget !== undefined;
  if (id.startsWith('FZ_HARM_')) return (patch.chordQualitySet?.length ?? 0) > 0;
  if (id.startsWith('FZ_BASS_')) return patch.bassContourPolicy !== undefined;
  if (id.startsWith('FZ_FORM_')) return patch.repetitionPolicy?.exactLoopAllowed === false;
  if (id.startsWith('FZ_DIS_')) return patch.tritoneStable === true && patch.chromaticBudget !== undefined;
  if (id.startsWith('FZ_GTR_')) return patch.ornamentPolicy !== undefined;
  if (id.startsWith('FZ_ORCH_')) return patch.ensembleInterlockMode !== undefined;
  if (id.startsWith('FZ_RIFF_HARM_')) {
    return patch.scalePool !== undefined && patch.chromaticBudget !== undefined;
  }
  if (id.startsWith('FZ_RIFF_RHY_')) {
    return (patch.groupingPatterns?.length ?? 0) > 0 || patch.oddMeterUsage !== undefined;
  }
  if (id.startsWith('FZ_RIFF_MELO_')) return (patch.variationOperators?.length ?? 0) > 0;
  if (id.startsWith('FZ_RIFF_SOLO_')) return patch.soloGeneratorProfile?.enabled === true;
  if (id.startsWith('LC_REG_')) return patch.tuningPolicy?.midiFloor !== undefined;
  if (id.startsWith('LC_RHY_')) return patch.rhythmFeel?.primarySubdivision !== undefined;
  if (id.startsWith('LC_INT_')) return Object.keys(patch.intervalWeights ?? {}).length > 0;
  if (id.startsWith('LC_HARM_')) {
    if (id.includes('_002')) {
      return patch.tuningPolicy?.tuningOptions?.chordToneRatio !== undefined;
    }
    return Object.keys(patch.scalePool ?? {}).length > 0;
  }
  if (id.startsWith('LC_PHR_')) {
    return (patch.phraseLengthBeats?.length ?? 0) > 0 && patch.cadenceTypes !== undefined;
  }
  if (id.startsWith('LC_SIL_')) return patch.silencePolicy !== undefined && patch.spacePolicy !== undefined;
  if (id.startsWith('LC_VAR_')) return (patch.variationOperators?.length ?? 0) > 0;
  if (id.startsWith('LC_MODE_')) {
    return patch.styleModes !== undefined && patch.tuningPolicy?.tuningOptions?.lcStyleModeSwitch === 1;
  }
  if (id.startsWith('DG_REG_')) return patch.tuningPolicy?.midiFloor !== undefined;
  if (id.startsWith('DG_RHY_')) return patch.rhythmFeel?.primarySubdivision !== undefined;
  if (id.startsWith('DG_INT_')) return Object.keys(patch.intervalWeights ?? {}).length > 0;
  if (id.startsWith('DG_BEND_')) {
    return patch.ornamentPolicy?.bends === true && patch.tuningPolicy?.tuningOptions?.bendHalfStep !== undefined;
  }
  if (id.startsWith('DG_HARM_')) {
    if (id.includes('_002')) {
      return patch.tuningPolicy?.tuningOptions?.chordToneRatio !== undefined;
    }
    return Object.keys(patch.scalePool ?? {}).length > 0;
  }
  if (id.startsWith('DG_PHR_')) {
    return (patch.phraseLengthBeats?.length ?? 0) > 0 && patch.tuningPolicy?.tuningOptions?.emotionalArcPeak !== undefined;
  }
  if (id.startsWith('DG_SIL_')) {
    return patch.tuningPolicy?.tuningOptions?.sustainedNoteBias !== undefined;
  }
  if (id.startsWith('DG_VAR_')) return (patch.variationOperators?.length ?? 0) > 0;
  if (id.startsWith('DG_MODE_')) {
    return patch.styleModes !== undefined && patch.tuningPolicy?.tuningOptions?.dgStyleModeSwitch === 1;
  }
  if (id.startsWith('EVH_REG_')) return patch.tuningPolicy?.midiFloor !== undefined;
  if (id.startsWith('EVH_RHY_')) return patch.rhythmFeel?.primarySubdivision !== undefined;
  if (id.startsWith('EVH_TAP_')) return patch.tuningPolicy?.tuningOptions?.tapToPulloffRatio !== undefined;
  if (id.startsWith('EVH_INT_')) {
    if (id.includes('_002')) {
      return (
        Object.keys(patch.intervalWeights ?? {}).length > 0 &&
        patch.tuningPolicy?.tuningOptions?.chromaticRunsHigh === 1
      );
    }
    return (
      Object.keys(patch.intervalWeights ?? {}).length > 0 &&
      patch.textureMix?.openStringDroneProb !== undefined
    );
  }
  if (id.startsWith('EVH_HARM_')) {
    return (
      Object.keys(patch.scalePool ?? {}).length > 0 &&
      patch.tuningPolicy?.tuningOptions?.susUsageVeryHigh !== undefined
    );
  }
  if (id.startsWith('EVH_PHR_')) {
    return (patch.phraseLengthBeats?.length ?? 0) > 0 && patch.cadenceTypes !== undefined;
  }
  if (id.startsWith('EVH_SIL_')) {
    return patch.silencePolicy !== undefined && patch.spacePolicy !== undefined;
  }
  if (id.startsWith('EVH_VAR_')) return (patch.variationOperators?.length ?? 0) > 0;
  if (id.startsWith('EVH_MODE_')) {
    return patch.styleModes !== undefined && patch.tuningPolicy?.tuningOptions?.evhStyleModeSwitch === 1;
  }
  const fzKind = id.toUpperCase().replace(/_/g, '-');
  if (fzKind.includes('FZBLUES-MODAL')) {
    return (
      Object.keys(patch.scalePool ?? {}).length > 0 &&
      patch.soloGeneratorProfile?.scaleMinglingEnabled !== undefined
    );
  }
  if (fzKind.includes('FZBLUES-CHROM')) {
    return patch.chromaticBudget !== undefined && patch.soloGeneratorProfile?.chromaticBudget !== undefined;
  }
  if (fzKind.includes('FZBLUES-DENS')) {
    return patch.soloGeneratorProfile?.noteDensityRange?.max !== undefined;
  }
  if (fzKind.includes('FZBLUES-RHYTHM') || fzKind.includes('FZBLUES-RHY')) {
    return patch.chromaticBudget !== undefined && (patch.groupingPatterns?.length ?? 0) > 0;
  }
  if (fzKind.includes('FZBLUES-PHRASE') || fzKind.includes('FZBLUES-PHR')) {
    return patch.cadenceTypes !== undefined && patch.tuningPolicy?.tuningOptions?.phraseEndingHardCut !== undefined;
  }
  if (fzKind.includes('FZBLUES-VAR')) return (patch.variationOperators?.length ?? 0) > 0;
  if (fzKind.includes('FZBLUES-VAMP')) {
    return patch.pedalPoint?.enabled !== undefined && patch.tuningPolicy?.tuningOptions?.vampType !== undefined;
  }
  return false;
}

const FZBLUES_RECEIPT_LINES = [
  'FZBLUES-MODAL — modalBase: Dorian, Mixolydian; pentatonicAnchorRatio 0.38; scaleMinglingEnabled true',
  'FZBLUES-CHROM — chromaticBudget 0.30',
  'FZBLUES-DENS — noteDensityRange: min 8, max 24',
  'FZBLUES-RHYTHM — rhythmicGroupings: 5, 7, 3, hemiola; chromaticBudget 0.30',
  'FZBLUES-PHRASE — phraseEndingPolicy: openStringPullOff feedbackSustain threeQuarterStepBend hardCut; contourShape arch',
  'FZBLUES-VAMP — vampType pedalOrTwoChord; keyVampPatterns i-bVI7, i-bIImaj7, Dm-A, I-II-Lydian',
  'FZBLUES-VAR — variationOperators: cycledMotifRhythmVariation octaveDisplacement tremoloPickTextureBurst openStringPullOffInjection scaleNeighbourNoteMingling',
] as const;

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
    const patch = compileReceiptsToRiffProfilePatch('frank_zappa');
    const meta = compileReceiptMetadata('frank_zappa');
    const fzOk = FRANK_ZAPPA_FZ_RECEIPT_IDS.every((id) => {
      const m = meta[id];
      if (!m) return false;
      if (m.metadataOnly) return true;
      return receiptHasPatchField(patch, id);
    });
    out.push({
      ok: fzOk && FRANK_ZAPPA_FZ_RECEIPT_IDS.every((id) => meta[id] !== undefined),
      name: `frank_zappa: all ${FRANK_ZAPPA_FZ_RECEIPT_IDS.length} FZ_* receipt ids mapped or metadataOnly`,
    });

    const soloOk = FRANK_ZAPPA_RESEARCH_RECEIPT_IDS.every((id) => {
      const m = meta[id];
      if (!m) return false;
      if (m.metadataOnly) return true;
      return receiptHasPatchField(patch, id);
    });
    out.push({
      ok: soloOk && FRANK_ZAPPA_RESEARCH_RECEIPT_IDS.every((id) => meta[id] !== undefined),
      name: `frank_zappa: all ${FRANK_ZAPPA_RESEARCH_RECEIPT_IDS.length} zappa_solo_* receipt ids mapped or metadataOnly`,
    });

    const unknown = assertPatchKeysKnown(patch);
    out.push({
      ok: unknown.length === 0,
      name: 'frank_zappa: compileReceiptsToRiffProfilePatch has no unknown keys',
    });
  }

  {
    const riffMeta: Record<string, { metadataOnly: boolean }> = {};
    for (const line of FRANK_ZAPPA_RIFF_RECEIPT_LINES) {
      const { id, metadataOnly } = compileResearchReceiptLine(line);
      riffMeta[id] = { metadataOnly };
    }
    const riffPatch = compileResearchReceiptLines(FRANK_ZAPPA_RIFF_RECEIPT_LINES);
    const riffOk = FRANK_ZAPPA_RIFF_RECEIPT_IDS.every((id) => {
      const m = riffMeta[id];
      if (!m) return false;
      if (m.metadataOnly) return true;
      return receiptHasPatchField(riffPatch, id);
    });
    out.push({
      ok: riffOk && assertPatchKeysKnown(riffPatch).length === 0,
      name: `frank_zappa: all ${FRANK_ZAPPA_RIFF_RECEIPT_IDS.length} FZ_RIFF_* receipt ids mapped or metadataOnly`,
    });
  }

  for (const vrbId of ['larry_carlton', 'david_gilmour'] as const) {
    const ids = vrbId === 'larry_carlton' ? LC_FINGERPRINT_RECEIPT_IDS : DG_FINGERPRINT_RECEIPT_IDS;
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
      name: `${vrbId}: all ${ids.length} LC/DG fingerprint receipt ids mapped or metadataOnly`,
    });
    out.push({
      ok: assertPatchKeysKnown(patch).length === 0,
      name: `${vrbId}: compileReceiptsToRiffProfilePatch has no unknown keys`,
    });
  }

  {
    const patch = compileReceiptsToRiffProfilePatch('eddie_van_halen');
    const meta = compileReceiptMetadata('eddie_van_halen');
    const allOk = EVH_FINGERPRINT_RECEIPT_IDS.every((id) => {
      const m = meta[id];
      if (!m) return false;
      if (m.metadataOnly) return true;
      return receiptHasPatchField(patch, id);
    });
    out.push({
      ok: allOk && EVH_FINGERPRINT_RECEIPT_IDS.every((id) => meta[id] !== undefined),
      name: `testEddieVanHalenReceiptCompiler: all ${EVH_FINGERPRINT_RECEIPT_IDS.length} EVH_* receipt ids mapped or metadataOnly`,
    });
    out.push({
      ok: assertPatchKeysKnown(patch).length === 0,
      name: 'eddie_van_halen: compileReceiptsToRiffProfilePatch has no unknown keys',
    });
  }

  {
    const fzBluesMeta: Record<string, { metadataOnly: boolean }> = {};
    for (const line of FZBLUES_RECEIPT_LINES) {
      const { id, metadataOnly } = compileResearchReceiptLine(line);
      fzBluesMeta[id] = { metadataOnly };
    }
    const fzBluesPatch = compileResearchReceiptLines(FZBLUES_RECEIPT_LINES);
    const fzBluesOk = FZBLUES_RECEIPT_IDS.every((id) => {
      const m = fzBluesMeta[id];
      if (!m) return false;
      if (m.metadataOnly) return true;
      return receiptHasPatchField(fzBluesPatch, id);
    });
    out.push({
      ok: fzBluesOk && assertPatchKeysKnown(fzBluesPatch).length === 0,
      name: `frank_zappa: all ${FZBLUES_RECEIPT_IDS.length} FZBLUES_* receipt ids mapped or metadataOnly`,
    });
    const fzBluesPrefixOnly = FZBLUES_RECEIPT_LINES.every((line) => {
      const { patch } = compileResearchReceiptLine(line);
      return assertPatchKeysKnown(patch).length === 0;
    });
    out.push({
      ok: fzBluesPrefixOnly,
      name: 'frank_zappa: FZBLUES prefix compile has no unknown patch keys',
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
