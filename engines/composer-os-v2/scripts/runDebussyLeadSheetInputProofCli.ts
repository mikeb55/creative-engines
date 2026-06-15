/**
 * CLI - debussy leadsheet-input Phase 1-4 proofs + Phase 5 second-composer compare.
 */
import * as fs from 'fs';
import * as path from 'path';
import { runDebussyLeadSheetInputProof } from '../core/import/runDebussyLeadSheetInputProof';
import { runDebussyLeadSheetQuintetProof } from '../core/import/runDebussyLeadSheetQuintetProof';
import { runDebussyLeadSheetHandoffProof } from '../core/import/runDebussyLeadSheetHandoffProof';
import { runDebussyLeadSheetFileHandoffProof } from '../core/import/runDebussyLeadSheetFileHandoffProof';
import { resolveDebussyLeadSheetFileProofPath } from '../core/import/loadDebussyLeadSheetImportTimelineFromMusicXmlFile';
import { runDebussyLeadSheetInputProofTests } from '../tests/debussyLeadSheetInputProof.test';
import {
  LEADSHEET_PHASE5_SECOND_COMPOSER,
  runLeadSheetPhase5BundledFileCompareProof,
} from '../core/import/runLeadSheetPhase5ComposerCompareProof';
import { runLeadSheetInputPhase5ComposerProofTests } from '../tests/leadSheetInputPhase5ComposerProof.test';

const outDir = path.join(__dirname, '..', 'output', 'debussy-leadsheet-input-proof');
fs.mkdirSync(outDir, { recursive: true });

const phase1 = runDebussyLeadSheetInputProof(90101);
fs.writeFileSync(path.join(outDir, 'proof-summary.json'), JSON.stringify(phase1, null, 2), 'utf8');
fs.writeFileSync(path.join(outDir, 'proof-score.musicxml'), phase1.musicXml, 'utf8');

const quintet = runDebussyLeadSheetQuintetProof(90103);
fs.writeFileSync(path.join(outDir, 'quintet-proof-summary.json'), JSON.stringify(quintet, null, 2), 'utf8');
fs.writeFileSync(path.join(outDir, 'quintet-proof-score.musicxml'), quintet.musicXml, 'utf8');

const handoff = runDebussyLeadSheetHandoffProof(90104);

const fileProofPath = resolveDebussyLeadSheetFileProofPath(path.join(__dirname, '..'));
const fileHandoff = runDebussyLeadSheetFileHandoffProof(fileProofPath, 90105);
const fileHandoffSummary = { ...fileHandoff, musicXml: `[${fileHandoff.musicXml.length} chars]` };
fs.writeFileSync(path.join(outDir, 'file-handoff-proof-summary.json'), JSON.stringify(fileHandoffSummary, null, 2), 'utf8');
fs.writeFileSync(path.join(outDir, 'file-handoff-proof-score.musicxml'), fileHandoff.musicXml, 'utf8');
const handoffSummary = { ...handoff, musicXml: `[${handoff.musicXml.length} chars]` };
fs.writeFileSync(path.join(outDir, 'handoff-proof-summary.json'), JSON.stringify(handoffSummary, null, 2), 'utf8');
fs.writeFileSync(path.join(outDir, 'handoff-proof-score.musicxml'), handoff.musicXml, 'utf8');

const phase5 = runLeadSheetPhase5BundledFileCompareProof(90106, LEADSHEET_PHASE5_SECOND_COMPOSER, path.join(__dirname, '..'));
const phase5Summary = {
  sourceFile: phase5.sourceFile,
  seed: phase5.seed,
  secondComposerId: phase5.secondComposerId,
  harmonyDiffBarCount: phase5.harmonyDiffBarCount,
  harmonyCompare: phase5.harmonyCompare,
  debussy: { ...phase5.debussy, musicXml: `[${phase5.debussy.musicXml.length} chars]` },
  secondComposer: { ...phase5.secondComposer, musicXml: `[${phase5.secondComposer.musicXml.length} chars]` },
};
fs.writeFileSync(path.join(outDir, 'phase5-composer-compare-summary.json'), JSON.stringify(phase5Summary, null, 2), 'utf8');
fs.writeFileSync(
  path.join(outDir, `phase5-${LEADSHEET_PHASE5_SECOND_COMPOSER}-handoff-score.musicxml`),
  phase5.secondComposer.musicXml,
  'utf8'
);

const tests = [...runDebussyLeadSheetInputProofTests(), ...runLeadSheetInputPhase5ComposerProofTests()];
for (const t of tests) {
  console.log((t.ok ? 'PASS' : 'FAIL') + ': ' + t.name);
}
process.exit(tests.some((t) => !t.ok) ? 1 : 0);
