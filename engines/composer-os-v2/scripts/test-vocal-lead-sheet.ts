/**
 * Song Mode — vocal lead sheet bridge smoke test.
 * Run from engines/composer-os-v2: npm run test:vocal
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { GenerateRequest } from '../app-api/appApiTypes';
import { runAppGeneration } from '../app-api/composerOsAppGeneration';

function main(): void {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ce-vocal-ls-'));
  const req: GenerateRequest = {
    presetId: 'song_mode',
    seed: 50021,
    styleStack: { primary: 'metheny' },
    includeVocalLeadSheet: true,
    totalBars: 32,
  };
  const result = runAppGeneration(req, outDir);
  const vp = result.vocalLeadSheetFilepath;
  if (!vp) {
    console.error('FAIL: vocalLeadSheetFilepath missing', {
      success: result.success,
      error: result.error,
    });
    process.exit(1);
  }
  if (!fs.existsSync(vp)) {
    console.error('FAIL: vocal lead sheet file not on disk:', vp);
    process.exit(1);
  }
  const body = fs.readFileSync(vp, 'utf-8');
  if (!body.includes('<?xml') || !body.includes('<score-partwise')) {
    console.error('FAIL: file content missing XML markers');
    process.exit(1);
  }
  console.log('PASS vocal lead sheet bridge');
  console.log('vocalLeadSheetFilepath:', vp);
  try {
    fs.rmSync(outDir, { recursive: true });
  } catch {
    /* ignore */
  }
}

main();
