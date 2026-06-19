/**
 * Read-only MusicXML per-bar attack + pitch fingerprint report for form/recap checks.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/scripts/analyzeMusicXmlPerBar.ts path/to/file.musicxml
 */

import fs from 'fs';
import path from 'path';

export type PerBarPartStats = {
  bar: number;
  attacks: number;
  rests: number;
  fingerprint: string;
};

export type PartSummary = {
  partId: string;
  partName: string;
  bars: PerBarPartStats[];
};

function tagValue(xml: string, tag: string): string | undefined {
  return xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'))?.[1]?.replace(/<[^>]+>/g, '').trim();
}

function attrValue(xml: string, attr: string): string | undefined {
  return xml.match(new RegExp(`\\b${attr}="([^"]*)"`, 'i'))?.[1]?.trim();
}

function pitchToMidi(noteXml: string): number | null {
  const step = tagValue(noteXml, 'step');
  const octave = tagValue(noteXml, 'octave');
  if (!step || !octave) return null;
  const steps: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const base = steps[step[0]!];
  if (base == null) return null;
  const alter = Number(tagValue(noteXml, 'alter') ?? '0');
  return (Number(octave) + 1) * 12 + base + alter;
}

function noteFingerprint(noteXml: string): string | null {
  if (/<rest\b/i.test(noteXml)) return null;
  if (/<chord\s*\/?>/i.test(noteXml)) return null;
  const midi = pitchToMidi(noteXml);
  if (midi == null) return null;
  const dur = tagValue(noteXml, 'duration') ?? '?';
  const voice = tagValue(noteXml, 'voice') ?? '1';
  return `${voice}:${midi}:${dur}`;
}

function parsePartBlock(partId: string, partName: string, partXml: string): PartSummary {
  const bars: PerBarPartStats[] = [];
  for (const m of partXml.matchAll(/<measure[^>]*number="(\d+)"[^>]*>([\s\S]*?)<\/measure>/g)) {
    const bar = Number(m[1]);
    const body = m[2]!;
    const notes = body.match(/<note\b[\s\S]*?<\/note>/g) ?? [];
    let attacks = 0;
    let rests = 0;
    const fps: string[] = [];
    for (const n of notes) {
      const fp = noteFingerprint(n);
      if (fp) {
        attacks += 1;
        fps.push(fp);
      } else if (/<rest\b/i.test(n)) {
        rests += 1;
      }
    }
    fps.sort();
    bars.push({ bar, attacks, rests, fingerprint: fps.join('|') });
  }
  return { partId, partName, bars };
}

export function analyzeMusicXmlPerBar(xml: string): {
  parts: PartSummary[];
  partNameById: Map<string, string>;
} {
  const partNameById = new Map<string, string>();
  for (const m of xml.matchAll(/<score-part id="([^"]+)"[^>]*>[\s\S]*?<part-name>([^<]*)<\/part-name>/g)) {
    partNameById.set(m[1]!, m[2]!);
  }
  const parts: PartSummary[] = [];
  for (const m of xml.matchAll(/<part id="([^"]+)"[^>]*>([\s\S]*?)<\/part>/g)) {
    const partId = m[1]!;
    const partName = partNameById.get(partId) ?? partId;
    parts.push(parsePartBlock(partId, partName, m[2]!));
  }
  return { parts, partNameById };
}

function findPart(parts: PartSummary[], pattern: RegExp): PartSummary | undefined {
  return parts.find((p) => pattern.test(p.partName) || pattern.test(p.partId));
}

function barStats(part: PartSummary | undefined, bar: number): PerBarPartStats | undefined {
  return part?.bars.find((b) => b.bar === bar);
}

function compareRecapPairs(
  part: PartSummary | undefined,
  pairs: Array<[number, number]>
): { allIdentical: boolean; rows: string[] } {
  const rows: string[] = [];
  let allIdentical = true;
  for (const [a, b] of pairs) {
    const left = barStats(part, a);
    const right = barStats(part, b);
    const sameFp = left?.fingerprint === right?.fingerprint;
    if (!sameFp) allIdentical = false;
    rows.push(
      `  bar ${a} vs ${b}: attacks ${left?.attacks ?? 0} vs ${right?.attacks ?? 0}; fingerprint ${sameFp ? 'MATCH' : 'DIFF'}`
    );
  }
  return { allIdentical, rows };
}

function parseBarArg(argv: string[]): number[] {
  const idx = argv.indexOf('--bars');
  if (idx < 0 || !argv[idx + 1]) return [1, 2, 3, 13, 14, 15];
  return argv[idx + 1]!.split(',').map((s) => Number(s.trim()));
}

function main(): void {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error(
      'Usage: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/scripts/analyzeMusicXmlPerBar.ts path/to/file.musicxml'
    );
    process.exit(1);
  }
  const xml = fs.readFileSync(path.resolve(filePath), 'utf8');
  const focusBars = parseBarArg(process.argv.slice(3));
  const { parts } = analyzeMusicXmlPerBar(xml);

  console.log(`File: ${path.basename(filePath)}`);
  console.log(`Parts: ${parts.map((p) => `${p.partId} (${p.partName})`).join(', ')}`);

  const guitar = findPart(parts, /guitar/i);
  const cello = findPart(parts, /cello|violoncello/i);

  for (const part of [guitar, cello]) {
    if (!part) continue;
    console.log(`\n${part.partName} [${part.partId}] attacks/rests:`);
    for (const bar of focusBars) {
      const s = barStats(part, bar);
      console.log(`  bar ${bar}: attacks=${s?.attacks ?? 0} rests=${s?.rests ?? 0}`);
    }
  }

  const pairs: Array<[number, number]> = [
    [1, 13],
    [2, 14],
    [3, 15],
  ];

  console.log('\nRecap fingerprint compare (A-section bar vs recap bar):');
  for (const part of [guitar, cello]) {
    if (!part) continue;
    const { allIdentical, rows } = compareRecapPairs(part, pairs);
    console.log(`\n${part.partName}:`);
    for (const row of rows) console.log(row);
    console.log(`  verdict: ${allIdentical ? 'IDENTICAL' : 'VARIED'}`);
  }
}

if (require.main === module) {
  main();
}