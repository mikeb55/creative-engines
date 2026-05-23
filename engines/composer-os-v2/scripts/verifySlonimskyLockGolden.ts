/**
 * Auto-verify Slonimsky lock tests 1, 2, 6, 7 (seed 42). Not in smoke allowlist.
 * Usage: npx tsx engines/composer-os-v2/scripts/verifySlonimskyLockGolden.ts [--write-goldens]
 */

import {
  SLONIMSKY_LOCK_GOLDEN_SEED,
  compareToGolden,
  evaluateLockCriteria,
  goldenPath,
  loadSlonimskyLockGolden,
  runTest1,
  runTest2,
  runTest6,
  runTest7,
  writeSlonimskyLockGolden,
  type SlonimskyLockGoldenId,
} from '../tests/slonimskyLockGolden';
import * as fs from 'fs';

const WRITE = process.argv.includes('--write-goldens');

const RUNNERS = {
  test1: runTest1,
  test2: runTest2,
  test6: runTest6,
  test7: runTest7,
} as const;

function main(): void {
  console.log(`Slonimsky lock golden verify — seed ${SLONIMSKY_LOCK_GOLDEN_SEED}\n`);
  let allPass = true;
  for (const id of Object.keys(RUNNERS) as SlonimskyLockGoldenId[]) {
    console.log(`--- ${id.toUpperCase()} ---`);
    const { fixture, error } = RUNNERS[id]();
    if (error) console.log(`  gen error: ${error}`);
    const lockFails = evaluateLockCriteria(id, fixture);
    console.log(`  noteCount=${fixture.noteCount} burstBarCount=${fixture.burstBarCount} avgNotesPerBar=${fixture.avgNotesPerBar.toFixed(2)}`);
    if (fixture.feedbackProxyPresent != null) console.log(`  feedbackProxy=${fixture.feedbackProxyPresent}`);
    if (fixture.slonimskyAllowedOutsideOverride != null) {
      console.log(`  slonimskyAllowedOutsideOverride=${fixture.slonimskyAllowedOutsideOverride}`);
    }
    if (fixture.sqNoteCount != null) {
      console.log(`  sqNoteCount=${fixture.sqNoteCount} bbNoteCount=${fixture.bbNoteCount} hybridKeys=${fixture.slonimskyEnsembleCellReceiptCount}`);
    }
    if (lockFails.length) {
      allPass = false;
      console.log(`  LOCK: FAIL — ${lockFails.join('; ')}`);
    } else {
      console.log('  LOCK: PASS');
    }
    if (fs.existsSync(goldenPath(id))) {
      const golden = loadSlonimskyLockGolden(id);
      const diffs = compareToGolden(fixture, golden);
      if (diffs.length) {
        allPass = false;
        console.log(`  GOLDEN: FAIL — ${diffs.join('; ')}`);
      } else {
        console.log('  GOLDEN: PASS');
      }
    } else if (!WRITE) {
      console.log('  GOLDEN: (no file — run with --write-goldens after lock PASS)');
    }
    if (WRITE && lockFails.length === 0 && !error) {
      writeSlonimskyLockGolden(fixture);
      console.log(`  wrote ${goldenPath(id)}`);
    }
    console.log('');
  }
  if (!allPass) process.exit(1);
  console.log('ALL PASS');
}

main();
