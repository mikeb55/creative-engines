/**
 * Phase 1 + Phase 2 + Phase 3 - debussy leadsheet-input parallel bypass proofs.
 */

import { normalizeChordToken } from '../core/harmony/chordProgressionParser';
import {
  DEBUSSY_LEADSHEET_PROOF_CHORDS,
  DEBUSSY_LEADSHEET_PROOF_MELODY,
} from '../core/import/buildDebussyLeadSheetHarmonySpine';
import { runDebussyLeadSheetInputProof } from '../core/import/runDebussyLeadSheetInputProof';
import {
  EXPECTED_QUINTET_PART_IDS,
  runDebussyLeadSheetQuintetProof,
} from '../core/import/runDebussyLeadSheetQuintetProof';
import { runDebussyLeadSheetHandoffProof } from '../core/import/runDebussyLeadSheetHandoffProof';
import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';

export function runDebussyLeadSheetInputProofTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  try {
    const proof = runDebussyLeadSheetInputProof(90101);

    const importedMatch = DEBUSSY_LEADSHEET_PROOF_CHORDS.every(
      (c, i) => normalizeChordToken(proof.importedHarmonyBars[i] ?? '') === normalizeChordToken(c)
    );

    out.push({
      ok: importedMatch,
      name: 'proof: fixed leadsheet chords ingested via importTimelineToLockedHarmony',
    });

    out.push({
      ok: proof.debussyPrecomputeCalled && proof.debussyDeviceReceiptCount > 0,
      name: 'proof: debussy precompute ran (device receipts present)',
    });

    out.push({
      ok:
        proof.debussyEffectiveHarmonyBars.length === 8 &&
        proof.debussyEffectiveHarmonyBars.some(
          (sym, i) => normalizeChordToken(sym) !== normalizeChordToken(DEBUSSY_LEADSHEET_PROOF_CHORDS[i] ?? '')
        ),
      name: 'proof: debussy harmony applied (effective bars differ from raw import on at least one bar)',
    });

    out.push({
      ok: proof.melodyPinned && proof.melodyNoteCount === DEBUSSY_LEADSHEET_PROOF_MELODY.length,
      name: 'proof: imported melody pinned on lead voice',
    });

    out.push({
      ok: !proof.hasBassPart && proof.partIds.length === 1 && proof.partIds[0] === 'guitar',
      name: 'proof: score has no bass part (melody-only scaffold)',
    });

    out.push({
      ok: proof.musicXmlExportOk && proof.musicXml.includes('<score-partwise') && proof.musicXml.length > 500,
      name: 'proof: score exports to MusicXML for inspection',
    });

    const quintet = runDebussyLeadSheetQuintetProof(90103);

    out.push({
      ok: quintet.partIds.length === 5 && EXPECTED_QUINTET_PART_IDS.every((id, i) => quintet.partIds[i] === id),
      name: 'quintet proof: score has exactly Guitar + V1 + V2 + Va + Vc',
    });

    out.push({
      ok: quintet.melodyPinned && quintet.stringNoteCount > 0,
      name: 'quintet proof: guitar melody pinned and strings have notes',
    });

    out.push({
      ok:
        !quintet.hasBassPart &&
        quintet.musicContextBarCount === 8 &&
        quintet.appliedHarmonyBars.some((sym, i) =>
          normalizeChordToken(sym) !== normalizeChordToken(DEBUSSY_LEADSHEET_PROOF_CHORDS[i] ?? '')
        ),
      name: 'quintet proof: no bass part, debussy harmony on string spine',
    });

    out.push({
      ok: quintet.musicXmlExportOk && quintet.musicXml.includes('sq_violin_1') && quintet.musicXml.includes('guitar'),
      name: 'quintet proof: MusicXML export for inspection',
    });

    const handoff = runDebussyLeadSheetHandoffProof(90104);

    out.push({
      ok:
        handoff.partIds.length === 5 &&
        EXPECTED_QUINTET_PART_IDS.every((id, i) => handoff.partIds[i] === id) &&
        !handoff.hasBassPart,
      name: 'handoff proof: quintet shape preserved (5 parts, no bass)',
    });

    out.push({
      ok:
        handoff.perBarMelodyOwnership.length === 8 &&
        handoff.melodyCarrierPartIds.includes('guitar') &&
        handoff.melodyCarrierPartIds.includes('sq_violin_1') &&
        handoff.melodyCarrierPartIds.includes('sq_cello') &&
        handoff.melodyCarrierPartIds.length >= 2,
      name: 'handoff proof: melody moves across guitar, V1, and cello',
    });

    out.push({
      ok: handoff.handoffVariationDetected && handoff.guitarMelodyAbsentOnHandoffBars,
      name: 'handoff proof: ContrapuntalLineEngine variation and guitar harmony on hand-off bars',
    });

    out.push({
      ok:
        handoff.melodyPinnedOnGuitarSegments &&
        handoff.guitarMelodyBars.join(',') === '1,2,7,8' &&
        handoff.guitarHarmonyBars.join(',') === '3,4,5,6',
      name: 'handoff proof: guitar melody only on bars 1-2 and 7-8',
    });

    out.push({
      ok: handoff.musicXmlExportOk && handoff.musicXml.includes('sq_cello') && handoff.musicXml.includes('guitar'),
      name: 'handoff proof: MusicXML export for inspection',
    });

    const duo = runGoldenPathOnce(90102, {
      presetId: 'guitar_bass_duo',
      primarySongwriterStyle: 'debussy',
      totalBars: 8,
      lockedHarmonyBarsRaw: [...DEBUSSY_LEADSHEET_PROOF_CHORDS],
      parsedChordBars: [...DEBUSSY_LEADSHEET_PROOF_CHORDS],
      chordProgressionText: DEBUSSY_LEADSHEET_PROOF_CHORDS.join(' | '),
      harmonyMode: 'custom_locked',
      suppressWybleVoiceLayoutForTest: true,
    });

    const duoHasGuitar = duo.score.parts.some((p) => p.instrumentIdentity === 'clean_electric_guitar');
    const duoHasBass = duo.score.parts.some((p) => p.instrumentIdentity === 'acoustic_upright_bass');

    out.push({
      ok: duoHasGuitar && duoHasBass,
      name: 'regression: normal debussy duo generate still produces guitar + bass',
    });
  } catch (e) {
    out.push({
      ok: false,
      name: 'debussyLeadSheetInputProof: ' + (e instanceof Error ? e.message : String(e)),
    });
  }

  return out;
}