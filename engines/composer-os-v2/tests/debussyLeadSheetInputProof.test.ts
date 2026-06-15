/**
 * Phase 1 + Phase 2 - debussy leadsheet-input parallel bypass proofs.
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