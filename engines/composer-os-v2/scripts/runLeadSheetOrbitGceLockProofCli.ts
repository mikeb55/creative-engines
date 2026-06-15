/**
 * CLI - Orbit leadsheet quintet proof + GCE v2.0 + LOCK eval (debussy + kenny_wheeler).
 */
import * as fs from 'fs';
import * as path from 'path';
import { assembleDebussyLeadSheetQuintetWithHandoffScore } from '../core/import/assembleDebussyLeadSheetQuintetWithHandoffScore';
import { loadDebussyLeadSheetImportTimelineFromMusicXmlFile } from '../core/import/loadDebussyLeadSheetImportTimelineFromMusicXmlFile';
import {
  formatLeadSheetGceLockReport,
  runLeadSheetGceLockEval,
  serializeLeadSheetGceLockEval,
} from '../core/import/leadSheetGceLockEvalRunner';
import { resolveOrbitLeadSheetProofPath } from '../core/import/resolveOrbitLeadSheetProofPath';
import { runLeadSheetPhase7StringRealizationProofTests } from '../tests/leadSheetPhase7StringRealizationProof.test';

const SEED = 90106;
const COMPOSERS = ['debussy', 'kenny_wheeler'] as const;

const outDir = path.join(__dirname, '..', 'output', 'leadsheet-gce-lock-proof');
fs.mkdirSync(outDir, { recursive: true });

const orbitPath = resolveOrbitLeadSheetProofPath(path.join(__dirname, '..'));
if (!orbitPath) {
  console.error('Orbit leadsheet proof file not found. Set ORBIT_LEADSHEET_PROOF_PATH or install fixture.');
  process.exit(1);
}

console.log('Orbit leadsheet:', orbitPath);
const importTimeline = loadDebussyLeadSheetImportTimelineFromMusicXmlFile(orbitPath);

let anyFail = false;

for (const composerId of COMPOSERS) {
  const handoff = assembleDebussyLeadSheetQuintetWithHandoffScore(SEED, undefined, importTimeline, composerId);
  const evalResult = runLeadSheetGceLockEval({
    score: handoff.score,
    composerId,
    seed: SEED,
    sourceFile: orbitPath,
  });

  console.log(formatLeadSheetGceLockReport(evalResult));

  const jsonPath = path.join(outDir, `orbit-${composerId}-gce-lock-eval.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(serializeLeadSheetGceLockEval(evalResult), null, 2), 'utf8');
  console.log('Wrote', jsonPath);
}

const phase7 = runLeadSheetPhase7StringRealizationProofTests();
for (const t of phase7) {
  console.log((t.ok ? 'PASS' : 'FAIL') + ': ' + t.name);
  if (!t.ok) anyFail = true;
}

process.exit(anyFail ? 1 : 0);
