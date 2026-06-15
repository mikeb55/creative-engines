/**
 * Phase 6 - desktop leadsheet file-input API (deterministic, no Electron).
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { apiRunLeadSheetFileInput } from '../app-api/runLeadSheetFileInputApi';
import { resolveDebussyLeadSheetFileProofPath } from '../core/import/loadDebussyLeadSheetImportTimelineFromMusicXmlFile';
import { EXPECTED_QUINTET_PART_IDS } from '../core/import/runDebussyLeadSheetQuintetProof';

export function runLeadSheetFileInputDesktopApiTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];
  const tmpOut = fs.mkdtempSync(path.join(os.tmpdir(), 'cos-leadsheet-phase6-'));
  const filePath = resolveDebussyLeadSheetFileProofPath(path.join(__dirname, '..'));

  for (const composerId of ['debussy', 'kenny_wheeler'] as const) {
    try {
      const res = apiRunLeadSheetFileInput({ filePath, composerId }, tmpOut);
      out.push({
        ok:
          res.ok === true &&
          res.partCount === 5 &&
          res.hasBassPart === false &&
          res.hasDuoParts === false &&
          res.handoffVariationDetected === true &&
          res.composerId === composerId &&
          EXPECTED_QUINTET_PART_IDS.every((id, i) => res.partIds?.[i] === id) &&
          typeof res.savedMusicXmlPath === 'string' &&
          fs.existsSync(res.savedMusicXmlPath!),
        name: `phase6 apiRunLeadSheetFileInput ${composerId}`,
      });
    } catch (e) {
      out.push({
        ok: false,
        name: `phase6 apiRunLeadSheetFileInput ${composerId}: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }

  const empty = apiRunLeadSheetFileInput({ filePath: '', composerId: 'debussy' }, tmpOut);
  out.push({ ok: empty.ok === false && !!empty.error, name: 'phase6 empty filePath rejected' });

  const badComposer = apiRunLeadSheetFileInput(
    { filePath, composerId: 'messiaen' as 'debussy' },
    tmpOut
  );
  out.push({ ok: badComposer.ok === false, name: 'phase6 unsupported composer rejected' });

  return out;
}

if (require.main === module) {
  const rows = runLeadSheetFileInputDesktopApiTests();
  for (const r of rows) console.log(r.ok ? 'PASS' : 'FAIL', r.name);
  process.exit(rows.every((r) => r.ok) ? 0 : 1);
}
