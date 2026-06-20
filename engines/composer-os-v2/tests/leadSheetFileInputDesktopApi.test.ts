/**
 * Phase 6 - desktop leadsheet file-input API (deterministic, no Electron).
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { apiRunLeadSheetFileInput } from '../app-api/runLeadSheetFileInputApi';
import { resolveDebussyLeadSheetFileProofPath } from '../core/import/loadDebussyLeadSheetImportTimelineFromMusicXmlFile';
import { EXPECTED_QUINTET_PART_IDS } from '../core/import/runDebussyLeadSheetQuintetProof';
import { resolveArtRockCanonicalFixturePath } from './leadSheetPopArtRockContrastArcProof.test';

const ART_ROCK_METAPHYSICS_SEED = 90106;
/** Full-chart quintet MusicXML should exceed a short 8-bar stub export. */
const MIN_ART_ROCK_MUSICXML_BYTES = 8_000;

export function runLeadSheetFileInputDesktopApiTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];
  const tmpOut = fs.mkdtempSync(path.join(os.tmpdir(), 'cos-leadsheet-phase6-'));
  const filePath = resolveDebussyLeadSheetFileProofPath(path.join(__dirname, '..'));

  for (const composerId of ['debussy', 'kenny_wheeler', 'bartok'] as const) {
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

  const metaphysicsPath = resolveArtRockCanonicalFixturePath(path.join(__dirname, '..'));
  try {
    const res = apiRunLeadSheetFileInput(
      { filePath: metaphysicsPath, composerId: 'art_rock', seed: ART_ROCK_METAPHYSICS_SEED },
      tmpOut,
    );
    const xmlBytes =
      res.savedMusicXmlPath && fs.existsSync(res.savedMusicXmlPath)
        ? fs.statSync(res.savedMusicXmlPath).size
        : 0;
    out.push({
      ok:
        res.ok === true &&
        res.composerId === 'art_rock' &&
        res.partCount === 5 &&
        res.barCount === 40 &&
        res.hasBassPart === false &&
        res.hasDuoParts === false &&
        res.handoffVariationDetected === true &&
        res.musicXmlExportOk === true &&
        EXPECTED_QUINTET_PART_IDS.every((id, i) => res.partIds?.[i] === id) &&
        typeof res.savedMusicXmlPath === 'string' &&
        fs.existsSync(res.savedMusicXmlPath!) &&
        xmlBytes >= MIN_ART_ROCK_MUSICXML_BYTES,
      name: `phase6 apiRunLeadSheetFileInput art_rock Metaphysics 40-bar seed ${ART_ROCK_METAPHYSICS_SEED}`,
    });
  } catch (e) {
    out.push({
      ok: false,
      name: `phase6 apiRunLeadSheetFileInput art_rock Metaphysics: ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  try {
    const labeled = apiRunLeadSheetFileInput(
      { filePath, composerId: 'debussy', outputLabel: 'my-bridge-take' },
      tmpOut
    );
    const labeledBase = labeled.savedMusicXmlPath
      ? path.basename(labeled.savedMusicXmlPath)
      : '';
    out.push({
      ok:
        labeled.ok === true &&
        labeledBase.startsWith('my-bridge-take_debussy_v') &&
        labeledBase.endsWith('_quintet.musicxml') &&
        typeof labeled.savedMusicXmlPath === 'string' &&
        fs.existsSync(labeled.savedMusicXmlPath!),
      name: 'phase6 apiRunLeadSheetFileInput honors outputLabel stem',
    });
  } catch (e) {
    out.push({
      ok: false,
      name: `phase6 apiRunLeadSheetFileInput outputLabel: ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  return out;
}

if (require.main === module) {
  const rows = runLeadSheetFileInputDesktopApiTests();
  for (const r of rows) console.log(r.ok ? 'PASS' : 'FAIL', r.name);
  process.exit(rows.every((r) => r.ok) ? 0 : 1);
}
