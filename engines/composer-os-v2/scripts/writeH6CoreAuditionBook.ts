/**
 * Write the H6-A4 audition MusicXML and decision sheet.
 * Run: node --import tsx engines/composer-os-v2/scripts/writeH6CoreAuditionBook.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { CORE_CANDIDATES, coreAuditionBookMusicXml, listCoreAuditionBookEntries } from '../core/hexatonic/index.ts';

const outDir = path.resolve('docs/h6-a4');
const xmlDir = path.join(outDir, 'musicxml');
fs.mkdirSync(xmlDir, { recursive: true });

const entries = listCoreAuditionBookEntries();
const files: string[] = [];
for (const entry of entries) {
  const filename = `${String(entry.index).padStart(2, '0')}-${entry.id}.musicxml`;
  fs.writeFileSync(path.join(xmlDir, filename), coreAuditionBookMusicXml(entry.id));
  files.push(filename);
}

fs.writeFileSync(path.join(outDir, 'booklet.json'), JSON.stringify({
  title: 'H6 Core 12 — audition book',
  status: 'PROVISIONAL — NOT MUSICALLY APPROVED',
  files,
  entries,
}, null, 2));

const lines: string[] = [
  '# H6 Core 12 — decision sheet',
  '',
  'Date: 2026-10-15',
  '',
  'All 12 candidates stay provisional. This sheet does not record a musical decision.',
  'No audible difference is claimed.',
  '',
  'Mark each row after playing or listening. Leave a row blank if you have not decided.',
  '',
];
for (const entry of entries) {
  const candidate = CORE_CANDIDATES[entry.index - 1]!;
  lines.push(`## ${entry.index}. ${entry.label}`, '');
  lines.push(entry.identity, '');
  lines.push(entry.mathematicalDifference, '');
  lines.push(`Triads: ${candidate.leftSpelling.join(' ')} / ${candidate.rightSpelling.join(' ')}`, '');
  lines.push('- Distinct: YES / NO / UNDECIDED');
  lines.push('- Useful: YES / NO / UNDECIDED');
  lines.push('- Playable: YES / NO / UNDECIDED');
  lines.push('- Decision: KEEP / REFINE / REJECT');
  lines.push('- Musical character:');
  lines.push('- Comments:');
  lines.push('');
}
lines.push('No candidate is admitted by this sheet.');
fs.writeFileSync(path.join(outDir, 'H6-CORE-12-DECISION-SHEET.md'), `${lines.join('\n')}\n`);
console.log(`wrote ${files.length} scores to ${xmlDir}`);
