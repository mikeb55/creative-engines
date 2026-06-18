/**
 * Phase 4 - debussy leadsheet file-input hand-off proof runner.
 */

import { normalizeChordToken } from '../harmony/chordProgressionParser';
import { exportScoreModelToMusicXml } from '../export/musicxmlExporter';
import { importTimelineToLockedHarmony } from './importTimelineAdapters';
import { type DebussyLeadSheetHandoffProofResult } from './runDebussyLeadSheetHandoffProof';
import { assembleDebussyLeadSheetQuintetWithHandoffScore, type LeadSheetQuintetAssemblyOptions } from './assembleDebussyLeadSheetQuintetWithHandoffScore';
import { DEBUSSY_LEADSHEET_PROOF_CHORDS } from './buildDebussyLeadSheetHarmonySpine';
import {
  DEBUSSY_LEADSHEET_FILE_PROOF_CHORDS,
  loadDebussyLeadSheetImportTimelineFromFile,
} from './loadDebussyLeadSheetImportTimelineFromMusicXmlFile';
import { applyLeadSheetHarmonyOverrides } from './applyLeadSheetHarmonyOverrides';
import type { ImportHarmonyBar, ImportSourceFormat, MosaicImportTimeline } from './mosaicImportTimeline';

export interface DebussyLeadSheetFileHandoffProofResult extends DebussyLeadSheetHandoffProofResult {
  composerId: string;
  sourceFile: string;
  sourceFormat: ImportSourceFormat;
  harmonyAdvisoryOnly: boolean;
  harmonyByBar: ImportHarmonyBar[];
  importTimeline: MosaicImportTimeline;
  importedHarmonyBars: string[];
  appliedHarmonyBars: string[];
  effectiveHarmonyBars: string[];
  fileChordMatch: boolean;
  differsFromHardcodedProofChords: boolean;
}

export function runDebussyLeadSheetFileHandoffProof(
  filePath: string,
  seed = 90105,
  composerId = 'debussy',
  assemblyOptions?: LeadSheetQuintetAssemblyOptions,
): DebussyLeadSheetFileHandoffProofResult {
  let importTimeline = loadDebussyLeadSheetImportTimelineFromFile(filePath);
  if (assemblyOptions?.harmonyOverridesByBar) {
    importTimeline = applyLeadSheetHarmonyOverrides(importTimeline, assemblyOptions.harmonyOverridesByBar);
  }
  const importedHarmonyBars = importTimelineToLockedHarmony(importTimeline);
  const fileChordMatch =
    importTimeline.sourceFormat === 'musicxml' &&
    DEBUSSY_LEADSHEET_FILE_PROOF_CHORDS.every(
      (c, i) => normalizeChordToken(importedHarmonyBars[i] ?? '') === normalizeChordToken(c)
    );
  const differsFromHardcodedProofChords = importedHarmonyBars.some(
    (sym, i) => normalizeChordToken(sym) !== normalizeChordToken(DEBUSSY_LEADSHEET_PROOF_CHORDS[i] ?? '')
  );

  const handoff = assembleDebussyLeadSheetQuintetWithHandoffScore(seed, undefined, importTimeline, composerId, assemblyOptions);
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
    composerId,
    sourceFile: filePath,
    sourceFormat: importTimeline.sourceFormat,
    harmonyAdvisoryOnly: importTimeline.sourceFormat === 'midi',
    harmonyByBar: [...importTimeline.harmonyByBar],
    importTimeline,
    importedHarmonyBars,
    appliedHarmonyBars: handoff.spine.appliedHarmonyBars,
    effectiveHarmonyBars: handoff.spine.effectiveHarmonyBars,
    fileChordMatch,
    differsFromHardcodedProofChords,
    partIds: handoff.partIds,
    perBarMelodyOwnership,
    melodyCarrierPartIds,
    handoffVariationDetected,
    guitarMelodyBars: handoff.guitarMelodyBars,
    guitarHarmonyBars: handoff.guitarHarmonyBars,
    melodyPinnedOnGuitarSegments: handoff.melodyPinnedOnGuitarSegments,
    hasBassPart: handoff.hasBassPart,
    guitarMelodyAbsentOnHandoffBars: handoff.guitarHarmonyBars.every(
      (bar) => !handoff.guitarMelodyBars.includes(bar)
    ),
    scoreDump: {
      title: score.title,
      parts: partsDump,
      perBarMelodyOwnership,
    },
    musicXml: exportResult.xml ?? '',
    musicXmlExportOk: exportResult.success === true,
  };
}
