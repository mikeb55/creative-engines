import * as fs from 'fs';
import * as path from 'path';
import { importLeadSheetFromMusicXml } from '../core/lead-sheet/leadSheetMusicXmlImport';
import { extractScoreMusicXmlFromUint8Array } from '../core/lead-sheet/musicXmlScoreInput';

function repoRootFromTests(): string {
  return path.resolve(__dirname, '..', '..', '..');
}

function classifyFileName(name: string): 'mxl' | 'plain-xml' | 'other' {
  const lower = name.toLowerCase();
  if (lower.endsWith('.mxl')) return 'mxl';
  if (lower.endsWith('.musicxml') || lower.endsWith('.xml')) return 'plain-xml';
  return 'other';
}

/**
 * Ensures MuseScore-style samples under repo `Sample MIDI 2 Musicxml tracks` unpack and import.
 */
export function runMusicXmlMxlSampleFolderTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];
  const sampleDir = path.join(repoRootFromTests(), 'Sample MIDI 2 Musicxml tracks');
  if (!fs.existsSync(sampleDir)) {
    out.push({
      ok: false,
      name: `MusicXML sample folder: missing directory ${sampleDir}`,
    });
    return out;
  }

  const entries = fs.readdirSync(sampleDir).filter((f) => !f.startsWith('.'));
  if (entries.length === 0) {
    out.push({ ok: false, name: 'MusicXML sample folder: no files' });
    return out;
  }

  for (const name of entries.sort()) {
    const full = path.join(sampleDir, name);
    const kind = classifyFileName(name);
    if (kind === 'other') {
      out.push({ ok: true, name: `sample folder: skipped non-MusicXML entry "${name}"` });
      continue;
    }

    const buf = fs.readFileSync(full);
    const bytes = new Uint8Array(buf);
    const extracted = extractScoreMusicXmlFromUint8Array(bytes);
    if (!extracted.ok || !extracted.xml) {
      out.push({
        ok: false,
        name: `sample "${name}" (${kind}): extract failed — ${extracted.errors.join(' | ')}`,
      });
      continue;
    }
    const imported = importLeadSheetFromMusicXml(extracted.xml);
    const ok = imported.ok === true && !!imported.leadSheet && imported.leadSheet.totalBars >= 1;
    out.push({
      ok,
      name: ok
        ? `sample "${name}" (${kind}): unpacked + LeadSheet import ok (${extracted.format ?? kind})`
        : `sample "${name}" (${kind}): LeadSheet import failed — ${(imported.errors ?? []).join(' | ') || 'unknown'}`,
    });
  }

  return out;
}

void ((): void => {
  if (typeof require !== 'undefined' && require.main === module) {
    const results = runMusicXmlMxlSampleFolderTests();
    console.log(JSON.stringify(results, null, 2));
    process.exit(results.every((x) => x.ok) ? 0 : 1);
  }
})();
