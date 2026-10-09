/**
 * WWH Operator 1.1 — RESPOND.
 * npx tsx scripts/wwhRespond.ts <source.musicxml> <startBar> <endBar> <seed> [--map comping-map.musicxml] [--out dir] [--density 0.4] [--open]
 * Writes ONE audition MusicXML (ORIGINAL + A/B/C). MuseScore opens only with --open.
 */
import { buildRespondAudition } from '../core/wwh/wwhOperatorRespond';

const args = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const positional = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1]!.startsWith('--') && args[i - 1] !== '--open'));
const [source, start, end, seed] = positional;
if (!source || !start || !end || !seed) {
  console.error('usage: wwhRespond.ts <source> <startBar> <endBar> <seed> [--map file] [--out dir] [--density n] [--open]');
  process.exit(2);
}
const result = buildRespondAudition({
  source,
  startBar: Number(start),
  endBar: Number(end),
  seed: Number(seed),
  compingMap: flag('--map'),
  outDir: flag('--out'),
  density: flag('--density') ? Number(flag('--density')) : undefined,
  open: args.includes('--open'),
});
console.log(`OUTPUT ${result.output}`);
console.log(`SOURCE SHA ${result.sourceShaBefore === result.sourceShaAfter ? 'UNCHANGED' : 'CHANGED'} ${result.sourceShaAfter.slice(0, 12)}`);
console.log(`CHECKS ${JSON.stringify(result.checks)}`);
for (const s of result.sections) {
  console.log(`\n${s.label} · seed ${s.seed} · answered ${s.answered}/${s.windows} gaps · ${s.events.length} attacks`);
  for (const e of s.events) console.log(`  bar ${e.bar} beat ${e.onsetQuarters + 1} ${e.quarters}q ${e.kind.padEnd(7)} ${e.chord.padEnd(14)} ${e.family.padEnd(7)} ${e.sounding.join(' ').padEnd(16)} str/fret ${e.fingering}`);
  for (const n of s.notes) console.log(`  note: ${n}`);
}
