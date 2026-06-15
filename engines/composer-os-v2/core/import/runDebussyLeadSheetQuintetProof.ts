/**
 * Phase 2 - debussy leadsheet-input quintet proof runner.
 */

import { exportScoreModelToMusicXml } from '../export/musicxmlExporter';
import { assembleDebussyLeadSheetQuintetScore } from './assembleDebussyLeadSheetQuintetScore';
import {
  SQ_PART_V1,
  SQ_PART_V2,
  SQ_PART_VA,
  SQ_PART_VC,
} from '../string-quartet/stringQuartetTypes';

import type { MosaicImportTimeline } from './mosaicImportTimeline';

export const EXPECTED_QUINTET_PART_IDS = ['guitar', SQ_PART_V1, SQ_PART_V2, SQ_PART_VA, SQ_PART_VC] as const;

export interface DebussyLeadSheetQuintetProofResult {
  seed: number;
  partIds: string[];
  partNames: string[];
  melodyPinned: boolean;
  hasBassPart: boolean;
  stringNoteCount: number;
  musicContextBarCount: number;
  appliedHarmonyBars: string[];
  scoreDump: {
    title: string;
    parts: Array<{ id: string; name: string; noteCount: number; bar1Chord?: string }>;
  };
  musicXml: string;
  musicXmlExportOk: boolean;
}

export function runDebussyLeadSheetQuintetProof(
  seed = 90103,
  importTimeline?: MosaicImportTimeline,
  composerId = 'debussy'
): DebussyLeadSheetQuintetProofResult {
  const assembly = assembleDebussyLeadSheetQuintetScore(seed, importTimeline, composerId);
  const { score, spine, melodyPinned, partIds, partNames, hasBassPart, stringNoteCount, musicContextBarCount } =
    assembly;

  const partsDump = score.parts.map((p) => {
    let noteCount = 0;
    for (const m of p.measures) {
      for (const e of m.events) {
        if (e.kind === 'note') noteCount++;
      }
    }
    return { id: p.id, name: p.name, noteCount, bar1Chord: p.measures[0]?.chord };
  });

  const exportResult = exportScoreModelToMusicXml(score);

  return {
    seed,
    partIds,
    partNames,
    melodyPinned,
    hasBassPart,
    stringNoteCount,
    musicContextBarCount,
    appliedHarmonyBars: spine.appliedHarmonyBars,
    scoreDump: { title: score.title, parts: partsDump },
    musicXml: exportResult.xml ?? '',
    musicXmlExportOk: exportResult.success === true,
  };
}