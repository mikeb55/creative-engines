/**
 * Performance Composer 1A — command-line lane writer.
 * Reads any partwise MusicXML, writes one new voice inside a bar span, verifies locks, writes a copy.
 * Never edits the source and never opens another application.
 *
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/scripts/performanceComposerLane.ts \
 *   --in score.musicxml --from 9 --to 24 --events events.json --out copy.musicxml [--part P1]
 * Bars are document order (1 = first measure), not printed numbers.
 */
import fs from 'node:fs';
import path from 'node:path';
import { writeLane, verifyLockedCopy, type PcLaneEvent } from '../core/performance-composer/pcLane';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const input = arg('in');
const out = arg('out');
const from = Number(arg('from'));
const to = Number(arg('to'));
const eventsFile = arg('events');
if (!input || !out || !eventsFile || !Number.isFinite(from) || !Number.isFinite(to)) {
  console.error('usage: --in <musicxml> --from <bar> --to <bar> --events <json> --out <musicxml> [--part <id>]');
  process.exit(2);
}
if (path.resolve(input) === path.resolve(out)) {
  console.error('refusing to overwrite the source');
  process.exit(2);
}
const source = fs.readFileSync(input, 'utf8');
const events = JSON.parse(fs.readFileSync(eventsFile, 'utf8')) as PcLaneEvent[];
const span = { from, to };
const result = writeLane(source, { span, events, partId: arg('part') });
const report = verifyLockedCopy(source, result.xml, span, result.lane);
if (!report.ok) {
  console.error(JSON.stringify({ ok: false, errors: report.errors.slice(0, 20) }, null, 2));
  process.exit(1);
}
fs.writeFileSync(out, result.xml);
console.log(
  JSON.stringify(
    {
      ok: true,
      out,
      lane: result.lane,
      bars: `${result.bars[0]!.printed}–${result.bars[result.bars.length - 1]!.printed} (printed)`,
      barsWritten: result.barsWritten,
      notesWritten: result.notesWritten,
      checks: report.checks,
    },
    null,
    2
  )
);
