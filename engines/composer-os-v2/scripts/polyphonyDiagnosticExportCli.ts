/**
 * Writes Phase 18.2A polyphony diagnostic MusicXML to disk for Sibelius / GP8 manual check.
 *
 * Usage: npx ts-node --project ../../tsconfig.json scripts/polyphonyDiagnosticExportCli.ts [outfile.musicxml]
 * Default: Phase-18-2A-polyphony-diagnostic.musicxml in cwd
 */

import * as fs from 'fs';
import * as path from 'path';
import { exportPhase182AGuitarPolyphonyDiagnosticMusicXml } from '../core/export/polyphonyDiagnosticExport';

const out =
  process.argv[2]?.trim() ||
  path.join(process.cwd(), 'Phase-18-2A-polyphony-diagnostic.musicxml');

const r = exportPhase182AGuitarPolyphonyDiagnosticMusicXml();
if (!r.success || !r.xml) {
  console.error(r.errors.join('\n') || 'Export failed');
  process.exit(1);
}
fs.writeFileSync(out, r.xml, 'utf8');
console.log(`Wrote ${path.resolve(out)}`);
console.log('Open in Sibelius / Guitar Pro 8: expect two voices on one guitar staff (quarters vs half notes).');
