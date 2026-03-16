/**
 * MusicXML validation for Sibelius handoff.
 * Exits 0 if valid, 1 if invalid. Logs errors to stderr.
 *
 * Checks:
 * - XML well-formedness
 * - Multi-staff: <staves> present when multiple clefs or staff numbers
 * - Required attributes in first measure: divisions, key, time, clef
 */

import * as fs from 'fs';
import * as path from 'path';

function main(): { valid: boolean; errors: string[] } {
  const filePath = process.argv[2];
  if (!filePath || !fs.existsSync(filePath)) {
    return { valid: false, errors: ['File not found or path not provided'] };
  }

  const ext = path.extname(filePath).toLowerCase();
  if (ext !== '.musicxml' && ext !== '.xml') {
    return { valid: false, errors: ['Not a MusicXML file'] };
  }

  let xml: string;
  try {
    xml = fs.readFileSync(filePath, 'utf-8');
  } catch (e) {
    return { valid: false, errors: [`Read error: ${e}`] };
  }

  const errors: string[] = [];

  // 1. XML well-formedness (basic check)
  if (!xml.trim().startsWith('<?xml') && !xml.trim().startsWith('<')) {
    errors.push('Invalid XML: missing declaration or root');
  }
  if (!xml.includes('<score-partwise') && !xml.includes('<score-timewise')) {
    errors.push('Invalid MusicXML: missing score-partwise or score-timewise');
  }
  if (!xml.includes('</score-partwise>') && !xml.includes('</score-timewise>')) {
    errors.push('Invalid MusicXML: unclosed root element');
  }
  // Basic bracket balance
  const open = (xml.match(/</g) || []).length;
  const close = (xml.match(/>/g) || []).length;
  if (open !== close) {
    errors.push('XML may be malformed: tag mismatch');
  }

  // 2. Multi-staff check: if multiple clefs (number="1" and number="2") or staff 2 used, need <staves>
  const hasClef2 = /<clef\s+number="2"/.test(xml) || /<clef number='2'/.test(xml);
  const hasStaff2 = /<staff>2<\/staff>/.test(xml);
  const hasStaves = /<staves>\s*\d+\s*<\/staves>/.test(xml);
  if ((hasClef2 || hasStaff2) && !hasStaves) {
    errors.push('Multi-staff: missing <staves> element (required when using multiple clefs or staff numbers)');
  }

  // 3. Required attributes: at least one measure must have divisions, key, time, clef
  if (!/<divisions>/.test(xml)) errors.push('Required: <divisions> in attributes');
  if (!/<fifths>/.test(xml) && !/<key>/.test(xml)) errors.push('Required: <key> in attributes');
  if (!/<beats>/.test(xml) && !/<time>/.test(xml)) errors.push('Required: <time> in attributes');
  if (!/<clef[\s>]/.test(xml)) errors.push('Required: <clef> in attributes');

  // 4. part-list present
  if (!/<part-list>/.test(xml)) errors.push('Required: <part-list> in score');
  if (!/<score-part\s+id=/.test(xml)) errors.push('Required: <score-part> entries in part-list');

  // 5. part entries: each score-part should have a matching part
  const partIds = [...xml.matchAll(/<score-part\s+id="([^"]+)"/g)].map((m) => m[1]);
  for (const id of partIds) {
    const partRegex = new RegExp(`<part\\s+id="${id}"`);
    if (!partRegex.test(xml)) errors.push(`Part ${id} declared in part-list but no matching <part id="${id}">`);
  }

  // 6. measure structure: at least one measure with duration elements
  if (!/<duration>\d+<\/duration>/.test(xml)) errors.push('No measure durations found');

  // 7. file size > 1KB
  const stats = fs.statSync(filePath);
  if (stats.size < 1024) errors.push(`File size ${stats.size} bytes < 1KB`);

  return {
    valid: errors.length === 0,
    errors,
  };
}

const result = main();
if (!result.valid) {
  result.errors.forEach((e) => console.error(`[validateMusicXML] ${e}`));
  process.exit(1);
}
process.exit(0);
