/**
 * Phase 6 - thin desktop IPC bridge to the Phase 1-5 leadsheet file-input pipeline.
 * Calls existing import-layer proof runner; no engine logic duplication.
 */

import fs from 'fs';
import path from 'path';
import { runDebussyLeadSheetFileHandoffProof } from '../core/import/runDebussyLeadSheetFileHandoffProof';
import { EXPECTED_QUINTET_PART_IDS } from '../core/import/runDebussyLeadSheetQuintetProof';

export const LEADSHEET_FILE_INPUT_COMPOSERS = ['debussy', 'kenny_wheeler'] as const;
export type LeadSheetFileInputComposerId = (typeof LEADSHEET_FILE_INPUT_COMPOSERS)[number];

export interface LeadSheetFileInputRequest {
  filePath: string;
  composerId: LeadSheetFileInputComposerId;
  seed?: number;
}

export interface LeadSheetFileInputResponse {
  ok: boolean;
  error?: string;
  canceled?: boolean;
  composerId?: LeadSheetFileInputComposerId;
  sourceFileName?: string;
  barCount?: number;
  partCount?: number;
  partIds?: string[];
  hasBassPart?: boolean;
  hasDuoParts?: boolean;
  handoffVariationDetected?: boolean;
  melodyCarrierPartIds?: string[];
  musicXmlExportOk?: boolean;
  savedMusicXmlPath?: string;
}

const DEFAULT_SEED = 90106;

function isAllowedComposer(id: string): id is LeadSheetFileInputComposerId {
  return (LEADSHEET_FILE_INPUT_COMPOSERS as readonly string[]).includes(id);
}

export function apiRunLeadSheetFileInput(
  req: LeadSheetFileInputRequest,
  outputDir: string
): LeadSheetFileInputResponse {
  const filePath = typeof req.filePath === 'string' ? req.filePath.trim() : '';
  if (!filePath) {
    return { ok: false, error: 'No MusicXML file path provided.' };
  }
  if (!fs.existsSync(filePath)) {
    return { ok: false, error: `File not found: ${filePath}` };
  }
  const composerId = req.composerId;
  if (!isAllowedComposer(composerId)) {
    return {
      ok: false,
      error: `Unsupported composer: ${composerId}. Use debussy or kenny_wheeler.`,
    };
  }

  try {
    const seed = req.seed ?? DEFAULT_SEED;
    const proof = runDebussyLeadSheetFileHandoffProof(filePath, seed, composerId);

    const partIds = proof.partIds;
    const quintetMatch =
      partIds.length === EXPECTED_QUINTET_PART_IDS.length &&
      EXPECTED_QUINTET_PART_IDS.every((id, i) => partIds[i] === id);
    if (!quintetMatch) {
      return {
        ok: false,
        error: `Expected quintet parts [${EXPECTED_QUINTET_PART_IDS.join(', ')}]; got [${partIds.join(', ')}].`,
      };
    }
    if (proof.hasBassPart) {
      return { ok: false, error: 'Output unexpectedly contains a bass part.' };
    }
    if (!proof.musicXmlExportOk || !proof.musicXml) {
      return { ok: false, error: 'MusicXML export failed.' };
    }
    if (!proof.handoffVariationDetected || proof.melodyCarrierPartIds.length < 2) {
      return { ok: false, error: 'Melody hand-off not detected in pipeline output.' };
    }

    const sourceFileName = path.basename(filePath);
    const safeStem = sourceFileName
      .replace(/\.[^.]+$/, '')
      .replace(/[^\w.-]+/g, '_')
      .slice(0, 60);
    const outDir = path.join(outputDir, 'leadsheet-input');
    fs.mkdirSync(outDir, { recursive: true });
    const savedMusicXmlPath = path.join(outDir, `${safeStem}_${composerId}_quintet.musicxml`);
    fs.writeFileSync(savedMusicXmlPath, proof.musicXml, 'utf8');

    const barCount = proof.effectiveHarmonyBars?.length ?? proof.importedHarmonyBars?.length ?? 0;

    return {
      ok: true,
      composerId,
      sourceFileName,
      barCount,
      partCount: partIds.length,
      partIds: [...partIds],
      hasBassPart: proof.hasBassPart,
      hasDuoParts: false,
      handoffVariationDetected: proof.handoffVariationDetected,
      melodyCarrierPartIds: [...proof.melodyCarrierPartIds],
      musicXmlExportOk: proof.musicXmlExportOk,
      savedMusicXmlPath,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}
