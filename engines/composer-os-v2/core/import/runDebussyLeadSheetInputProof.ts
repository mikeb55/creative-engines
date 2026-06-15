/**
 * Phase 1 - debussy-only leadsheet-input proof (parallel duo bypass).
 */

import { exportScoreModelToMusicXml } from '../export/musicxmlExporter';
import type { ScoreModel } from '../score-model/scoreModelTypes';
import { buildMelodyOnlyHarmonyScaffoldScore } from './buildMelodyOnlyHarmonyScaffoldScore';
import {
  buildDebussyLeadSheetHarmonySpine,
  DEBUSSY_LEADSHEET_PROOF_CHORDS,
  DEBUSSY_LEADSHEET_PROOF_MELODY,
  buildDebussyLeadSheetProofImportTimeline,
} from './buildDebussyLeadSheetHarmonySpine';
import { pinMelodyOnScore, verifyPinnedMelodyOnScore } from './mosaicStyleTransfer';

export {
  DEBUSSY_LEADSHEET_PROOF_CHORDS,
  DEBUSSY_LEADSHEET_PROOF_MELODY,
  buildDebussyLeadSheetProofImportTimeline,
};

export interface DebussyLeadSheetInputProofResult {
  seed: number;
  importedHarmonyBars: string[];
  debussyEffectiveHarmonyBars: string[];
  appliedHarmonyBars: string[];
  debussyPrecomputeCalled: boolean;
  debussyDeviceReceiptCount: number;
  melodyPinned: boolean;
  partIds: string[];
  hasBassPart: boolean;
  melodyNoteCount: number;
  scoreDump: {
    title: string;
    measures: Array<{ bar: number; chord: string | undefined; melodyPitches: number[] }>;
  };
  musicXml: string;
  musicXmlExportOk: boolean;
}

export function runDebussyLeadSheetInputProof(seed = 90101): DebussyLeadSheetInputProofResult {
  const spine = buildDebussyLeadSheetHarmonySpine(seed);
  const { importTimeline, importedHarmonyBars, debussyEffectiveHarmonyBars, appliedHarmonyBars, generationMetadata } =
    spine;

  let score: ScoreModel = buildMelodyOnlyHarmonyScaffoldScore(appliedHarmonyBars, {
    title: 'Debussy LeadSheet Input Proof',
  });
  score = pinMelodyOnScore(score, importTimeline.melodyLine);

  const melodyPinned = verifyPinnedMelodyOnScore(score, importTimeline.melodyLine);
  const leadPart = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  let melodyNoteCount = 0;
  const measures: DebussyLeadSheetInputProofResult['scoreDump']['measures'] = [];
  for (const m of leadPart?.measures ?? []) {
    const melodyPitches = m.events
      .filter((e) => e.kind === 'note' && (e.voice ?? 1) === 1)
      .map((e) => (e.kind === 'note' ? e.pitch : 0));
    melodyNoteCount += melodyPitches.length;
    measures.push({ bar: m.index, chord: m.chord, melodyPitches });
  }

  const exportResult = exportScoreModelToMusicXml(score);

  return {
    seed,
    importedHarmonyBars,
    debussyEffectiveHarmonyBars,
    appliedHarmonyBars,
    debussyPrecomputeCalled: Array.isArray(generationMetadata.debussyDeviceReceipts),
    debussyDeviceReceiptCount: generationMetadata.debussyDeviceReceipts?.length ?? 0,
    melodyPinned,
    partIds: score.parts.map((p) => p.id),
    hasBassPart: score.parts.some((p) => p.instrumentIdentity === 'acoustic_upright_bass'),
    melodyNoteCount,
    scoreDump: { title: score.title, measures },
    musicXml: exportResult.xml ?? '',
    musicXmlExportOk: exportResult.success === true,
  };
}