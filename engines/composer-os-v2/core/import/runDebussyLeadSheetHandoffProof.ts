/**
 * Phase 3 - debussy leadsheet-input melody hand-off proof runner.
 */

import { exportScoreModelToMusicXml } from '../export/musicxmlExporter';
import { assembleDebussyLeadSheetQuintetWithHandoffScore } from './assembleDebussyLeadSheetQuintetWithHandoffScore';

export interface DebussyLeadSheetHandoffProofResult {
  seed: number;
  partIds: string[];
  perBarMelodyOwnership: Array<{ bar: number; ownerPartId: string }>;
  melodyCarrierPartIds: string[];
  handoffVariationDetected: boolean;
  guitarMelodyBars: number[];
  guitarHarmonyBars: number[];
  melodyPinnedOnGuitarSegments: boolean;
  hasBassPart: boolean;
  guitarMelodyAbsentOnHandoffBars: boolean;
  scoreDump: {
    title: string;
    parts: Array<{ id: string; name: string; noteCount: number }>;
    perBarMelodyOwnership: Array<{ bar: number; ownerPartId: string }>;
  };
  musicXml: string;
  musicXmlExportOk: boolean;
}

export function runDebussyLeadSheetHandoffProof(seed = 90104): DebussyLeadSheetHandoffProofResult {
  const handoff = assembleDebussyLeadSheetQuintetWithHandoffScore(seed);
  const { score, perBarMelodyOwnership, melodyCarrierPartIds, handoffVariationDetected } = handoff;

  const partsDump = score.parts.map((p) => {
    let noteCount = 0;
    for (const m of p.measures) {
      for (const e of m.events) {
        if (e.kind === 'note') noteCount++;
      }
    }
    return { id: p.id, name: p.name, noteCount };
  });

  const exportResult = exportScoreModelToMusicXml(score);

  return {
    seed,
    partIds: handoff.partIds,
    perBarMelodyOwnership,
    melodyCarrierPartIds,
    handoffVariationDetected,
    guitarMelodyBars: handoff.guitarMelodyBars,
    guitarHarmonyBars: handoff.guitarHarmonyBars,
    melodyPinnedOnGuitarSegments: handoff.melodyPinnedOnGuitarSegments,
    hasBassPart: handoff.hasBassPart,
    guitarMelodyAbsentOnHandoffBars: handoff.guitarHarmonyBars.every((bar) => !handoff.guitarMelodyBars.includes(bar)),
    scoreDump: {
      title: score.title,
      parts: partsDump,
      perBarMelodyOwnership,
    },
    musicXml: exportResult.xml ?? '',
    musicXmlExportOk: exportResult.success === true,
  };
}