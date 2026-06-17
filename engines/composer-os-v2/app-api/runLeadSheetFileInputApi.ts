/**
 * Phase 6 - thin desktop IPC bridge to the Phase 1-5 leadsheet file-input pipeline.
 * Calls existing import-layer proof runner; no engine logic duplication.
 */

import fs from 'fs';
import path from 'path';
import { runDebussyLeadSheetFileHandoffProof } from '../core/import/runDebussyLeadSheetFileHandoffProof';
import { EXPECTED_QUINTET_PART_IDS } from '../core/import/runDebussyLeadSheetQuintetProof';

export const LEADSHEET_FILE_INPUT_COMPOSERS = ['debussy', 'kenny_wheeler', 'bartok', 'james_brown'] as const;
export type LeadSheetFileInputComposerId = (typeof LEADSHEET_FILE_INPUT_COMPOSERS)[number];

export interface LeadSheetFileInputRequest {
  filePath: string;
  composerId: LeadSheetFileInputComposerId;
  seed?: number;
  /** 0 = calmer rhythmic activity, 1 = more active. */
  rhythmicActivity?: number;
  /** 0 = lighter guitar comp, 0.5 = baseline, 1 = busier. */
  guitarCompDensity?: number;
}

export interface LeadSheetFileInputResponse {
  ok: boolean;
  error?: string;
  canceled?: boolean;
  composerId?: LeadSheetFileInputComposerId;
  sourceFileName?: string;
  sourceFormat?: 'musicxml' | 'midi';
  harmonyProvenance?: 'explicit' | 'inferred-advisory';
  harmonyConfidenceByBar?: number[];
  midiQuantizeNote?: string;
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
    return { ok: false, error: 'No leadsheet file path provided.' };
  }
  if (!fs.existsSync(filePath)) {
    return { ok: false, error: `File not found: ${filePath}` };
  }
  const ext = path.extname(filePath).toLowerCase();
  const allowedExt = new Set(['.musicxml', '.xml', '.mid', '.midi']);
  if (!allowedExt.has(ext)) {
    return {
      ok: false,
      error: `Unsupported file type "${ext}". Use .musicxml, .xml, .mid, or .midi.`,
    };
  }
  const composerId = req.composerId;
  if (!isAllowedComposer(composerId)) {
    return {
      ok: false,
      error: `Unsupported composer: ${composerId}. Use debussy, kenny_wheeler, bartok, or james_brown.`,
    };
  }

  try {
    const seed = req.seed ?? DEFAULT_SEED;
    const rhythmicActivity =
      typeof req.rhythmicActivity === 'number' && Number.isFinite(req.rhythmicActivity)
        ? Math.max(0, Math.min(1, req.rhythmicActivity))
        : 0.35;
    const guitarCompDensity =
      typeof req.guitarCompDensity === 'number' && Number.isFinite(req.guitarCompDensity)
        ? Math.max(0, Math.min(1, req.guitarCompDensity))
        : 0.5;
    const proof = runDebussyLeadSheetFileHandoffProof(filePath, seed, composerId, {
      rhythmicActivity,
      guitarCompDensity,
    });

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
    const runId = Date.now();
    const savedMusicXmlPath = path.join(outDir, `${safeStem}_${composerId}_v${runId}_quintet.musicxml`);
    fs.writeFileSync(savedMusicXmlPath, proof.musicXml, 'utf8');

    const barCount = proof.effectiveHarmonyBars?.length ?? proof.importedHarmonyBars?.length ?? 0;
    const harmonyConfidenceByBar = proof.harmonyByBar.map((h) => h.confidence);

    return {
      ok: true,
      composerId,
      sourceFileName,
      sourceFormat: proof.sourceFormat,
      harmonyProvenance: proof.harmonyAdvisoryOnly ? 'inferred-advisory' : 'explicit',
      harmonyConfidenceByBar,
      ...(proof.sourceFormat === 'midi'
        ? {
            midiQuantizeNote:
              'MIDI input v1: single-track melody only. Multi-track Sibelius/DAW exports will mislabel melody and harmony — use MusicXML for those scores. Melody quantizes to eighth notes; harmony is inferred and advisory.',
          }
        : {}),
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
