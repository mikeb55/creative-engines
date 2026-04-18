/**
 * Scan a folder of Bacharach reference MusicXML/MXL and print aggregate chord statistics.
 *
 * Usage (repo root):
 *   npm run mine:bacharach -- --dir reference/bacharach
 *
 * Or set COMPOSER_OS_BACHARACH_REF_DIR to an absolute path (e.g. Documents folder).
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  mineMusicXmlFile,
  summarizeCorpus,
  type BacharachFileMiningResult,
} from './mining/bacharachReferenceMining';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

function walkMusicXmlFiles(dir: string, out: string[]): void {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkMusicXmlFiles(p, out);
    else if (/\.(musicxml|xml|mxl)$/i.test(ent.name)) out.push(p);
  }
}

function parseArgs(argv: string[]): { dir: string; jsonOut: string | null } {
  let dir = process.env.COMPOSER_OS_BACHARACH_REF_DIR?.trim() || path.join(REPO_ROOT, 'reference', 'bacharach');
  let jsonOut: string | null = null;
  const tail = argv.slice(2);
  for (let i = 0; i < tail.length; i++) {
    const a = tail[i];
    if (a === '--dir' && tail[i + 1]) dir = path.resolve(tail[++i]);
    else if (a === '--json-out' && tail[i + 1]) jsonOut = path.resolve(tail[++i]);
  }
  return { dir, jsonOut };
}

function main(): void {
  const { dir, jsonOut } = parseArgs(process.argv);
  const files: string[] = [];
  walkMusicXmlFiles(dir, files);
  files.sort();

  const results: BacharachFileMiningResult[] = [];
  let skipped = 0;
  for (const f of files) {
    const r = mineMusicXmlFile(f);
    if (r && r.chords.length > 0) results.push(r);
    else skipped++;
  }

  const summary = summarizeCorpus(results);

  const lines: string[] = [
    `# Bacharach reference mining (diagnostic)`,
    ``,
    `- **Directory:** \`${dir}\``,
    `- **Files scanned:** ${files.length}`,
    `- **Parsed with harmony:** ${summary.filesWithHarmony}`,
    `- **Skipped / empty harmony:** ${skipped}`,
    ``,
  ];

  if (summary.meanRatios) {
    lines.push(`## Corpus mean ratios (first-part harmony, one chord/measure)`);
    lines.push('');
    lines.push(`| Metric | Mean |`);
    lines.push(`|--------|------|`);
    lines.push(`| maj7 family | ${summary.meanRatios.maj7Family.toFixed(3)} |`);
    lines.push(`| m7 family | ${summary.meanRatios.m7Family.toFixed(3)} |`);
    lines.push(`| dominant 7 family | ${summary.meanRatios.dominant7Family.toFixed(3)} |`);
    lines.push(`| slash chords | ${summary.meanRatios.slashRatio.toFixed(3)} |`);
    lines.push(`| triad-like | ${summary.meanRatios.triadOrPower.toFixed(3)} |`);
    lines.push('');
  }

  lines.push(`## Per file`);
  lines.push('');
  for (const r of summary.perFile) {
    lines.push(`### ${r.source}`);
    lines.push(`- measures (max number): ${r.measureCount}`);
    lines.push(
      `- ratios: maj7 ${r.ratios.maj7Family.toFixed(2)}, m7 ${r.ratios.m7Family.toFixed(2)}, dom7 ${r.ratios.dominant7Family.toFixed(2)}, slash ${r.ratios.slashRatio.toFixed(2)}`
    );
    lines.push('');
  }

  const text = lines.join('\n');
  console.log(text);

  if (jsonOut) {
    fs.mkdirSync(path.dirname(jsonOut), { recursive: true });
    fs.writeFileSync(
      jsonOut,
      JSON.stringify({ dir, summary, rawFilePaths: files }, null, 2),
      'utf-8'
    );
    console.log(`\nWrote JSON: ${jsonOut}`);
  }

  if (files.length === 0) {
    console.warn(
      `\nNo .musicxml / .xml / .mxl files found. Copy scores into reference/bacharach or set COMPOSER_OS_BACHARACH_REF_DIR.\n`
    );
  }
}

main();
