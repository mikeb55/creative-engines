/**
 * Phase 5 - second-composer leadsheet-input proof tests (not in smoke harness).
 */

import path from 'path';
import {
  EXPECTED_QUINTET_PART_IDS,
  runDebussyLeadSheetQuintetProof,
} from '../core/import/runDebussyLeadSheetQuintetProof';
import { runDebussyLeadSheetInputProofTests } from './debussyLeadSheetInputProof.test';
import {
  LEADSHEET_PHASE5_SECOND_COMPOSER,
  runLeadSheetPhase5BundledFileCompareProof,
} from '../core/import/runLeadSheetPhase5ComposerCompareProof';
import { resolveDebussyLeadSheetFileProofPath } from '../core/import/loadDebussyLeadSheetImportTimelineFromMusicXmlFile';

export function runLeadSheetInputPhase5ComposerProofTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  try {
    const compare = runLeadSheetPhase5BundledFileCompareProof(
      90106,
      LEADSHEET_PHASE5_SECOND_COMPOSER,
      path.join(__dirname, '..')
    );

    out.push({
      ok: compare.sameImportedHarmony,
      name: 'phase5: same sample file imported harmony for debussy and second composer',
    });

    out.push({
      ok: compare.debussy.composerId === 'debussy' && compare.secondComposer.composerId === LEADSHEET_PHASE5_SECOND_COMPOSER,
      name: `phase5: second composer is ${LEADSHEET_PHASE5_SECOND_COMPOSER}`,
    });

    out.push({
      ok: compare.quintetPartCountMatch,
      name: 'phase5: second composer quintet has Guitar + Vn1 + Vn2 + Va + Vc',
    });

    out.push({
      ok: compare.secondNoBass && compare.secondNoDuo,
      name: 'phase5: second composer output has no bass / duo part',
    });

    out.push({
      ok: compare.secondComposer.melodyCarrierPartIds.length >= 2,
      name: 'phase5: second composer melody hand-off carriers present',
    });

    out.push({
      ok: compare.secondComposer.musicXmlExportOk === true,
      name: 'phase5: second composer MusicXML export succeeds',
    });

    out.push({
      ok: compare.harmonyDiffBarCount >= 1,
      name: `phase5: harmony differs on at least one bar (count=${compare.harmonyDiffBarCount})`,
    });

    const filePath = resolveDebussyLeadSheetFileProofPath(path.join(__dirname, '..'));
    out.push({
      ok: compare.sourceFile === filePath,
      name: 'phase5: uses bundled sample MusicXML file',
    });

    const wheelerQuintet = runDebussyLeadSheetQuintetProof(90107, undefined, LEADSHEET_PHASE5_SECOND_COMPOSER);
    out.push({
      ok:
        wheelerQuintet.partIds.length === 5 &&
        EXPECTED_QUINTET_PART_IDS.every((id, i) => wheelerQuintet.partIds[i] === id) &&
        !wheelerQuintet.hasBassPart,
      name: 'phase5: kenny_wheeler quintet assembly without file hand-off',
    });

    const debussyRegression = runDebussyLeadSheetInputProofTests();
    out.push({
      ok: debussyRegression.every((t) => t.ok),
      name: 'phase5: debussy Phase 1-4 proofs unchanged (via default composerId)',
    });
  } catch (e) {
    out.push({
      ok: false,
      name: 'leadSheetInputPhase5ComposerProof: ' + (e instanceof Error ? e.message : String(e)),
    });
  }

  return out;
}
