/**
 * WWH Performance Synthesis — ingest, discover, and check.
 * Does not compose and does not write a score.
 *
 *   npm run wps --prefix engines/composer-os-v2 -- --spec core/wwh/wps/specs/07-impossible-metaphysics.json
 *
 * WPS V1.2 does not generate musical notes and does not write a score.
 */

import fs from 'node:fs';
import path from 'node:path';
import { runWps } from '../core/wwh/wps/wpsAssess';
import type { WpsSongSpec } from '../core/wwh/wps/wpsTypes';

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const specPath = arg('--spec');
if (!specPath) {
  console.error('Usage: wpsCli.ts --spec <song.json>');
  process.exit(1);
}

const spec = JSON.parse(fs.readFileSync(specPath, 'utf8')) as WpsSongSpec;
const report = runWps(spec);
console.log(report.lines.join('\n'));
const out = arg('--report');
if (out) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, report.lines.join('\n') + '\n');
}
process.exit(report.ok ? 0 : 1);
