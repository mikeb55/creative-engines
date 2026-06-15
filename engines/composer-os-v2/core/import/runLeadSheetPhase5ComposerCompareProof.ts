/**
 * Phase 5 - second-composer leadsheet-input proof (same MusicXML, composerId varies).
 */

import { normalizeChordToken } from '../harmony/chordProgressionParser';
import {
  runDebussyLeadSheetFileHandoffProof,
  type DebussyLeadSheetFileHandoffProofResult,
} from './runDebussyLeadSheetFileHandoffProof';
import { EXPECTED_QUINTET_PART_IDS } from './runDebussyLeadSheetQuintetProof';
import {
  loadDebussyLeadSheetImportTimelineFromMusicXmlFile,
  resolveDebussyLeadSheetFileProofPath,
} from './loadDebussyLeadSheetImportTimelineFromMusicXmlFile';

/** Preferred second composer for Phase 5 widening proof. */
export const LEADSHEET_PHASE5_SECOND_COMPOSER = 'kenny_wheeler';

export interface LeadSheetHarmonyBarCompareRow {
  bar: number;
  imported: string;
  debussyEffective: string;
  secondComposerEffective: string;
  debussyApplied: string;
  secondComposerApplied: string;
  effectiveDiffers: boolean;
}

export interface LeadSheetPhase5ComposerCompareProofResult {
  sourceFile: string;
  seed: number;
  secondComposerId: string;
  debussy: DebussyLeadSheetFileHandoffProofResult;
  secondComposer: DebussyLeadSheetFileHandoffProofResult;
  harmonyCompare: LeadSheetHarmonyBarCompareRow[];
  harmonyDiffBarCount: number;
  sameImportedHarmony: boolean;
  quintetPartCountMatch: boolean;
  secondHasHandoff: boolean;
  secondNoBass: boolean;
  secondNoDuo: boolean;
}

export function buildLeadSheetHarmonyBarCompare(
  debussy: DebussyLeadSheetFileHandoffProofResult,
  second: DebussyLeadSheetFileHandoffProofResult
): LeadSheetHarmonyBarCompareRow[] {
  const bars = Math.max(
    debussy.effectiveHarmonyBars.length,
    second.effectiveHarmonyBars.length,
    debussy.importedHarmonyBars.length
  );
  const rows: LeadSheetHarmonyBarCompareRow[] = [];
  for (let i = 0; i < bars; i++) {
    const debEff = debussy.effectiveHarmonyBars[i] ?? '';
    const secEff = second.effectiveHarmonyBars[i] ?? '';
    rows.push({
      bar: i + 1,
      imported: debussy.importedHarmonyBars[i] ?? '',
      debussyEffective: debEff,
      secondComposerEffective: secEff,
      debussyApplied: debussy.appliedHarmonyBars[i] ?? '',
      secondComposerApplied: second.appliedHarmonyBars[i] ?? '',
      effectiveDiffers: normalizeChordToken(debEff) !== normalizeChordToken(secEff),
    });
  }
  return rows;
}

export function runLeadSheetPhase5ComposerCompareProof(
  musicXmlFilePath: string,
  seed = 90106,
  secondComposerId = LEADSHEET_PHASE5_SECOND_COMPOSER
): LeadSheetPhase5ComposerCompareProofResult {
  const debussy = runDebussyLeadSheetFileHandoffProof(musicXmlFilePath, seed, 'debussy');
  const secondComposer = runDebussyLeadSheetFileHandoffProof(musicXmlFilePath, seed, secondComposerId);
  const harmonyCompare = buildLeadSheetHarmonyBarCompare(debussy, secondComposer);
  const harmonyDiffBarCount = harmonyCompare.filter((r) => r.effectiveDiffers).length;

  return {
    sourceFile: musicXmlFilePath,
    seed,
    secondComposerId,
    debussy,
    secondComposer,
    harmonyCompare,
    harmonyDiffBarCount,
    sameImportedHarmony: debussy.importedHarmonyBars.every(
      (sym, i) => normalizeChordToken(sym) === normalizeChordToken(secondComposer.importedHarmonyBars[i] ?? '')
    ),
    quintetPartCountMatch:
      debussy.partIds.length === 5 &&
      secondComposer.partIds.length === 5 &&
      EXPECTED_QUINTET_PART_IDS.every((id, i) => secondComposer.partIds[i] === id),
    secondHasHandoff:
      secondComposer.melodyCarrierPartIds.length >= 2 && secondComposer.handoffVariationDetected !== undefined,
    secondNoBass: secondComposer.hasBassPart === false,
    secondNoDuo: !secondComposer.partIds.includes('bass'),
  };
}

export function runLeadSheetPhase5BundledFileCompareProof(
  seed = 90106,
  secondComposerId = LEADSHEET_PHASE5_SECOND_COMPOSER,
  fromDir?: string
): LeadSheetPhase5ComposerCompareProofResult {
  const filePath = resolveDebussyLeadSheetFileProofPath(fromDir);
  loadDebussyLeadSheetImportTimelineFromMusicXmlFile(filePath);
  return runLeadSheetPhase5ComposerCompareProof(filePath, seed, secondComposerId);
}
