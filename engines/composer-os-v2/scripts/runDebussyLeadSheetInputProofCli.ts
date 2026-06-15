/**
 * CLI - debussy leadsheet-input Phase 1 proof (dump + exit code).
 */
import * as fs from 'fs';
import * as path from 'path';
import { runDebussyLeadSheetInputProof } from '../core/import/runDebussyLeadSheetInputProof';
import { runDebussyLeadSheetInputProofTests } from '../tests/debussyLeadSheetInputProof.test';

const outDir = path.join(__dirname, '..', 'output', 'debussy-leadsheet-input-proof');
fs.mkdirSync(outDir, { recursive: true });

const proof = runDebussyLeadSheetInputProof(90101);
fs.writeFileSync(path.join(outDir, 'proof-summary.json'), JSON.stringify(proof, null, 2), 'utf8');
fs.writeFileSync(path.join(outDir, 'proof-score.musicxml'), proof.musicXml, 'utf8');

const tests = runDebussyLeadSheetInputProofTests();
for (const t of tests) {
  console.log(`${t.ok ? 'PASS' : 'FAIL'}: ${t.name}`);
}
process.exit(tests.some((t) => !t.ok) ? 1 : 0);