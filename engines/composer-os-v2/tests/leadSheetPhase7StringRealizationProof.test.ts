/**
 * Phase 7 - leadsheet string realization + hand-off enforcement proof.
 */

import * as fs from 'fs';
import { EXPECTED_QUINTET_PART_IDS } from '../core/import/runDebussyLeadSheetQuintetProof';
import { assembleDebussyLeadSheetQuintetWithHandoffScore } from '../core/import/assembleDebussyLeadSheetQuintetWithHandoffScore';
import { loadDebussyLeadSheetImportTimelineFromMusicXmlFile } from '../core/import/loadDebussyLeadSheetImportTimelineFromMusicXmlFile';
import {
  assertLeadSheetScoreInRange,
  dumpLeadSheetQuintetBarVoices,
} from '../core/import/leadSheetStringRealizationPass';
import { runDebussyLeadSheetHandoffProof } from '../core/import/runDebussyLeadSheetHandoffProof';
import {
  formatLeadSheetGceLockReport,
  runLeadSheetGceLockEval,
  serializeLeadSheetGceLockEval,
} from '../core/import/leadSheetGceLockEvalRunner';
import { resolveOrbitLeadSheetProofPath } from '../core/import/resolveOrbitLeadSheetProofPath';
import * as path from 'path';

const GCE_CATEGORY_IDS = [
  'cadentialClarity',
  'melodicIdentity',
  'phraseGrammar',
  'harmonyAndLanguage',
  'rhythmicIdentity',
  'structureAndForm',
  'arrangementAndOrchestration',
  'economyAndFocus',
  'tensionAndRelease',
  'thematicRecallPotential',
] as const;

function hasMotionInBar(parts: Record<string, string>, ownerPartId: string): boolean {
  for (const [pid, dump] of Object.entries(parts)) {
    if (pid === ownerPartId || dump === '-') continue;
    const notes = dump.split('|').filter(Boolean);
    if (notes.length >= 2) return true;
    if (
      notes.some((n) => {
        const dur = Number(n.split('x')[1]);
        return Number.isFinite(dur) && dur < 3.5;
      })
    ) {
      return true;
    }
  }
  return false;
}

function runPhase7Proof(
  composerId: string,
  seed: number,
  importTimeline?: ReturnType<typeof loadDebussyLeadSheetImportTimelineFromMusicXmlFile>,
) {
  const handoff = assembleDebussyLeadSheetQuintetWithHandoffScore(seed, undefined, importTimeline, composerId);
  const range = assertLeadSheetScoreInRange(handoff.score);
  const dump = dumpLeadSheetQuintetBarVoices(handoff.score);
  const motionBars = dump.filter((d) => {
    const owner = handoff.perBarMelodyOwnership.find((o) => o.bar === d.bar)?.ownerPartId ?? 'guitar';
    return hasMotionInBar(d.parts, owner);
  });
  return { handoff, range, dump, motionBars };
}

export function runLeadSheetPhase7StringRealizationProofTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  try {
    const phase3 = runDebussyLeadSheetHandoffProof(90104);
    out.push({
      ok: phase3.partIds.length === 5 && !phase3.hasBassPart && phase3.musicXmlExportOk,
      name: 'phase3 regression: handoff proof still exports quintet',
    });

    for (const composerId of ['debussy', 'kenny_wheeler'] as const) {
      const { handoff, range, dump, motionBars } = runPhase7Proof(composerId, 90106);

      out.push({
        ok: handoff.partIds.length === 5 && !handoff.hasBassPart,
        name: `phase7 ${composerId}: quintet shape preserved`,
      });

      out.push({
        ok: handoff.phase7?.melodyOwnershipEnforced === true,
        name: `phase7 ${composerId}: import melody pinned on all owned bars`,
      });

      out.push({
        ok: range.ok && (handoff.phase7?.rangeViolationsAfter ?? 1) === 0,
        name: `phase7 ${composerId}: all notes in instrument range`,
      });

      const b5 = dump.find((d) => d.bar === 5)?.parts.sq_cello ?? '';
      const b6 = dump.find((d) => d.bar === 6)?.parts.sq_cello ?? '';
      const b5Notes = b5 === '-' ? 0 : b5.split('|').length;
      const b6Notes = b6 === '-' ? 0 : b6.split('|').length;
      const celloMelodyOwned =
        handoff.phase7?.ownedBarMelodyMatch.find((r) => r.bar === 5)?.matched === true &&
        handoff.phase7?.ownedBarMelodyMatch.find((r) => r.bar === 6)?.matched === true &&
        b5Notes >= 1 &&
        b6Notes >= 2 &&
        !b5.includes('37@') &&
        !b6.includes('35@');
      out.push({
        ok: celloMelodyOwned,
        name: `phase7 ${composerId}: cello bars 5-6 carry imported melody contour in range`,
      });

      out.push({
        ok: motionBars.length >= 4,
        name: `phase7 ${composerId}: accompaniment bars contain supporting motion`,
      });

      out.push({
        ok: EXPECTED_QUINTET_PART_IDS.every((id, i) => handoff.partIds[i] === id),
        name: `phase7 ${composerId}: part id order unchanged`,
      });
    }

    const orbitFixture = resolveOrbitLeadSheetProofPath(path.join(__dirname, '..'));
    if (orbitFixture) {
      const tl = loadDebussyLeadSheetImportTimelineFromMusicXmlFile(orbitFixture);
      for (const composerId of ['debussy', 'kenny_wheeler'] as const) {
        const { handoff, range } = runPhase7Proof(composerId, 90106, tl);
        out.push({
          ok: handoff.phase7?.melodyOwnershipEnforced === true && range.ok,
          name: `phase7 orbit ${composerId}: file handoff realization`,
        });

        const evalResult = runLeadSheetGceLockEval({
          score: handoff.score,
          composerId,
          seed: 90106,
          sourceFile: orbitFixture,
        });
        out.push({
          ok:
            evalResult.scoringMode === 'feature-linked' &&
            GCE_CATEGORY_IDS.every((c) => typeof evalResult.gce.categories[c] === 'number') &&
            evalResult.lock.gates.length === 6,
          name: `phase7 orbit ${composerId}: GCE+LOCK eval wired (feature-linked, 10 categories, 6 LOCK gates)`,
        });

        if (process.env.LEADSHEET_GCE_LOCK_DUMP === '1') {
          const dumpDir = path.join(__dirname, '..', 'output', 'leadsheet-gce-lock-proof');
          fs.mkdirSync(dumpDir, { recursive: true });
          const jsonPath = path.join(dumpDir, `orbit-${composerId}-gce-lock-eval.json`);
          fs.writeFileSync(jsonPath, JSON.stringify(serializeLeadSheetGceLockEval(evalResult), null, 2), 'utf8');
          console.log(formatLeadSheetGceLockReport(evalResult));
          console.log('Wrote', jsonPath);
        }
      }
    }
  } catch (e) {
    out.push({
      ok: false,
      name: 'leadSheetPhase7StringRealizationProof: ' + (e instanceof Error ? e.message : String(e)),
    });
  }

  return out;
}

if (require.main === module) {
  for (const t of runLeadSheetPhase7StringRealizationProofTests()) {
    console.log((t.ok ? 'PASS' : 'FAIL') + ': ' + t.name);
  }
}
