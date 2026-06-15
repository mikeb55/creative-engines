/**
 * CLI - debussy leadsheet-input Phase 1 + Phase 2 + Phase 3 proofs.
 */
import * as fs from 'fs';
import * as path from 'path';
import { runDebussyLeadSheetInputProof } from '../core/import/runDebussyLeadSheetInputProof';
import { runDebussyLeadSheetQuintetProof } from '../core/import/runDebussyLeadSheetQuintetProof';
import { runDebussyLeadSheetHandoffProof } from '../core/import/runDebussyLeadSheetHandoffProof';
import { runDebussyLeadSheetInputProofTests } from '../tests/debussyLeadSheetInputProof.test';

const outDir = path.join(__dirname, '..', 'output', 'debussy-leadsheet-input-proof');
fs.mkdirSync(outDir, { recursive: true });

const phase1 = runDebussyLeadSheetInputProof(90101);
fs.writeFileSync(path.join(outDir, 'proof-summary.json'), JSON.stringify(phase1, null, 2), 'utf8');
fs.writeFileSync(path.join(outDir, 'proof-score.musicxml'), phase1.musicXml, 'utf8');

const quintet = runDebussyLeadSheetQuintetProof(90103);
fs.writeFileSync(path.join(outDir, 'quintet-proof-summary.json'), JSON.stringify(quintet, null, 2), 'utf8');
fs.writeFileSync(path.join(outDir, 'quintet-proof-score.musicxml'), quintet.musicXml, 'utf8');

const handoff = runDebussyLeadSheetHandoffProof(90104);
const handoffSummary = { ...handoff, musicXml: `[${handoff.musicXml.length} chars]` };
fs.writeFileSync(path.join(outDir, 'handoff-proof-summary.json'), JSON.stringify(handoffSummary, null, 2), 'utf8');
fs.writeFileSync(path.join(outDir, 'handoff-proof-score.musicxml'), handoff.musicXml, 'utf8');

const tests = runDebussyLeadSheetInputProofTests();
for (const t of tests) {
  console.log((t.ok ? 'PASS' : 'FAIL') + ': ' + t.name);
}
process.exit(tests.some((t) => !t.ok) ? 1 : 0);